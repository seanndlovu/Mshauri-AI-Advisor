import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  ThumbsUp, ThumbsDown, MessageCircle, MapPin, Search,
  TrendingUp, TrendingDown, CloudRain, Beef, Lightbulb,
  ArrowRight, Send, ChevronRight, Wifi, Share2, Bookmark,
  Flame, Sparkles, BarChart3,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/* ─── types ───────────────────────────────────────────── */
interface Post {
  id: number; communityId: number; type: string; title: string;
  content: string; location: string | null; upvotes: number;
  downvotes: number; commentCount: number; authorName: string | null;
  createdAt: string;
}
interface Community {
  id: number; slug: string; name: string; description: string;
  memberCount: number; postCount: number;
}

/* ─── static data ─────────────────────────────────────── */
const TICKER_ITEMS = [
  { icon: "🦷", color: "text-red-400",    text: "Foot and Mouth Alert in Matabeleland South" },
  { icon: "🌧", color: "text-blue-400",   text: "Rainfall deficit detected in Masvingo province" },
  { icon: "📈", color: "text-green-400",  text: "Maize prices up 8.3% across major markets this week" },
  { icon: "💰", color: "text-yellow-400", text: "New Agriculture Grant available — apply before July 30" },
  { icon: "🐛", color: "text-orange-400", text: "Fall armyworm pressure HIGH in Bindura and Shamva" },
  { icon: "☀️", color: "text-cyan-400",   text: "ZIMMET seasonal outlook: near-normal rains expected October 2024" },
  { icon: "📊", color: "text-purple-400", text: "Tobacco auction floors: average $3.85/kg — up 12% year-on-year" },
];

const MARKET_PULSE = [
  { label: "Maize (USD/t)",    value: "$380",  change: "+8.3%", up: true },
  { label: "Wheat (USD/t)",    value: "$290",  change: "+3.1%", up: true },
  { label: "Soybeans (USD/t)", value: "$520",  change: "-2.4%", up: false },
  { label: "Cotton (USD/kg)",  value: "$0.85", change: "+1.7%", up: true },
];
const CLIMATE_PULSE = [
  { label: "Rainfall (30d)",      value: "-23%",    status: "bad"  },
  { label: "Temperature",         value: "+2.1°C",  status: "warn" },
  { label: "Soil Moisture",       value: "Low",     status: "bad"  },
  { label: "Vegetation Health",   value: "Good",    status: "good" },
];
const LIVESTOCK_PULSE = [
  { label: "Cattle Disease",  value: "High",   status: "bad"  },
  { label: "Goats Trend",     value: "Stable", status: "ok"   },
  { label: "Poultry Health",  value: "Good",   status: "good" },
  { label: "Tick Activity",   value: "High",   status: "bad"  },
];
const OPPORTUNITY_PULSE = [
  { label: "Grants",    value: "12" },
  { label: "Buyers",    value: "23" },
  { label: "Equipment", value: "8"  },
  { label: "Training",  value: "15" },
];

const MARKET_SNAPSHOT = [
  { crop: "Maize",      price: "$0.28/kg",  change: "+3%",  up: true  },
  { crop: "Tomatoes",   price: "$0.45/kg",  change: "+15%", up: true  },
  { crop: "Soya Beans", price: "$0.62/kg",  change: "-2%",  up: false },
  { crop: "Groundnuts", price: "$1.10/kg",  change: "0%",   up: null  },
  { crop: "Cotton",     price: "$0.85/kg",  change: "+2%",  up: true  },
];

const TOPICS = [
  "Crop Disease", "Soil Health", "Planting Guide", "Pest Control",
  "Market Prices", "Irrigation", "Livestock", "Alerts",
  "Seeds", "Weather",
];

