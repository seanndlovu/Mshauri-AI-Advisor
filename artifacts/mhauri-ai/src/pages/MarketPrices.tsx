import { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, ExternalLink, TrendingUp, ShoppingBasket, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface LivePrice {
  item: string;
  quantity: string;
  priceUsd: number;
  priceZig: number;
  category: string;
  source: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  "Vegetables": "🥬",
  "Fruits": "🍎",
  "Grains & Staples": "🌾",
  "Protein": "🥚",
  "Dried & Processed": "🫙",
};

const ITEM_EMOJI_MAP: [string, string][] = [
  ["apple", "🍎"], ["avocado", "🥑"], ["banana", "🍌"], ["lemon", "🍋"],
  ["orange", "🍊"], ["pineapple", "🍍"], ["pawpaw", "🪴"], ["strawberr", "🍓"],
  ["watermelon", "🍉"], ["tomato", "🍅"], ["sweet potato", "🍠"],
  ["potato", "🥔"], ["onion", "🧅"], ["garlic", "🧄"], ["carrot", "🥕"],
  ["broccoli", "🥦"], ["cauliflower", "🥦"], ["cabbage", "🥬"],
  ["butternut", "🎃"], ["pumpkin", "🎃"], ["baby marrow", "🥒"],
  ["cucumber", "🥒"], ["pepper", "🫑"], ["chili", "🌶️"], ["mushroom", "🍄"],
  ["green maize", "🌽"], ["maize", "🌽"], ["soya", "🫘"], ["bean", "🫘"],
  ["peas", "🫛"], ["groundnut", "🥜"], ["rice", "🍚"],
  ["millet", "🌾"], ["sorghum", "🌾"], ["popcorn", "🍿"],
  ["broiler", "🍗"], ["roadrunner", "🐓"], ["layer", "🐓"], ["chicken", "🍗"],
  ["turkey", "🦃"], ["egg", "🥚"], ["rape", "🥬"], ["covo", "🥬"],
  ["tsunga", "🥬"], ["beetroot", "🌹"], ["sugarcane", "🎋"],
  ["yam", "🍠"], ["finger millet", "🌾"], ["dried", "🫙"],
];

function getItemEmoji(name: string): string {
  const l = name.toLowerCase();
  for (const [key, emoji] of ITEM_EMOJI_MAP) {
    if (l.includes(key)) return emoji;
  }
  return "🌱";
}

type SortField = "item" | "priceUsd" | "priceZig";
type SortDir = "asc" | "desc";

export default function MarketPrices() {
  const [data, setData] = useState<LivePrice[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortField, setSortField] = useState<SortField>("item");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  async function fetchPrices(force = false) {
    try {
      const r = await fetch(`/api/market-prices/live${force ? "?force=1" : ""}`);
      if (!r.ok) throw new Error("Failed to load prices");
      const json = await r.json();
      setData(json.data ?? []);
      setFetchedAt(json.fetchedAt ?? "");
      setError(null);
    } catch {
      setError("Could not load market prices. Please try again.");
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchPrices().finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchPrices(true);
    setRefreshing(false);
  }

  const categories = useMemo(() => {
    const cats = new Set(data.map(d => d.category));
    return ["All", ...Array.from(cats).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data;
    if (category !== "All") rows = rows.filter(r => r.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.item.toLowerCase().includes(q) || r.quantity.toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortField === "item") cmp = a.item.localeCompare(b.item);
      else if (sortField === "priceUsd") cmp = a.priceUsd - b.priceUsd;
      else if (sortField === "priceZig") cmp = a.priceZig - b.priceZig;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, category, search, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  const stats = useMemo(() => {
    if (!data.length) return null;
    const prices = data.map(d => d.priceUsd);
    return {
      total: data.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    };
  }, [data]);

  function fmtDate(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-ZW", { month: "short", day: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-ZW", { hour: "2-digit", minute: "2-digit" })
    );
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-[#22c55e]" />
      : <ArrowDown className="w-3 h-3 text-[#22c55e]" />;
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 pb-20">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[var(--text-1)] font-black text-[22px] flex items-center gap-2">
            <ShoppingBasket className="w-6 h-6 text-[#22c55e]" />
            Market Analysis
          </h1>
          {fetchedAt && (
            <p className="text-[var(--text-3)] text-[11px] mt-0.5">
              Mbare Musika · Updated {fmtDate(fetchedAt)}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 text-[#22c55e] text-[11px] font-bold border border-[#22c55e]/30 px-3 py-1.5 rounded-full hover:bg-[#22c55e]/10 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 text-center">
            <div className="text-[#22c55e] font-black text-[22px]">{stats.total}</div>
            <div className="text-[var(--text-3)] text-[10px] font-bold uppercase tracking-wide mt-0.5">Items</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 text-center">
            <div className="text-[var(--text-1)] font-black text-[20px]">${stats.avg.toFixed(2)}</div>
            <div className="text-[var(--text-3)] text-[10px] font-bold uppercase tracking-wide mt-0.5">Avg USD</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 text-center">
            <div className="text-[var(--text-1)] font-black text-[16px]">${stats.min}–${stats.max}</div>
            <div className="text-[var(--text-3)] text-[10px] font-bold uppercase tracking-wide mt-0.5">Range</div>
          </div>
        </div>
      )}

      {/* ── Source links ── */}
      <div className="flex gap-2 mb-5">
        <a
          href="https://docs.google.com/spreadsheets/d/1Xhm6GEsJTncv_aPhK9Ivo1eq40ZQTxeE3PphNy8uQ_s"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--text-2)] border border-[var(--border-color)] px-3 py-1.5 rounded-full hover:border-[#22c55e]/50 hover:text-[#22c55e] transition-colors bg-[var(--bg-card)]"
        >
          <span>📊</span> Price Sheet
          <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
        <a
          href="https://zmx.co.zw" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--text-2)] border border-[var(--border-color)] px-3 py-1.5 rounded-full hover:border-[#22c55e]/50 hover:text-[#22c55e] transition-colors bg-[var(--bg-card)]"
        >
          <TrendingUp className="w-3.5 h-3.5" /> ZMX Exchange
          <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search produce, grains, protein…"
          className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:border-[#22c55e]/50 transition-colors"
        />
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 transition-all ${
              category === cat
                ? "bg-[#22c55e]/15 border-[#22c55e]/50 text-[#22c55e]"
                : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-2)] hover:border-[var(--text-2)]/40"
            }`}
          >
            {cat !== "All" && (CATEGORY_EMOJIS[cat] ?? "🌱")}{" "}{cat}
            {cat !== "All" && (
              <span className="opacity-50 ml-0.5">
                ({data.filter(d => d.category === cat).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--text-3)]">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#22c55e]" />
          <p className="text-[13px]">Loading market prices…</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-[var(--text-3)]">
          <p className="text-[14px] mb-3">{error}</p>
          <button onClick={() => fetchPrices()} className="text-[#22c55e] font-bold hover:underline text-[13px]">
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-3)]">
          <p className="text-[14px]">No results{search ? ` for "${search}"` : ""}</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
            <button
              onClick={() => toggleSort("item")}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] hover:text-[var(--text-2)] text-left transition-colors"
            >
              Item <SortIcon field="item" />
            </button>
            <button
              onClick={() => toggleSort("priceUsd")}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] hover:text-[var(--text-2)] justify-end transition-colors w-14"
            >
              USD <SortIcon field="priceUsd" />
            </button>
            <button
              onClick={() => toggleSort("priceZig")}
              className="hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] hover:text-[var(--text-2)] justify-end transition-colors w-20"
            >
              ZiG <SortIcon field="priceZig" />
            </button>
            <div className="hidden sm:block text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] text-right w-20">
              Category
            </div>
          </div>

          {/* Data rows */}
          {filtered.map((row, i) => (
            <div
              key={`${row.item}-${i}`}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-4 py-3 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-[17px] shrink-0">{getItemEmoji(row.item)}</span>
                  <div className="min-w-0">
                    <div className="text-[var(--text-1)] font-bold text-[13px] truncate leading-tight">
                      {row.item}
                    </div>
                    <div className="text-[var(--text-3)] text-[11px] truncate leading-tight">
                      {row.quantity}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right w-14">
                <span className="text-[#22c55e] font-black text-[14px]">
                  ${row.priceUsd.toFixed(2)}
                </span>
              </div>

              <div className="hidden sm:block text-right w-20">
                <span className="text-[var(--text-2)] font-semibold text-[12px]">
                  {row.priceZig > 0 ? `${row.priceZig.toLocaleString()} ZiG` : "—"}
                </span>
              </div>

              <div className="hidden sm:flex justify-end w-20">
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-3)] whitespace-nowrap">
                  {CATEGORY_EMOJIS[row.category] ?? "🌱"}{" "}
                  {row.category.replace(" & Staples", "").replace(" & Processed", "")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      {!loading && !error && data.length > 0 && (
        <p className="text-center text-[var(--text-3)] text-[10px] mt-5 leading-relaxed">
          Mbare Musika prices · {data.length} items · Data sourced from Maricho Media price sheet
        </p>
      )}
    </div>
  );
}
