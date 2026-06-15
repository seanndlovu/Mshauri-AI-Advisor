import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import {
  MessageCircle, MapPin, Share2, Bookmark,
  Flame, Sparkles, BarChart3, PenSquare,
  TrendingUp, TrendingDown, ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { CreatePostModal } from "@/components/CreatePostModal";

/* ─── types ───────────────────────────────────────────── */
interface Post {
  id: number; communityId: number; type: string; title: string;
  content: string; location: string | null; upvotes: number;
  downvotes: number; commentCount: number; authorName: string | null;
  createdAt: string;
}
interface Community { id: number; slug: string; name: string; memberCount: number; postCount: number; }

/* ─── constants ───────────────────────────────────────── */
const POST_META: Record<string, { label: string; color: string; bg: string }> = {
  disease_report: { label: "Disease Alert",  color: "text-red-400",    bg: "bg-red-500/10"     },
  market_price:   { label: "Market Update",  color: "text-emerald-400",bg: "bg-emerald-500/10" },
  weather:        { label: "Climate Alert",  color: "text-blue-400",   bg: "bg-blue-500/10"    },
  opportunity:    { label: "Opportunity",    color: "text-purple-400", bg: "bg-purple-500/10"  },
  question:       { label: "Question",       color: "text-yellow-400", bg: "bg-yellow-500/10"  },
  success_story:  { label: "Success Story",  color: "text-green-400",  bg: "bg-green-500/10"   },
};

const COMMUNITY_ICONS: Record<string, string> = {
  maize:"🌽", livestock:"🐄", poultry:"🐔", vegetables:"🥬",
  tobacco:"🌿", pests:"🐛", irrigation:"💧", agribusiness:"💼",
  climate:"🌦️", soils:"🪱",
};

const MARKET_SNAPSHOT = [
  { crop:"Maize",      price:"$0.28/kg", change:"+3%",  up: true  },
  { crop:"Tomatoes",   price:"$0.45/kg", change:"+15%", up: true  },
  { crop:"Soya Beans", price:"$0.62/kg", change:"-2%",  up: false },
  { crop:"Groundnuts", price:"$1.10/kg", change:"0%",   up: null  },
  { crop:"Cotton",     price:"$0.85/kg", change:"+2%",  up: true  },
];

const TOPICS = [
  "Crop Disease","Soil Health","Planting Guide","Pest Control",
  "Market Prices","Irrigation","Livestock","Alerts","Seeds","Weather",
];

// Maricho Media resource promo cards — shown every 7th item
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

type SortMode = "hot" | "new" | "top";

function hotScore(p: Post) {
  const h = (Date.now() - new Date(p.createdAt).getTime()) / 3_600_000;
  return p.upvotes / Math.pow(h + 2, 1.5);
}
function sortPosts(posts: Post[], mode: SortMode) {
  const c = [...posts];
  if (mode === "new") c.sort((a,b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  if (mode === "top") c.sort((a,b) => b.upvotes - a.upvotes);
  if (mode === "hot") c.sort((a,b) => hotScore(b) - hotScore(a));
  return c;
}

/* ─── Maricho Media promo card ───────────────────────── */
function MarichoPromoCard({ resource }: { resource: typeof MARICHO_RESOURCES[number] }) {
  return (
    <div className={`flex items-start gap-3 border rounded-lg p-4 mb-2 ${resource.color}`}>
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

/* ─── CreatePostBar ───────────────────────────────────── */
function CreatePostBar({ onOpen }: { onOpen: () => void }) {
  const { user } = useAuth();
  const initials = user?.name?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() ?? "?";
  return (
    <div className="flex items-center gap-2 bg-[#1e2025] border border-[#343536] rounded-lg p-2 mb-3">
      <div className="w-9 h-9 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] font-black text-[12px] shrink-0">
        {user ? initials : "?"}
      </div>
      <button
        onClick={onOpen}
        className="flex-1 text-left bg-[#272729] hover:bg-[#2d2e30] border border-[#343536] rounded-md px-4 py-2 text-[#818384] text-[13px] transition-colors"
      >
        Share your agricultural knowledge…
      </button>
      <button
        onClick={onOpen}
        className="flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-[12px] font-bold px-4 py-2 rounded-full transition-colors shrink-0"
      >
        <PenSquare className="w-3.5 h-3.5" /> Post
      </button>
    </div>
  );
}

/* ─── SortBar ─────────────────────────────────────────── */
function SortBar({ sort, setSort }: { sort: SortMode; setSort:(m:SortMode)=>void }) {
  const btns: { mode: SortMode; icon: React.ReactNode; label: string }[] = [
    { mode:"hot", icon:<Flame className="w-4 h-4"/>,    label:"Hot"  },
    { mode:"new", icon:<Sparkles className="w-4 h-4"/>, label:"New"  },
    { mode:"top", icon:<BarChart3 className="w-4 h-4"/>,label:"Top"  },
  ];
  return (
    <div className="flex items-center gap-1 bg-[#1e2025] border border-[#343536] rounded-lg px-3 py-2 mb-3">
      {btns.map(b => (
        <button key={b.mode} onClick={() => setSort(b.mode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
            sort === b.mode
              ? "bg-[#22c55e]/20 text-[#22c55e]"
              : "text-[#818384] hover:text-[#d7dadc] hover:bg-[#2d2e30]"
          }`}
        >
          {b.icon} {b.label}
        </button>
      ))}
    </div>
  );
}

/* ─── PostCard ────────────────────────────────────────── */
function PostCard({ post, onVote }: { post: Post; onVote:(id:number,dir:"up"|"down")=>void }) {
  const meta = POST_META[post.type] ?? POST_META.question;
  const time = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  return (
    <div className="flex bg-[#1e2025] border border-[#343536] hover:border-[#818384] rounded-lg mb-2 overflow-hidden transition-colors group">
      {/* Vote column */}
      <div className="w-10 shrink-0 flex flex-col items-center py-2 gap-0.5 bg-[#161618]">
        <button
          onClick={e => { e.preventDefault(); onVote(post.id, "up"); }}
          className="p-1 rounded text-[#4a5568] hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <span className="text-[12px] font-black text-[#d7dadc]">{post.upvotes}</span>
        <button
          onClick={e => { e.preventDefault(); onVote(post.id, "down"); }}
          className="p-1 rounded text-[#4a5568] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {/* Content */}
      <Link href={`/posts/${post.id}`} className="flex-1 min-w-0 p-3 cursor-pointer">
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
          <span className="text-[#3a4a58] text-[10px]">•</span>
          <span className="text-[#5a7080] text-[11px]">u/{post.authorName ?? "anonymous"}</span>
          <span className="text-[#3a4a58] text-[10px]">•</span>
          <span className="text-[#5a7080] text-[11px]">{time}</span>
          {post.location && (
            <>
              <span className="text-[#3a4a58] text-[10px]">•</span>
              <span className="flex items-center gap-0.5 text-[#5a7080] text-[11px]">
                <MapPin className="w-2.5 h-2.5" />{post.location}
              </span>
            </>
          )}
        </div>
        <h3 className="text-[#d7dadc] font-semibold text-[14px] leading-snug mb-1.5 group-hover:text-white transition-colors">
          {post.title}
        </h3>
        <p className="text-[#818384] text-[12px] leading-relaxed line-clamp-2 mb-3">{post.content}</p>
        <div className="flex items-center gap-1">
          {[
            { icon:<MessageCircle className="w-3.5 h-3.5"/>, label:`${post.commentCount} ${post.commentCount===1?"Comment":"Comments"}` },
            { icon:<Share2 className="w-3.5 h-3.5"/>, label:"Share" },
            { icon:<Bookmark className="w-3.5 h-3.5"/>, label:"Save" },
          ].map(a => (
            <button key={a.label} onClick={e=>e.preventDefault()}
              className="flex items-center gap-1.5 text-[#818384] hover:text-[#d7dadc] hover:bg-[#2d2e30] text-[11px] font-bold px-2.5 py-1.5 rounded-full transition-colors"
            >
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </Link>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="flex bg-[#1e2025] border border-[#343536] rounded-lg mb-2 overflow-hidden">
      <div className="w-10 bg-[#161618] shrink-0" />
      <div className="flex-1 p-3">
        <div className="h-3 w-32 bg-white/5 rounded animate-pulse mb-3" />
        <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
        <div className="h-3 w-full bg-white/5 rounded animate-pulse mb-1" />
        <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse" />
      </div>
    </div>
  );
}

/* ─── Right panel cards ───────────────────────────────── */
function AboutCard() {
  const [, nav] = useLocation();
  return (
    <div className="bg-[#1e2025] border border-[#343536] rounded-lg overflow-hidden mb-3">
      <div className="h-10 bg-gradient-to-r from-[#16a34a] to-[#22c55e]" />
      <div className="px-4 pb-4">
        <div className="flex items-end gap-2 -mt-5 mb-3">
          <img src="/mshauri-logo.png" alt="Mshauri" className="w-12 h-12 rounded-full border-2 border-[#1e2025] bg-black object-contain" />
        </div>
        <h2 className="font-bold text-[#d7dadc] text-[13px] mb-1">About Mshauri</h2>
        <p className="text-[#818384] text-[11px] leading-relaxed mb-3">
          AI-powered agricultural intelligence for Zimbabwean farmers. Ask in English, Shona or Ndebele.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div><div className="font-black text-[#d7dadc] text-[14px]">1,204</div><div className="text-[#818384] text-[10px]">Farmers</div></div>
          <div><div className="font-black text-[#22c55e] text-[14px]">Online</div><div className="text-[#818384] text-[10px]">24 / 7</div></div>
        </div>
        <div className="h-px bg-[#343536] mb-3" />
        <button onClick={() => nav("/ask")} className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white text-[12px] font-bold py-2 rounded-full transition-colors mb-2">
          Ask Mshauri AI →
        </button>
        <button onClick={() => nav("/whatsapp")} className="w-full border border-[#25d366] text-[#25d366] text-[12px] font-bold py-2 rounded-full hover:bg-[#25d366]/10 transition-colors">
          💬 Connect on WhatsApp
        </button>
      </div>
    </div>
  );
}

function MarketSnapshot() {
  return (
    <div className="bg-[#1e2025] border border-[#343536] rounded-lg p-4 mb-3">
      <h3 className="font-bold text-[#d7dadc] text-[11px] uppercase tracking-wider mb-3">Market Snapshot</h3>
      <div className="flex flex-col gap-2.5">
        {MARKET_SNAPSHOT.map(item => (
          <div key={item.crop} className="flex items-center justify-between">
            <span className="text-[#d7dadc] text-[12px]">{item.crop}</span>
            <div className="flex items-center gap-2">
              <span className="text-[#d7dadc] text-[11px] font-semibold">{item.price}</span>
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${item.up===true?"text-[#22c55e]":item.up===false?"text-[#ef4444]":"text-[#818384]"}`}>
                {item.up===true&&<TrendingUp className="w-3 h-3"/>}
                {item.up===false&&<TrendingDown className="w-3 h-3"/>}
                {item.change}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrowseByTopic() {
  const [, nav] = useLocation();
  return (
    <div className="bg-[#1e2025] border border-[#343536] rounded-lg p-4 mb-3">
      <h3 className="font-bold text-[#d7dadc] text-[11px] uppercase tracking-wider mb-3">Browse by Topic</h3>
      <div className="flex flex-wrap gap-1.5">
        {TOPICS.map(t => (
          <button key={t} onClick={() => nav("/communities")}
            className="bg-[#272729] hover:bg-[#2d2e30] border border-[#343536] hover:border-[#22c55e]/40 rounded-full px-2.5 py-1 text-[11px] text-[#818384] hover:text-[#22c55e] transition-all"
          >{t}</button>
        ))}
      </div>
    </div>
  );
}

function TopCommunities({ communities }: { communities: Community[] }) {
  if (!communities.length) return null;
  return (
    <div className="bg-[#1e2025] border border-[#343536] rounded-lg p-4 mb-3">
      <h3 className="font-bold text-[#d7dadc] text-[11px] uppercase tracking-wider mb-3">Top Communities</h3>
      <div className="flex flex-col gap-0.5">
        {communities.slice(0, 5).map((c, i) => (
          <Link key={c.id} href={`/communities/${c.slug}`}>
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-[#272729] cursor-pointer transition-colors group">
              <span className="text-[#818384] text-[11px] font-bold w-4">{i+1}</span>
              <span className="text-lg">{COMMUNITY_ICONS[c.slug]??"🌱"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[#d7dadc] text-[12px] font-medium group-hover:text-[#22c55e] transition-colors truncate">r/{c.slug}</div>
                <div className="text-[#818384] text-[10px]">{c.memberCount.toLocaleString()} members</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link href="/communities">
        <button className="w-full mt-2 text-[#22c55e] text-[11px] font-bold hover:underline">View all communities →</button>
      </Link>
    </div>
  );
}

/* ─── Main Feed ───────────────────────────────────────── */
export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("hot");
  const [createOpen, setCreateOpen] = useState(false);

  const loadPosts = useCallback(() => {
    fetch("/api/posts?sort=new&limit=40").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setPosts(d);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/posts?sort=new&limit=40").then(r => r.json()),
      fetch("/api/communities").then(r => r.json()),
    ]).then(([p, c]) => {
      setPosts(Array.isArray(p) ? p : []);
      setCommunities(Array.isArray(c) ? c : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleVote(id: number, direction: "up" | "down") {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, upvotes: direction==="up" ? p.upvotes+1 : p.upvotes } : p));
    try {
      await fetch(`/api/posts/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
    } catch {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, upvotes: direction==="up" ? p.upvotes-1 : p.upvotes } : p));
    }
  }

  const feed = sortPosts(posts, sort);

  // Build feed items with Maricho Media cards interspersed every 7 posts
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
            <CreatePostBar onOpen={() => setCreateOpen(true)} />
            <SortBar sort={sort} setSort={setSort} />
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)
              : feedItems.length === 0
              ? (
                <div className="text-center py-16 text-[#818384]">
                  <div className="text-4xl mb-3">🌱</div>
                  <p className="font-semibold">No posts yet</p>
                  <p className="text-sm mt-1">Be the first to share knowledge</p>
                </div>
              )
              : feedItems.map((item, i) =>
                  item.kind === "post"
                    ? <PostCard key={`post-${item.post.id}`} post={item.post} onVote={handleVote} />
                    : <MarichoPromoCard key={`promo-${i}`} resource={item.resource} />
                )
            }
          </div>

          {/* Right panel */}
          <div className="hidden lg:block w-[300px] shrink-0">
            <div className="sticky top-5">
              <AboutCard />
              <MarketSnapshot />
              <BrowseByTopic />
              <TopCommunities communities={communities} />
            </div>
          </div>
        </div>
      </div>

      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={loadPosts}
      />
    </div>
  );
}
