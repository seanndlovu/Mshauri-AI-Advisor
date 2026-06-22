import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import {
  MessageCircle, Share2, ExternalLink,
  MapPin, Loader2, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/* ─── Types ──────────────────────────────────────────────── */
interface Post {
  id: number; communityId: number; type: string; title: string;
  content: string; location: string | null; upvotes: number;
  commentCount: number; authorName: string | null; createdAt: string;
}

interface WeatherData {
  temp: number;
  precip: number;
  code: number;
}

interface MarketItem {
  item: string;
  priceUsd: number;
}

/* ─── Constants ──────────────────────────────────────────── */
const POST_META: Record<string, { label: string; color: string; bg: string }> = {
  disease_report: { label: "Disease Alert",  color: "text-red-400",    bg: "bg-red-500/10"     },
  market_price:   { label: "Market Update",  color: "text-emerald-400",bg: "bg-emerald-500/10" },
  weather:        { label: "Climate Alert",  color: "text-blue-400",   bg: "bg-blue-500/10"    },
  opportunity:    { label: "Opportunity",    color: "text-purple-400", bg: "bg-purple-500/10"  },
  question:       { label: "Question",       color: "text-yellow-400", bg: "bg-yellow-500/10"  },
  success_story:  { label: "Success Story",  color: "text-green-400",  bg: "bg-green-500/10"   },
};

const MARICHO_RESOURCES = [
  {
    icon: "📅", tag: "Free Download",
    title: "Zimbabwe Crop Planting Calendar 2025",
    desc: "Month-by-month planting guide for all major crops — maize, soya, groundnuts, vegetables and more.",
    cta: "Download PDF", color: "border-[#22c55e]/30 bg-[#22c55e]/5",
  },
  {
    icon: "🐛", tag: "Pest Guide",
    title: "Fall Armyworm Identification & Control",
    desc: "Identify the #1 maize pest early. Spray timing, dosage charts, and IPM strategies for smallholder farmers.",
    cta: "View Guide", color: "border-orange-500/30 bg-orange-500/5",
  },
  {
    icon: "🌱", tag: "Conservation Farming",
    title: "Conservation Agriculture Manual — Free PDF",
    desc: "Boost yields by 30% while protecting your soil. Proven methods used by 10,000+ Zimbabwean farmers.",
    cta: "Download PDF", color: "border-blue-500/30 bg-blue-500/5",
  },
  {
    icon: "💰", tag: "Business Tool",
    title: "Maize Production Business Plan Template",
    desc: "Bankable business plan template ready for agro-lending. Includes cost tables and profit projections.",
    cta: "Get Template", color: "border-purple-500/30 bg-purple-500/5",
  },
];

interface SiteStats {
  userCount: number;
  postsToday: number;
}

type SortMode = "helpful" | "recent";

/* ─── Market signal (same logic as MarketPrices page) ─────── */
function deterministicChange(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return (h % 41) - 20;
}

/* ─── Weather helpers ────────────────────────────────────── */
function weatherEmoji(code: number): string {
  if (code === 0)          return "☀️";
  if (code <= 3)           return "🌤️";
  if (code <= 48)          return "🌫️";
  if (code <= 55)          return "🌦️";
  if (code <= 65)          return "🌧️";
  if (code <= 82)          return "🌧️";
  if (code <= 86)          return "🌨️";
  return "⛈️";
}

function weatherAdvice(code: number, precip: number): string {
  if (code >= 95)          return "Thunderstorm — stay safe";
  if (code >= 80)          return "Rain showers — check drainage";
  if (code >= 61)          return "Rain today — avoid field work";
  if (code >= 51)          return "Light drizzle — monitor fields";
  if (precip >= 60)        return "Rain likely — protect harvested crops";
  if (precip >= 30)        return "Some rain possible — stay prepared";
  if (code === 0)          return "Clear sky — good planting conditions";
  if (code <= 2)           return "Good farming conditions today";
  return "Partly cloudy — check soil moisture";
}

/* ─── Subcomponents ──────────────────────────────────────── */

/** Horizontal situational awareness strip */
function AwarenessStrip({
  weather, topMover, pulseCount, loadingWeather, loadingMover, stats,
}: {
  weather: WeatherData | null;
  topMover: { item: string; priceUsd: number; pct: number } | null;
  pulseCount: number;
  loadingWeather: boolean;
  loadingMover: boolean;
  stats: SiteStats | null;
}) {
  const cards = [
    /* Weather */
    <div key="weather" className="shrink-0 w-52 bg-[#16181C] border border-[#2F3336] border-l-2 border-l-[#22c55e] rounded-2xl p-3.5 flex flex-col justify-between h-[90px]">
      {loadingWeather ? (
        <div className="flex items-center gap-2 text-[#71767B] text-[12px]">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading weather…
        </div>
      ) : weather ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[22px] leading-none">{weatherEmoji(weather.code)}</span>
            <div>
              <div className="text-[#E7E9EA] font-black text-[16px] leading-none">{weather.temp.toFixed(0)}°C</div>
              <div className="text-[#71767B] text-[10px]">{weather.precip}% rain chance</div>
            </div>
          </div>
          <div className="text-[#22c55e] text-[10px] font-semibold leading-tight">
            {weatherAdvice(weather.code, weather.precip)}
          </div>
        </>
      ) : (
        <div className="text-[#71767B] text-[11px]">Weather unavailable</div>
      )}
    </div>,

    /* Top market mover */
    <Link key="mover" href="/prices">
      <div className="shrink-0 w-52 bg-[#16181C] border border-[#2F3336] border-l-2 border-l-[#22c55e] rounded-2xl p-3.5 flex flex-col justify-between h-[90px] cursor-pointer hover:border-[#3F4448] transition-colors">
        {loadingMover ? (
          <div className="flex items-center gap-2 text-[#71767B] text-[12px]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading prices…
          </div>
        ) : topMover ? (
          <>
            <div>
              <div className="text-[#71767B] text-[10px] uppercase tracking-wider font-bold mb-0.5">Top Mover</div>
              <div className="text-[#E7E9EA] font-bold text-[14px] leading-tight truncate">{topMover.item}</div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#E7E9EA] font-black text-[15px]">${topMover.priceUsd.toFixed(2)}</span>
              <span className={`flex items-center gap-0.5 text-[12px] font-bold ${topMover.pct >= 0 ? "text-[#22c55e]" : "text-red-400"}`}>
                {topMover.pct >= 0
                  ? <ArrowUpRight className="w-3.5 h-3.5" />
                  : <ArrowDownRight className="w-3.5 h-3.5" />
                }
                {topMover.pct > 0 ? "+" : ""}{topMover.pct}%
              </span>
            </div>
          </>
        ) : (
          <div className="text-[#71767B] text-[11px]">Market data unavailable</div>
        )}
      </div>
    </Link>,

    /* Community pulse */
    <div key="pulse" className="shrink-0 w-52 bg-[#16181C] border border-[#2F3336] border-l-2 border-l-[#22c55e] rounded-2xl p-3.5 flex flex-col justify-between h-[90px]">
      <div>
        <div className="text-[#71767B] text-[10px] uppercase tracking-wider font-bold mb-0.5">Community Pulse</div>
        <div className="text-[#E7E9EA] font-black text-[18px] leading-none">
          {stats ? (stats.postsToday > 0 ? stats.postsToday : pulseCount || "—") : (pulseCount || "—")}
        </div>
        <div className="text-[#71767B] text-[11px] mt-0.5">new discussions today</div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
        <span className="text-[#22c55e] text-[10px] font-semibold">
          {stats ? `${stats.userCount.toLocaleString()} members` : "members active"}
        </span>
      </div>
    </div>,
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 mb-5 scrollbar-hide">
      {cards}
    </div>
  );
}

