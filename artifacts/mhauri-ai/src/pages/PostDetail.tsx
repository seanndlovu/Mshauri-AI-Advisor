import { useState, useEffect, FormEvent } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, ThumbsUp, ThumbsDown, MessageCircle, MapPin, Clock, Send } from "lucide-react";
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

interface Comment {
  id: number;
  postId: number;
  content: string;
  upvotes: number;
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

export default function PostDetail() {
  const [, params] = useRoute("/posts/:id");
  const postId = parseInt(params?.id ?? "0", 10);
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    Promise.all([
      fetch(`/api/posts/${postId}`).then((r) => r.json()),
      fetch(`/api/posts/${postId}/comments`).then((r) => r.json()),
    ]).then(([p, c]) => {
      setPost(p);
      setComments(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [postId]);

  async function vote(value: 1 | -1) {
    if (!post) return;
    await fetch(`/api/posts/${post.id}/vote`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setPost((p) => p ? { ...p, upvotes: p.upvotes + (value === 1 ? 1 : 0), downvotes: p.downvotes + (value === -1 ? 1 : 0) } : p);
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !post) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((c) => [comment, ...c]);
        setPost((p) => p ? { ...p, commentCount: p.commentCount + 1 } : p);
        setCommentText("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="h-8 w-32 bg-white/5 rounded-full animate-pulse mb-4" />
          <div className="h-48 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!post || (post as unknown as { error: string }).error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-[#71767B]">
          <p>Post not found</p>
          <Link href="/"><button className="mt-3 text-[#22c55e] hover:underline text-sm">Back to feed</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <Link href="/">
          <button className="flex items-center gap-2 text-[#71767B] hover:text-[#E7E9EA] mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to feed
          </button>
        </Link>

        {/* Post card */}
        <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${TYPE_COLORS[post.type] ?? TYPE_COLORS.question}`}>
              {TYPE_LABELS[post.type] ?? post.type}
            </span>
            {post.location && (
              <span className="flex items-center gap-1 text-[12px] text-[#71767B]">
                <MapPin className="w-3.5 h-3.5" />{post.location}
              </span>
            )}
          </div>
          <h1 className="text-[#E7E9EA] font-bold text-[18px] leading-snug mb-3">{post.title}</h1>
          <p className="text-[#E7E9EA] text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#2F3336]">
            <div className="flex items-center gap-2">
              <button onClick={() => vote(1)} className="p-1.5 rounded-full hover:bg-white/10 text-[#71767B] hover:text-[#22c55e] transition-colors">
                <ThumbsUp className="w-4 h-4" />
              </button>
              <span className="text-[#E7E9EA] font-semibold text-sm">{post.upvotes}</span>
              <button onClick={() => vote(-1)} className="p-1.5 rounded-full hover:bg-white/10 text-[#71767B] hover:text-red-400 transition-colors">
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
            <span className="flex items-center gap-1.5 text-[#71767B] text-sm">
              <MessageCircle className="w-4 h-4" />{post.commentCount} comments
            </span>
            <span className="text-[#71767B] text-sm ml-auto">u/{post.authorName ?? "anonymous"}</span>
            <span className="flex items-center gap-1 text-[#71767B] text-sm">
              <Clock className="w-3.5 h-3.5" />
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Comment form */}
        <form onSubmit={submitComment} className="mb-6">
          <div className="flex gap-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts…"
              rows={2}
              className="flex-1 bg-[#16181C] border border-[#2F3336] rounded-xl px-4 py-3 text-[#E7E9EA] text-sm placeholder-[#71767B] focus:outline-none focus:border-[#22c55e] resize-none transition-colors"
            />
            <button type="submit" disabled={submitting || !commentText.trim()}
              className="p-3 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl disabled:opacity-50 transition-colors self-end">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Comments */}
        <div>
          <h2 className="text-[#E7E9EA] font-bold text-[15px] mb-3">{post.commentCount} Comments</h2>
          {comments.length === 0 ? (
            <p className="text-[#71767B] text-sm text-center py-8">No comments yet. Be the first!</p>
          ) : (
            <div className="flex flex-col">
              {comments.map((comment, i) => (
                <div key={comment.id} className={`py-4 ${i < comments.length - 1 ? "border-b border-[#2F3336]" : ""}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-[#22c55e] font-bold text-xs">
                      {(comment.authorName ?? "A")[0].toUpperCase()}
                    </div>
                    <span className="text-[#E7E9EA] text-sm font-medium">u/{comment.authorName ?? "anonymous"}</span>
                    <span className="text-[#71767B] text-xs">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[#E7E9EA] text-sm leading-relaxed pl-9">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
