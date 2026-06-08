import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useListConversations } from "@workspace/api-client-react";
import { useChatStream } from "@/hooks/use-chat-stream";
import { formatDistanceToNow } from "date-fns";
import {
  Image, Mic, MessageCircle, Repeat2, Heart, Share, Bookmark,
  ChevronUp, ChevronDown, Search, Sprout,
  Flame, Clock, Award, MoreHorizontal, Pin, PinOff,
  Send, X, Check, Copy, Link2,
} from "lucide-react";

/* ─────────────── constants ─────────────── */

const QUICK_PROMPTS = [
  { label: "🌽 Maize disease help", text: "My maize leaves are turning yellow at the tips. What could be wrong?" },
  { label: "🐄 Cattle coughing", text: "My cattle are coughing and seem weak. What should I do?" },
  { label: "🌱 Planting schedule", text: "When is the best time to plant tomatoes in Mashonaland?" },
  { label: "🐛 Fall armyworm", text: "How do I control fall armyworm in my maize crop?" },
  { label: "💧 Irrigation setup", text: "How should I set up irrigation for my small vegetable garden?" },
];

const TRENDING = [
  { tag: "MaizeBlightAlert", posts: "2.4K posts", hot: true },
  { tag: "ZimbabweFarming", posts: "18.1K posts", hot: false },
  { tag: "LumpySkinDisease", posts: "5.6K posts", hot: true },
  { tag: "HarareMarketPrices", posts: "1.2K posts", hot: false },
  { tag: "PlantingSchedule2024", posts: "890 posts", hot: false },
  { tag: "DroughtResponse", posts: "3.3K posts", hot: true },
];

/* ─────────────── helpers ─────────────── */

function ls<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function getCategoryLabel(title: string) {
  const t = title.toLowerCase();
  if (t.includes("cattle") || t.includes("livestock") || t.includes("goat") || t.includes("pig") || t.includes("poultry"))
    return { label: "Livestock", color: "text-purple-400" };
  if (t.includes("maize") || t.includes("crop") || t.includes("tobacco") || t.includes("soy") || t.includes("sorghum"))
    return { label: "Crops", color: "text-emerald-400" };
  if (t.includes("price") || t.includes("market") || t.includes("sell"))
    return { label: "Market", color: "text-blue-400" };
  if (t.includes("pest") || t.includes("disease") || t.includes("worm") || t.includes("virus"))
    return { label: "Pest & Disease", color: "text-red-400" };
  if (t.includes("whatsapp") || t.includes("263"))
    return { label: "WhatsApp", color: "text-green-400" };
  return { label: "Farming", color: "text-[#71767B]" };
}

/* ─────────────── Toast ─────────────── */

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#22c55e] text-white text-[13px] font-bold px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <Check className="w-4 h-4" /> {msg}
    </div>
  );
}

/* ─────────────── VoteButton ─────────────── */