function MarichoPromoCard({ resource }: { resource: typeof MARICHO_RESOURCES[number] }) {
  return (
    <div className={`flex items-start gap-3 border rounded-2xl p-4 mb-3 ${resource.color}`}>
      <span className="text-2xl shrink-0">{resource.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold text-[#71767B] uppercase tracking-wider">Maricho Media</span>
          <span className="text-[9px] bg-[#1a1a1b] border border-[#2F3336] text-[#71767B] px-1.5 py-0.5 rounded-full">{resource.tag}</span>
        </div>
        <h3 className="text-[#E7E9EA] font-semibold text-[13px] leading-snug mb-1">{resource.title}</h3>
        <p className="text-[#71767B] text-[11px] leading-relaxed mb-2.5">{resource.desc}</p>
        <button className="flex items-center gap-1 text-[#22c55e] text-[11px] font-bold hover:underline">
          <ExternalLink className="w-3 h-3" /> {resource.cta}
        </button>
      </div>
    </div>
  );
}

function SortToggle({ sort, setSort }: { sort: SortMode; setSort: (m: SortMode) => void }) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {(["helpful", "recent"] as SortMode[]).map(mode => (
        <button key={mode} onClick={() => setSort(mode)}
          className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${
            sort === mode
              ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
              : "text-[#71767B] hover:text-[#E7E9EA] border border-transparent hover:border-[#2F3336]"
          }`}
        >
          {mode === "helpful" ? "Most Helpful" : "Recent"}
        </button>
      ))}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const [, nav] = useLocation();
  const meta = POST_META[post.type] ?? POST_META.question;
  const time = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  return (
    <div
      onClick={() => nav(`/posts/${post.id}`)}
      className="bg-[#16181C] border border-[#2F3336] hover:border-[#4a5568] rounded-2xl p-4 mb-3 cursor-pointer transition-all group"
    >
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
          {meta.label}
        </span>
        <span className="text-[#2F3336] text-[10px]">·</span>
        <span className="text-[#71767B] text-[11px]">u/{post.authorName ?? "anonymous"}</span>
        <span className="text-[#2F3336] text-[10px]">·</span>
        <span className="text-[#71767B] text-[11px]">{time}</span>
        {post.location && (
          <>
            <span className="text-[#2F3336] text-[10px]">·</span>
            <span className="flex items-center gap-0.5 text-[#71767B] text-[11px]">
              <MapPin className="w-2.5 h-2.5" />{post.location}
            </span>
          </>
        )}
      </div>

      <h3 className="text-[#E7E9EA] font-bold text-[16px] leading-tight mb-2 group-hover:text-white transition-colors">
        {post.title}
      </h3>

      <p className="text-[#71767B] text-[13px] leading-relaxed line-clamp-2 mb-3">
        {post.content}
      </p>

      <div className="flex items-center gap-0.5 pt-3 border-t border-[#2F3336]">
        <span className="flex items-center gap-1.5 text-[#71767B] text-[11px] font-medium px-2 py-1">
          👍 {post.upvotes} helpful
        </span>
        <span className="flex items-center gap-1.5 text-[#71767B] text-[11px] font-medium px-2 py-1">
          <MessageCircle className="w-3.5 h-3.5" /> {post.commentCount} {post.commentCount === 1 ? "reply" : "replies"}
        </span>
        <button
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 text-[#71767B] hover:text-[#E7E9EA] text-[11px] font-medium px-2 py-1 rounded-full hover:bg-white/5 transition-colors ml-auto"
        >
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 mb-3">
      <div className="h-3 w-40 bg-white/5 rounded-full animate-pulse mb-3" />
      <div className="h-5 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
      <div className="h-3 w-full bg-white/5 rounded animate-pulse mb-1.5" />
      <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse" />
    </div>
  );
}

function AboutCard({ stats }: { stats: SiteStats | null }) {
  const [, nav] = useLocation();
  return (
    <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl overflow-hidden mb-3">
      <div className="h-10 bg-gradient-to-r from-[#16a34a] to-[#22c55e]" />
      <div className="px-4 pb-4">
        <div className="flex items-end gap-2 -mt-5 mb-3">
          <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-16 h-16 rounded-xl bg-black object-contain" />
        </div>
        <h2 className="font-bold text-[#E7E9EA] text-[13px] mb-1">About Mshauri</h2>
        <p className="text-[#71767B] text-[11px] leading-relaxed mb-3">
          Explore markets, climate, policy, nutrition, trade, food security, investment and emerging trends.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div className="font-black text-[#E7E9EA] text-[14px]">{stats ? stats.userCount.toLocaleString() : "—"}</div>
            <div className="text-[#71767B] text-[10px]">Members</div>
          </div>
          <div>
            <div className="font-black text-[#22c55e] text-[14px]">Online</div>
            <div className="text-[#71767B] text-[10px]">24 / 7</div>
          </div>
        </div>
        <div className="h-px bg-[#2F3336] mb-3" />
        <button
          onClick={() => nav("/ask")}
          className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white text-[12px] font-bold py-2 rounded-full transition-colors"
        >
          Ask Mshauri AI →
        </button>
      </div>
    </div>
  );
}

function FarmersOnline({ stats }: { stats: SiteStats | null }) {
  return (
    <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 mb-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse shrink-0" />
        <span className="text-[#E7E9EA] text-[12px] font-semibold">
          {stats ? `${stats.userCount.toLocaleString()} members registered` : "Members active today"}
        </span>
      </div>
      <p className="text-[#71767B] text-[11px] mt-1 pl-4">Across Zimbabwe — Harare, Bulawayo, Mutare and more</p>
    </div>
  );
}

/** Ask Mshauri CTA block — used in right panel (desktop) and sticky bar (mobile) */
function AskMshauriCTA({ compact = false }: { compact?: boolean }) {
  const [, nav] = useLocation();
  if (compact) {
    return (
      <button
        onClick={() => nav("/ask")}
        className="flex items-center justify-between w-full bg-[#16181C] border border-[#22c55e]/30 rounded-2xl px-4 py-3 hover:bg-[#22c55e]/5 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-7 h-7 object-contain shrink-0" />
          <span className="text-[#E7E9EA] text-[13px] font-semibold">Explore markets, climate, policy, nutrition, trade and more</span>
        </div>
        <span className="text-[#22c55e] text-[12px] font-bold group-hover:translate-x-0.5 transition-transform">
          Ask Mshauri →
        </span>
      </button>
    );
  }
  return (
    <div className="bg-[#16181C] border border-[#22c55e]/30 rounded-2xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-7 h-7 object-contain shrink-0" />
        <span className="text-[#E7E9EA] text-[13px] font-semibold">Ask Mshauri AI</span>
      </div>
      <p className="text-[#71767B] text-[11px] leading-relaxed mb-3">
        Explore markets, climate, policy, nutrition, trade, food security, investment and emerging trends.
      </p>
      <button
        onClick={() => nav("/ask")}
        className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white text-[12px] font-bold py-2.5 rounded-full transition-colors"
      >
        Ask Mshauri AI →
      </button>
    </div>
  );
}

/* ─── Main Feed ──────────────────────────────────────────── */
export default function Feed() {
  const [posts, setPosts]               = useState<Post[]>([]);
  const [loading, setLoading]           = useState(true);
  const [sort, setSort]                 = useState<SortMode>("helpful");

  /* awareness strip state */
  const [weather, setWeather]           = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [topMover, setTopMover]         = useState<{ item: string; priceUsd: number; pct: number } | null>(null);
  const [loadingMover, setLoadingMover] = useState(true);
  const [stats, setStats]               = useState<SiteStats | null>(null);

  /* fetch posts */
  useEffect(() => {
    fetch("/api/posts?sort=top&limit=40")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPosts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  /* fetch weather */
  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-17.83&longitude=31.05" +
      "&current=temperature_2m,precipitation_probability,weather_code&timezone=Africa%2FHarare"
    )
      .then(r => r.json())
      .then(json => {
        const c = json?.current;
        if (c) setWeather({ temp: c.temperature_2m, precip: c.precipitation_probability, code: c.weather_code });
      })
      .catch(() => {})
      .finally(() => setLoadingWeather(false));
  }, []);

  /* fetch site stats */
  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then((d: SiteStats) => { if (d?.userCount !== undefined) setStats(d); })
      .catch(() => {});
  }, []);

  /* fetch top market mover */
  useEffect(() => {
    fetch("/api/market-prices/live")
      .then(r => r.json())
      .then(json => {
        const items: MarketItem[] = json?.data ?? [];
        if (!items.length) return;
        const withPct = items.map(it => ({ ...it, pct: deterministicChange(it.item) }));
        const top = withPct.reduce((best, cur) => cur.pct > best.pct ? cur : best, withPct[0]);
        setTopMover({ item: top.item, priceUsd: top.priceUsd, pct: top.pct });
      })
      .catch(() => {})
      .finally(() => setLoadingMover(false));
  }, []);

  /* pulse = posts from last 24 h */
  const pulseCount = posts.filter(
    p => Date.now() - new Date(p.createdAt).getTime() < 86_400_000
  ).length;

  /* sorted feed with promo cards interspersed every 7 posts */
  const sortedPosts = useCallback(() => {
    const c = [...posts];
    if (sort === "helpful") c.sort((a, b) => b.upvotes - a.upvotes);
    else c.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return c;
  }, [posts, sort])();

  type FeedItem = { kind: "post"; post: Post } | { kind: "promo"; resource: typeof MARICHO_RESOURCES[number] };
  const feedItems: FeedItem[] = [];
  let promoIdx = 0;
  sortedPosts.forEach((post, i) => {
    feedItems.push({ kind: "post", post });
    if ((i + 1) % 7 === 0 && promoIdx < MARICHO_RESOURCES.length) {
      feedItems.push({ kind: "promo", resource: MARICHO_RESOURCES[promoIdx++] });
    }
  });

  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1b]">
      <div className="max-w-5xl mx-auto px-4 py-5">

        {/* Situational Awareness Strip */}
        <AwarenessStrip
          weather={weather}
          topMover={topMover}
          pulseCount={pulseCount}
          loadingWeather={loadingWeather}
          loadingMover={loadingMover}
          stats={stats}
        />

        <div className="flex gap-6">
          {/* ── Feed column ── */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[#E7E9EA] font-bold text-[15px] mb-1">Most Helpful Discussions</h2>
            <SortToggle sort={sort} setSort={setSort} />

            {loading
              ? Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)
              : feedItems.length === 0
              ? (
                <div className="text-center py-16 text-[#71767B]">
                  <div className="text-4xl mb-3">🌱</div>
                  <p className="font-semibold">No posts yet</p>
                  <p className="text-sm mt-1">Be the first to share knowledge</p>
                </div>
              )
              : feedItems.map((item, i) =>
                  item.kind === "post"
                    ? <PostCard key={`post-${item.post.id}`} post={item.post} />
                    : <MarichoPromoCard key={`promo-${i}`} resource={item.resource} />
                )
            }
          </div>

          {/* ── Right panel (desktop) ── */}
          <div className="hidden lg:block w-[300px] shrink-0">
            <div className="sticky top-5">
              <AboutCard stats={stats} />
              <FarmersOnline stats={stats} />
              <AskMshauriCTA />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Ask Mshauri CTA (mobile) ── */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 px-4 pb-2 pointer-events-none">
        <div className="pointer-events-auto">
          <AskMshauriCTA compact />
        </div>
      </div>
    </div>
  );
}
