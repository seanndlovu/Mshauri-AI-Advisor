import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, conversationsTable, messagesTable, farmersTable, analyticsEventsTable, communitiesTable, postsTable, whatsappSubscriptionsTable } from "@workspace/db";
import type { Farmer } from "@workspace/db";
import OpenAI from "openai";
import { logger } from "../lib/logger";
import { findRelevantArticles } from "../lib/knowledge-search";
import { getMarketPricesContext } from "../lib/market-prices-context";

const router: IRouter = Router();

// ── URL shortener (TinyURL — no API key required) ───────────────────────────
async function shortenUrl(url: string): Promise<string> {
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const short = (await res.text()).trim();
      if (short.startsWith("http")) return short;
    }
  } catch { /* fall back to original */ }
  return url;
}

// In-memory diagnostic state
let lastWebhookReceivedAt: Date | null = null;
let webhookHitCount = 0;

// ── Community posting state machine ────────────────────────────────────────
type PostType = "question" | "disease_report" | "market_price" | "opportunity" | "success_story" | "weather";
interface PostingState {
  step: "awaiting_confirm" | "awaiting_title";
  originalMessage: string;
  aiAnswer: string;
  communityId: number;
  communityName: string;
  communitySlug: string;
  postType: PostType;
  suggestedTitle: string;
  expiresAt: number;
}
const postingStates = new Map<string, PostingState>();

// ── Onboarding state machine ────────────────────────────────────────────────
type OnboardingStep = "awaiting_name" | "awaiting_location" | "awaiting_crops";
interface OnboardingState {
  step: OnboardingStep;
  name?: string;
  location?: string;
  expiresAt: number;
}
const onboardingStates = new Map<string, OnboardingState>();

function getOnboardingState(phone: string): OnboardingState | null {
  const s = onboardingStates.get(phone);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { onboardingStates.delete(phone); return null; }
  return s;
}
function setOnboardingState(phone: string, state: Omit<OnboardingState, "expiresAt">) {
  onboardingStates.set(phone, { ...state, expiresAt: Date.now() + 20 * 60 * 1000 });
}
function clearOnboardingState(phone: string) { onboardingStates.delete(phone); }

// ── Community subscription helpers ──────────────────────────────────────────
const COMMUNITY_DISPLAY: Record<string, string> = {
  maize: "🌽 Maize Farming", livestock: "🐄 Livestock", vegetables: "🥦 Vegetables",
  poultry: "🐓 Poultry", tobacco: "🌿 Tobacco", pests: "🐛 Pest Control",
  irrigation: "💧 Irrigation", agribusiness: "💼 Agribusiness",
  climate: "🌦️ Climate & Weather", soils: "🪱 Soils & Fertilisers",
};

async function subscribeToComm(phone: string, slug: string): Promise<"subscribed" | "already" | "not_found"> {
  if (!COMMUNITY_SLUGS.includes(slug)) return "not_found";
  try {
    await db.insert(whatsappSubscriptionsTable).values({ phone, communitySlug: slug }).onConflictDoNothing();
    return "subscribed";
  } catch { return "already"; }
}

async function unsubscribeFromComm(phone: string, slug: string): Promise<"removed" | "not_found"> {
  if (!COMMUNITY_SLUGS.includes(slug)) return "not_found";
  const result = await db.delete(whatsappSubscriptionsTable)
    .where(and(eq(whatsappSubscriptionsTable.phone, phone), eq(whatsappSubscriptionsTable.communitySlug, slug)));
  return result.rowCount && result.rowCount > 0 ? "removed" : "not_found";
}

async function getMySubscriptions(phone: string): Promise<string[]> {
  const rows = await db.select().from(whatsappSubscriptionsTable)
    .where(eq(whatsappSubscriptionsTable.phone, phone));
  return rows.map(r => r.communitySlug);
}

function parseCommunityCommand(text: string): { action: "join" | "leave"; slug: string } | null {
  const t = text.trim().toLowerCase();
  const joinMatch = t.match(/^join\s+(\w+)/);
  if (joinMatch) {
    const slug = joinMatch[1]!;
    const matched = COMMUNITY_SLUGS.find(s => s.startsWith(slug) || slug.startsWith(s));
    return matched ? { action: "join", slug: matched } : null;
  }
  const leaveMatch = t.match(/^leave\s+(\w+)/);
  if (leaveMatch) {
    const slug = leaveMatch[1]!;
    const matched = COMMUNITY_SLUGS.find(s => s.startsWith(slug) || slug.startsWith(s));
    return matched ? { action: "leave", slug: matched } : null;
  }
  return null;
}

