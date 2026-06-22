import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/news", async (_req, res): Promise<void> => {
  try {
    const response = await fetch("https://marichomedia.com/feed", {
      headers: { Accept: "application/rss+xml, text/xml, */*" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) { res.json([]); return; }
    const xml = await response.text();

    const items: Array<{
      title: string; link: string; description: string; pubDate: string; image: string;
    }> = [];

    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null) {
      const block = m[1];
      const title =
        (block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s) ?? [])[1]?.trim() ?? "";
      const link =
        (block.match(/<link>(https?:[^<]+)<\/link>/) ?? [])[1]?.trim() ??
        (block.match(/<guid[^>]*>(https?:[^<]+)<\/guid>/) ?? [])[1]?.trim() ?? "";
      const rawDesc =
        (block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/s) ?? [])[1] ?? "";
      const description = rawDesc
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
      const pubDate =
        (block.match(/<pubDate>(.*?)<\/pubDate>/) ?? [])[1]?.trim() ?? "";
      const image =
        (block.match(/enclosure[^>]+url="([^"]+)"/) ?? [])[1] ??
        (block.match(/<media:content[^>]+url="([^"]+)"/) ?? [])[1] ??
        (block.match(/<wp:attachment_url>(.*?)<\/wp:attachment_url>/) ?? [])[1] ?? "";
      if (title) items.push({ title, link, description, pubDate, image });
    }

    res.json(items.slice(0, 6));
  } catch {
    res.json([]);
  }
});

export { router as newsRouter };
