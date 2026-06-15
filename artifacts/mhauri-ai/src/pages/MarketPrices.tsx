import { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, ExternalLink, TrendingUp, Plus, Loader2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

/* ── Types ── */
interface LivePrice {
  item: string;
  quantity: string;
  priceUsd: number;
  priceZig: number;
  category: string;
  source: "zimpricecheck";
}

interface LiveResponse {
  data: LivePrice[];
  fetchedAt: string;
  cached: boolean;
  stale?: boolean;
}

/* ── Helpers ── */
const CATEGORIES = ["All", "Vegetables", "Fruits", "Grains & Staples", "Protein", "Dried & Processed"];

const CAT_COLORS: Record<string, string> = {
  "Vegetables":        "bg-green-500/15 text-green-400 border-green-500/30",
  "Fruits":            "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Grains & Staples":  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "Protein":           "bg-red-500/15 text-red-400 border-red-500/30",
  "Dried & Processed": "bg-amber-600/15 text-amber-400 border-amber-500/30",
};

const CAT_EMOJI: Record<string, string> = {
  "Vegetables": "🥬", "Fruits": "🍊", "Grains & Staples": "🌽",
  "Protein": "🥩", "Dried & Processed": "🫙",
};

function getEmoji(item: string): string {
  const l = item.toLowerCase();
  if (/apple/.test(l)) return "🍎";
  if (/avocado/.test(l)) return "🥑";
  if (/banana/.test(l)) return "🍌";
  if (/beetroot/.test(l)) return "🫀";
  if (/broccoli/.test(l)) return "🥦";
  if (/broiler|chicken/.test(l)) return "🐔";
  if (/butternut|pumpkin/.test(l)) return "🎃";
  if (/baby marrow/.test(l)) return "🥒";
  if (/mushroom/.test(l)) return "🍄";
  if (/cabbage|covo|rape|blackjack/.test(l)) return "🥬";
  if (/carrot/.test(l)) return "🥕";
  if (/cauliflower/.test(l)) return "🥦";
  if (/chili|pepper/.test(l)) return "🌶️";
  if (/green pepper/.test(l)) return "🫑";
  if (/groundnut|nzungu/.test(l)) return "🥜";
  if (/cucumber/.test(l)) return "🥒";
  if (/egg/.test(l)) return "🥚";
  if (/garlic/.test(l)) return "🧄";
  if (/ginger/.test(l)) return "🫚";
  if (/green bean|peas|nyemba|cow pea/.test(l)) return "🫘";
  if (/maize|corn|mapfunde|mumhare/.test(l)) return "🌽";
  if (/lemon/.test(l)) return "🍋";
  if (/lettuce/.test(l)) return "🥬";
  if (/mopane/.test(l)) return "🐛";
  if (/millet|mhunga/.test(l)) return "🌾";
  if (/sorghum/.test(l)) return "🌾";
  if (/rice/.test(l)) return "🍚";
  if (/kapenta|matemba/.test(l)) return "🐟";
  if (/guinea|hanga/.test(l)) return "🐓";
  if (/roadrunner/.test(l)) return "🐓";
  if (/layer/.test(l)) return "🐔";
  if (/masawu|matohwe|mauyu|sour fruit|snot apple|baobab/.test(l)) return "🌿";
  if (/onion/.test(l)) return "🧅";
  if (/orange/.test(l)) return "🍊";
  if (/pawpaw|papaya/.test(l)) return "🍈";
  if (/pineapple/.test(l)) return "🍍";
  if (/potato/.test(l)) return "🥔";
  if (/strawberry/.test(l)) return "🍓";
  if (/soya/.test(l)) return "🫘";
  if (/sugar bean/.test(l)) return "🫘";
  if (/tomato/.test(l)) return "🍅";
  if (/watermelon/.test(l)) return "🍉";
  if (/okra/.test(l)) return "🌿";
  if (/sugarcane/.test(l)) return "🎋";
  if (/dried/.test(l)) return "🫙";
  return "🌿";
}

/* ── Price Card ── */
function PriceCard({ price }: { price: LivePrice }) {
  const catStyle = CAT_COLORS[price.category] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30";
  return (
    <div className="bg-[#1e2025] border border-[#343536] rounded-xl p-4 hover:border-[#818384]/40 hover:bg-[#23272c] transition-all group flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl leading-none">{getEmoji(price.item)}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catStyle} whitespace-nowrap`}>
          {price.category}
        </span>
      </div>
      <div>
        <div className="text-[#d7dadc] font-bold text-[13px] leading-snug">{price.item}</div>
        <div className="text-[#818384] text-[11px] mt-0.5">{price.quantity}</div>
      </div>
      <div className="border-t border-[#343536] pt-2 mt-auto">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[#22c55e] font-black text-[18px] leading-none">
              ${price.priceUsd.toFixed(2)}
            </div>
            {price.priceZig > 0 && (
              <div className="text-[#818384] text-[11px] mt-0.5">
                {price.priceZig.toLocaleString()} ZiG
              </div>
            )}
          </div>
          <div className="text-[10px] text-[#4a5568]">Mbare</div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function MarketPrices() {
  const { toast } = useToast();
  const [liveData, setLiveData] = useState<LivePrice[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showCatMenu, setShowCatMenu] = useState(false);

  async function fetchLive(force = false) {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const r = await fetch(`/api/market-prices/live${force ? "?force=1" : ""}`);
      if (!r.ok) throw new Error("Failed");
      const json: LiveResponse = await r.json();
      setLiveData(json.data);
      setFetchedAt(json.fetchedAt);
      if (force) toast({ title: "Prices refreshed ✓", description: `${json.data.length} items updated.` });
    } catch {
      setError(true);
      if (force) toast({ title: "Refresh failed", description: "Could not fetch latest prices.", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchLive(); }, []);

  const filtered = useMemo(() => {
    let items = liveData;
    if (category !== "All") items = items.filter(p => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(p => p.item.toLowerCase().includes(q) || p.quantity.toLowerCase().includes(q));
    }
    return items;
  }, [liveData, category, search]);

  const stats = useMemo(() => {
    const byCategory: Record<string, number> = {};
    for (const p of liveData) byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
    return byCategory;
  }, [liveData]);

  const timeAgo = fetchedAt ? format(new Date(fetchedAt), "d MMM, h:mm a") : null;

  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1b]">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#1a1a1b]/95 backdrop-blur-sm border-b border-[#343536] px-4 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-[#d7dadc] font-black text-[18px] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#22c55e]" />
                Market Prices
              </h1>
              {timeAgo && (
                <p className="text-[#818384] text-[11px]">
                  Last updated {timeAgo} · Mbare Musika
                </p>
              )}
            </div>
            <button
              onClick={() => fetchLive(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#272729] hover:bg-[#2d2e30] border border-[#343536] rounded-full text-[#818384] hover:text-[#d7dadc] text-[12px] font-bold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#272729] border border-[#343536] rounded-full px-3 py-2">
              <Search className="w-4 h-4 text-[#818384] shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tomatoes, maize, eggs…"
                className="flex-1 bg-transparent text-[#d7dadc] text-[13px] placeholder-[#4a5568] focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-[#818384] hover:text-[#d7dadc] text-lg leading-none">×</button>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowCatMenu(o => !o)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#272729] border border-[#343536] rounded-full text-[#d7dadc] text-[12px] font-bold whitespace-nowrap transition-colors hover:bg-[#2d2e30]"
              >
                {CAT_EMOJI[category] ?? "🌿"} {category}
                <ChevronDown className={`w-3 h-3 transition-transform ${showCatMenu ? "rotate-180" : ""}`} />
              </button>
              {showCatMenu && (
                <div className="absolute right-0 top-full mt-1 bg-[#1e2025] border border-[#343536] rounded-xl shadow-xl z-20 min-w-[180px] overflow-hidden py-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setCategory(cat); setShowCatMenu(false); }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-[12px] font-bold text-left hover:bg-[#272729] transition-colors ${category === cat ? "text-[#22c55e]" : "text-[#d7dadc]"}`}
                    >
                      <span>{CAT_EMOJI[cat] ?? "🌿"} {cat}</span>
                      {cat !== "All" && stats[cat] && (
                        <span className="text-[#818384] font-normal">{stats[cat]}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">

        {/* Category pills (desktop) */}
        <div className="hidden sm:flex gap-2 mb-5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all ${
                category === cat
                  ? "bg-[#22c55e]/15 border-[#22c55e]/50 text-[#22c55e]"
                  : "bg-[#1e2025] border-[#343536] text-[#818384] hover:text-[#d7dadc] hover:border-[#818384]/40"
              }`}
            >
              {CAT_EMOJI[cat] ?? "🌿"} {cat}
              {cat !== "All" && stats[cat] ? <span className="opacity-60">{stats[cat]}</span> : null}
            </button>
          ))}
        </div>

        {/* Data source banner */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <a
            href="https://zimpricecheck.com/price-updates/fruit-and-vegetable-prices/"
            target="_blank" rel="noreferrer"
            className="flex-1 min-w-[200px] flex items-center gap-3 bg-[#1e2025] border border-[#343536] hover:border-[#22c55e]/40 rounded-xl px-4 py-3 transition-colors group"
          >
            <span className="text-2xl">🛒</span>
            <div className="flex-1 min-w-0">
              <div className="text-[#d7dadc] font-bold text-[13px] group-hover:text-[#22c55e] transition-colors">ZimPriceCheck</div>
              <div className="text-[#818384] text-[11px]">Mbare Musika — {liveData.length} items live</div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#818384] shrink-0" />
          </a>
          <a
            href="https://zmx.co.zw/market-data/"
            target="_blank" rel="noreferrer"
            className="flex-1 min-w-[200px] flex items-center gap-3 bg-[#1e2025] border border-[#343536] hover:border-[#22c55e]/40 rounded-xl px-4 py-3 transition-colors group"
          >
            <span className="text-2xl">📊</span>
            <div className="flex-1 min-w-0">
              <div className="text-[#d7dadc] font-bold text-[13px] group-hover:text-[#22c55e] transition-colors">ZMX Exchange</div>
              <div className="text-[#818384] text-[11px]">Zimbabwe Mercantile Exchange · Live futures</div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#818384] shrink-0" />
          </a>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-[#22c55e] animate-spin" />
            <p className="text-[#818384] text-[13px]">Fetching latest prices from Mbare Musika…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <span className="text-4xl">😕</span>
            <div>
              <p className="text-[#d7dadc] font-bold mb-1">Could not load prices</p>
              <p className="text-[#818384] text-[13px] mb-4">Check your connection and try again.</p>
              <button
                onClick={() => fetchLive(true)}
                className="px-5 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold rounded-full text-[13px] transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-4xl">🔍</span>
            <p className="text-[#818384] text-[13px]">No items match "{search}"</p>
            <button onClick={() => { setSearch(""); setCategory("All"); }} className="text-[#22c55e] text-[12px] hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#818384] text-[12px]">
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                {category !== "All" || search ? ` · filtered from ${liveData.length}` : ""}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((price, i) => (
                <PriceCard key={`${price.item}-${i}`} price={price} />
              ))}
            </div>
          </>
        )}

        {/* Attribution */}
        <div className="mt-8 pt-5 border-t border-[#343536] text-center">
          <p className="text-[#4a5568] text-[11px]">
            Prices from{" "}
            <a href="https://zimpricecheck.com" target="_blank" rel="noreferrer" className="text-[#818384] hover:text-[#d7dadc] underline">ZimPriceCheck</a>
            {" "}(Mbare Musika, Harare) and{" "}
            <a href="https://zmx.co.zw" target="_blank" rel="noreferrer" className="text-[#818384] hover:text-[#d7dadc] underline">ZMX</a>.
            {" "}Prices are indicative. Always verify before trading.
          </p>
        </div>
      </div>
    </div>
  );
}
