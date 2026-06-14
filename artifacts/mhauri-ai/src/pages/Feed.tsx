import { useState, useEffect, useRef, FormEvent } from "react";
import { useLocation, Link } from "wouter";
import {
  ThumbsUp, MessageCircle, MapPin, Clock, Search,
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  CloudRain, Beef, Lightbulb, ArrowRight, Send,
  ChevronRight, Filter, Plus, Wifi
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

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
  { icon: "🦷", color: "text-red-400", text: "Foot and Mouth Alert in Matabeleland South" },
  { icon: "🌧", color: "text-blue-400", text: "Rainfall deficit detected in Masvingo province" },
  { icon: "📈", color: "text-green-400", text: "Maize prices up 8.3% across major markets this week" },
  { icon: "💰", color: "text-yellow-400", text: "New Agriculture Grant available — apply before July 30" },
  { icon: "🐛", color: "text-orange-400", text: "Fall armyworm pressure HIGH in Bindura and Shamva" },
  { icon: "☀️", color: "text-cyan-400", text: "ZIMMET seasonal outlook: near-normal rains expected October 2024" },
  { icon: "📊", color: "text-purple-400", text: "Tobacco auction floors: average $3.85/kg — up 12% year-on-year" },
];

const MARKET_PULSE = [
  { label: "Maize (USD/t)", value: "$380", change: "+8.3%", up: true },
  { label: "Wheat (USD/t)", value: "$290", change: "+3.1%", up: true },
  { label: "Soybeans (USD/t)", value: "$520", change: "-2.4%", up: false },
  { label: "Cotton (USD/kg)", value: "$0.85", change: "+1.7%", up: true },
];
const CLIMATE_PULSE = [
  { label: "Rainfall (30d)", value: "-23%", status: "bad" },
  { label: "Temperature", value: "+2.1°C", status: "warn" },
  { label: "Soil Moisture", value: "Low", status: "bad" },
  { label: "Vegetation Health", value: "Good", status: "good" },
];
const LIVESTOCK_PULSE = [
  { label: "Cattle Disease", value: "High", status: "bad" },
  { label: "Goats Trend", value: "Stable", status: "ok" },
  { label: "Poultry Health", value: "Good", status: "good" },
  { label: "Tick Activity", value: "High", status: "bad" },
];
const OPPORTUNITY_PULSE = [
  { label: "Grants", value: "12" },
  { label: "Buyers", value: "23" },
  { label: "Equipment", value: "8" },
  { label: "Training", value: "15" },
];

