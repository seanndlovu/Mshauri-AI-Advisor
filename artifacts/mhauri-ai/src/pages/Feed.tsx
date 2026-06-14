import { useState, useEffect, FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ThumbsUp, ThumbsDown, MessageCircle, MapPin, Clock, TrendingUp, Flame, Award, Sprout, Search, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface Post {
  id: number;
  communityId: number;
  type: string;
  title: string;
  content: string;
  location: string | null;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  authorName: string | null;
  createdAt: string;
}

interface Community {
  id: number;
  slug: string;
  name: string;
  postCount: number;
}

const TYPE_COLORS: Record<string, string> = {
  question: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  disease_report: "bg-red-500/20 text-red-400 border-red-500/30",
  market_price: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  opportunity: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  success_story: "bg-green-500/20 text-green-400 border-green-500/30",
  weather: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const TYPE_LABELS: Record<string, string> = {
  question: "Question", disease_report: "🚨 Disease Report", market_price: "💰 Market Price",
  opportunity: "Opportunity", success_story: "✅ Success Story", weather: "🌦 Weather",
};

const COMMUNITY_ICONS: Record<string, string> = {
  maize: "🌽", livestock: "🐄", poultry: "🐔", irrigation: "💧",
  climate: "🌦️", agribusiness: "💼", tobacco: "🌿", vegetables: "🥬",
  pests: "🐛", soils: "🪱",
};

export default function Feed() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [sort, setSort] = useState<"new" | "top">("new");
  const [filterType, setFilterType] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/communities")
      .then((r) => r.json())
      .then(setCommunities)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: "30" });
    if (filterType !== "all") params.set("type", filterType);
    fetch(`/api/posts?${params}`)
      .then((r) => r.json())
      .then((data) => { setPosts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sort, filterType]);

  async function vote(postId: number, value: 1 | -1) {
    await fetch(`/api/posts/${postId}/vote`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setPosts((ps) => ps.map((p) => p.id === postId
      ? { ...p, upvotes: p.upvotes + (value === 1 ? 1 : 0), downvotes: p.downvotes + (value === -1 ? 1 : 0) }
      : p));
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="border-b border-[#2F3336] px-4 py-5 bg-black">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Sprout className="w-5 h-5 text-[#22c55e]" />
            <span className="text-[#22c55e] text-sm font-bold uppercase tracking-wide">Mshauri</span>
          </div>
          <h1 className="text-[#E7E9EA] text-2xl font-black mb-1">Agricultural Intelligence</h1>
          <p className="text-[#71767B] text-sm">Community-powered farming knowledge for Zimbabwe</p>

          <div className="flex gap-2 mt-4">
            {!user ? (
              <>
                <button onClick={() => setLocation("/register")}
                  className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-5 py-2 rounded-full text-sm transition-colors">
                  Join Community
                </button>
                <button onClick={() => setLocation("/ask")}
                  className="border border-[#2F3336] text-[#E7E9EA] hover:bg-white/10 font-medium px-5 py-2 rounded-full text-sm transition-colors">
                  Ask AI
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setLocation("/communities")}
                  className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-5 py-2 rounded-full text-sm transition-colors">
                  Browse Communities
                </button>
                <button onClick={() => setLocation("/ask")}
                  className="border border-[#2F3336] text-[#E7E9EA] hover:bg-white/10 font-medium px-5 py-2 rounded-full text-sm transition-colors">
                  Ask Mshauri AI
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-[#2F3336] flex gap-2 overflow-x-auto scrollbar-none">
          {(["new", "top"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${sort === s ? "bg-[#22c55e] text-white" : "border border-[#2F3336] text-[#71767B] hover:bg-white/5"}`}>
              {s === "new" ? <><Clock className="w-3.5 h-3.5" /> New</> : <><Flame className="w-3.5 h-3.5" /> Top</>}
            </button>
          ))}
          <div className="w-px bg-[#2F3336] shrink-0" />
          {["all", "question", "disease_report", "market_price", "success_story"].map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize ${filterType === t ? "bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40" : "border border-[#2F3336] text-[#71767B] hover:bg-white/5"}`}>
              {t === "all" ? "All" : TYPE_LABELS[t]?.replace(/^[^\s]+\s/, "") ?? t.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Communities sidebar-style strip */}
        {communities.length > 0 && (
          <div className="px-4 py-3 border-b border-[#2F3336] flex gap-2 overflow-x-auto scrollbar-none">
            {communities.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/communities/${c.slug}`}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2F3336] hover:bg-white/5 cursor-pointer transition-colors whitespace-nowrap">
                  <span className="text-sm">{COMMUNITY_ICONS[c.slug] ?? "🌱"}</span>
                  <span className="text-[#71767B] text-[12px]">r/{c.slug}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-4 border-b border-[#2F3336]">
                <div className="h-4 w-20 bg-white/5 rounded-full animate-pulse mb-2" />
                <div className="h-5 w-3/4 bg-white/5 rounded-full animate-pulse mb-1" />
                <div className="h-4 w-full bg-white/5 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-[#71767B]">
            <Sprout className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium mb-1">No posts yet</p>
            <p className="text-sm">Join a community and start the conversation</p>
            <Link href="/communities">
              <button className="mt-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-5 py-2 rounded-full text-sm transition-colors">
                Browse Communities
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {posts.map((post, i) => (
              <Link key={post.id} href={`/posts/${post.id}`}>
                <div className={`px-4 py-4 hover:bg-white/5 cursor-pointer transition-colors ${i < posts.length - 1 ? "border-b border-[#2F3336]" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <button onClick={(e) => { e.preventDefault(); vote(post.id, 1); }}
                        className="p-1 rounded hover:bg-white/10 text-[#71767B] hover:text-[#22c55e] transition-colors">
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <span className="text-[12px] font-bold text-[#E7E9EA]">{post.upvotes - post.downvotes}</span>
                      <button onClick={(e) => { e.preventDefault(); vote(post.id, -1); }}
                        className="p-1 rounded hover:bg-white/10 text-[#71767B] hover:text-red-400 transition-colors">
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[post.type] ?? TYPE_COLORS.question}`}>
                          {TYPE_LABELS[post.type] ?? post.type}
                        </span>
                        {post.location && (
                          <span className="flex items-center gap-1 text-[11px] text-[#71767B]">
                            <MapPin className="w-3 h-3" />{post.location}
                          </span>
                        )}
                      </div>
                      <h3 className="text-[#E7E9EA] font-semibold text-[15px] leading-snug mb-1">{post.title}</h3>
                      <p className="text-[#71767B] text-sm line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-[#71767B] text-[12px]">
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{post.commentCount}</span>
                        <span>{post.authorName ?? "Anonymous"}</span>
                        <span className="flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#2F3336] shrink-0 mt-2" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