function getPostingState(phone: string): PostingState | null {
  const s = postingStates.get(phone);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { postingStates.delete(phone); return null; }
  return s;
}
function setPostingState(phone: string, state: Omit<PostingState, "expiresAt">) {
  postingStates.set(phone, { ...state, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min TTL
}
function clearPostingState(phone: string) { postingStates.delete(phone); }

// Classify whether a message is worth posting to community
interface PostClassification {
  worthPosting: boolean;
  communitySlug: string;
  postType: PostType;
  suggestedTitle: string;
}

const COMMUNITY_SLUGS = ["maize","livestock","vegetables","poultry","tobacco","pests","irrigation","agribusiness","climate","soils"];

async function classifyForCommunity(userMessage: string): Promise<PostClassification | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a classifier for a Zimbabwean farming community platform. Given a WhatsApp message from a farmer, decide if it is worth sharing as a community post so other farmers can benefit.

Worth posting if: it describes a crop/livestock problem, disease, pest, market question, weather concern, or farming challenge others could learn from or help with.
NOT worth posting if: it's a simple greeting, off-topic, already answered trivially, or too personal.

Available communities: ${COMMUNITY_SLUGS.join(", ")}
Post types: question, disease_report, market_price, opportunity, success_story, weather

Return JSON: { "worthPosting": boolean, "communitySlug": string, "postType": string, "suggestedTitle": string }
suggestedTitle should be a clear, concise post title under 80 characters.`,
        },
        { role: "user", content: userMessage },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<PostClassification>;
    if (!parsed.worthPosting) return null;
    if (!COMMUNITY_SLUGS.includes(parsed.communitySlug ?? "")) return null;
    return {
      worthPosting: true,
      communitySlug: parsed.communitySlug!,
      postType: (parsed.postType as PostType) ?? "question",
      suggestedTitle: parsed.suggestedTitle ?? userMessage.slice(0, 80),
    };
  } catch {
    return null;
  }
}

async function createCommunityPost(
  communityId: number,
  title: string,
  content: string,
  postType: PostType,
  aiAnswer: string,
): Promise<number> {
  const fullContent = `${content}\n\nMshauri AI answer: ${aiAnswer}`;
  const [post] = await db.insert(postsTable).values({
    communityId,
    userId: null,
    type: postType,
    title,
    content: fullContent,
    imageUrl: null,
    videoUrl: null,
    linkUrl: null,
  }).returning({ id: postsTable.id });
  await db.update(communitiesTable)
    .set({ postCount: sql`post_count + 1` })
    .where(eq(communitiesTable.id, communityId))
    .catch(() => {});
  return post!.id;
}

function getWhatsAppConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
  };
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const WELCOME_MESSAGE = `Welcome to Mshauri AI! 🌾

I'm your personal farming assistant for Zimbabwe. Here's what I can do:

Ask me anything:
• "My maize leaves are yellow" → diagnosis + fix
• "Prices" → today's market prices
• "Weather" → farming weather tips
• "Help" → see all commands

I understand English, Shona and Ndebele.

What farming question can I help you with today?`;

const HELP_MENU = `Mshauri AI Commands:

PRICES — today's market prices
COMMUNITIES — browse all communities
MY COMMUNITIES — your subscriptions
JOIN MAIZE — join a community (e.g. maize, livestock, pests)
LEAVE MAIZE — leave a community
REGISTER — set up your farmer profile
HELP — show this menu

Or just describe your problem in your own words!

Examples:
• "My cattle are not eating"
• "Best time to plant maize in Mashonaland"
• "How do I treat fall armyworm"

Powered by Maricho Media 🌾`;

async function getMarketPricesWhatsApp(): Promise<string> {
  try {
    const { marketPricesTable } = await import("@workspace/db");
    const prices = await db
      .select()
      .from(marketPricesTable)
      .orderBy(desc(marketPricesTable.priceDate))
      .limit(10);
    if (prices.length === 0) return "No market prices available right now. Check back soon.";
    const lines = prices.map(p => `• ${p.commodity}: $${p.priceUsd}/${p.unit} (${p.market})`);
    return `Zimbabwe Market Prices\n\n${lines.join("\n")}\n\nPrices updated regularly. Ask me about any specific crop!`;
  } catch {
    return "Market prices are temporarily unavailable. Please try again shortly.";
  }
}

function detectKeyword(text: string): "welcome" | "help" | "prices" | "weather" | "communities" | "my_communities" | "register" | null {
  const t = text.trim().toLowerCase();
  if (["hi", "hello", "hey", "start", "hie", "mhoro", "sawubona", "ndeipi"].includes(t)) return "welcome";
  if (["help", "menu", "commands", "?", "info"].includes(t)) return "help";
  if (t === "prices" || t === "price" || t === "market" || t === "markets" || t === "mutengo" || t.startsWith("price") || t.startsWith("market")) return "prices";
  if (t === "weather" || t === "mvura" || t === "rain" || t === "forecast" || t.startsWith("weather")) return "weather";
  if (t === "communities" || t === "community list" || t === "join" || t === "all communities") return "communities";
  if (t === "my communities" || t === "my community" || t === "subscriptions" || t === "my subs") return "my_communities";
  if (t === "register" || t === "registration" || t === "sign up" || t === "profile" || t === "my profile") return "register";
  return null;
}

const MHAURI_SYSTEM_PROMPT = `You are Mhauri AI, an expert Zimbabwean agricultural extension officer.
Your role is to provide practical, accurate, farmer-friendly agricultural advice for Zimbabwe and Southern Africa.

You specialize in:
- Crop production (maize, tobacco, soybean, groundnuts, sorghum, millet, vegetables, fruits)
- Livestock management (cattle, goats, sheep, pigs, poultry)
- Climate-smart agriculture adapted to Zimbabwe's seasons
- Soil fertility and conservation agriculture
- Pest management and integrated pest management (IPM)
- Plant disease diagnosis and treatment
- Farm equipment troubleshooting
- Agribusiness and market access

Rules:
1. Always provide actionable, practical recommendations.
2. Prioritize low-cost solutions suitable for smallholder farmers.
3. Consider Zimbabwean climate, seasons, and farming conditions.
4. Respond in the SAME language used by the farmer (English, Shona, or Ndebele).
5. If an image is shared, analyze the visual symptoms and identify possible diseases, pests, or deficiencies. Provide a confidence level and specific recommendations.
6. Never invent facts. If uncertain, clearly state your limitations.
7. For animal health matters, provide guidance but recommend veterinary consultation when appropriate.
8. Format responses clearly using this structure when diagnosing problems:
   Diagnosis: [Your assessment]
   Possible Cause: [Root cause]
   Recommended Action: [Step-by-step actions]
   Prevention: [How to prevent recurrence]
9. Keep answers practical and easy to understand.
10. When responding in Shona or Ndebele, use agricultural terms familiar to local farmers.
11. IMPORTANT: Keep responses concise for WhatsApp — under 1000 characters when possible. Use plain text, no markdown.`;

async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const { accessToken, phoneNumberId } = getWhatsAppConfig();
  const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    logger.error({ status: response.status, err }, "WhatsApp send failed");
    throw new Error(`WhatsApp API error: ${response.status}`);
  }
}

async function downloadWhatsAppMedia(mediaId: string): Promise<{ dataUrl: string; mimeType: string }> {
  const { accessToken } = getWhatsAppConfig();
  const urlRes = await fetch(`https://graph.facebook.com/v23.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!urlRes.ok) throw new Error("Failed to fetch media URL");
  const { url, mime_type } = (await urlRes.json()) as { url: string; mime_type?: string };

  const mediaRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!mediaRes.ok) throw new Error("Failed to download media");

  const buffer = await mediaRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = mime_type ?? mediaRes.headers.get("content-type") ?? "image/jpeg";
  return { dataUrl: `data:${contentType};base64,${base64}`, mimeType: contentType };
}