const POST_TYPE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  disease_report: { label: "Disease Alert", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", icon: "🦷" },
  market_price: { label: "Market Update", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: "📈" },
  weather: { label: "Climate Alert", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30", icon: "🌧" },
  opportunity: { label: "Opportunity", color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30", icon: "💡" },
  question: { label: "Question", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", icon: "❓" },
  success_story: { label: "Success Story", color: "text-green-400", bg: "bg-green-500/15 border-green-500/30", icon: "✅" },
};

const FEED_FILTERS = ["All", "Alerts", "Markets", "Weather", "Opportunities", "Livestock"];

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

const FILTER_TYPE_MAP: Record<string, string | null> = {
  "All": null, "Alerts": "disease_report", "Markets": "market_price",
  "Weather": "weather", "Opportunities": "opportunity", "Livestock": null,
};

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
        <Plus className="w-3 h-3" /> Report
      </button>
    </div>
  );
}

/* ─── HeroSection ─────────────────────────────────────── */
function HeroSection({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState("");
  return (
    <div className="relative overflow-hidden bg-[#071208]" style={{ minHeight: 260 }}>
      {/* Gradient bg layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a2010] via-[#153820] to-[#061408]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#000]/80 via-transparent to-[#000]/20" />
      {/* Decorative grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />
      {/* Glowing orb */}
      <div className="absolute top-[-60px] left-[40%] w-[400px] h-[400px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #22c55e 0%, transparent 70%)" }} />

      <div className="relative z-10 px-6 py-8">
        <div className="flex items-start gap-2 mb-3">
          <span className="text-[#22c55e] text-[11px] font-bold uppercase tracking-[0.15em] bg-[#22c55e]/10 border border-[#22c55e]/20 px-2.5 py-1 rounded-full">
            Beta
          </span>
        </div>
        <h1 className="text-[#f0f6f0] font-black text-[28px] leading-[1.1] mb-2 max-w-lg">
          Africa's Agricultural<br />
          <span className="text-[#22c55e]">Intelligence Network</span>
        </h1>
        <p className="text-[#6b8c6b] text-[13px] mb-6 max-w-md leading-relaxed">
          Real-time intelligence from farmers, experts, markets, weather systems and AI analysis.
        </p>

        {/* Search */}
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

        {/* Quick chips */}
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
  if (status === "ok") return <span className="text-[#60a5fa] text-[11px] font-bold">Stable</span>;
  if (status === "warn") return <span className="text-[#f59e0b] text-[11px] font-bold">Elevated</span>;
  if (status === "bad") return <span className="text-[#ef4444] text-[11px] font-bold">High</span>;
  return null;
}

/* ─── Pulse Cards ─────────────────────────────────────── */
function PulseCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 py-4 bg-black border-b border-[#1f2937]">
      {/* Market Pulse */}
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
                <span className={`text-[10px] font-bold ${row.up ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  {row.change}
                </span>
                {row.up ? <TrendingUp className="w-3 h-3 text-[#22c55e]" /> : <TrendingDown className="w-3 h-3 text-[#ef4444]" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Climate Pulse */}
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

      {/* Livestock Pulse */}
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

      {/* Opportunity Pulse */}
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

/* ─── Post thumbnail gradient ────────────────────────── */
function PostThumb({ type }: { type: string }) {
  const gradients: Record<string, string> = {
    disease_report: "from-red-900/60 to-red-700/20",
    market_price: "from-emerald-900/60 to-emerald-700/20",
    weather: "from-blue-900/60 to-blue-700/20",
    opportunity: "from-purple-900/60 to-purple-700/20",
    success_story: "from-green-900/60 to-green-700/20",
    question: "from-yellow-900/60 to-yellow-700/20",
  };
  const icons: Record<string, string> = {
    disease_report: "🦷", market_price: "📈", weather: "🌧",
    opportunity: "💡", success_story: "✅", question: "❓",
  };
  return (
    <div className={`w-[72px] h-[56px] rounded-lg shrink-0 bg-gradient-to-br ${gradients[type] ?? "from-gray-800/60 to-gray-700/20"} flex items-center justify-center text-xl border border-white/5`}>
      {icons[type] ?? "📝"}
    </div>
  );
}

/* ─── Intelligence Feed ───────────────────────────────── */
function IntelligenceFeed({ posts, loading }: { posts: Post[]; loading: boolean }) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [, setLocation] = useLocation();

  const filtered = activeFilter === "All"
    ? posts
    : activeFilter === "Livestock"
    ? posts.filter((p) => p.communityId === 2)
    : posts.filter((p) => p.type === FILTER_TYPE_MAP[activeFilter]);

  return (
    <div className="flex-1 min-h-0">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-2 border-b border-[#1f2937] overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5 text-[#4a6a7a]" />
        </div>
        {FEED_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
              activeFilter === f
                ? "bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30"
                : "text-[#4a6a7a] border border-transparent hover:text-[#a0b0b8] hover:bg-white/5"
            }`}
          >
            {f}
          </button>
        ))}
        <button className="flex items-center justify-center w-6 h-6 rounded-full border border-[#1f2937] text-[#4a6a7a] hover:text-[#e7e9ea] hover:bg-white/5 transition-colors ml-1 shrink-0">
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-4 border-b border-[#1f2937]">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="h-3 w-24 bg-white/5 rounded animate-pulse mb-2" />
                    <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse mb-1.5" />
                    <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                  </div>
                  <div className="w-[72px] h-[56px] bg-white/5 rounded-lg animate-pulse shrink-0" />
                </div>
              </div>
            ))
          : filtered.length === 0
          ? (
            <div className="text-center py-12 text-[#4a6a7a] text-sm">
              No posts in this category yet
            </div>
          )
          : filtered.slice(0, 15).map((post, i) => {
              const meta = POST_TYPE_META[post.type] ?? POST_TYPE_META.question;
              const daysOld = Math.floor((Date.now() - new Date(post.createdAt).getTime()) / 86400000);
              const timeLabel = daysOld === 0
                ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: false }) + " ago"
                : formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

              return (
                <Link key={post.id} href={`/posts/${post.id}`}>
                  <div className={`px-4 py-3.5 border-b border-[#131a1f] hover:bg-[#0d1117] cursor-pointer transition-colors group`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Metadata row */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                            <span>{meta.icon}</span> {meta.label}
                          </span>
                          <span className="text-[#3a5060] text-[10px]">•</span>
                          <span className="text-[#3a5060] text-[10px]">{timeLabel}</span>
                          {post.location && (
                            <>
                              <span className="text-[#3a5060] text-[10px]">•</span>
                              <span className="flex items-center gap-0.5 text-[#4a6a7a] text-[10px]">
                                <MapPin className="w-2.5 h-2.5" />{post.location}
                              </span>
                            </>
                          )}
                        </div>
                        {/* Title */}
                        <h3 className="text-[#d0dde0] font-semibold text-[13px] leading-snug mb-1 group-hover:text-[#e7f0e7] transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        {/* Body preview */}
                        <p className="text-[#4a5a68] text-[11px] leading-relaxed line-clamp-1 mb-2">
                          {post.content}
                        </p>
                        {/* Footer */}
                        <div className="flex items-center gap-3 text-[#3a5060] text-[10px]">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" /> {post.upvotes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> {post.commentCount}
                          </span>
                          <span>{post.authorName ?? "Anonymous"}</span>
                        </div>
                      </div>
                      <PostThumb type={post.type} />
                    </div>
                  </div>
                </Link>
              );
            })}
      </div>
    </div>
  );
}

