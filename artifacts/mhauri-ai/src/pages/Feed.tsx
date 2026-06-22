import { useState, useEffect, useCallback, useMemo } from "react";
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
  imageUrl?: string | null;
  videoUrl?: string | null;
  linkUrl?: string | null;
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

interface NewsItem { title: string; link: string; description: string; pubDate: string; image: string; }

type SortMode = "helpful" | "recent";

/* ─── Market signal (same logic as MarketPrices page) ─────── */
function deterministicChange(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return (h % 41) - 20;
}

/* ─── Subcomponents ──────────────────────────────────────── */

const WA_LINK = "https://wa.me/263714280244?text=Hi%2C%20I%20want%20to%20connect%20with%20Mshauri";

/** Horizontal situational awareness strip */
function AwarenessStrip({
  topMover, pulseCount, loadingMover, stats,
}: {
  topMover: { item: string; priceUsd: number; pct: number } | null;
  pulseCount: number;
  loadingMover: boolean;
  stats: SiteStats | null;
}) {
  const cards = [
    /* Ask Mshauri AI */
    <button key="askai" onClick={() => { window.location.href = "/ask"; }}
      className="shrink-0 w-52 bg-[#16181C] border border-[#22c55e]/40 border-l-2 border-l-[#22c55e] rounded-2xl p-3.5 flex flex-col justify-between h-[90px] hover:bg-[#22c55e]/5 transition-colors text-left cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-6 h-6 rounded-lg object-contain bg-black shrink-0" />
        <div className="text-[#E7E9EA] font-bold text-[13px] leading-tight">Ask Mshauri AI</div>
      </div>
      <div className="text-[#71767B] text-[10px] leading-snug">Crops, pests, markets & farming advice</div>
      <div className="text-[#22c55e] text-[10px] font-semibold">Ask now →</div>
    </button>,

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

      {/* Media preview */}
      {post.imageUrl && (
        <div className="rounded-xl overflow-hidden mb-2.5 bg-black border border-[#2F3336]">
          <img src={post.imageUrl} alt="Post image" className="w-full max-h-64 object-cover" />
        </div>
      )}
      {post.videoUrl && (
        <div className="rounded-xl overflow-hidden mb-2.5 bg-black border border-[#2F3336]">
          <video src={post.videoUrl} className="w-full max-h-64" controls preload="metadata" />
        </div>
      )}
      {post.linkUrl && !post.imageUrl && !post.videoUrl && (
        <div className="flex items-center gap-2 mb-2.5 bg-[#1a1a1b] border border-[#2F3336] rounded-xl px-3 py-2.5">
          <span className="text-[#71767B] text-[12px]">🔗</span>
          <a href={post.linkUrl} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[#22c55e] text-[12px] truncate hover:underline">{post.linkUrl}</a>
        </div>
      )}

      {!post.imageUrl && !post.videoUrl && (
        <p className="text-[#71767B] text-[13px] leading-relaxed line-clamp-2 mb-3">
          {post.content}
        </p>
      )}

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
        <a
          href={WA_LINK}
          target="_blank"
          rel="noreferrer"
          className="w-full bg-[#25d366] hover:bg-[#1fbd57] text-white text-[12px] font-bold py-2 rounded-full transition-colors flex items-center justify-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{width:"12px",height:"12px",fill:"white",flexShrink:0}}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Ask on WhatsApp →
        </a>
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

/** WhatsApp "Ask Mshauri" card for right sidebar */
function WhatsAppCard() {
  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noreferrer"
      className="block bg-[#16181C] border border-[#25d366]/30 rounded-2xl p-4 mb-3 hover:bg-[#25d366]/5 transition-colors group"
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-white" xmlns="http://www.w3.org/2000/svg" style={{width:"18px",height:"18px"}}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <span className="text-[#E7E9EA] text-[13px] font-semibold">Ask Mshauri on WhatsApp</span>
      </div>
      <p className="text-[#71767B] text-[11px] leading-relaxed mb-3">
        Get instant farming advice on WhatsApp. Ask about crops, pests, prices and more — in English, Shona or Ndebele.
      </p>
      <div className="w-full bg-[#25d366] hover:bg-[#1fbd57] text-white text-[12px] font-bold py-2.5 rounded-full transition-colors flex items-center justify-center gap-2">
        <svg viewBox="0 0 24 24" className="fill-white" xmlns="http://www.w3.org/2000/svg" style={{width:"13px",height:"13px"}}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Chat on WhatsApp →
      </div>
    </a>
  );
}

/* ─── Right-panel widgets ────────────────────────────────── */

function PopularPostsWidget({ posts }: { posts: Post[] }) {
  if (!posts.length) return null;
  return (
    <div className="bg-[#16181C] border border-[#2F3336] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2F3336]">
        <h3 className="text-[#E7E9EA] font-bold text-[12px] uppercase tracking-wide">🔥 Popular Posts</h3>
      </div>
      <div className="divide-y divide-[#2F3336]/60">
        {posts.map((p, i) => (
          <Link key={p.id} href={`/posts/${p.id}`}>
            <div className="flex gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer">
              <span className="text-[#71767B] font-black text-[14px] w-4 shrink-0">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-[#E7E9EA] text-[12px] font-semibold leading-snug line-clamp-2">{p.title}</p>
                <div className="text-[#71767B] text-[10px] mt-1">▲ {p.upvotes} · 💬 {p.commentCount}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewsWidget({ items }: { items: NewsItem[] }) {
  if (!items.length) return null;
  return (
    <div className="bg-[#16181C] border border-[#2F3336] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2F3336] flex items-center justify-between">
        <h3 className="text-[#E7E9EA] font-bold text-[12px] uppercase tracking-wide">📰 Maricho News</h3>
        <a href="https://marichomedia.com" target="_blank" rel="noreferrer"
          className="text-[#22c55e] text-[10px] font-semibold hover:underline">
          View all →
        </a>
      </div>
      <div className="divide-y divide-[#2F3336]/60">
        {items.map((item, i) => (
          <a key={i} href={item.link} target="_blank" rel="noreferrer"
            className="flex gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
          >
            {item.image ? (
              <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[#272729]" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#272729] flex items-center justify-center shrink-0 text-xl">📰</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[#E7E9EA] text-[12px] font-semibold leading-snug line-clamp-2">{item.title}</p>
              {item.description && (
                <p className="text-[#71767B] text-[10px] mt-0.5 line-clamp-2">{item.description}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Feed ──────────────────────────────────────────── */
export default function Feed() {
  const [posts, setPosts]               = useState<Post[]>([]);
  const [loading, setLoading]           = useState(true);
  const [sort, setSort]                 = useState<SortMode>("helpful");

  /* awareness strip state */
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

  /* news from Maricho Media */
  const [news, setNews] = useState<NewsItem[]>([]);
  useEffect(() => {
    fetch("/api/news")
      .then(r => r.json())
      .then(d => Array.isArray(d) && setNews(d))
      .catch(() => {});
  }, []);

  /* top posts for right panel */
  const popularPosts = useMemo(
    () => [...posts].sort((a, b) => b.upvotes - a.upvotes).slice(0, 5),
    [posts]
  );

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
          topMover={topMover}
          pulseCount={pulseCount}
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
            <div className="sticky top-5 flex flex-col gap-4 max-h-[calc(100dvh-80px)] overflow-y-auto pr-0.5">
              <AboutCard stats={stats} />
              <PopularPostsWidget posts={popularPosts} />
              {news.length > 0 && <NewsWidget items={news} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