async function transcribeVoiceNote(mediaId: string): Promise<string> {
  const { dataUrl, mimeType } = await downloadWhatsAppMedia(mediaId);
  const base64Data = dataUrl.split(",")[1];
  const buffer = Buffer.from(base64Data, "base64");

  const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : mimeType.includes("mpeg") ? "mp3" : "ogg";
  const file = new File([buffer], `voice.${ext}`, { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });

  return transcription.text;
}

async function upsertFarmer(phone: string): Promise<Farmer | null> {
  try {
    const [farmer] = await db
      .insert(farmersTable)
      .values({ phone, lastSeen: new Date() })
      .onConflictDoUpdate({
        target: farmersTable.phone,
        set: { lastSeen: new Date() },
      })
      .returning();
    return farmer ?? null;
  } catch (err) {
    logger.error({ err, phone }, "Failed to upsert farmer");
    return null;
  }
}

function buildFarmerContext(farmer: Farmer | null): string {
  if (!farmer) return "";
  const parts: string[] = [];
  if (farmer.name) parts.push(`Name: ${farmer.name}`);
  if (farmer.location) parts.push(`Location: ${farmer.location}`);
  if (farmer.crops.length > 0) parts.push(`Crops grown: ${farmer.crops.join(", ")}`);
  if (farmer.livestock.length > 0) parts.push(`Livestock: ${farmer.livestock.join(", ")}`);
  if (parts.length === 0) return "";
  return `\n\n--- FARMER PROFILE ---\n${parts.join("\n")}\nTailor your advice to this farmer's specific context, crops, and location.\n--- END PROFILE ---`;
}

