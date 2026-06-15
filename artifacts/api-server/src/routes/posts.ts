import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, postsTable, commentsTable, communitiesTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

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
  const { communityId, type, title, content, location } = req.body as {
    communityId: number;
    type: string;
    title: string;
    content: string;
    location?: string;
  };

  if (!communityId || !title || !content) {
    res.status(400).json({ error: "communityId, title and content are required" });
    return;
  }

  let authorName = "anonymous";
  if (userId) {
    const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) authorName = user.email.split("@")[0];
  }

  const validTypes = ["question", "disease_report", "market_price", "opportunity", "success_story", "weather"] as const;
  const safeType = validTypes.includes(type as typeof validTypes[number]) ? (type as typeof validTypes[number]) : "question";

  const [post] = await db.insert(postsTable).values({
    userId,
    communityId,
    type: safeType,
    title,
    content,
    location: location ?? null,
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

  let authorName = "anonymous";
  if (userId) {
    const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) authorName = user.email.split("@")[0];
  }

  const [comment] = await db.insert(commentsTable).values({ postId, userId, content, authorName }).returning();
  await db.update(postsTable).set({ commentCount: sql`comment_count + 1` }).where(eq(postsTable.id, postId));

  res.status(201).json(formatComment(comment));
});

export { router as postsRouter };
