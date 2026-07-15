import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface ZmxPost {
  id: number;
  title: string;
  link: string;
  date: string;
}

let _cache: { items: ZmxPost[]; expires: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&#8230;/g, "\u2026")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

router.get("/zmx/feed", async (req, res): Promise<void> => {
  if (_cache && Date.now() < _cache.expires) {
    res.json(_cache.items);
    return;
  }

  try {
    const response = await fetch(
      "https://zmx.co.zw/wp-json/wp/v2/posts?per_page=6&_fields=id,title,link,date&orderby=date&order=desc",
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) {
      throw new Error(`ZMX API returned ${response.status}`);
    }

    const raw = (await response.json()) as Array<{
      id: number;
      title: { rendered: string };
      link: string;
      date: string;
    }>;

    const items: ZmxPost[] = raw.map((p) => ({
      id: p.id,
      title: decodeHtml(p.title.rendered),
      link: p.link,
      date: p.date,
    }));

    _cache = { items, expires: Date.now() + CACHE_TTL_MS };
    res.json(items);
  } catch (err) {
    req.log.warn({ err }, "ZMX feed fetch failed");
    if (_cache) {
      res.json(_cache.items);
      return;
    }
    res.status(502).json({ error: "ZMX feed unavailable" });
  }
});

export { router as zmxRouter };