async function logAnalyticsEvent(
  eventType: "message_received" | "voice_transcribed" | "image_analyzed",
  phone: string,
  language?: string,
  preview?: string
): Promise<void> {
  try {
    await db.insert(analyticsEventsTable).values({
      eventType,
      phone,
      language,
      messagePreview: preview?.slice(0, 100),
    });
  } catch {}
}

async function getOrCreateConversation(phone: string): Promise<number> {
  const existing = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.whatsappPhone, phone))
    .orderBy(desc(conversationsTable.updatedAt))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [created] = await db
    .insert(conversationsTable)
    .values({ title: `WhatsApp: ${phone}`, whatsappPhone: phone })
    .returning();

  return created.id;
}

async function getRecentHistory(conversationId: number) {
  return db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(20);
}

async function handleIncomingMessage(
  phone: string,
  userText: string,
  imageDataUrl?: string,
  eventType: "message_received" | "voice_transcribed" | "image_analyzed" = "message_received"
): Promise<void> {
  // Fetch farmer profile and conversation in parallel
  const [farmer, conversationId] = await Promise.all([
    upsertFarmer(phone),
    getOrCreateConversation(phone),
  ]);

  const historyRows = await getRecentHistory(conversationId);
  const isNewUser = historyRows.length === 0;
  const history = historyRows.reverse();

  const langPref = farmer?.languagePref ?? "en";

  // ── Onboarding state machine (runs before everything else) ─────────────
  const onboarding = getOnboardingState(phone);
  if (onboarding) {
    const answer = userText.trim();
    const skip = /^skip$/i.test(answer);

    if (onboarding.step === "awaiting_name") {
      if (skip) {
        // User doesn't want to register right now — drop the flow and answer normally
        clearOnboardingState(phone);
        await sendWhatsAppMessage(phone, "No problem! Just ask me your farming question anytime. Type REGISTER whenever you'd like to set up your profile.");
        return;
      }
      const name = answer.slice(0, 80);
      await db.update(farmersTable).set({ name }).where(eq(farmersTable.phone, phone)).catch(() => {});
      setOnboardingState(phone, { step: "awaiting_location", name });
      await sendWhatsAppMessage(phone,
        `Great, ${name}! Which province are you in?\n\n1. Harare\n2. Bulawayo\n3. Manicaland\n4. Mashonaland Central\n5. Mashonaland East\n6. Mashonaland West\n7. Masvingo\n8. Matabeleland North\n9. Matabeleland South\n10. Midlands\n\n(Type the name or number, or SKIP)`
      );
      return;
    }

    if (onboarding.step === "awaiting_location") {
      const PROVINCES = ["Harare","Bulawayo","Manicaland","Mashonaland Central","Mashonaland East","Mashonaland West","Masvingo","Matabeleland North","Matabeleland South","Midlands"];
      let location: string | undefined;
      if (!skip) {
        const num = parseInt(answer, 10);
        location = (!isNaN(num) && num >= 1 && num <= 10) ? PROVINCES[num - 1] : answer.slice(0, 80);
      }
      if (location) {
        await db.update(farmersTable).set({ location }).where(eq(farmersTable.phone, phone)).catch(() => {});
      }
      setOnboardingState(phone, { step: "awaiting_crops", name: onboarding.name, location });
      await sendWhatsAppMessage(phone,
        `${location ? `${location} — great farming region!` : "Understood!"} What do you mainly farm?\n\nExamples: maize, cattle, vegetables, tobacco, poultry, mixed farming\n\n(Describe your farm or type SKIP)`
      );
      return;
    }

    if (onboarding.step === "awaiting_crops") {
      const crops = skip ? [] : answer.split(/[,\s]+/).map(c => c.trim()).filter(Boolean).slice(0, 10);
      if (crops.length > 0) {
        await db.update(farmersTable).set({ crops }).where(eq(farmersTable.phone, phone)).catch(() => {});
      }
      clearOnboardingState(phone);
      const name = onboarding.name ?? farmer?.name;
      await sendWhatsAppMessage(phone,
        `${name ? `You're all set, ${name}!` : "Profile complete!"} 🎉\n\nI'll personalise my advice for ${onboarding.location ?? "your area"}${crops.length ? ` — ${crops.slice(0, 3).join(", ")}` : ""}.\n\nNow ask me anything about farming — or type COMMUNITIES to join a farming group!`
      );
      return;
    }
  }

  // ── Keyword shortcuts — bypass AI for common commands ──────────────────
  if (!imageDataUrl) {
    const keyword = detectKeyword(userText);
    const communityCmd = parseCommunityCommand(userText);

    // Community join/leave commands
    if (communityCmd) {
      if (communityCmd.action === "join") {
        const result = await subscribeToComm(phone, communityCmd.slug);
        const display = COMMUNITY_DISPLAY[communityCmd.slug] ?? communityCmd.slug;
        if (result === "subscribed") {
          await sendWhatsAppMessage(phone, `✅ You've joined ${display}!\n\nYou'll see community updates from this group. Type MY COMMUNITIES to see all your subscriptions, or type LEAVE ${communityCmd.slug.toUpperCase()} to unsubscribe.`);
        } else {
          await sendWhatsAppMessage(phone, `You're already in ${display}. Type MY COMMUNITIES to see all your subscriptions.`);
        }
      } else {
        const result = await unsubscribeFromComm(phone, communityCmd.slug);
        const display = COMMUNITY_DISPLAY[communityCmd.slug] ?? communityCmd.slug;
        await sendWhatsAppMessage(phone, result === "removed"
          ? `👋 You've left ${display}. Type COMMUNITIES anytime to rejoin.`
          : `You weren't subscribed to ${display}.`
        );
      }
      void logAnalyticsEvent(eventType, phone, langPref, userText);
      return;
    }

    if (keyword === "communities") {
      const mySlug = await getMySubscriptions(phone);
      const lines = COMMUNITY_SLUGS.map(s => {
        const joined = mySlug.includes(s) ? " ✅" : "";
        return `${COMMUNITY_DISPLAY[s] ?? s}${joined}\n  → JOIN ${s.toUpperCase()}`;
      });
      await sendWhatsAppMessage(phone, `Mshauri Communities:\n\n${lines.join("\n\n")}\n\nType JOIN followed by the community name to subscribe.`);
      void logAnalyticsEvent(eventType, phone, langPref, userText);
      return;
    }

    if (keyword === "my_communities") {
      const subs = await getMySubscriptions(phone);
      if (subs.length === 0) {
        await sendWhatsAppMessage(phone, `You haven't joined any communities yet.\n\nType COMMUNITIES to see what's available, then JOIN <name> to subscribe.`);
      } else {
        const lines = subs.map(s => `• ${COMMUNITY_DISPLAY[s] ?? s} — LEAVE ${s.toUpperCase()} to unsubscribe`);
        await sendWhatsAppMessage(phone, `Your Communities:\n\n${lines.join("\n")}\n\nType COMMUNITIES to browse more.`);
      }
      void logAnalyticsEvent(eventType, phone, langPref, userText);
      return;
    }

    if (keyword === "register") {
      setOnboardingState(phone, { step: "awaiting_name" });
      const name = farmer?.name;
      await sendWhatsAppMessage(phone,
        `Let's set up your farmer profile! 🌾\n\nThis helps me give you personalised advice.\n\nWhat's your name?${name ? ` (Currently: ${name})` : ""}\n\n(Type SKIP to keep as is)`
      );
      void logAnalyticsEvent(eventType, phone, langPref, userText);
      return;
    }

    if (keyword === "welcome") {
      await sendWhatsAppMessage(phone, WELCOME_MESSAGE);
      if (isNewUser && !farmer?.name) {
        // Soft profile invite — one message, no forced flow
        await sendWhatsAppMessage(phone, "Type REGISTER to set up your farmer profile for personalised advice, or just ask your question now!");
      }
      void logAnalyticsEvent(eventType, phone, langPref, userText);
      return;
    } else if (keyword === "help") {
      await sendWhatsAppMessage(phone, HELP_MENU);
      void logAnalyticsEvent(eventType, phone, langPref, userText);
      return;
    } else if (keyword === "prices") {
      const pricesMsg = await getMarketPricesWhatsApp();
      await sendWhatsAppMessage(phone, pricesMsg);
      void logAnalyticsEvent(eventType, phone, langPref, userText);
      return;
    } else if (keyword === "weather") {
      const primaryDomain = (process.env.REPLIT_DOMAINS ?? "").split(",")[0].trim();
      const weatherAppUrl = primaryDomain ? await shortenUrl(`https://${primaryDomain}/weather`) : "";
      const weatherMsg = `Zimbabwe Farming Weather Tips:\n\n• June-August: dry season — ideal for land prep, irrigation crops, winter wheat\n• September-November: pre-season — prepare soil, order inputs early\n• November-April: rainy season — main crop planting, watch for pests\n\nFor your local 7-day forecast, check the Mshauri app:${weatherAppUrl ? `\n${weatherAppUrl}` : ""}\n\nOr ask me: "When should I plant maize in [your area]?"`;
      await sendWhatsAppMessage(phone, weatherMsg);
      void logAnalyticsEvent(eventType, phone, langPref, userText);
      return;
    }
  }

  // Build context in parallel
  const [knowledgeContext, marketContext] = await Promise.all([
    findRelevantArticles(userText, farmer?.languagePref ?? "all"),
    getMarketPricesContext(),
  ]);

  const farmerContext = buildFarmerContext(farmer);
  const systemContent = MHAURI_SYSTEM_PROMPT + farmerContext + marketContext + knowledgeContext;

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history.map((m): OpenAI.Chat.ChatCompletionMessageParam => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: userText },
  ];
  if (imageDataUrl) {
    userContent.push({ type: "image_url", image_url: { url: imageDataUrl, detail: "high" } });
  }
  chatMessages.push({ role: "user", content: userContent });

  await db.insert(messagesTable).values({
    conversationId,
    role: "user",
    content: userText,
    imageUrl: imageDataUrl ?? null,
  });

  await db.update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  void logAnalyticsEvent(eventType, phone, langPref, userText);

  let reply = "Sorry, I am temporarily unavailable. Please try again shortly.";
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: chatMessages,
    });
    reply = completion.choices[0]?.message?.content ?? reply;
  } catch (err) {
    logger.error({ err }, "OpenAI error for WhatsApp message");
  }

  await db.insert(messagesTable).values({
    conversationId,
    role: "assistant",
    content: reply,
    imageUrl: null,
  });

  await db.update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  await sendWhatsAppMessage(phone, reply);

  // For brand-new users with no profile, append a one-time soft nudge after answering
  if (isNewUser && !farmer?.name) {
    await sendWhatsAppMessage(phone, "💡 Tip: Type REGISTER to set up your farmer profile and I'll personalise my advice for your crops and location.");
  }

  // After answering, check if this message is worth posting to the community
  // Run classification in background — don't delay the reply
  void (async () => {
    try {
      const classification = await classifyForCommunity(userText);
      if (!classification) return;

      // Look up the community in DB
      const [community] = await db
        .select()
        .from(communitiesTable)
        .where(eq(communitiesTable.slug, classification.communitySlug))
        .limit(1);
      if (!community) return;

      // Save posting state and ask the user
      setPostingState(phone, {
        step: "awaiting_confirm",
        originalMessage: userText,
        aiAnswer: reply,
        communityId: community.id,
        communityName: community.name,
        communitySlug: community.slug,
        postType: classification.postType,
        suggestedTitle: classification.suggestedTitle,
      });

      const typeLabel: Record<PostType, string> = {
        question: "Question",
        disease_report: "Disease Report",
        market_price: "Market Price",
        opportunity: "Opportunity",
        success_story: "Success Story",
        weather: "Weather",
      };

      await sendWhatsAppMessage(
        phone,
        `Other farmers may have this same issue.\n\nShare to community: ${community.name}?\nPost: "${classification.suggestedTitle}"\nType: ${typeLabel[classification.postType]}\n\nReply YES to post it, or NO to skip.`
      );
    } catch (err) {
      logger.warn({ err, phone }, "Community classification failed silently");
    }
  })();
}

