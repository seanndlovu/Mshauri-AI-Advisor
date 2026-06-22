import { useState, useEffect, FormEvent } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, MessageCircle, MapPin, Clock, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Community {
  id: number; slug: string; name: string;
  description: string; memberCount: number; postCount: number;
}

interface Post {
  id: number; communityId: number; type: string; title: string;
  content: string; location: string | null; upvotes: number;
  commentCount: number; authorName: string | null; createdAt: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  linkUrl?: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  question:      "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  disease_report:"bg-red-500/15    text-red-400    border-red-500/30",
  market_price:  "bg-emerald-500/15text-emerald-400 border-emerald-500/30",
  opportunity:   "bg-purple-500/15 text-purple-400  border-purple-500/30",
  success_story: "bg-green-500/15  text-green-400   border-green-500/30",
  weather:       "bg-blue-500/15   text-blue-400    border-blue-500/30",
};

const TYPE_LABELS: Record<string, string> = {
  question: "Question", disease_report: "Disease Alert", market_price: "Market Update",
  opportunity: "Opportunity", success_story: "Success Story", weather: "Climate Alert",
};

type SortMode = "recent" | "helpful";

export default function CommunityFeed() {
  const [, params] = useRoute("/communities/:slug");
  const slug = params?.slug ?? "";

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<SortMode>("recent");
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ type: "question", title: "", content: "", location: "" });
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/communities/${slug}`).then(r => r.json()).then(setCommunity).catch(() => {});
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    const apiSort = sort === "helpful" ? "top" : "new";
    fetch(`/api/communities/${slug}/posts?sort=${apiSort}`)
      .then(r => r.json())
      .then(d => { setPosts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug, sort]);

  async function submitPost(e: FormEvent) {
    e.preventDefault();
    if (!community || !form.title.trim() || !form.content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId: community.id, ...form }),
      });
      if (res.ok) {
        const post = await res.json();
        setPosts(p => [post, ...p]);
        setForm({ type: "question", title: "", content: "", location: "" });
        setShowCompose(false);
        setCommunity(c => c ? { ...c, postCount: c.postCount + 1 } : c);
      }
    } finally { setPosting(false); }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1b]">
      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link href="/communities">
            <button className="p-2 rounded-full hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#E7E9EA]" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-[#E7E9EA] font-bold text-lg truncate">r/{slug}</h1>
            {community && <p className="text-[#71767B] text-xs truncate">{community.description}</p>}
          </div>
          {community && (
            <span className="text-[#71767B] text-[11px] shrink-0">{community.memberCount.toLocaleString()} members</span>
          )}
        </div>

        {/* Sort + Post button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {(["recent", "helpful"] as SortMode[]).map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                  sort === s
                    ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
                    : "text-[#71767B] border border-transparent hover:border-[#343536] hover:text-[#d7dadc]"
                }`}
              >
                {s === "recent" ? "Recent" : "Most Helpful"}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCompose(!showCompose)}
            className="flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white text-[12px] font-bold px-4 py-1.5 rounded-full transition-colors">
            <Send className="w-3.5 h-3.5" /> Post
          </button>
        </div>

        {/* Compose form */}
        {showCompose && (
          <form onSubmit={submitPost} className="mb-4 bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="bg-black border border-[#2F3336] rounded-xl px-3 py-2 text-[#E7E9EA] text-sm focus:outline-none focus:border-[#22c55e]">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Location (optional)"
                className="bg-black border border-[#2F3336] rounded-xl px-3 py-2 text-[#E7E9EA] text-sm placeholder-[#71767B] focus:outline-none focus:border-[#22c55e]" />
            </div>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required placeholder="Title"
              className="bg-black border border-[#2F3336] rounded-xl px-3 py-2 text-[#E7E9EA] text-sm placeholder-[#71767B] focus:outline-none focus:border-[#22c55e]" />
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              required rows={3} placeholder="Describe your question or situation…"
              className="bg-black border border-[#2F3336] rounded-xl px-3 py-2 text-[#E7E9EA] text-sm placeholder-[#71767B] focus:outline-none focus:border-[#22c55e] resize-none" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCompose(false)}
                className="px-4 py-2 rounded-full border border-[#2F3336] text-[#71767B] text-sm hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={posting}
                className="px-4 py-2 rounded-full bg-[#22c55e] text-white text-sm font-bold hover:bg-[#16a34a] disabled:opacity-60">
                {posting ? "Posting…" : "Submit"}
              </button>
            </div>
          </form>
        )}

        {/* Posts */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-[#71767B]">
            <p className="mb-2">No posts yet in r/{slug}</p>
            <button onClick={() => setShowCompose(true)} className="text-[#22c55e] hover:underline text-sm font-semibold">
              Be the first to post
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map(post => (
              <Link key={post.id} href={`/posts/${post.id}`}>
                <div className="bg-[#16181C] border border-[#2F3336] hover:border-[#4a5568] rounded-2xl p-4 cursor-pointer transition-all group">
                  {/* Meta */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLORS[post.type] ?? TYPE_COLORS.question}`}>
                      {TYPE_LABELS[post.type] ?? post.type}
                    </span>
                    {post.location && (
                      <span className="flex items-center gap-1 text-[11px] text-[#71767B]">
                        <MapPin className="w-3 h-3" />{post.location}
                      </span>
                    )}
                  </div>
                  {/* Title + content */}
                  <h3 className="text-[#E7E9EA] font-bold text-[15px] leading-snug mb-1.5 group-hover:text-white transition-colors">
                    {post.title}
                  </h3>

                  {/* Media preview */}
                  {post.imageUrl && (
                    <div className="rounded-xl overflow-hidden mb-2 bg-black border border-[#2F3336]">
                      <img src={post.imageUrl} alt="Post image" className="w-full max-h-52 object-cover" />
                    </div>
                  )}
                  {post.videoUrl && (
                    <div className="rounded-xl overflow-hidden mb-2 bg-black border border-[#2F3336]">
                      <video src={post.videoUrl} className="w-full max-h-52" controls preload="metadata" onClick={e => e.preventDefault()} />
                    </div>
                  )}
                  {post.linkUrl && !post.imageUrl && !post.videoUrl && (
                    <div className="flex items-center gap-2 mb-2 bg-[#1a1a1b] border border-[#2F3336] rounded-xl px-3 py-2">
                      <span className="text-[11px]">🔗</span>
                      <span className="text-[#22c55e] text-[11px] truncate">{post.linkUrl}</span>
                    </div>
                  )}
                  {!post.imageUrl && !post.videoUrl && (
                    <p className="text-[#71767B] text-[13px] leading-relaxed line-clamp-2 mb-3">{post.content}</p>
                  )}
                  {/* Footer */}
                  <div className="flex items-center gap-3 pt-3 border-t border-[#2F3336] text-[#71767B] text-[11px]">
                    <span>👍 {post.upvotes} helpful</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{post.commentCount}</span>
                    <span>u/{post.authorName ?? "anonymous"}</span>
                    <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
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
