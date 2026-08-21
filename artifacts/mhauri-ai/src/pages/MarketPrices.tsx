import { useEffect, useMemo, useState } from "react";
import { Search, TrendingUp, Loader2, MapPin, CalendarDays } from "lucide-react";

type PublicPrice = {
  id: number;
  commodity: string;
  grade: string | null;
  unit: string;
  market: string;
  priceUsd: string | null;
  priceZig: string | null;
  observedDate: string;
  category: string;
};

type Edition = {
  name: string;
  source: string;
  observedDate: string;
  publishedAt: string | null;
};

const ITEM_EMOJIS: [string, string][] = [
  ["maize", "🌽"], ["tomato", "🍅"], ["potato", "🥔"], ["onion", "🧅"],
  ["cabbage", "🥬"], ["bean", "🫘"], ["groundnut", "🥜"], ["wheat", "🌾"],
  ["sorghum", "🌾"], ["millet", "🌾"], ["broiler", "🍗"], ["egg", "🥚"],
  ["cattle", "🐄"], ["banana", "🍌"], ["avocado", "🥑"],
];

function itemEmoji(name: string) {
  return ITEM_EMOJIS.find(([match]) => name.toLowerCase().includes(match))?.[1] ?? "🌱";
}

function formatDate(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-ZW", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
}

export default function MarketPrices() {
  const [prices, setPrices] = useState<PublicPrice[]>([]);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/market-prices")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load verified market prices.");
        return response.json();
      })
      .then((payload) => {
        setPrices(Array.isArray(payload.data) ? payload.data : []);
        setEdition(payload.edition ?? null);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load verified market prices."))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(prices.map((price) => price.category))).sort()], [prices]);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return prices.filter((price) => {
      const matchesCategory = category === "All" || price.category === category;
      const matchesSearch = !search || [price.commodity, price.grade, price.market, price.unit]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search));
      return matchesCategory && matchesSearch;
    });
  }, [prices, category, query]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-7 pb-24">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-[#22c55e]" />
        </div>
        <div>
          <h1 className="text-[#E7E9EA] font-black text-[24px] leading-tight">Market Prices</h1>
          <p className="text-[#71767B] text-[13px] mt-1">Latest verified agricultural market prices.</p>
        </div>
      </div>

      {edition && (
        <div className="mb-6 rounded-2xl border border-[#2F3336] bg-[#16181C] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
          <div className="min-w-0">
            <p className="text-[#E7E9EA] font-bold text-[13px] truncate">{edition.name}</p>
            <p className="text-[#71767B] text-[11px] mt-0.5">Verified source: {edition.source}</p>
          </div>
          <div className="sm:ml-auto flex items-center gap-1.5 text-[#A7F3D0] text-[11px] font-semibold">
            <CalendarDays className="w-3.5 h-3.5" />
            Prices observed {formatDate(edition.observedDate)}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 text-[#71767B]">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#22c55e]" />
          <p className="text-[13px]">Loading market prices…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-red-300">{error}</div>
      ) : !edition ? (
        <div className="rounded-2xl border border-[#2F3336] bg-[#16181C] px-6 py-16 text-center">
          <h2 className="text-[#E7E9EA] font-bold text-[17px]">Prices will appear after the next verified update</h2>
          <p className="text-[#71767B] text-[13px] mt-2">Our market team publishes a complete price edition after it has been checked.</p>
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71767B]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commodities, markets, or units…"
              className="w-full bg-[#16181C] border border-[#2F3336] rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-[#E7E9EA] placeholder-[#71767B] focus:outline-none focus:border-[#22c55e]/50" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
            {categories.map((name) => (
              <button key={name} onClick={() => setCategory(name)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold border transition-colors ${category === name ? "bg-[#22c55e]/15 border-[#22c55e]/50 text-[#86efac]" : "bg-[#16181C] border-[#2F3336] text-[#71767B] hover:border-[#3F4448]"}`}>
                {name}
              </button>
            ))}
          </div>
          {filtered.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((price) => (
                <article key={price.id} className="rounded-2xl bg-[#16181C] border border-[#2F3336] p-4 hover:border-[#22c55e]/30 transition-colors">
                  <div className="flex gap-3">
                    <span className="text-[25px] leading-none">{itemEmoji(price.commodity)}</span>
                    <div className="min-w-0">
                      <h2 className="font-bold text-[#E7E9EA] text-[15px] truncate">{price.commodity}</h2>
                      <p className="text-[#71767B] text-[11px] mt-0.5">{[price.grade, price.unit].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-end mt-5">
                    {price.priceUsd && <span className="font-black text-[#E7E9EA] text-[22px]">US${Number(price.priceUsd).toFixed(2)}</span>}
                    {price.priceZig && <span className="text-[#A7F3D0] text-[12px] font-bold">{Number(price.priceZig).toLocaleString()} ZiG</span>}
                  </div>
                  <p className="mt-4 text-[#A7F3D0] text-[11px] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{price.market}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-[#71767B] text-[13px]">No prices match your search.</div>
          )}
        </>
      )}
    </div>
  );
}