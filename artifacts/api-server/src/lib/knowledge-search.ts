import { ilike, eq, or, and } from "drizzle-orm";
import { db, articlesTable } from "@workspace/db";

/**
 * Finds the most relevant active knowledge base articles for a given query.
 * Uses simple keyword matching against title and content.
 * Returns up to maxResults articles, formatted for injection into AI context.
 */
export async function findRelevantArticles(
  query: string,
  language: "en" | "sn" | "nd" | "all" = "all",
  maxResults = 3
): Promise<string> {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);

  if (words.length === 0) return "";

  const languageFilter =
    language === "all"
      ? eq(articlesTable.isActive, true)
      : and(
          eq(articlesTable.isActive, true),
          or(
            eq(articlesTable.language, language),
            eq(articlesTable.language, "all")
          )
        );

  const keywordConditions = words.map((word) =>
    or(
      ilike(articlesTable.title, `%${word}%`),
      ilike(articlesTable.content, `%${word}%`)
    )
  );

  const { or: drizzleOr } = await import("drizzle-orm");

  const articles = await db
    .select({
      title: articlesTable.title,
      content: articlesTable.content,
      category: articlesTable.category,
    })
    .from(articlesTable)
    .where(and(languageFilter!, drizzleOr(...keywordConditions)!))
    .limit(maxResults);

  if (articles.length === 0) return "";

  const formatted = articles
    .map(
      (a, i) =>
        `[Reference ${i + 1}: ${a.title} (${a.category})]\n${a.content.slice(0, 800)}${a.content.length > 800 ? "..." : ""}`
    )
    .join("\n\n");

  return `\n\n--- KNOWLEDGE BASE REFERENCES ---\nThe following articles from the Mhauri AI knowledge base are relevant to this question. Use them to provide accurate, specific advice:\n\n${formatted}\n--- END REFERENCES ---`;
}