function VoteButton({ convId, baseScore }: { convId: number; baseScore: number }) {
  const [vote, setVote] = useState<1 | -1 | 0>(() => ls(`vote_${convId}`, 0));
  const handle = (dir: 1 | -1, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const next = vote === dir ? 0 : dir;
    setVote(next); lsSet(`vote_${convId}`, next);
  };
  const total = baseScore + vote;
  return (
    <div className="flex flex-col items-center gap-0.5 mr-3 shrink-0" onClick={(e) => e.preventDefault()}>
      <button onClick={(e) => handle(1, e)}
        className={`p-0.5 rounded-md transition-all hover:bg-[#f97316]/10 active:scale-110 ${vote === 1 ? "text-[#f97316]" : "text-[#71767B] hover:text-[#f97316]"}`}>
        <ChevronUp className="w-5 h-5" />
      </button>
      <span className={`text-[12px] font-black tabular-nums transition-colors ${vote === 1 ? "text-[#f97316]" : vote === -1 ? "text-blue-400" : "text-[#71767B]"}`}>
        {total}
      </span>
      <button onClick={(e) => handle(-1, e)}
        className={`p-0.5 rounded-md transition-all hover:bg-blue-400/10 active:scale-110 ${vote === -1 ? "text-blue-400" : "text-[#71767B] hover:text-blue-400"}`}>
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}

/* ─────────────── ShareMenu ─────────────── */

function ShareMenu({ convId, title, onClose }: { convId: number; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const copy = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/conversations/${convId}`).catch(() => {});
    onClose();
  };
  const native = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (navigator.share) navigator.share({ title, url: `${window.location.origin}/conversations/${convId}` }).catch(() => {});
    onClose();
  };

  return (
    <div ref={ref} className="absolute bottom-8 right-0 z-30 bg-[#16181C] border border-[#2F3336] rounded-2xl shadow-2xl overflow-hidden min-w-[200px]">
      <button onClick={copy} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-[#E7E9EA] text-[14px] font-semibold">
        <Copy className="w-4 h-4 text-[#71767B]" /> Copy link
      </button>
      <button onClick={native} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-[#E7E9EA] text-[14px] font-semibold border-t border-[#2F3336]">
        <Link2 className="w-4 h-4 text-[#71767B]" /> Share via…
      </button>
    </div>
  );
}

/* ─────────────── PostCard ─────────────── */

interface Reply { text: string; time: string; name: string }
interface PostCardProps {
  conv: { id: number; title?: string | null; updatedAt: string; whatsappPhone?: string | null };
  baseScore: number;
  isPinned: boolean;
  onPin: (id: number) => void;
  onToast: (msg: string) => void;
}

function PostCard({ conv, baseScore, isPinned, onPin, onToast }: PostCardProps) {
  const cat = getCategoryLabel(conv.title || "");
  const authorName = conv.whatsappPhone ? `Farmer ${conv.whatsappPhone.slice(-4)}` : "Farmer";

  // ── Like
  const [liked, setLiked] = useState(() => ls(`liked_${conv.id}`, false));
  const [likeCount, setLikeCount] = useState(() => ls(`likeCount_${conv.id}`, (conv.id * 5) % 13));
  const [likeAnim, setLikeAnim] = useState(false);
  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const next = !liked;
    const nextCount = next ? likeCount + 1 : Math.max(0, likeCount - 1);
    setLiked(next); setLikeCount(nextCount);
    lsSet(`liked_${conv.id}`, next); lsSet(`likeCount_${conv.id}`, nextCount);
    if (next) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 600); }
  };

  // ── Reshare
  const [reshared, setReshared] = useState(() => ls(`reshared_${conv.id}`, false));
  const [reshareCount, setReshareCount] = useState(() => ls(`reshareCount_${conv.id}`, (conv.id * 2) % 5));
  const handleReshare = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const next = !reshared;
    const nextCount = next ? reshareCount + 1 : Math.max(0, reshareCount - 1);
    setReshared(next); setReshareCount(nextCount);
    lsSet(`reshared_${conv.id}`, next); lsSet(`reshareCount_${conv.id}`, nextCount);
    onToast(next ? "Reshared to your followers" : "Reshare removed");
  };

  // ── Bookmark
  const [bookmarked, setBookmarked] = useState(() => ls(`bookmarked_${conv.id}`, false));
  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const next = !bookmarked;
    setBookmarked(next); lsSet(`bookmarked_${conv.id}`, next);
    onToast(next ? "Saved to bookmarks" : "Removed from bookmarks");
  };

  // ── Pin
  const handlePin = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    onPin(conv.id);
    onToast(isPinned ? "Post unpinned" : "Post pinned to top");
  };

  // ── Share menu
  const [showShare, setShowShare] = useState(false);

  // ── Reply
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<Reply[]>(() => ls(`replies_${conv.id}`, []));
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const toggleReply = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setShowReply((v) => !v);
    if (!showReply) setTimeout(() => replyRef.current?.focus(), 50);
  };

  const submitReply = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!replyText.trim()) return;
    const next: Reply[] = [...replies, { text: replyText.trim(), time: new Date().toISOString(), name: "You" }];
    setReplies(next); lsSet(`replies_${conv.id}`, next);
    setReplyText(""); setShowReply(false);
    onToast("Reply posted");
  };

  const replyCount = (conv.id * 3) % 7 + replies.length;

  return (
    <div
      className={`group border-b border-[#2F3336] hover:bg-white/[0.02] transition-colors ${isPinned ? "bg-[#22c55e]/[0.03] border-l-2 border-l-[#22c55e]" : ""}`}
      data-testid={`card-conversation-${conv.id}`}
    >
      {isPinned && (
        <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-0">
          <Pin className="w-3 h-3 text-[#22c55e]" />
          <span className="text-[12px] text-[#22c55e] font-semibold">Pinned post</span>
        </div>
      )}

      <Link href={`/conversations/${conv.id}`}>
        <div className="px-4 py-4 cursor-pointer">
          <div className="flex gap-0">
            {/* Vote */}
            <VoteButton convId={conv.id} baseScore={baseScore} />

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#1D9BF0]/20 flex items-center justify-center shrink-0 mr-3 text-[#1D9BF0] font-bold text-[14px] mt-0.5">
              {conv.whatsappPhone ? "📱" : "F"}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              {/* Author row */}
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="font-bold text-[15px] text-[#E7E9EA] leading-none">{authorName}</span>
                <span className={`text-[13px] font-semibold ${cat.color}`}>· {cat.label}</span>
                <span className="text-[#71767B] text-[13px] ml-auto shrink-0">
                  {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                </span>
              </div>

              {/* Title */}
              <p className="text-[15px] text-[#E7E9EA] leading-snug mb-3 group-hover:text-white transition-colors">
                {conv.title || "New Conversation"}
              </p>

              {/* Reshare banner */}
              {reshared && (
                <div className="flex items-center gap-1.5 mb-2 text-[#00BA7C] text-[12px] font-semibold">
                  <Repeat2 className="w-3.5 h-3.5" /> You reshared this
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center justify-between" onClick={(e) => e.preventDefault()}>
                {/* Reply */}
                <button
                  onClick={toggleReply}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-all hover:bg-[#1D9BF0]/10 hover:text-[#1D9BF0] ${showReply ? "text-[#1D9BF0]" : "text-[#71767B]"}`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-[13px]">{replyCount}</span>
                </button>

                {/* Reshare */}
                <button
                  onClick={handleReshare}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-all hover:bg-[#00BA7C]/10 active:scale-110 ${reshared ? "text-[#00BA7C]" : "text-[#71767B] hover:text-[#00BA7C]"}`}
                >
                  <Repeat2 className={`w-4 h-4 ${reshared ? "drop-shadow-[0_0_4px_#00BA7C]" : ""}`} />
                  <span className="text-[13px]">{reshareCount}</span>
                </button>

                {/* Like */}
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-all hover:bg-red-500/10 active:scale-110 ${liked ? "text-red-400" : "text-[#71767B] hover:text-red-400"}`}
                >
                  <Heart className={`w-4 h-4 transition-all duration-300 ${liked ? "fill-red-400 drop-shadow-[0_0_6px_#f87171]" : ""} ${likeAnim ? "scale-125" : "scale-100"}`} />
                  <span className="text-[13px]">{likeCount}</span>
                </button>

                {/* Bookmark */}
                <button
                  onClick={handleBookmark}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-all hover:bg-[#1D9BF0]/10 active:scale-110 ${bookmarked ? "text-[#1D9BF0]" : "text-[#71767B] hover:text-[#1D9BF0]"}`}
                >
                  <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-[#1D9BF0]" : ""}`} />
                </button>

                {/* Pin */}
                <button
                  onClick={handlePin}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-all hover:bg-[#22c55e]/10 active:scale-110 ${isPinned ? "text-[#22c55e]" : "text-[#71767B] hover:text-[#22c55e]"}`}
                  title={isPinned ? "Unpin post" : "Pin to top"}
                >
                  {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>

                {/* Share */}
                <div className="relative">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowShare((v) => !v); }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-all hover:bg-[#1D9BF0]/10 hover:text-[#1D9BF0] text-[#71767B]"
                  >
                    <Share className="w-4 h-4" />
                  </button>
                  {showShare && (
                    <ShareMenu convId={conv.id} title={conv.title || "Conversation"} onClose={() => setShowShare(false)} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Reply box */}
      {showReply && (
        <div
          className="mx-4 mb-4 pl-16 border-t border-[#2F3336] pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0 text-white font-black text-[13px]">Y</div>
            <div className="flex-1 min-w-0">
              <textarea
                ref={replyRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitReply(e as unknown as React.MouseEvent); } }}
                placeholder="Post your reply… (English · Shona · Ndebele)"
                rows={2}
                className="w-full bg-transparent text-[#E7E9EA] placeholder:text-[#71767B] text-[14px] resize-none focus:outline-none border-b border-[#2F3336] pb-2 mb-2"
              />
              <div className="flex items-center justify-end gap-2">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowReply(false); setReplyText(""); }}
                  className="px-3 py-1 rounded-full text-[#71767B] text-[13px] hover:bg-white/5 transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button onClick={submitReply} disabled={!replyText.trim()}
                  className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 text-white font-bold text-[13px] px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5">
                  <Send className="w-3 h-3" /> Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replies thread */}
      {replies.length > 0 && (
        <div className="mx-4 mb-3 pl-16 space-y-2 border-t border-[#2F3336] pt-3">
          {replies.map((r, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0 text-white font-black text-[11px]">Y</div>
              <div className="flex-1 bg-[#16181C] rounded-xl px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[12px] font-bold text-[#E7E9EA]">{r.name}</span>
                  <span className="text-[11px] text-[#71767B]">· {formatDistanceToNow(new Date(r.time), { addSuffix: true })}</span>
                </div>
                <p className="text-[13px] text-[#E7E9EA] leading-snug">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Home page ─────────────── */

export default function Home() {
  const [, setLocation] = useLocation();
  const [askText, setAskText] = useState("");
  const [sort, setSort] = useState<"new" | "hot" | "top">("new");
  const [toast, setToast] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(() => new Set(ls<number[]>("pinnedIds", [])));
  const { sendMessage, isStreaming } = useChatStream();

  const { data: conversations = [], isLoading } = useListConversations();

  const handleAsk = () => {
    if (!askText.trim() || isStreaming) return;
    const t = askText; setAskText("");
    sendMessage(t, null, (id: number) => setLocation(`/conversations/${id}`));
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); }
  };
  const handlePrompt = (text: string) => {
    sendMessage(text, null, (id: number) => setLocation(`/conversations/${id}`));
  };
  const handlePin = (id: number) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      lsSet("pinnedIds", [...next]);
      return next;
    });
  };
  const showToast = (msg: string) => { setToast(msg); };

  const sorted = [...conversations].sort((a, b) => {
    if (pinnedIds.has(b.id) && !pinnedIds.has(a.id)) return 1;
    if (pinnedIds.has(a.id) && !pinnedIds.has(b.id)) return -1;
    if (sort === "hot") return (b.id % 17) - (a.id % 17);
    if (sort === "top") {
      const scoreA = ls(`likeCount_${a.id}`, (a.id * 5) % 13) + ls(`vote_${a.id}`, 0);
      const scoreB = ls(`likeCount_${b.id}`, (b.id * 5) % 13) + ls(`vote_${b.id}`, 0);
      return scoreB - scoreA;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="h-full overflow-y-auto bg-black">
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      <div className="max-w-[1280px] mx-auto flex">

        {/* ── CENTER FEED ── */}
        <div className="flex-1 min-w-0 border-r border-l border-[#2F3336] min-h-full">

          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-[#2F3336] px-4 py-3 flex items-center justify-between">
            <h1 className="text-[20px] font-black text-[#E7E9EA]">Home</h1>
            {pinnedIds.size > 0 && (
              <span className="text-[12px] text-[#22c55e] font-semibold flex items-center gap-1">
                <Pin className="w-3 h-3" /> {pinnedIds.size} pinned
              </span>
            )}
          </div>

          {/* Compose */}
          <div className="border-b border-[#2F3336] px-4 pt-4 pb-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0 text-white font-black text-[15px]">F</div>
              <div className="flex-1 min-w-0">
                <textarea
                  value={askText}
                  onChange={(e) => setAskText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What's happening in your fields? (English · Shona · Ndebele)"
                  rows={3}
                  className="w-full bg-transparent text-[#E7E9EA] placeholder:text-[#71767B] text-[19px] resize-none focus:outline-none border-b border-[#2F3336] pb-3 mb-3"
                  data-testid="input-ask-home"
                />
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {QUICK_PROMPTS.map(({ label, text }) => (
                    <button key={label} onClick={() => handlePrompt(text)}
                      className="text-[12px] text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#22c55e]/10 rounded-full px-3 py-1 transition-colors font-medium">
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-full hover:bg-[#22c55e]/10 text-[#22c55e] transition-colors"><Image className="w-5 h-5" /></button>
                    <button className="p-2 rounded-full hover:bg-[#22c55e]/10 text-[#22c55e] transition-colors"><Mic className="w-5 h-5" /></button>
                  </div>
                  <button onClick={handleAsk} disabled={!askText.trim() || isStreaming}
                    className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[15px] px-5 py-2 rounded-full transition-colors"
                    data-testid="button-ask-submit">
                    {isStreaming ? "Sending…" : "Ask"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sort tabs */}
          <div className="border-b border-[#2F3336] px-4 flex items-center gap-1">
            {[
              { key: "new", label: "New", icon: Clock },
              { key: "hot", label: "Hot", icon: Flame },
              { key: "top", label: "Top", icon: Award },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setSort(key as "new" | "hot" | "top")}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-[14px] font-bold border-b-2 transition-colors ${
                  sort === key ? "text-[#E7E9EA] border-[#22c55e]" : "text-[#71767B] border-transparent hover:text-[#E7E9EA] hover:bg-white/5"}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
            <div className="ml-auto text-[12px] text-[#71767B] pr-1">
              {conversations.length} post{conversations.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Feed */}
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-b border-[#2F3336] px-4 py-4 flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-1/4" />
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : sorted.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center mx-auto mb-4">
                <Sprout className="w-8 h-8 text-[#22c55e]" />
              </div>
              <h2 className="text-[22px] font-black text-[#E7E9EA] mb-2">Welcome to Mshauri</h2>
              <p className="text-[#71767B] text-[15px] mb-6 max-w-xs mx-auto">Ask your first farming question and it will appear in your feed.</p>
              <button onClick={() => handlePrompt("Hello Mshauri, I need farming advice.")}
                className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-6 py-3 rounded-full text-[15px] transition-colors">
                Ask a question
              </button>
            </div>
          ) : (
            sorted.map((conv, idx) => (
              <PostCard
                key={conv.id}
                conv={conv}
                baseScore={1 + (conv.id * 7 + idx * 3) % 23}
                isPinned={pinnedIds.has(conv.id)}
                onPin={handlePin}
                onToast={showToast}
              />
            ))
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="hidden lg:flex flex-col w-[350px] shrink-0 px-5 py-3 gap-4">
          <div className="bg-[#202327] rounded-full px-4 py-2.5 flex items-center gap-2 sticky top-3">
            <Search className="w-4 h-4 text-[#71767B] shrink-0" />
            <span className="text-[15px] text-[#71767B]">Search Mshauri</span>
          </div>

          <div className="bg-[#16181C] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2F3336]">
              <h2 className="text-[20px] font-black text-[#E7E9EA]">Trending in Zimbabwe</h2>
            </div>
            {TRENDING.map(({ tag, posts, hot }, i) => (
              <button key={tag} onClick={() => handlePrompt(`Tell me about #${tag} in Zimbabwe farming`)}
                className="w-full flex items-start justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-[#2F3336] last:border-0 text-left">
                <div>
                  <p className="text-[13px] text-[#71767B]">Farming · {i + 1}{hot && <span className="ml-1 text-[#f97316]">🔥</span>}</p>
                  <p className="font-bold text-[15px] text-[#E7E9EA]">#{tag}</p>
                  <p className="text-[13px] text-[#71767B]">{posts}</p>
                </div>
                <MoreHorizontal className="w-4 h-4 text-[#71767B] mt-1 shrink-0" />
              </button>
            ))}
            <button className="w-full px-4 py-3 text-[15px] text-[#22c55e] hover:bg-white/5 transition-colors text-left">Show more</button>
          </div>

          <div className="bg-[#16181C] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2F3336]">
              <h2 className="text-[20px] font-black text-[#E7E9EA]">Who's Using Mshauri</h2>
            </div>
            {[
              { name: "Mashonaland Farmer", handle: "Harare", icon: "🌽", q: "Ask about crop rotation" },
              { name: "Matabeleland Farmer", handle: "Bulawayo", icon: "🐄", q: "Ask about livestock care" },
              { name: "Midlands Farmer", handle: "Gweru", icon: "🌱", q: "Ask about soil health" },
            ].map(({ name, handle, icon, q }) => (
              <button key={handle} onClick={() => handlePrompt(q)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-[#2F3336] last:border-0 text-left">
                <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-xl shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-[#E7E9EA] truncate">{name}</p>
                  <p className="text-[13px] text-[#71767B]">{handle}</p>
                </div>
                <span className="bg-[#E7E9EA] hover:bg-white text-black font-bold text-[13px] px-3.5 py-1.5 rounded-full transition-colors shrink-0">Ask</span>
              </button>
            ))}
          </div>

          <div className="bg-[#16181C] rounded-2xl px-4 py-4 border border-[#2F3336]">
            <p className="text-[20px] font-black text-[#E7E9EA] mb-1">📱 Also on WhatsApp</p>
            <p className="text-[14px] text-[#71767B] mb-3 leading-relaxed">Chat with Mshauri in the field — works with low data in English, Shona, or Ndebele.</p>
            <a
              href="https://wa.me/263714280244?text=Hi"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#22c55e] hover:bg-[#16a34a] rounded-full px-4 py-2.5 text-center text-white font-bold text-[14px] transition-colors"
            >
              Send "Hi" to +263 714 280 244
            </a>
          </div>

          <p className="text-[13px] text-[#71767B] px-1 pb-4 leading-relaxed">
            Mshauri AI · Maricho Media · Zimbabwe 2024<br />Built for smallholder farmers across Southern Africa.
          </p>
        </div>
      </div>
    </div>
  );
}
