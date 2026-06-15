import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, postsTable, commentsTable, communitiesTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

/* ─── Zimbabwean animal names across all 12+ official languages ─── */
const ZW_ANIMALS = [
  // Shona (chiShona — ~70% of Zimbabwe)
  "Shumba","Nzou","Mhara","Garwe","Bveni","Mbizi","Tsuro","Bere",
  "Jongwe","Hweva","Nhewa","Chidembo","Zizi","Kamba","Hove","Nguruve",
  "Ngwe","Tsoko","Nyati","Nhengo","Gondo","Hungwe","Nganga","Nzwere",
  // isiNdebele (~20% of Zimbabwe)
  "Ibhubhesi","Indlovu","Ingwe","Impisi","Idube","Imvubu","Ingwenya",
  "Imbila","Umvundla","Isikhova","Inkunzi","Ingulube","Ubhejane","Ingqungqulu",
  // Kalanga (Bulilima-Mangwe area)
  "Gwena","Nkwe","Phiri",
  // Tonga (Zambezi Valley)
  "Nkuzu","Chikuvu","Nkanga","Chipembere",
  // Venda (Beit Bridge / Limpopo)
  "Ndou","Nngwe","Phukha","Phala","Tshikhozi",
  // Ndau (Chimanimani / Chipinge)
  "Gudo","Njuzu",
  // Nambya (Hwange area)
  "Njovu",
  // Shangani / Tsonga (south-east Zimbabwe)
  "Nghala","Mhisi","Ndzou",
  // Chewa / Nyanja (eastern Zimbabwe)
  "Mkango","Njobvu","Nyalugwe","Makaka","Mvuu","Ngona",
  // Sotho (Sesotho speakers in Zimbabwe)
  "Tau","Tlou","Nare",
  // Tswana (small community)
  "Kubu",
  // Korekore (northern Zimbabwe — Shona dialect group)
  "Nyamuzihwa","Tembo",
];

function randomAnimal(): string {
  const animal = ZW_ANIMALS[Math.floor(Math.random() * ZW_ANIMALS.length)];
  const num = 100 + Math.floor(Math.random() * 900);
  return `${animal}-${num}`;
}

function formatPost(p: typeof postsTable.$inferSelect) {
  return { ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
}

function formatComment(c: typeof commentsTable.$inferSelect) {
  return { ...c, createdAt: c.createdAt.toISOString() };
}

router.get("/posts", async (req, res): Promise<void> => {
  const sort = (req.query.sort as string) ?? "new";
  const type = req.query.type as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const offset = parseInt(req.query.offset as string) || 0;

  const conditions = type ? eq(postsTable.type, type as typeof postsTable.$inferSelect["type"]) : undefined;

  const posts = await (sort === "top"
    ? db.select().from(postsTable).where(conditions).orderBy(desc(postsTable.upvotes)).limit(limit).offset(offset)
    : db.select().from(postsTable).where(conditions).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset)
  );

  res.json(posts.map(formatPost));
});

router.post("/posts", async (req, res): Promise<void> => {
  const userId = req.session?.userId ?? null;
  const { communityId, type, title, content, location, imageUrl } = req.body as {
    communityId: number;
    type: string;
    title: string;
    content: string;
    location?: string;
    imageUrl?: string;
  };

  if (!communityId || !title || !content) {
    res.status(400).json({ error: "communityId, title and content are required" });
    return;
  }

  const authorName = randomAnimal();

  const validTypes = ["question", "disease_report", "market_price", "opportunity", "success_story", "weather"] as const;
  const safeType = validTypes.includes(type as typeof validTypes[number]) ? (type as typeof validTypes[number]) : "question";

  const [post] = await db.insert(postsTable).values({
    userId,
    communityId,
    type: safeType,
    title,
    content,
    location: location ?? null,
    imageUrl: imageUrl ?? null,
    authorName,
  }).returning();

  await db.update(communitiesTable).set({ postCount: sql`post_count + 1` }).where(eq(communitiesTable.id, communityId));

  res.status(201).json(formatPost(post));
});

router.get("/posts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  res.json(formatPost(post));
});

router.delete("/posts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const userId = req.session?.userId;
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  if (post.userId !== userId) { res.status(403).json({ error: "Not authorized" }); return; }

  await db.delete(postsTable).where(eq(postsTable.id, id));
  res.sendStatus(204);
});

router.post("/posts/:id/vote", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { value } = req.body as { value: 1 | -1 };
  if (value === 1) {
    await db.update(postsTable).set({ upvotes: sql`upvotes + 1` }).where(eq(postsTable.id, id));
  } else {
    await db.update(postsTable).set({ downvotes: sql`downvotes + 1` }).where(eq(postsTable.id, id));
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
  res.json(formatPost(post));
});

router.get("/posts/:id/comments", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const comments = await db.select().from(commentsTable).where(eq(commentsTable.postId, id)).orderBy(desc(commentsTable.createdAt));
  res.json(comments.map(formatComment));
});

router.post("/posts/:id/comments", async (req, res): Promise<void> => {
  const postId = parseInt(req.params.id, 10);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const userId = req.session?.userId ?? null;
  const { content } = req.body as { content: string };
  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

  const authorName = randomAnimal();

  const [comment] = await db.insert(commentsTable).values({ postId, userId, content, authorName }).returning();
  await db.update(postsTable).set({ commentCount: sql`comment_count + 1` }).where(eq(postsTable.id, postId));

  res.status(201).json(formatComment(comment));
});

export { router as postsRouter };