/* ─── Right Panel: AI Advisor mini ───────────────────── */
function AIAdvisorMini() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");

  const QUICK = [
    "What pests are affecting maize in my area?",
    "Is it a good time to sell grain this week?",
    "How much rainfall is expected this month?",
  ];

  function ask(q: string) {
    setLocation(`/ask?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="border-b border-[#1f2937] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center text-sm">🤖</div>
          <div>
            <span className="text-[#e7e9ea] text-[12px] font-bold">AI Advisor</span>
            <span className="ml-1.5 text-[9px] text-[#22c55e] font-bold bg-[#22c55e]/10 px-1.5 py-0.5 rounded-full border border-[#22c55e]/20">BETA</span>
          </div>
        </div>
      </div>
      <p className="text-[#4a6a7a] text-[11px] mb-3 leading-relaxed">Your AI agricultural analyst. Ask questions. Get intelligence.</p>

      {/* Input */}
      <div className="flex gap-1.5 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && query.trim() && ask(query)}
          placeholder="Ask Mshauri anything..."
          className="flex-1 bg-[#0d1117] border border-[#1f2937] rounded-lg px-3 py-2 text-[#e7e9ea] text-[11px] placeholder-[#2a3a4a] focus:outline-none focus:border-[#22c55e]/50 transition-colors"
        />
        <button
          onClick={() => query.trim() && ask(query)}
          className="p-2 bg-[#22c55e]/15 border border-[#22c55e]/30 rounded-lg text-[#22c55e] hover:bg-[#22c55e]/25 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-col gap-1.5 mb-3">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            className="flex items-center gap-2 text-left text-[10px] text-[#4a6a7a] hover:text-[#22c55e] transition-colors group"
          >
            <span className="w-1 h-1 rounded-full bg-[#22c55e]/40 group-hover:bg-[#22c55e] transition-colors shrink-0" />
            {q}
          </button>
        ))}
      </div>

      <button
        onClick={() => setLocation("/ask")}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-[11px] font-bold transition-colors"
      >
        Open full AI Advisor <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Right Panel: Top Communities ───────────────────── */
function TopCommunities({ communities }: { communities: Community[] }) {
  return (
    <div className="border-b border-[#1f2937] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#e7e9ea] text-[12px] font-bold">Top Communities</span>
        <Link href="/communities">
          <button className="text-[#4a6a7a] text-[10px] hover:text-[#22c55e] transition-colors">View all</button>
        </Link>
      </div>
      <div className="flex flex-col gap-1">
        {communities.slice(0, 6).map((c) => (
          <Link key={c.id} href={`/communities/${c.slug}`}>
            <div className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-[#0d1117] cursor-pointer transition-colors group">
              <div className="w-8 h-8 rounded-full bg-[#1a2a1a] border border-[#2a3a2a] flex items-center justify-center text-base shrink-0">
                {COMMUNITY_ICONS[c.slug] ?? "🌱"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#c0d0c8] text-[11px] font-medium group-hover:text-[#22c55e] transition-colors">r/{c.slug}</div>
                <div className="text-[#3a5060] text-[10px]">{(c.memberCount).toLocaleString()} members</div>
              </div>
              <ChevronRight className="w-3 h-3 text-[#2a3a4a] group-hover:text-[#22c55e] transition-colors shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Right Panel: Trending ───────────────────────────── */
function TrendingDiscussions({ posts }: { posts: Post[] }) {
  const trending = [...posts].sort((a, b) => b.upvotes - a.upvotes).slice(0, 5);
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#e7e9ea] text-[12px] font-bold">Trending Discussions</span>
      </div>
      <div className="flex flex-col gap-2">
        {trending.map((post) => {
          const meta = POST_TYPE_META[post.type];
          return (
            <Link key={post.id} href={`/posts/${post.id}`}>
              <div className="flex items-start gap-2 group cursor-pointer">
                <span className={`${meta?.color ?? "text-[#4a6a7a]"} text-[10px] font-black mt-0.5 w-5 text-right shrink-0`}>
                  {post.upvotes}
                </span>
                <span className="text-[#7a9a8a] text-[10px] mt-0.5 font-bold shrink-0">↑</span>
                <span className="text-[#8a9aaa] text-[11px] leading-tight group-hover:text-[#c0d0c8] transition-colors line-clamp-2">
                  {post.title}
                </span>
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

  function handleSearch(q: string) {
    setLocation(`/ask?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <TickerBar onReport={() => setLocation("/communities")} />

      {/* Body: scrollable main + sticky right panel */}
      <div className="flex flex-1 min-h-0">
        {/* Main scrollable column */}
        <div className="flex-1 overflow-y-auto min-w-0">
          <HeroSection onSearch={handleSearch} />
          <PulseCards />
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <h2 className="text-[#e7e9ea] text-[13px] font-bold uppercase tracking-wide flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-[#22c55e] animate-pulse" />
              Live Intelligence Feed
            </h2>
          </div>
          <IntelligenceFeed posts={posts} loading={loading} />
        </div>

        {/* Right panel — sticky, separate scroll */}
        <div className="hidden lg:flex flex-col w-[300px] xl:w-[320px] shrink-0 border-l border-[#131a1f] overflow-y-auto bg-[#080d10]">
          <AIAdvisorMini />
          <TopCommunities communities={communities} />
          <TrendingDiscussions posts={posts} />
        </div>
      </div>
    </div>
  );
}
