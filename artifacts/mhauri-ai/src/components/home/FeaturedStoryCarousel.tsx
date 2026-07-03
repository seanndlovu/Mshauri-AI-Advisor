import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NewsItem {
  title: string;
  link: string;
  excerpt: string;
  date: string;
  imageUrl: string;
}

const FALLBACK_IMG = "https://marichomedia.com/wp-content/uploads/2024/01/maricho-media-logo.jpg";

export function FeaturedStoryCarousel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/news", { credentials: "include" })
      .then(r => r.json())
      .then((d: NewsItem[]) => Array.isArray(d) && d.length > 0 && setItems(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    setProgress(0);
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % items.length);
      setProgress(0);
    }, 10000);
    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(p + 1, 100));
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [items, current]);

  function goTo(idx: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setCurrent(idx);
    setProgress(0);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-[#16181C] border border-[#2F3336] h-48 flex items-center justify-center mb-6">
        <span className="text-[#71767B] text-sm">Loading featured stories…</span>
      </div>
    );
  }

  const item = items[current];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[#E7E9EA] font-bold text-[15px]">Featured Stories</h2>
        <span className="text-[11px] text-[#71767B] font-medium uppercase tracking-wide">Maricho Newsroom</span>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-[#2F3336] group" style={{ minHeight: 220 }}>
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${item.imageUrl || FALLBACK_IMG})`,
            filter: "brightness(0.45)",
          }}
        />

        <div className="relative z-10 p-5 flex flex-col justify-end h-full" style={{ minHeight: 220 }}>
          <div className="mb-auto" />
          <div>
            <span className="inline-block bg-[#22c55e] text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wide">
              Maricho Media
            </span>
            <h3 className="text-white font-black text-[18px] leading-snug mb-1 line-clamp-2">
              {item.title}
            </h3>
            <p className="text-white/70 text-[12px] leading-relaxed line-clamp-2 mb-3">
              {item.excerpt}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-[11px]">
                {item.date ? formatDistanceToNow(new Date(item.date), { addSuffix: true }) : ""}
              </span>
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[12px] font-semibold px-3 py-1.5 rounded-full transition-all"
              >
                Read article <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {items.length > 1 && (
          <>
            <button
              onClick={() => goTo((current - 1 + items.length) % items.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => goTo((current + 1) % items.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-20 h-0.5 bg-white/10">
          <div
            className="h-full bg-[#22c55e] transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${i === current ? "w-4 h-1.5 bg-[#22c55e]" : "w-1.5 h-1.5 bg-[#2F3336] hover:bg-[#71767B]"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
