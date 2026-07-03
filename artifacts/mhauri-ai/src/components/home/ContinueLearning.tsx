import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LearningItem {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  meta: string;
  href: string;
  watermark: string;
}

const ITEMS: LearningItem[] = [
  {
    id: "mag-13",
    tag: "Magazine",
    tagColor: "#22c55e",
    title: "Maricho Magazine May 2026",
    meta: "8 min read",
    href: "https://www.wpdm.com/package_download/wpdmdl=1309/",
    watermark: "🌿",
  },
  {
    id: "podcast-23",
    tag: "Podcast",
    tagColor: "#22c55e",
    title: "The Agriculture Update Episode 23",
    meta: "⏱ 24 min",
    href: "https://marichomedia.com",
    watermark: "🎙️",
  },
  {
    id: "ca-pdf",
    tag: "Report",
    tagColor: "#22c55e",
    title: "Climate Smart Agriculture in SADC Region",
    meta: "PDF · 2.4 MB",
    href: "https://marichomedia.com",
    watermark: "☀️",
  },
  {
    id: "faw-pdf",
    tag: "Research",
    tagColor: "#22c55e",
    title: "Drought Tolerant Maize Varieties in Zimbabwe",
    meta: "PDF · 1.8 MB",
    href: "https://marichomedia.com",
    watermark: "🌽",
  },
  {
    id: "armyworm-vid",
    tag: "Video",
    tagColor: "#22c55e",
    title: "How to Identify and Control Armyworm",
    meta: "▶ 5:36",
    href: "https://marichomedia.com",
    watermark: "🐛",
  },
  {
    id: "ag-ep23",
    tag: "Podcast",
    tagColor: "#22c55e",
    title: "The Agriculture Update Episode 22",
    meta: "⏱ 31 min",
    href: "https://marichomedia.com",
    watermark: "🌾",
  },
  {
    id: "mag-12",
    tag: "Magazine",
    tagColor: "#22c55e",
    title: "Maricho Magazine Issue 12",
    meta: "6 min read",
    href: "https://www.wpdm.com/package_download/wpdmdl=1305/",
    watermark: "📖",
  },
  {
    id: "soil-guide",
    tag: "Free PDF",
    tagColor: "#22c55e",
    title: "Soil Health Guide for Zimbabwean Farmers",
    meta: "PDF · 1.1 MB",
    href: "https://marichomedia.com",
    watermark: "🌱",
  },
];

export function ContinueLearning() {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 340 : -340, behavior: "smooth" });
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[#E7E9EA] font-bold text-[15px]">Continue Learning</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-full bg-[#16181C] border border-[#2F3336] flex items-center justify-center hover:bg-[#272729] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[#71767B]" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-full bg-[#16181C] border border-[#2F3336] flex items-center justify-center hover:bg-[#272729] transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 text-[#71767B]" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {ITEMS.map((item, idx) => (
          <a
            key={item.id}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 w-[160px] rounded-2xl overflow-hidden group cursor-pointer transition-all hover:scale-[1.03] hover:shadow-xl"
            style={{ textDecoration: "none" }}
          >
            {/* Card image area — dark forest green with watermark */}
            <div
              style={{
                position: "relative",
                height: 110,
                background: `linear-gradient(140deg, #0a1a0a 0%, #162416 45%, #0d2010 100%)`,
                overflow: "hidden",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                padding: "10px 10px 0",
              }}
            >
              {/* Decorative glow blob */}
              <div style={{
                position: "absolute", bottom: -20, right: -20,
                width: 90, height: 90,
                background: "radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)",
                borderRadius: "50%",
                pointerEvents: "none",
              }} />
              {/* Large watermark emoji */}
              <div style={{
                position: "absolute", bottom: -4, right: 4,
                fontSize: 56, opacity: 0.18, lineHeight: 1,
                transform: "rotate(-8deg)",
                filter: "drop-shadow(0 0 8px rgba(34,197,94,0.4))",
                userSelect: "none",
                pointerEvents: "none",
              }}>
                {item.watermark}
              </div>
              {/* Tag badge */}
              <span style={{
                background: "rgba(34,197,94,0.18)",
                border: "1px solid rgba(34,197,94,0.35)",
                color: "#22c55e",
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                backdropFilter: "blur(4px)",
              }}>
                {item.tag}
              </span>
            </div>

            {/* Card content */}
            <div style={{
              background: "#0f1e0f",
              borderTop: "1px solid rgba(34,197,94,0.12)",
              padding: "10px 10px 12px",
            }}>
              <p style={{
                color: "#e8f5e9",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.45,
                marginBottom: 6,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}>
                {item.title}
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#7aad80", fontSize: 10, fontWeight: 500 }}>
                  {item.meta}
                </span>
                <span style={{ fontSize: 14 }}>🔖</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