// GET /api/whatsapp/webhook — Meta verification
router.get("/whatsapp/webhook", (req, res): void => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === getWhatsAppConfig().verifyToken) {
    req.log.info("WhatsApp webhook verified");
    res.status(200).send(challenge);
  } else {
    req.log.warn({ mode, token }, "WhatsApp webhook verification failed");
    res.status(403).json({ error: "Verification failed" });
  }
});

// GET /api/whatsapp/status — diagnostic endpoint
router.get("/whatsapp/status", async (req, res): Promise<void> => {
  const { accessToken, phoneNumberId, verifyToken } = getWhatsAppConfig();
  const primaryDomain = (process.env.REPLIT_DOMAINS ?? "unknown").split(",")[0].trim();
  const webhookUrl = `https://${primaryDomain}/api/whatsapp/webhook`;

  const status: Record<string, unknown> = {
    webhookUrl,
    verifyTokenSet: !!verifyToken,
    phoneNumberIdSet: !!phoneNumberId,
    accessTokenPrefix: accessToken ? accessToken.slice(0, 10) + "…" : "NOT SET",
    lastWebhookReceivedAt: lastWebhookReceivedAt?.toISOString() ?? "never",
    webhookHitCount,
    instructions: {
      step1: "In Meta Business Platform → WhatsApp → Configuration → Webhook",
      step2: `Set Callback URL to: ${webhookUrl}`,
      step3: "Set Verify Token to the value of your WHATSAPP_VERIFY_TOKEN secret",
      step4: "Click Verify and Save",
      step5: "Under Webhook Fields, subscribe to: messages",
    },
  };

  // Test if token is still valid
  try {
    const r = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await r.json() as Record<string, unknown>;
    if (r.ok) {
      status.tokenValid = true;
      status.phoneNumber = data.display_phone_number;
      status.displayName = data.verified_name;
    } else {
      status.tokenValid = false;
      status.tokenError = data.error;
    }
  } catch (err) {
    status.tokenValid = false;
    status.tokenError = String(err);
  }

  res.json(status);
});

