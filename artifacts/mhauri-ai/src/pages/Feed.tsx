import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  MessageCircle, MapPin, Share2,
  TrendingUp, TrendingDown, ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/* ─── types ─────────────────────────────────────────────── */
interface Post {
  id: number; communityId: number; type: string; title: string;
  content: string; location: string | null; upvotes: number;
  commentCount: number; authorName: string | null; createdAt: string;
}

/* ─── constants ──────────────────────────────────────────── */
const POST_META: Record<string, { label: string; color: string; bg: string }> = {
  disease_report: { label: "Disease Alert",  color: "text-red-400",    bg: "bg-red-500/10"     },
  market_price:   { label: "Market Update",  color: "text-emerald-400",bg: "bg-emerald-500/10" },
  weather:        { label: "Climate Alert",  color: "text-blue-400",   bg: "bg-blue-500/10"    },
  opportunity:    { label: "Opportunity",    color: "text-purple-400", bg: "bg-purple-500/10"  },
  question:       { label: "Question",       color: "text-yellow-400", bg: "bg-yellow-500/10"  },
  success_story:  { label: "Success Story",  color: "text-green-400",  bg: "bg-green-500/10"   },
};

const MARKET_SNAPSHOT = [
  { crop:"Maize",      price:"$0.28/kg", change:"+3%",  up: true  },
  { crop:"Tomatoes",   price:"$0.45/kg", change:"+15%", up: true  },
  { crop:"Soya Beans", price:"$0.62/kg", change:"-2%",  up: false },
  { crop:"Groundnuts", price:"$1.10/kg", change:"0%",   up: null  },
  { crop:"Cotton",     price:"$0.85/kg", change:"+2%",  up: true  },
];

// Maricho Media resource promo cards — interspersed every 7 posts
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

type SortMode = "helpful" | "recent";

function sortPosts(posts: Post[], mode: SortMode) {
  const c = [...posts];
  if (mode === "helpful") c.sort((a, b) => b.upvotes - a.upvotes);
  if (mode === "recent")  c.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return c;
}

