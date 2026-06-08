import OpenAI from "openai";
import { logger } from "./logger";

const SEARCH_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function searchMarichoArticles(query: string): Promise<string> {
  try {
    const url = `https://maricho.co.zw/v1/search?q=${encodeURIComponent(query)}&limit=3`;
    const res = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return "";

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || data.length === 0) return "";

    const articles = data
      .slice(0, 3)
      .map((a: Record<string, unknown>, i: number) => {
        const title = String(a.title ?? a.name ?? "Article");
        const excerpt = String(a.excerpt ?? a.content ?? a.description ?? "").slice(0, 600);
        return `[Maricho ${i + 1}: ${title}]\n${excerpt}`;
      })
      .join("\n\n");

    return `\n\n--- MARICHO MEDIA ARTICLES ---\n${articles}\n--- END MARICHO ---`;
  } catch (err) {
    logger.warn({ err }, "Maricho live search failed");
    return "";
  }
}

export async function perplexityResearch(query: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return "";

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.perplexity.ai",
    });

    const completion = await client.chat.completions.create({
      model: "llama-3.1-sonar-small-128k-online",
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant for Mshauri AI, an agricultural assistant for Zimbabwe. Provide concise, factual, up-to-date agricultural information relevant to Zimbabwe and Southern Africa.",
        },
        {
          role: "user",
          content: `Find current information relevant to this Zimbabwean farmer query: ${query}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    if (!content) return "";

    return `\n\n--- PERPLEXITY RESEARCH (live) ---\n${content.slice(0, 600)}\n--- END PERPLEXITY ---`;
  } catch (err) {
    logger.warn({ err }, "Perplexity research failed");
    return "";
  }
}
