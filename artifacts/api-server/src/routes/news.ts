import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface NewsItem {
  title: string;
  link: string;
  excerpt: string;
  date: string;
  imageUrl: string;
}

let _cache: { items: NewsItem[]; expires: number } | null = null;

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&#8230;/g, "\u2026")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "");
}

router.get("/news", async (_req, res): Promise<void> => {
  if (_cache && Date.now() < _cache.expires) {
    res.json(_cache.items);
    return;
  }
  try {
    const response = await fetch(
      "https://marichomedia.com/wp-json/wp/v2/posts?per_page=4&_embed=true",
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) throw new Error("API error");
    const posts = await response.json() as Record<string, unknown>[];

    const items: NewsItem[] = posts.map(post => {
      const rawTitle = (post.title as { rendered: string })?.rendered ?? "";
      const title = decodeHtml(rawTitle.replace(/<[^>]+>/g, ""));

      const rawExcerpt = (post.excerpt as { rendered: string })?.rendered ?? "";
      const excerpt = decodeHtml(
        rawExcerpt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      ).slice(0, 320);

      const embedded = post._embedded as Record<string, unknown> | undefined;
      const mediaArr = embedded?.["wp:featuredmedia"] as Record<string, unknown>[] | undefined;
      const imageUrl = (mediaArr?.[0]?.source_url as string) ?? "";

      return {
        title,
        excerpt,
        date: (post.date as string) ?? "",
        imageUrl,
        link: (post.link as string) ?? "",
      };
    });

    _cache = { items, expires: Date.now() + 30 * 60 * 1000 };
    res.json(items);
  } catch {
    res.json(_cache?.items ?? []);
  }
});

export { router as newsRouter };
