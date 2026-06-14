import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, communitiesTable, postsTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/communities", async (req, res): Promise<void> => {
  const communities = await db.select().from(communitiesTable).orderBy(desc(communitiesTable.postCount));
  res.json(communities);
});

router.get("/communities/:slug", async (req, res): Promise<void> => {
  const [community] = await db.select().from(communitiesTable).where(eq(communitiesTable.slug, req.params.slug)).limit(1);
  if (!community) {
    res.status(404).json({ error: "Community not found" });
    return;
  }
  res.json(community);
});

router.get("/communities/:slug/posts", async (req, res): Promise<void> => {
  const [community] = await db.select().from(communitiesTable).where(eq(communitiesTable.slug, req.params.slug)).limit(1);
  if (!community) {
    res.status(404).json({ error: "Community not found" });
    return;
  }

  const sort = (req.query.sort as string) ?? "new";
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const offset = parseInt(req.query.offset as string) || 0;

  let query = db.select().from(postsTable).where(eq(postsTable.communityId, community.id));

  const posts = await (sort === "top"
    ? db.select().from(postsTable).where(eq(postsTable.communityId, community.id)).orderBy(desc(postsTable.upvotes)).limit(limit).offset(offset)
    : db.select().from(postsTable).where(eq(postsTable.communityId, community.id)).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset)
  );

  res.json(posts.map(formatPost));
});

function formatPost(p: typeof postsTable.$inferSelect) {
  return { ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
}

export { router as communitiesRouter };