// POST /api/whatsapp/test-send — send a test message outbound
router.post("/whatsapp/test-send", async (req, res): Promise<void> => {
  const { to, message } = req.body as { to?: string; message?: string };
  if (!to || !message) {
    res.status(400).json({ error: "to and message are required" });
    return;
  }
  try {
    await sendWhatsAppMessage(to.replace(/\D/g, ""), message);
    res.json({ success: true, to, message });
  } catch (err) {
    req.log.error({ err }, "test-send failed");
    res.status(502).json({ error: String(err) });
  }
});

// POST /api/whatsapp/webhook — incoming messages
router.post("/whatsapp/webhook", async (req, res): Promise<void> => {
  // Track hits for diagnostics
  lastWebhookReceivedAt = new Date();
  webhookHitCount++;

  // Respond immediately so Meta doesn't retry
  res.sendStatus(200);

  const body = req.body as {
    object?: string;
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            from?: string;
            type?: string;
            text?: { body?: string };
            image?: { id?: string; caption?: string };
            audio?: { id?: string };
            voice?: { id?: string };
          }>;
          statuses?: unknown[];
        };
      }>;
    }>;
  };

  if (body.object !== "whatsapp_business_account") return;

  const changes = body.entry?.[0]?.changes ?? [];
  for (const change of changes) {
    const messages = change.value?.messages ?? [];

    for (const msg of messages) {
      const phone = msg.from;
      if (!phone) continue;

      // Skip status updates, delivery receipts, etc.
      if (!["text", "image", "audio", "voice"].includes(msg.type ?? "")) continue;

      try {
        if (msg.type === "text") {
          const text = msg.text?.body;
          if (!text) continue;
          req.log.info({ phone, textLength: text.length }, "WhatsApp text message received");

          // Check for active posting state — intercept YES/NO before normal AI handling
          const postingState = getPostingState(phone);
          if (postingState) {
            const normalized = text.trim().toLowerCase();

            if (postingState.step === "awaiting_confirm") {
              if (normalized === "yes" || normalized === "y" || normalized.startsWith("yes")) {
                // User confirmed — create the post
                clearPostingState(phone);
                try {
                  const postId = await createCommunityPost(
                    postingState.communityId,
                    postingState.suggestedTitle,
                    postingState.originalMessage,
                    postingState.postType,
                    postingState.aiAnswer,
                  );
                  const primaryDomain = (process.env.REPLIT_DOMAINS ?? "").split(",")[0].trim();
                  const rawPostUrl = primaryDomain
                    ? `https://${primaryDomain}/communities/${postingState.communitySlug}`
                    : "";
                  const postUrl = rawPostUrl ? await shortenUrl(rawPostUrl) : "";
                  const confirmMsg = `Posted to ${postingState.communityName}!\n"${postingState.suggestedTitle}"\n\nOther farmers can now see it and share their experience.${postUrl ? `\n\nView: ${postUrl}` : ""}\n\nAny other questions?`;
                  req.log.info({ phone, postId, community: postingState.communitySlug }, "Community post created from WhatsApp");
                  await sendWhatsAppMessage(phone, confirmMsg);
                } catch (err) {
                  req.log.error({ err, phone }, "Failed to create community post");
                  await sendWhatsAppMessage(phone, "Sorry, I could not create the post right now. Please try again later.");
                }
              } else if (normalized === "no" || normalized === "n" || normalized.startsWith("no")) {
                clearPostingState(phone);
                await sendWhatsAppMessage(phone, "No problem. What else can I help you with?");
              } else {
                // Not a YES/NO — treat as a new message, clear state
                clearPostingState(phone);
                await handleIncomingMessage(phone, text, undefined, "message_received");
              }
              continue;
            }
          }

          await handleIncomingMessage(phone, text, undefined, "message_received");

        } else if (msg.type === "image") {
          const mediaId = msg.image?.id;
          const caption = msg.image?.caption ?? "Please analyze this image.";
          if (!mediaId) continue;
          req.log.info({ phone, mediaId }, "WhatsApp image message received");
          const { dataUrl } = await downloadWhatsAppMedia(mediaId);
          await handleIncomingMessage(phone, caption, dataUrl, "image_analyzed");

        } else if (msg.type === "audio" || msg.type === "voice") {
          const mediaId = (msg.audio?.id ?? msg.voice?.id);
          if (!mediaId) continue;
          req.log.info({ phone, mediaId }, "WhatsApp voice note received");
          const transcript = await transcribeVoiceNote(mediaId);
          if (!transcript.trim()) {
            await sendWhatsAppMessage(phone, "Sorry, I could not understand the voice note. Please try again or send a text message.");
            continue;
          }
          req.log.info({ phone, transcriptLength: transcript.length }, "Voice note transcribed");
          await handleIncomingMessage(phone, `[Voice note]: ${transcript}`, undefined, "voice_transcribed");
        }
      } catch (err) {
        req.log.error({ err, phone }, "Error handling WhatsApp message");
        try {
          await sendWhatsAppMessage(
            phone!,
            "Sorry, I am temporarily unavailable. Please try again shortly."
          );
        } catch {}
      }
    }
  }
});

