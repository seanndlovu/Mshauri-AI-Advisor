import { ilike, eq, or, and } from "drizzle-orm";
import { db, articlesTable } from "@workspace/db";
import { searchMarichoArticles, perplexityResearch } from "./live-search";

/**
 * Finds relevant articles from the DB knowledge base by keyword matching.
 * Also calls live sources (Maricho search API, Perplexity) if available.
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

  const [dbContext, marichoContext, perplexityContext] = await Promise.all([
    words.length > 0 ? searchDbArticles(words, language, maxResults) : Promise.resolve(""),
    searchMarichoArticles(query),
    perplexityResearch(query),
  ]);

  const combined = [dbContext, marichoContext, perplexityContext].filter(Boolean).join("");
  return combined;
}

async function searchDbArticles(
  words: string[],
  language: "en" | "sn" | "nd" | "all",
  maxResults: number
): Promise<string> {
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

  return `\n\n--- KNOWLEDGE BASE REFERENCES ---\nThe following articles from the Mshauri AI knowledge base are relevant to this question. Use them to provide accurate, specific advice:\n\n${formatted}\n--- END REFERENCES ---`;
}