const POST_TYPE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  disease_report: { label: "Disease Alert",  color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30",     icon: "🦷" },
  market_price:   { label: "Market Update",  color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: "📈" },
  weather:        { label: "Climate Alert",  color: "text-blue-400",   bg: "bg-blue-500/15 border-blue-500/30",    icon: "🌧" },
  opportunity:    { label: "Opportunity",    color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30", icon: "💡" },
  question:       { label: "Question",       color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", icon: "❓" },
  success_story:  { label: "Success Story",  color: "text-green-400",  bg: "bg-green-500/15 border-green-500/30",  icon: "✅" },
};

const COMMUNITY_ICONS: Record<string, string> = {
  maize: "🌽", livestock: "🐄", poultry: "🐔", vegetables: "🥬",
  tobacco: "🌿", pests: "🐛", irrigation: "💧", agribusiness: "💼",
  climate: "🌦️", soils: "🪱",
};

const QUICK_PROMPTS = [
  "Why are maize prices rising?",
  "Show drought risks in Matabeleland",
  "Best cattle breeds for low rainfall",
  "Fall armyworm control methods",
];

type SortMode = "hot" | "new" | "top";

function hotScore(post: Post): number {
  const hoursAge = (Date.now() - new Date(post.createdAt).getTime()) / 3_600_000;
  return post.upvotes / Math.pow(hoursAge + 2, 1.5);
}

function sortPosts(posts: Post[], mode: SortMode): Post[] {
  const copy = [...posts];
  if (mode === "new") copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (mode === "top") copy.sort((a, b) => b.upvotes - a.upvotes);
  if (mode === "hot") copy.sort((a, b) => hotScore(b) - hotScore(a));
  return copy;
}

/* ─── TickerBar ───────────────────────────────────────── */
function TickerBar({ onReport }: { onReport: () => void }) {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="flex items-center bg-[#0d1117] border-b border-[#1f2937] h-10 shrink-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 border-r border-[#1f2937] shrink-0 h-full">
        <Wifi className="w-3 h-3 text-[#22c55e] animate-pulse" />
        <span className="text-[#22c55e] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">Live</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-8 animate-ticker whitespace-nowrap">
          {doubled.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5 text-[12px] text-[#a0adb8] shrink-0">
              <span>{item.icon}</span>
              <span className={`${item.color} font-medium`}>{item.text}</span>
              <span className="text-[#2f3f50] mx-2">•</span>
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={onReport}
        className="flex items-center gap-1.5 shrink-0 ml-3 mr-4 px-3 h-6 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] text-[11px] font-bold hover:bg-[#22c55e]/25 transition-colors"
      >
        + Report
      </button>
    </div>
  );
}

/* ─── HeroSection ─────────────────────────────────────── */
function HeroSection({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState("");
  return (
    <div className="relative overflow-hidden bg-[#071208]" style={{ minHeight: 240 }}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a2010] via-[#153820] to-[#061408]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#000]/80 via-transparent to-[#000]/20" />
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />
      <div className="absolute top-[-60px] left-[40%] w-[400px] h-[400px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #22c55e 0%, transparent 70%)" }} />
      <div className="relative z-10 px-6 py-7">
        <span className="text-[#22c55e] text-[11px] font-bold uppercase tracking-[0.15em] bg-[#22c55e]/10 border border-[#22c55e]/20 px-2.5 py-1 rounded-full inline-block mb-3">
          Beta
        </span>
        <h1 className="text-[#f0f6f0] font-black text-[26px] leading-[1.1] mb-2 max-w-lg">
          Africa's Agricultural<br />
          <span className="text-[#22c55e]">Intelligence Network</span>
        </h1>
        <p className="text-[#6b8c6b] text-[13px] mb-5 max-w-md leading-relaxed">
          Real-time intelligence from farmers, experts, markets, weather systems and AI analysis.
        </p>
        <div className="flex items-center gap-2 max-w-xl">
          <div className="flex-1 flex items-center gap-2 bg-[#0d1a0d]/80 backdrop-blur-sm border border-[#2a4a2a] rounded-xl px-4 py-3 focus-within:border-[#22c55e]/60 transition-colors">
            <Search className="w-4 h-4 text-[#4a6a4a] shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && query.trim() && onSearch(query)}
              placeholder="Ask anything about agriculture in Zimbabwe..."
              className="flex-1 bg-transparent text-[#e7f0e7] text-[13px] placeholder-[#4a6a4a] outline-none"
            />
          </div>
          <button
            onClick={() => query.trim() && onSearch(query)}
            className="px-4 py-3 bg-[#22c55e] hover:bg-[#16a34a] rounded-xl text-white transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => onSearch(p)}
              className="text-[11px] text-[#5a8a5a] border border-[#2a4a2a] rounded-full px-3 py-1 hover:bg-[#22c55e]/10 hover:border-[#22c55e]/30 hover:text-[#22c55e] transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Status indicator ────────────────────────────────── */
function StatusDot({ status }: { status: string }) {
  if (status === "good") return <span className="text-[#22c55e] text-[11px] font-bold">Good</span>;
  if (status === "ok")   return <span className="text-[#60a5fa] text-[11px] font-bold">Stable</span>;
  if (status === "warn") return <span className="text-[#f59e0b] text-[11px] font-bold">Elevated</span>;
  return <span className="text-[#ef4444] text-[11px] font-bold">High</span>;
}

/* ─── Pulse Cards ─────────────────────────────────────── */
function PulseCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 py-4 bg-black border-b border-[#1f2937]">
      <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl p-3 hover:border-[#22c55e]/30 transition-colors">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#22c55e]" />
            <span className="text-[#e7e9ea] text-[11px] font-bold uppercase tracking-wide">Market Pulse</span>
          </div>
          <button className="text-[#4a6a7a] text-[10px] hover:text-[#22c55e] transition-colors">View all</button>
        </div>
        <div className="flex flex-col gap-1.5">
          {MARKET_PULSE.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-[#6b8399] text-[11px] truncate mr-2">{row.label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[#e7e9ea] text-[11px] font-medium">{row.value}</span>
                <span className={`text-[10px] font-bold ${row.up ? "text-[#22c55e]" : "text-[#ef4444]"}`}>{row.change}</span>
                {row.up ? <TrendingUp className="w-3 h-3 text-[#22c55e]" /> : <TrendingDown className="w-3 h-3 text-[#ef4444]" />}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl p-3 hover:border-[#3b82f6]/30 transition-colors">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <CloudRain className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span className="text-[#e7e9ea] text-[11px] font-bold uppercase tracking-wide">Climate Pulse</span>
          </div>
          <button className="text-[#4a6a7a] text-[10px] hover:text-[#3b82f6] transition-colors">View all</button>
        </div>
        <div className="flex flex-col gap-1.5">
          {CLIMATE_PULSE.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-[#6b8399] text-[11px] truncate mr-2">{row.label}</span>
              <StatusDot status={row.status} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl p-3 hover:border-[#f59e0b]/30 transition-colors">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Beef className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="text-[#e7e9ea] text-[11px] font-bold uppercase tracking-wide">Livestock Pulse</span>
          </div>
          <button className="text-[#4a6a7a] text-[10px] hover:text-[#f59e0b] transition-colors">View all</button>
        </div>
        <div className="flex flex-col gap-1.5">
          {LIVESTOCK_PULSE.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-[#6b8399] text-[11px] truncate mr-2">{row.label}</span>
              <StatusDot status={row.status} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl p-3 hover:border-[#a855f7]/30 transition-colors">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-[#a855f7]" />
            <span className="text-[#e7e9ea] text-[11px] font-bold uppercase tracking-wide">Opportunity Pulse</span>
          </div>
          <button className="text-[#4a6a7a] text-[10px] hover:text-[#a855f7] transition-colors">View all</button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {OPPORTUNITY_PULSE.map((row) => (
            <div key={row.label} className="bg-[#1a1f2e] rounded-lg p-2 text-center">
              <div className="text-[#e7e9ea] text-lg font-black">{row.value}</div>
              <div className="text-[#4a5a6a] text-[10px]">{row.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Intelligence Feed ───────────────────────────────── */
function IntelligenceFeed({
  posts, loading, onVote,
}: {
  posts: Post[];
  loading: boolean;
  onVote: (id: number, dir: "up" | "down") => void;
}) {
  const [sort, setSort] = useState<SortMode>("new");
  const sorted = sortPosts(posts, sort);

  return (
    <div className="flex-1">
      {/* Sort bar — from Variant A */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-[#1f2937] bg-[#080d10]">
        {(
          [
            { mode: "hot" as SortMode, icon: <Flame className="w-3 h-3" />, label: "Hot" },
            { mode: "new" as SortMode, icon: <Sparkles className="w-3 h-3" />, label: "New" },
            { mode: "top" as SortMode, icon: <BarChart3 className="w-3 h-3" />, label: "Top" },
          ] as const
        ).map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => setSort(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              sort === mode
                ? "bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30"
                : "text-[#3a5060] hover:text-[#8ab0b8] border border-transparent"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Post cards — Variant A layout in dark theme */}
      <div className="flex flex-col">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex border-b border-[#0d1117] overflow-hidden">
                <div className="w-10 bg-[#0a0f0a] shrink-0" />
                <div className="flex-1 px-4 py-4">
                  <div className="h-3 w-24 bg-white/5 rounded animate-pulse mb-2" />
                  <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse mb-1.5" />
                  <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            ))
          : sorted.length === 0
          ? <div className="text-center py-16 text-[#4a6a7a] text-sm">No posts yet</div>
          : sorted.map((post) => {
              const meta = POST_TYPE_META[post.type] ?? POST_TYPE_META.question;
              const timeLabel = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
              return (
                <div
                  key={post.id}
                  className="flex border-b border-[#0a0f0a] hover:bg-[#0d1117] transition-colors group"
                >
                  {/* Vote column — from Variant A */}
                  <div className="w-10 shrink-0 flex flex-col items-center pt-3 pb-2 gap-1 bg-[#080d10] group-hover:bg-[#0a1015] transition-colors border-r border-[#0f1820]">
                    <button
                      onClick={(e) => { e.preventDefault(); onVote(post.id, "up"); }}
                      className="p-1 rounded text-[#2a4050] hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <span className="text-[11px] font-black text-[#8ab0b8]">{post.upvotes}</span>
                    <button
                      onClick={(e) => { e.preventDefault(); onVote(post.id, "down"); }}
                      className="p-1 rounded text-[#2a4050] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <Link href={`/posts/${post.id}`} className="flex-1 min-w-0">
                    <div className="px-4 py-3 cursor-pointer">
                      {/* Meta row */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                          <span>{meta.icon}</span> {meta.label}
                        </span>
                        <span className="text-[#1f3040] text-[10px]">•</span>
                        <span className="text-[#3a5060] text-[10px]">{timeLabel}</span>
                        {post.location && (
                          <>
                            <span className="text-[#1f3040] text-[10px]">•</span>
                            <span className="flex items-center gap-0.5 text-[#3a5060] text-[10px]">
                              <MapPin className="w-2.5 h-2.5" />{post.location}
                            </span>
                          </>
                        )}
                      </div>
                      {/* Title */}
                      <h3 className="text-[#c8d8d8] font-semibold text-[13px] leading-snug mb-1.5 group-hover:text-[#e7f0e7] transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      {/* Preview */}
                      <p className="text-[#3a5060] text-[11px] leading-relaxed line-clamp-2 mb-2.5">
                        {post.content}
                      </p>
                      {/* Actions row — from Variant A */}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => e.preventDefault()}
                          className="flex items-center gap-1 text-[#2a4050] hover:text-[#8ab0b8] text-[11px] font-medium transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {post.commentCount} {post.commentCount === 1 ? "reply" : "replies"}
                        </button>
                        <button
                          onClick={(e) => e.preventDefault()}
                          className="flex items-center gap-1 text-[#2a4050] hover:text-[#8ab0b8] text-[11px] font-medium transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Share
                        </button>
                        <button
                          onClick={(e) => e.preventDefault()}
                          className="flex items-center gap-1 text-[#2a4050] hover:text-[#8ab0b8] text-[11px] font-medium transition-colors"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          Save
                        </button>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
      </div>
    </div>
  );
}

/* ─── Right: AI Advisor mini ──────────────────────────── */
function AIAdvisorMini() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const QUICK = [
    "What pests are affecting maize in my area?",
    "Is it a good time to sell grain this week?",
    "How much rainfall is expected this month?",
  ];
  function ask(q: string) { setLocation(`/ask?q=${encodeURIComponent(q)}`); }
  return (
    <div className="border-b border-[#1f2937] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center text-sm">🤖</div>
        <span className="text-[#e7e9ea] text-[12px] font-bold">AI Advisor</span>
        <span className="text-[9px] text-[#22c55e] font-bold bg-[#22c55e]/10 px-1.5 py-0.5 rounded-full border border-[#22c55e]/20">BETA</span>
      </div>
      <p className="text-[#3a5060] text-[11px] mb-3 leading-relaxed">Your AI agricultural analyst. Ask questions. Get intelligence.</p>
      <div className="flex gap-1.5 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && query.trim() && ask(query)}
          placeholder="Ask Mshauri anything..."
          className="flex-1 bg-[#0d1117] border border-[#1f2937] rounded-lg px-3 py-2 text-[#e7e9ea] text-[11px] placeholder-[#1f3040] focus:outline-none focus:border-[#22c55e]/50 transition-colors"
        />
        <button onClick={() => query.trim() && ask(query)} className="p-2 bg-[#22c55e]/15 border border-[#22c55e]/30 rounded-lg text-[#22c55e] hover:bg-[#22c55e]/25 transition-colors">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        {QUICK.map((q) => (
          <button key={q} onClick={() => ask(q)} className="flex items-center gap-2 text-left text-[10px] text-[#3a5060] hover:text-[#22c55e] transition-colors group">
            <span className="w-1 h-1 rounded-full bg-[#22c55e]/40 group-hover:bg-[#22c55e] shrink-0" />
            {q}
          </button>
        ))}
      </div>
      <button onClick={() => setLocation("/ask")} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-[11px] font-bold transition-colors">
        Open full AI Advisor <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Right: Market Snapshot (from Variant A) ─────────── */
function MarketSnapshot() {
  return (
    <div className="border-b border-[#1f2937] p-4">
      <h3 className="text-[#e7e9ea] text-[11px] font-bold uppercase tracking-wider mb-3">Market Snapshot</h3>
      <div className="flex flex-col gap-2">
        {MARKET_SNAPSHOT.map((item) => (
          <div key={item.crop} className="flex items-center justify-between">
            <span className="text-[#8ab0b8] text-[12px]">{item.crop}</span>
            <div className="flex items-center gap-2">
              <span className="text-[#c8d8d8] text-[11px] font-semibold">{item.price}</span>
              <span className={`text-[10px] font-bold ${
                item.up === true ? "text-[#22c55e]" :
                item.up === false ? "text-[#ef4444]" :
                "text-[#3a5060]"
              }`}>{item.change}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Right: Browse by Topic (from Variant A) ─────────── */
function BrowseByTopic() {
  const [, setLocation] = useLocation();
  const topicTypes: Record<string, string> = {
    "Crop Disease": "disease_report", "Market Prices": "market_price",
    "Alerts": "disease_report", "Livestock": "question",
  };
  return (
    <div className="border-b border-[#1f2937] p-4">
      <h3 className="text-[#e7e9ea] text-[11px] font-bold uppercase tracking-wider mb-3">Browse by Topic</h3>
      <div className="flex flex-wrap gap-1.5">
        {TOPICS.map((t) => (
          <button
            key={t}
            onClick={() => setLocation("/communities")}
            className="bg-[#0d1117] hover:bg-[#1a2a2a] border border-[#1f2937] hover:border-[#22c55e]/30 rounded-full px-2.5 py-1 text-[10px] text-[#5a8080] hover:text-[#22c55e] transition-all"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Right: Trending ─────────────────────────────────── */
function TrendingDiscussions({ posts }: { posts: Post[] }) {
  const trending = [...posts].sort((a, b) => b.upvotes - a.upvotes).slice(0, 5);
  return (
    <div className="p-4">
      <h3 className="text-[#e7e9ea] text-[12px] font-bold mb-3">Trending Discussions</h3>
      <div className="flex flex-col gap-2">
        {trending.map((post) => {
          const meta = POST_TYPE_META[post.type];
          return (
            <Link key={post.id} href={`/posts/${post.id}`}>
              <div className="flex items-start gap-2 group cursor-pointer">
                <span className={`${meta?.color ?? "text-[#4a6a7a]"} text-[10px] font-black mt-0.5 w-5 text-right shrink-0`}>{post.upvotes}</span>
                <span className="text-[#3a6a5a] text-[10px] mt-0.5 font-bold shrink-0">↑</span>
                <span className="text-[#6a8a8a] text-[11px] leading-tight group-hover:text-[#c0d0c8] transition-colors line-clamp-2">{post.title}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Feed ───────────────────────────────────────── */
export default function Feed() {
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/posts?sort=new&limit=40").then((r) => r.json()),
      fetch("/api/communities").then((r) => r.json()),
    ]).then(([p, c]) => {
      setPosts(Array.isArray(p) ? p : []);
      setCommunities(Array.isArray(c) ? c : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleVote(id: number, direction: "up" | "down") {
    // optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, upvotes: direction === "up" ? p.upvotes + 1 : p.upvotes, downvotes: direction === "down" ? p.downvotes + 1 : p.downvotes }
          : p
      )
    );
    try {
      await fetch(`/api/posts/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
    } catch {
      // revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, upvotes: direction === "up" ? p.upvotes - 1 : p.upvotes, downvotes: direction === "down" ? p.downvotes - 1 : p.downvotes }
            : p
        )
      );
    }
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <TickerBar onReport={() => setLocation("/communities")} />
      <div className="flex flex-1 min-h-0">
        {/* Scrollable main */}
        <div className="flex-1 overflow-y-auto min-w-0">
          <HeroSection onSearch={(q) => setLocation(`/ask?q=${encodeURIComponent(q)}`)} />
          <PulseCards />
          <div className="flex items-center gap-2 px-4 pt-4 pb-1">
            <Wifi className="w-3.5 h-3.5 text-[#22c55e] animate-pulse" />
            <h2 className="text-[#e7e9ea] text-[13px] font-bold uppercase tracking-wide">Live Intelligence Feed</h2>
          </div>
          <IntelligenceFeed posts={posts} loading={loading} onVote={handleVote} />
        </div>

        {/* Sticky right panel */}
        <div className="hidden lg:flex flex-col w-[300px] xl:w-[320px] shrink-0 border-l border-[#0f1820] overflow-y-auto bg-[#080d10]">
          <AIAdvisorMini />
          <MarketSnapshot />
          <BrowseByTopic />
          <TrendingDiscussions posts={posts} />
        </div>
      </div>
    </div>
  );
}
