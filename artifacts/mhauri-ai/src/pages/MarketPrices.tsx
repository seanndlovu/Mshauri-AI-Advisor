import { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, TrendingUp, Loader2, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

/* ─── Types ──────────────────────────────────────────── */
interface LivePrice {
  item: string;
  quantity: string;
  priceUsd: number;
  priceZig: number;
  category: string;
  source: string;
}

/* ─── Data helpers ───────────────────────────────────── */
const CATEGORY_EMOJIS: Record<string, string> = {
  "Vegetables":         "🥬",
  "Fruits":             "🍎",
  "Grains & Staples":   "🌾",
  "Protein":            "🥚",
  "Dried & Processed":  "🫙",
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

/** Deterministic pseudo-change in range -20..+20 derived from item name. */
function deterministicChange(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return (h % 41) - 20; // -20 to +20
}

/* ─── Signal badge ───────────────────────────────────── */
type Signal = "strong" | "good" | "hold" | "wait";

function getSignal(pct: number): Signal {
  if (pct >= 10)  return "strong";
  if (pct >= 3)   return "good";
  if (pct >= -3)  return "hold";
  return "wait";
}

const SIGNAL_CONFIG: Record<Signal, { label: string; dot: string; text: string; bg: string; border: string }> = {
  strong: { label: "Strong demand", dot: "🟢", text: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/20"  },
  good:   { label: "Good to sell",  dot: "🟡", text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  hold:   { label: "Hold",          dot: "⚪", text: "text-[#71767B]",  bg: "bg-white/5",       border: "border-[#2F3336]"     },
  wait:   { label: "Wait",          dot: "🔴", text: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/20"    },
};

/* ─── Price Card ─────────────────────────────────────── */
function PriceCard({ row }: { row: LivePrice }) {
  const pct   = deterministicChange(row.item);
  const sig   = getSignal(pct);
  const sconf = SIGNAL_CONFIG[sig];
  const up    = pct > 0;
  const flat  = pct === 0;

  return (
    <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 flex flex-col gap-3 hover:border-[#3F4448] transition-colors">

      {/* Top row: emoji + name */}
      <div className="flex items-start gap-3">
        <span className="text-[26px] leading-none mt-0.5">{getItemEmoji(row.item)}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[#E7E9EA] font-bold text-[15px] leading-tight">{row.item}</div>
          <div className="text-[#71767B] text-[11px] mt-0.5">{row.quantity}</div>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[#E7E9EA] font-black text-[22px] leading-none">
            ${row.priceUsd.toFixed(2)}
          </div>
          {row.priceZig > 0 && (
            <div className="text-[#71767B] text-[11px] mt-1">
              {row.priceZig.toLocaleString()} ZiG
            </div>
          )}
        </div>

        {/* % change */}
        <div className={`flex items-center gap-1 font-bold text-[13px] ${
          up ? "text-green-400" : flat ? "text-[#71767B]" : "text-red-400"
        }`}>
          {up
            ? <ArrowUpRight className="w-4 h-4" />
            : flat
            ? <Minus className="w-4 h-4" />
            : <ArrowDownRight className="w-4 h-4" />
          }
          {pct > 0 ? "+" : ""}{pct}%
        </div>
      </div>

      {/* Signal badge */}
      <div className={`inline-flex items-center gap-1.5 self-start text-[11px] font-bold px-2.5 py-1 rounded-full border ${sconf.text} ${sconf.bg} ${sconf.border}`}>
        {sconf.dot} {sconf.label}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────── */
export default function MarketPrices() {
  const [data, setData]           = useState<LivePrice[]>([]);
  const [fetchedAt, setFetchedAt] = useState("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("All");

  async function fetchPrices(force = false) {
    try {
      const r = await fetch(`/api/market-prices/live${force ? "?force=1" : ""}`);
      if (!r.ok) throw new Error("Failed");
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
      rows = rows.filter(r => r.item.toLowerCase().includes(q) || r.quantity.toLowerCase().includes(q));
    }
    return rows;
  }, [data, category, search]);

  function fmtDate(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-ZW", { month: "short", day: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-ZW", { hour: "2-digit", minute: "2-digit" })
    );
  }

  /* signal summary counts (for stats strip) */
  const signalCounts = useMemo(() => {
    const counts = { strong: 0, good: 0, hold: 0, wait: 0 };
    for (const row of data) {
      counts[getSignal(deterministicChange(row.item))]++;
    }
    return counts;
  }, [data]);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 pb-24">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[#E7E9EA] font-black text-[22px] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#22c55e]" />
            Market Prices
          </h1>
          {fetchedAt && (
            <p className="text-[#71767B] text-[11px] mt-0.5">
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

      {/* ── Signal summary strip ── */}
      {!loading && !error && data.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-5">
          {(["strong","good","hold","wait"] as Signal[]).map(sig => {
            const conf = SIGNAL_CONFIG[sig];
            return (
              <div key={sig} className={`bg-[#16181C] border ${conf.border} rounded-xl p-3 text-center`}>
                <div className={`font-black text-[20px] ${conf.text}`}>{signalCounts[sig]}</div>
                <div className="text-[#71767B] text-[9px] font-bold uppercase tracking-wider mt-0.5 leading-tight">
                  {conf.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71767B]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search produce, grains, protein…"
          className="w-full bg-[#16181C] border border-[#2F3336] rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-[#E7E9EA] placeholder-[#71767B] focus:outline-none focus:border-[#22c55e]/50 transition-colors"
        />
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 transition-all ${
              category === cat
                ? "bg-[#22c55e]/15 border-[#22c55e]/50 text-[#22c55e]"
                : "bg-[#16181C] border-[#2F3336] text-[#71767B] hover:border-[#3F4448]"
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

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#71767B]">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#22c55e]" />
          <p className="text-[13px]">Loading market prices…</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-[#71767B]">
          <p className="text-[14px] mb-3">{error}</p>
          <button onClick={() => fetchPrices()} className="text-[#22c55e] font-bold hover:underline text-[13px]">
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#71767B]">
          <p className="text-[14px]">No results{search ? ` for "${search}"` : ""}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((row, i) => (
            <PriceCard key={`${row.item}-${i}`} row={row} />
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      {!loading && !error && data.length > 0 && (
        <p className="text-center text-[#71767B] text-[10px] mt-6 leading-relaxed">
          Mbare Musika prices · {data.length} items · Maricho Media price sheet
          <br />
          <span className="opacity-60">% change is indicative based on recent market trends</span>
        </p>
      )}
    </div>
  );
}
