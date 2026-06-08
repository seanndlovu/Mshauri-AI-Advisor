import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, broadcastsTable, farmersTable, analyticsEventsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

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
    logger.error({ status: response.status, err, to }, "Broadcast send failed for recipient");
    throw new Error(`WhatsApp API error: ${response.status}`);
  }
}

function formatBroadcast(b: typeof broadcastsTable.$inferSelect) {
  return {
    ...b,
    sentAt: b.sentAt ? b.sentAt.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/broadcasts", async (req, res): Promise<void> => {
  const broadcasts = await db
    .select()
    .from(broadcastsTable)
    .orderBy(desc(broadcastsTable.createdAt));
  res.json(broadcasts.map(formatBroadcast));
});

router.post("/broadcasts", async (req, res): Promise<void> => {
  const body = req.body as { message: string };
  if (!body.message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const activeFarmers = await db
    .select({ phone: farmersTable.phone })
    .from(farmersTable)
    .where(eq(farmersTable.isActive, true));

  const [broadcast] = await db
    .insert(broadcastsTable)
    .values({
      message: body.message,
      status: "sending",
      recipientCount: activeFarmers.length,
    })
    .returning();

  res.status(201).json(formatBroadcast(broadcast));

  // Fire-and-forget: send to all active farmers
  (async () => {
    let failed = 0;
    for (const farmer of activeFarmers) {
      try {
        await sendWhatsAppMessage(farmer.phone, body.message);
      } catch {
        failed++;
      }
    }

    const finalStatus = failed === activeFarmers.length && activeFarmers.length > 0 ? "failed" : "sent";
    await db
      .update(broadcastsTable)
      .set({ status: finalStatus, sentAt: new Date() })
      .where(eq(broadcastsTable.id, broadcast.id));

    await db.insert(analyticsEventsTable).values({
      eventType: "broadcast_sent",
      messagePreview: body.message.slice(0, 100),
    });

    logger.info(
      { broadcastId: broadcast.id, recipients: activeFarmers.length, failed },
      "Broadcast complete"
    );
  })();
});

export { router as broadcastsRouter };
