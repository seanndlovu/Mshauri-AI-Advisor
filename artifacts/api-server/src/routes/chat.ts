import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, conversationsTable, messagesTable } from "@workspace/db";
import {
  CreateConversationBody,
  DeleteConversationParams,
  GetConversationMessagesParams,
  ListConversationsResponseItem,
  GetConversationMessagesResponseItem,
} from "@workspace/api-zod";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
5. If an image is described or uploaded, analyze the visual symptoms to identify possible diseases, pests, or deficiencies. Provide confidence level and specific recommendations.
6. Never invent facts. If uncertain, clearly state your limitations.
7. For animal health matters, provide guidance but recommend veterinary consultation when appropriate.
8. Format responses clearly using this structure when diagnosing problems:
   Diagnosis: [Your assessment]
   Possible Cause: [Root cause]
   Recommended Action: [Step-by-step actions]
   Prevention: [How to prevent recurrence]
9. Keep answers practical and easy to understand.
10. When responding in Shona or Ndebele, use agricultural terms familiar to local farmers.`;


router.get("/chat/conversations", async (req, res): Promise<void> => {
  const conversations = await db
    .select({
      id: conversationsTable.id,
      title: conversationsTable.title,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      messageCount: sql<number>`cast(count(${messagesTable.id}) as int)`,
    })
    .from(conversationsTable)
    .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
    .groupBy(conversationsTable.id)
    .orderBy(desc(conversationsTable.updatedAt));

  res.json(conversations.map((c) => ListConversationsResponseItem.parse({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  })));
});

router.post("/chat/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conversation] = await db
    .insert(conversationsTable)
    .values({ title: parsed.data.title })
    .returning();

  res.status(201).json(ListConversationsResponseItem.parse({
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messageCount: 0,
  }));
});

router.delete("/chat/conversations/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteConversationParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/chat/conversations/:id/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetConversationMessagesParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json(msgs.map((m) => GetConversationMessagesResponseItem.parse({
    ...m,
    createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/chat/conversations/:id/stream", async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const conversationId = parseInt(raw, 10);
  if (isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }

  const { message, imageBase64 } = req.body as { message?: unknown; imageBase64?: unknown };
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const historyRows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: MHAURI_SYSTEM_PROMPT },
    ...historyRows.map((m): OpenAI.Chat.ChatCompletionMessageParam => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: message },
  ];

  let imageDataUrl: string | null = null;
  if (imageBase64 && typeof imageBase64 === "string") {
    const mimeMatch = imageBase64.match(/^data:(image\/[^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
    imageDataUrl = `data:${mimeType};base64,${base64Data}`;
    userContent.push({
      type: "image_url",
      image_url: { url: imageDataUrl, detail: "high" },
    });
  }

  chatMessages.push({ role: "user", content: userContent });

  await db.insert(messagesTable).values({
    conversationId,
    role: "user",
    content: message,
    imageUrl: imageDataUrl,
  });

  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
      imageUrl: null,
    });

    await db
      .update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversationId));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    req.log.error({ err }, "OpenAI streaming error");
    res.write(`data: ${JSON.stringify({ error: "Sorry, I am temporarily unavailable. Please try again shortly." })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