/* ─── WhatsApp Subscribe ──────────────────────────────── */
router.post("/whatsapp/subscribe", async (req, res): Promise<void> => {
  const { phone } = req.body as { phone?: string };
  if (!phone) { res.status(400).json({ error: "Phone number required" }); return; }

  const config = getWhatsAppConfig();
  const to = phone.replace(/\D/g, "");

  try {
    const waRes = await fetch(`https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body: "👋 *Welcome to Mshauri!* You're now connected.\n\nYou can:\n• Ask any farming question\n• Get daily market prices\n• Receive pest & disease alerts\n• Check localised weather\n\nTry asking: *What pests affect maize in November?*\n\n_Powered by Maricho Media_ 🌱",
        },
      }),
    });
    if (!waRes.ok) {
      const errBody = await waRes.text();
      req.log.warn({ phone, errBody }, "WhatsApp subscribe send failed");
      res.status(502).json({ error: "Failed to send WhatsApp message" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err, phone }, "WhatsApp subscribe error");
    res.status(500).json({ error: "Internal error" });
  }
});

/* ─── WhatsApp Business Number ──────────────────────────── */
router.get("/whatsapp/number", async (req, res): Promise<void> => {
  const { accessToken, phoneNumberId } = getWhatsAppConfig();
  if (!accessToken || !phoneNumberId) {
    res.status(503).json({ error: "WhatsApp not configured" });
    return;
  }
  try {
    const r = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!r.ok) {
      const body = await r.text();
      req.log.warn({ status: r.status, body }, "WhatsApp number fetch failed");
      res.status(502).json({ error: "Could not fetch number" });
      return;
    }
    const data = await r.json() as { display_phone_number?: string; verified_name?: string };
    res.json({
      number: data.display_phone_number ?? null,
      name: data.verified_name ?? "Mshauri",
    });
  } catch (err) {
    req.log.error({ err }, "WhatsApp number fetch error");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;


