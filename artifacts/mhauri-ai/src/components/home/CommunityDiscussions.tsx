import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { MessageCircle, Share2, Bookmark, PenSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: number; communityId: number; type: string; title: string;
  content: string; upvotes: number; commentCount: number;
  authorName: string | null; createdAt: string; imageUrl?: string | null;
}

interface Community { id: number; slug: string; name: string; }

type Tab = "latest" | "popular";

const TYPE_COLORS: Record<string, string> = {
  question:      "text-yellow-400 bg-yellow-500/10",
  disease_report:"text-red-400    bg-red-500/10",
  market_price:  "text-emerald-400 bg-emerald-500/10",
  opportunity:   "text-purple-400 bg-purple-500/10",
  success_story: "text-green-400  bg-green-500/10",
  weather:       "text-blue-400   bg-blue-500/10",
};

const TYPE_LABELS: Record<string, string> = {
  question: "Question", disease_report: "Disease Alert", market_price: "Market",
  opportunity: "Opportunity", success_story: "Success", weather: "Climate",
};

export function CommunityDiscussions() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("latest");
  const [posts, setPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/communities", { credentials: "include" })
      .then(r => r.json())
      .then((d: Community[]) => {
        if (Array.isArray(d)) {
          const map = new Map<number, string>();
          d.forEach(c => map.set(c.id, c.slug));
          setCommunities(map);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const sort = tab === "popular" ? "top" : "new";
    fetch(`/api/posts?sort=${sort}&limit=6`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPosts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "latest",  label: "Latest"  },
    { key: "popular", label: "Popular" },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[#E7E9EA] font-bold text-[15px]">Community Discussions</h2>
        <button
          onClick={() => setLocation("/feed")}
          className="flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-[12px] font-bold px-3 py-1.5 rounded-full transition-colors"
        >
          <PenSquare className="w-3.5 h-3.5" /> New Post
        </button>
      </div>

      <div className="flex items-center gap-1 mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${
              tab === t.key
                ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
                : "text-[#71767B] border border-transparent hover:border-[#343536] hover:text-[#E7E9EA]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map(post => {
            const slug = communities.get(post.communityId) ?? "community";
            const typeColor = TYPE_COLORS[post.type] ?? TYPE_COLORS.question;
            const typeLabel = TYPE_LABELS[post.type] ?? post.type;
            return (
              <Link key={post.id} href={`/posts/${post.id}`}>
                <div className="flex items-start gap-3 bg-[#16181C] border border-[#2F3336] hover:border-[#4a5568] rounded-2xl p-4 cursor-pointer transition-all group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[#22c55e] text-[11px] font-bold">m/{slug}</span>
                      <span className="text-[#71767B] text-[11px]">·</span>
                      <span className="text-[#71767B] text-[11px]">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeColor}`}>
                        {typeLabel}
                      </span>
                    </div>
                    <h3 className="text-[#E7E9EA] font-bold text-[14px] leading-snug mb-1 group-hover:text-white transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    {!post.imageUrl && (
                      <p className="text-[#71767B] text-[12px] line-clamp-1 mb-2">{post.content}</p>
                    )}
                    <div className="flex items-center gap-3 text-[#71767B] text-[11px]">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />{post.commentCount} replies
                      </span>
                      <span>👍 {post.upvotes}</span>
                      <button
                        onClick={e => e.preventDefault()}
                        className="flex items-center gap-1 hover:text-[#22c55e] transition-colors"
                      >
                        <Share2 className="w-3 h-3" /> Share
                      </button>
                      <button
                        onClick={e => e.preventDefault()}
                        className="flex items-center gap-1 hover:text-[#22c55e] transition-colors ml-auto"
                      >
                        <Bookmark className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {post.imageUrl && (
                    <div className="shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-[#2F3336]">
                      <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-3 text-center">
        <Link href="/feed">
          <button className="text-[#22c55e] text-[13px] font-semibold hover:underline">
            View all discussions →
          </button>
        </Link>
      </div>
    </div>
  );
}