/* ─── Maricho promo card ─────────────────────────────────── */
function MarichoPromoCard({ resource }: { resource: typeof MARICHO_RESOURCES[number] }) {
  return (
    <div className={`flex items-start gap-3 border rounded-2xl p-4 mb-3 ${resource.color}`}>
      <span className="text-2xl shrink-0">{resource.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold text-[#818384] uppercase tracking-wider">Maricho Media</span>
          <span className="text-[9px] bg-[#272729] border border-[#343536] text-[#818384] px-1.5 py-0.5 rounded-full">{resource.tag}</span>
        </div>
        <h3 className="text-[#d7dadc] font-semibold text-[13px] leading-snug mb-1">{resource.title}</h3>
        <p className="text-[#818384] text-[11px] leading-relaxed mb-2.5">{resource.desc}</p>
        <button className="flex items-center gap-1 text-[#22c55e] text-[11px] font-bold hover:underline">
          <ExternalLink className="w-3 h-3" /> {resource.cta}
        </button>
      </div>
    </div>
  );
}

/* ─── Sort toggle ────────────────────────────────────────── */
function SortToggle({ sort, setSort }: { sort: SortMode; setSort: (m: SortMode) => void }) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {(["helpful", "recent"] as SortMode[]).map(mode => (
        <button key={mode} onClick={() => setSort(mode)}
          className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all capitalize ${
            sort === mode
              ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
              : "text-[#818384] hover:text-[#d7dadc] border border-transparent hover:border-[#343536]"
          }`}
        >
          {mode === "helpful" ? "Most Helpful" : "Recent"}
        </button>
      ))}
    </div>
  );
}

/* ─── Post card ──────────────────────────────────────────── */
function PostCard({ post }: { post: Post }) {
  const [, nav] = useLocation();
  const meta = POST_META[post.type] ?? POST_META.question;
  const time = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  return (
    <div
      onClick={() => nav(`/posts/${post.id}`)}
      className="bg-[#16181C] border border-[#2F3336] hover:border-[#4a5568] rounded-2xl p-4 mb-3 cursor-pointer transition-all group"
    >
      {/* Meta line */}
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

      {/* Title */}
      <h3 className="text-[#E7E9EA] font-bold text-[16px] leading-tight mb-2 group-hover:text-white transition-colors">
        {post.title}
      </h3>

      {/* Content preview */}
      <p className="text-[#71767B] text-[13px] leading-relaxed line-clamp-2 mb-3">
        {post.content}
      </p>

      {/* Actions bar */}
      <div className="flex items-center gap-0.5 pt-3 border-t border-[#2F3336]">
        <span className="flex items-center gap-1.5 text-[#71767B] text-[11px] font-medium px-2 py-1">
          👍 {post.upvotes} helpful
        </span>
        <span className="flex items-center gap-1.5 text-[#71767B] text-[11px] font-medium px-2 py-1">
          <MessageCircle className="w-3.5 h-3.5" /> {post.commentCount} {post.commentCount === 1 ? "reply" : "replies"}
        </span>
        <button
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 text-[#71767B] hover:text-[#d7dadc] text-[11px] font-medium px-2 py-1 rounded-full hover:bg-white/5 transition-colors ml-auto"
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

/* ─── Right panel cards ──────────────────────────────────── */
function AboutCard() {
  const [, nav] = useLocation();
  return (
    <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl overflow-hidden mb-3">
      <div className="h-10 bg-gradient-to-r from-[#16a34a] to-[#22c55e]" />
      <div className="px-4 pb-4">
        <div className="flex items-end gap-2 -mt-5 mb-3">
          <img src="/mshauri-logo.png" alt="Mshauri" className="w-12 h-12 rounded-full border-2 border-[#16181C] bg-black object-contain" />
        </div>
        <h2 className="font-bold text-[#E7E9EA] text-[13px] mb-1">About Mshauri</h2>
        <p className="text-[#71767B] text-[11px] leading-relaxed mb-3">
          AI-powered agricultural intelligence for Zimbabwean farmers. Ask in English, Shona or Ndebele.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div className="font-black text-[#E7E9EA] text-[14px]">1,204</div>
            <div className="text-[#71767B] text-[10px]">Farmers</div>
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

function MarketSnapshot() {
  return (
    <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 mb-3">
      <h3 className="font-bold text-[#E7E9EA] text-[11px] uppercase tracking-wider mb-3">Market Snapshot</h3>
      <div className="flex flex-col gap-2.5">
        {MARKET_SNAPSHOT.map(item => (
          <div key={item.crop} className="flex items-center justify-between">
            <span className="text-[#E7E9EA] text-[12px]">{item.crop}</span>
            <div className="flex items-center gap-2">
              <span className="text-[#E7E9EA] text-[11px] font-semibold">{item.price}</span>
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
                item.up === true ? "text-[#22c55e]" : item.up === false ? "text-[#ef4444]" : "text-[#71767B]"
              }`}>
                {item.up === true && <TrendingUp className="w-3 h-3" />}
                {item.up === false && <TrendingDown className="w-3 h-3" />}
                {item.change}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FarmersOnline() {
  return (
    <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 mb-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse shrink-0" />
        <span className="text-[#E7E9EA] text-[12px] font-semibold">1,204 farmers active today</span>
      </div>
      <p className="text-[#71767B] text-[11px] mt-1 pl-4">Across Zimbabwe — Harare, Bulawayo, Mutare and more</p>
    </div>
  );
}

/* ─── Main Feed ──────────────────────────────────────────── */
export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("helpful");

  useEffect(() => {
    fetch("/api/posts?sort=new&limit=40")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPosts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const feed = sortPosts(posts, sort);

  type FeedItem = { kind: "post"; post: Post } | { kind: "promo"; resource: typeof MARICHO_RESOURCES[number] };
  const feedItems: FeedItem[] = [];
  let promoIdx = 0;
  feed.forEach((post, i) => {
    feedItems.push({ kind: "post", post });
    if ((i + 1) % 7 === 0 && promoIdx < MARICHO_RESOURCES.length) {
      feedItems.push({ kind: "promo", resource: MARICHO_RESOURCES[promoIdx++] });
    }
  });

  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1b]">
      <div className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex gap-6">
          {/* Feed column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[#E7E9EA] font-bold text-[15px]">Most Helpful Discussions</h2>
            </div>
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

          {/* Right panel */}
          <div className="hidden lg:block w-[300px] shrink-0">
            <div className="sticky top-5">
              <AboutCard />
              <MarketSnapshot />
              <FarmersOnline />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
