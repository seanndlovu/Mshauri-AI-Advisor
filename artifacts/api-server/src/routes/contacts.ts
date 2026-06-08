import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, contactsTable, farmersTable, conversationsTable } from "@workspace/db";

const router: IRouter = Router();

/* ── Anonymise helpers ───────────────────────────────────── */

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6) return raw;
  const prefix = raw.startsWith("+") ? "+" : "";
  const cc = digits.slice(0, digits.length - 9);
  const show = digits.slice(-4);
  return `${prefix}${cc} ${"•".repeat(3)} ${"•".repeat(3)} ${show}`;
}

function maskEmail(raw: string): string {
  const [local, domain] = raw.split("@");
  if (!domain) return raw;
  const [dname, ...dext] = domain.split(".");
  const maskedLocal = local.length <= 2 ? `${local[0]}•••` : `${local[0]}${"•".repeat(Math.min(local.length - 1, 3))}`;
  const maskedDomain = `${dname[0]}${"•".repeat(Math.min(dname.length - 1, 3))}.${dext.join(".")}`;
  return `${maskedLocal}@${maskedDomain}`;
}

/* ── GET /contacts ───────────────────────────────────────── */

router.get("/contacts", async (_req, res): Promise<void> => {
  // 1. Explicit contacts from the contacts table
  const stored = await db.select().from(contactsTable).orderBy(desc(contactsTable.createdAt));

  // 2. WhatsApp numbers from farmers table (auto-collected via WhatsApp bot)
  const farmers = await db.select({ phone: farmersTable.phone, createdAt: farmersTable.createdAt }).from(farmersTable);

  // 3. Any extra phone numbers from conversations not already in farmers
  const convPhones = await db
    .selectDistinct({ phone: conversationsTable.whatsappPhone, createdAt: conversationsTable.createdAt })
    .from(conversationsTable)
    .where(eq(conversationsTable.whatsappPhone, conversationsTable.whatsappPhone));

  // Build deduped set — stored contacts take precedence
  const storedValues = new Set(stored.map((c) => c.value));

  const farmerContacts = farmers
    .filter((f) => !storedValues.has(f.phone))
    .map((f) => ({
      id: null as null,
      type: "whatsapp" as const,
      value: f.phone,
      display: maskPhone(f.phone),
      label: null as string | null,
      createdAt: f.createdAt.toISOString(),
      source: "whatsapp_bot",
    }));

  const convSet = new Set([...stored.map((c) => c.value), ...farmers.map((f) => f.phone)]);
  const convContacts = convPhones
    .filter((c) => c.phone && !convSet.has(c.phone!))
    .map((c) => ({
      id: null as null,
      type: "whatsapp" as const,
      value: c.phone!,
      display: maskPhone(c.phone!),
      label: null as string | null,
      createdAt: c.createdAt.toISOString(),
      source: "web_conversation",
    }));

  const storedMapped = stored.map((c) => ({
    id: c.id,
    type: c.type as "whatsapp" | "email",
    value: c.value,
    display: c.type === "email" ? maskEmail(c.value) : maskPhone(c.value),
    label: c.label,
    createdAt: c.createdAt.toISOString(),
    source: "manual",
  }));

  const all = [...storedMapped, ...farmerContacts, ...convContacts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json(all);
});

/* ── POST /contacts/email ────────────────────────────────── */

router.post("/contacts/email", async (req, res): Promise<void> => {
  const { email, label } = req.body as { email?: string; label?: string };

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  try {
    const [contact] = await db
      .insert(contactsTable)
      .values({ type: "email", value: email.toLowerCase().trim(), label: label || null })
      .onConflictDoNothing()
      .returning();

    if (!contact) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    res.status(201).json({
      id: contact.id,
      type: contact.type,
      display: maskEmail(contact.value),
      label: contact.label,
      createdAt: contact.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to save contact" });
  }
});

/* ── POST /contacts/whatsapp ─────────────────────────────── */

router.post("/contacts/whatsapp", async (req, res): Promise<void> => {
  const { phone, label } = req.body as { phone?: string; label?: string };

  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "phone is required" });
    return;
  }

  try {
    const [contact] = await db
      .insert(contactsTable)
      .values({ type: "whatsapp", value: phone.trim(), label: label || null })
      .onConflictDoNothing()
      .returning();

    if (!contact) {
      res.status(409).json({ error: "Phone already registered" });
      return;
    }

    res.status(201).json({
      id: contact.id,
      type: contact.type,
      display: maskPhone(contact.value),
      label: contact.label,
      createdAt: contact.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to save contact" });
  }
});

export { router as contactsRouter };
