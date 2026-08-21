import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface MarketItem {
  id?: number;
  item?: string;
  commodity?: string;
  priceUsd?: string | null;
  price?: number;
  unit?: string;
  priceChange?: number;
  change?: number;
}

interface Card {
  id: string;
  type: "price" | "pest" | "insights";
  icon: string;
  name: string;
  price?: number;
  unit?: string;
  change?: number;
  badge?: string;
  detail?: string;
  sub?: string;
  href?: string;
}

const COMMODITY_ICONS: Record<string, string> = {
  maize: "🌽",  corn: "🌽",
  cattle: "🐄",  beef: "🐄",  livestock: "🐄",
  soybean: "🫘", soybeans: "🫘",
  wheat: "🌾",
  tobacco: "🍃",
  cotton: "🪴",
  groundnut: "🥜", groundnuts: "🥜",
  tomato: "🍅", tomatoes: "🍅",
  sugar: "🍬",
  potato: "🥔", potatoes: "🥔",
  sorghum: "🌿",
  default: "📦",
};

function getIcon(name: string): string {
  const key = name.toLowerCase().split(" ")[0];
  return COMMODITY_ICONS[key] ?? COMMODITY_ICONS.default;
}

function PriceCard({ card, animate }: { card: Card; animate?: boolean }) {
  if (card.type === "pest") {
    return (
      <div className={`shrink-0 w-[155px] rounded-2xl border p-4 flex flex-col gap-1 cursor-pointer transition-all hover:shadow-lg ${
        animate ? "animate-slide-up" : ""
      } bg-red-500/5 border-red-500/20 hover:border-red-500/40`}>
        <div className="text-[22px] mb-0.5">🐛</div>
        <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide">{card.name}</div>
        <div className="text-[#E7E9EA] font-black text-[14px] leading-tight mt-0.5">{card.detail}</div>
        <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit">
          ⚠️ {card.badge}
        </span>
        <div className="text-[#71767B] text-[10px] mt-0.5">{card.sub}</div>
      </div>
    );
  }

  if (card.type === "insights") {
    return (
      <Link href={card.href ?? "/prices"}>
        <div className={`shrink-0 w-[155px] rounded-2xl border p-4 flex flex-col gap-1 cursor-pointer transition-all hover:shadow-lg ${
          animate ? "animate-slide-up" : ""
        } bg-[#22c55e]/5 border-[#22c55e]/20 hover:border-[#22c55e]/50`}>
          <div className="text-[22px] mb-0.5">📊</div>
          <div className="text-[10px] font-bold text-[#22c55e] uppercase tracking-wide">{card.name}</div>
          <div className="text-[#E7E9EA] font-semibold text-[12px] leading-snug mt-0.5">{card.detail}</div>
          <div className="flex items-center gap-1 text-[#22c55e] text-[11px] font-bold mt-auto pt-1">
            {card.sub} <ExternalLink className="w-3 h-3" />
          </div>
        </div>
      </Link>
    );
  }

  const price = card.price ?? 0;

  return (
    <div className={`shrink-0 w-[155px] rounded-2xl border p-4 flex flex-col gap-0.5 cursor-pointer transition-all hover:shadow-lg hover:border-[#22c55e]/30 ${
      animate ? "animate-slide-up" : ""
    } bg-[#16181C] border-[#2F3336]`}>
      <div className="text-[22px] mb-0.5">{card.icon}</div>
      <div className="text-[#71767B] text-[10px] font-semibold uppercase tracking-wide">{card.name}</div>
      <div className="flex items-end gap-1 mt-1">
        <span className="text-[#E7E9EA] font-black text-[22px] leading-none">
          ${price < 10 ? price.toFixed(2) : price >= 1000 ? price.toLocaleString("en", { maximumFractionDigits: 0 }) : Math.round(price)}
        </span>
        <span className="text-[#71767B] text-[10px] mb-1">{card.unit ?? "/unit"}</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] font-bold text-[#86efac] mt-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#86efac]" />
        Verified price
      </div>
    </div>
  );
}

export function MarketPriceCarousel() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/market-prices?limit=8", { credentials: "include" })
      .then(r => r.json())
      .then((payload: { data?: MarketItem[] }) => {
        const data = Array.isArray(payload.data) ? payload.data : [];
        const priceCards: Card[] = data.length > 0
          ? data.map((item, i) => ({
              id: `price-${item.id ?? i}`,
              type: "price" as const,
              icon: getIcon(item.item ?? item.commodity ?? ""),
              name: (item.item ?? item.commodity ?? "Commodity") + " Price",
              price: item.priceUsd ? Number(item.priceUsd) : item.price ?? 0,
              unit: item.unit ? `/${item.unit}` : "/ton",
            }))
          : [];
        const extras: Card[] = [
          {
            id: "pest-alert",
            type: "pest",
            icon: "🐛",
            name: "Pest Alert",
            badge: "High risk",
            detail: "Fall Armyworm",
            sub: "Several provinces",
          },
          {
            id: "market-insights",
            type: "insights",
            icon: "📊",
            name: "Market Insights",
            detail: "Market trends, reports & more",
            sub: "View all",
            href: "/prices",
          },
        ];
        setCards([...priceCards, ...extras]);
        setLoading(false);
      })
      .catch(() => {
        setCards([
          { id: "pest-alert", type: "pest", icon: "🐛", name: "Pest Alert", badge: "High risk", detail: "Fall Armyworm", sub: "Several provinces" },
          { id: "market-insights", type: "insights", icon: "📊", name: "Market Insights", detail: "Market trends, reports & more", sub: "View all", href: "/prices" },
        ]);
        setLoading(false);
      });
  }, []);

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 340 : -340, behavior: "smooth" });
  }

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[155px] h-[110px] rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[#22c55e] text-[13px]">📈</span>
          <h2 className="text-[#E7E9EA] font-bold text-[15px]">Market Prices</h2>
        </div>
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
        {cards.map((card, i) => (
          <div key={card.id} style={{ animationDelay: `${i * 50}ms` }}>
            <PriceCard card={card} animate />
          </div>
        ))}
      </div>
    </div>
  );
}
