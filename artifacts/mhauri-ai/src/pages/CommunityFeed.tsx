import { useState, useEffect, FormEvent } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, ThumbsUp, ThumbsDown, MessageCircle, MapPin, Clock, Send, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Community {
  id: number;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  postCount: number;
}

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

const TYPE_COLORS: Record<string, string> = {
  question: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  disease_report: "bg-red-500/20 text-red-400 border-red-500/30",
  market_price: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  opportunity: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  success_story: "bg-green-500/20 text-green-400 border-green-500/30",
  weather: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const TYPE_LABELS: Record<string, string> = {
  question: "Question", disease_report: "Disease Report", market_price: "Market Price",
  opportunity: "Opportunity", success_story: "Success Story", weather: "Weather",
};

export default function CommunityFeed() {
  const [match, params] = useRoute("/communities/:slug");
  const slug = params?.slug ?? "";

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<"new" | "top">("new");
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ type: "question", title: "", content: "", location: "" });
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/communities/${slug}`)
      .then((r) => r.json())
      .then(setCommunity)
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/communities/${slug}/posts?sort=${sort}`)
      .then((r) => r.json())
      .then((data) => { setPosts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug, sort]);

  async function submitPost(e: FormEvent) {
    e.preventDefault();
    if (!community || !form.title.trim() || !form.content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId: community.id, ...form }),
      });
      if (res.ok) {
        const post = await res.json();
        setPosts((p) => [post, ...p]);
        setForm({ type: "question", title: "", content: "", location: "" });
        setShowCompose(false);
        if (community) setCommunity((c) => c ? { ...c, postCount: c.postCount + 1 } : c);
      }
    } finally {
      setPosting(false);
    }
  }

  async function vote(postId: number, value: 1 | -1) {
    await fetch(`/api/posts/${postId}/vote`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setPosts((ps) => ps.map((p) => p.id === postId
      ? { ...p, upvotes: p.upvotes + (value === 1 ? 1 : 0), downvotes: p.downvotes + (value === -1 ? 1 : 0) }
      : p
    ));
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link href="/communities">
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#E7E9EA]" />
            </button>
          </Link>
          <div>
            <h1 className="text-[#E7E9EA] font-bold text-lg">r/{slug}</h1>
            {community && <p className="text-[#71767B] text-xs">{community.description}</p>}
          </div>
        </div>

        {/* Sort + Compose */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(["new", "top"] as const).map((s) => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${sort === s ? "bg-[#22c55e] text-white" : "border border-[#2F3336] text-[#71767B] hover:bg-white/5"}`}>
                {s}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCompose(!showCompose)}
            className="flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-bold px-4 py-1.5 rounded-full transition-colors">
            <Send className="w-4 h-4" /> Post
          </button>
        </div>

        {/* Compose form */}
        {showCompose && (
          <form onSubmit={submitPost} className="mb-4 bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="bg-black border border-[#2F3336] rounded-lg px-3 py-2 text-[#E7E9EA] text-sm focus:outline-none focus:border-[#22c55e]">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Location (optional)"
                className="bg-black border border-[#2F3336] rounded-lg px-3 py-2 text-[#E7E9EA] text-sm placeholder-[#71767B] focus:outline-none focus:border-[#22c55e]" />
            </div>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required placeholder="Title"
              className="bg-black border border-[#2F3336] rounded-lg px-3 py-2 text-[#E7E9EA] text-sm placeholder-[#71767B] focus:outline-none focus:border-[#22c55e]" />
            <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              required rows={3} placeholder="Describe your question or report..."
              className="bg-black border border-[#2F3336] rounded-lg px-3 py-2 text-[#E7E9EA] text-sm placeholder-[#71767B] focus:outline-none focus:border-[#22c55e] resize-none" />
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
          <div className="flex flex-col gap-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-[#71767B]">
            <p className="mb-2">No posts yet in r/{slug}</p>
            <button onClick={() => setShowCompose(true)} className="text-[#22c55e] hover:underline text-sm">Be the first to post</button>
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                        <span>u/{post.authorName ?? "anonymous"}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
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
