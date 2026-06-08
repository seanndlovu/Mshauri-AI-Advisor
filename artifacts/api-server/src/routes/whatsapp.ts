import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, conversationsTable, messagesTable, farmersTable, analyticsEventsTable } from "@workspace/db";
import type { Farmer } from "@workspace/db";
import OpenAI from "openai";
import { logger } from "../lib/logger";
import { findRelevantArticles } from "../lib/knowledge-search";
import { getMarketPricesContext } from "../lib/market-prices-context";

const router: IRouter = Router();

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  const url = `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
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
  const urlRes = await fetch(`https://graph.facebook.com/v23.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
  });
  if (!urlRes.ok) throw new Error("Failed to fetch media URL");
  const { url, mime_type } = (await urlRes.json()) as { url: string; mime_type?: string };

  const mediaRes = await fetch(url, {
    headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
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
  const history = historyRows.reverse();

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

  // Detect language from recent messages for analytics
  const langPref = farmer?.languagePref ?? "en";

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
}

// GET /api/whatsapp/webhook — Meta verification
router.get("/whatsapp/webhook", (req, res): void => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    req.log.info("WhatsApp webhook verified");
    res.status(200).send(challenge);
  } else {
    req.log.warn({ mode, token }, "WhatsApp webhook verification failed");
    res.status(403).json({ error: "Verification failed" });
  }
});

// POST /api/whatsapp/webhook — incoming messages
router.post("/whatsapp/webhook", async (req, res): Promise<void> => {
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

export default router;
