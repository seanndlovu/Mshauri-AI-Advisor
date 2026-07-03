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

const WATERMARKS = ["🌿", "🌾", "🌽", "🐄", "🌱", "☀️", "🌳"];

function GreenOverlay({ watermark }: { watermark: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(140deg, #091409 0%, #152815 45%, #0c200c 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        position: "absolute", bottom: -30, right: -20,
        width: 220, height: 220,
        background: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: -20, left: -20,
        width: 140, height: 140,
        background: "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />
      <div style={{
        fontSize: 100, opacity: 0.14, lineHeight: 1,
        filter: "drop-shadow(0 0 20px rgba(34,197,94,0.5))",
        transform: "rotate(-10deg)",
        userSelect: "none",
      }}>
        {watermark}
      </div>
    </div>
  );
}

export function FeaturedStoryCarousel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
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
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
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
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#E7E9EA] font-bold text-[15px]">Featured Stories</h2>
          <span className="text-[11px] text-[#71767B] font-medium uppercase tracking-wide">Maricho Newsroom</span>
        </div>
        <div
          className="rounded-2xl border border-[#2F3336] overflow-hidden"
          style={{ minHeight: 220, position: "relative" }}
        >
          <GreenOverlay watermark="🌿" />
          <div style={{ position: "relative", zIndex: 10, padding: 20, minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <span style={{ color: "#7aad80", fontSize: 12 }}>Loading featured stories…</span>
          </div>
        </div>
      </div>
    );
  }

  const item = items[current];
  const showOverlay = !item.imageUrl || imgErrors.has(current);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[#E7E9EA] font-bold text-[15px]">Featured Stories</h2>
        <span className="text-[11px] text-[#71767B] font-medium uppercase tracking-wide">Maricho Newsroom</span>
      </div>

      <div
        className="relative rounded-2xl overflow-hidden border border-[#2F3336] group"
        style={{ minHeight: 220 }}
      >
        {/* Background: real image OR green overlay */}
        {showOverlay ? (
          <GreenOverlay watermark={WATERMARKS[current % WATERMARKS.length]} />
        ) : (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700"
              style={{ backgroundImage: `url(${item.imageUrl})`, filter: "brightness(0.40)" }}
            />
            {/* Hidden img to detect load errors */}
            <img
              src={item.imageUrl}
              alt=""
              style={{ display: "none" }}
              onError={() => setImgErrors(prev => new Set([...prev, current]))}
            />
          </>
        )}

        {/* Dark gradient overlay for text readability */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
          zIndex: 5,
        }} />

        {/* Content */}
        <div className="relative z-10 p-5 flex flex-col justify-end" style={{ minHeight: 220 }}>
          <div className="mb-auto" />
          <div>
            <span style={{
              display: "inline-block",
              background: "#22c55e",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 10px",
              borderRadius: 999,
              marginBottom: 8,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>
              Maricho Media
            </span>
            <h3 style={{ color: "#fff", fontWeight: 900, fontSize: 17, lineHeight: 1.35, marginBottom: 4,
                         display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>
              {item.title}
            </h3>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 1.6, marginBottom: 12,
                        display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>
              {item.excerpt}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
                {item.date ? formatDistanceToNow(new Date(item.date), { addSuffix: true }) : ""}
              </span>
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.45)",
                  color: "#22c55e", fontSize: 12, fontWeight: 700,
                  padding: "6px 14px", borderRadius: 999, textDecoration: "none",
                  backdropFilter: "blur(4px)", transition: "all 0.2s",
                }}
              >
                Read article <ExternalLink style={{ width: 12, height: 12 }} />
              </a>
            </div>
          </div>
        </div>

        {/* Prev/Next arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={() => goTo((current - 1 + items.length) % items.length)}
              style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", zIndex: 20,
                width: 32, height: 32, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff", opacity: 0, transition: "opacity 0.2s",
              }}
              className="group-hover:!opacity-100"
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
            <button
              onClick={() => goTo((current + 1) % items.length)}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", zIndex: 20,
                width: 32, height: 32, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff", opacity: 0, transition: "opacity 0.2s",
              }}
              className="group-hover:!opacity-100"
            >
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </>
        )}

        {/* Progress bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, height: 2, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ height: "100%", background: "#22c55e", width: `${progress}%`, transition: "none" }} />
        </div>
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}>
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                borderRadius: 999, border: "none", cursor: "pointer", padding: 0,
                width: i === current ? 16 : 6, height: 6,
                background: i === current ? "#22c55e" : "#2F3336",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
