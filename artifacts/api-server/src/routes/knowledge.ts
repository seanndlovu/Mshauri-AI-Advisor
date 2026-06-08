import { Router, type IRouter } from "express";
import { eq, ilike, or, sql, desc } from "drizzle-orm";
import { db, articlesTable } from "@workspace/db";
import {
  ListArticlesQueryParams,
  CreateArticleBody,
  GetArticleParams,
  UpdateArticleParams,
  UpdateArticleBody,
  DeleteArticleParams,
  ListArticlesResponseItem,
  GetArticleResponse,
  UpdateArticleResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toResponse(a: typeof articlesTable.$inferSelect) {
  return ListArticlesResponseItem.parse({
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  });
}

router.get("/knowledge/articles", async (req, res): Promise<void> => {
  const query = ListArticlesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { category, language, search } = query.data;

  let dbQuery = db.select().from(articlesTable).$dynamic();

  const conditions = [];
  if (category) conditions.push(eq(articlesTable.category, category));
  if (language) conditions.push(eq(articlesTable.language, language as "en" | "sn" | "nd" | "all"));
  if (search) {
    conditions.push(
      or(
        ilike(articlesTable.title, `%${search}%`),
        ilike(articlesTable.content, `%${search}%`)
      )!
    );
  }

  if (conditions.length > 0) {
    const { and } = await import("drizzle-orm");
    dbQuery = dbQuery.where(and(...conditions));
  }

  const articles = await dbQuery.orderBy(desc(articlesTable.updatedAt));
  res.json(articles.map(toResponse));
});

router.get("/knowledge/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ category: articlesTable.category })
    .from(articlesTable)
    .orderBy(articlesTable.category);
  res.json(rows.map((r) => r.category));
});

router.post("/knowledge/articles", async (req, res): Promise<void> => {
  const parsed = CreateArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, content, category, tags, language, isActive } = parsed.data;

  const [article] = await db
    .insert(articlesTable)
    .values({
      title,
      content,
      category,
      tags: tags ?? [],
      language: (language as "en" | "sn" | "nd" | "all") ?? "all",
      isActive: isActive ?? true,
    })
    .returning();

  res.status(201).json(toResponse(article));
});

router.get("/knowledge/articles/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetArticleParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [article] = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.id, params.data.id));

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  res.json(GetArticleResponse.parse({
    ...article,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  }));
});

router.patch("/knowledge/articles/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateArticleParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof articlesTable.$inferInsert> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags;
  if (parsed.data.language !== undefined) updateData.language = parsed.data.language as "en" | "sn" | "nd" | "all";
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  const [article] = await db
    .update(articlesTable)
    .set(updateData)
    .where(eq(articlesTable.id, params.data.id))
    .returning();

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  res.json(UpdateArticleResponse.parse({
    ...article,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  }));
});

router.delete("/knowledge/articles/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteArticleParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(articlesTable)
    .where(eq(articlesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  res.sendStatus(204);
});

export { router as knowledgeRouter };
