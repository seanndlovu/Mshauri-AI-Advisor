import { useState, KeyboardEvent } from "react";
import { useLocation, Link } from "wouter";
import { useListConversations, useListMarketPrices } from "@workspace/api-client-react";
import { useChatStream } from "@/hooks/use-chat-stream";
import { formatDistanceToNow } from "date-fns";
import {
  Image, Mic, MessageCircle, Repeat2, Heart, Share, Bookmark,
  ChevronUp, ChevronDown, Search, TrendingUp, Sprout, Users,
  Flame, Clock, Award, MoreHorizontal,
} from "lucide-react";

const QUICK_PROMPTS = [
  { label: "🌽 Maize disease help", text: "My maize leaves are turning yellow at the tips. What could be wrong?" },
  { label: "💰 Harare market prices", text: "What are the current market prices for vegetables in Harare?" },
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

function getCategoryLabel(title: string) {
  const t = title.toLowerCase();
  if (t.includes("cattle") || t.includes("livestock") || t.includes("goat") || t.includes("pig") || t.includes("poultry"))
    return { label: "Livestock", color: "text-purple-400", dot: "bg-purple-400" };
  if (t.includes("maize") || t.includes("crop") || t.includes("tobacco") || t.includes("soy") || t.includes("sorghum"))
    return { label: "Crops", color: "text-emerald-400", dot: "bg-emerald-400" };
  if (t.includes("price") || t.includes("market") || t.includes("sell"))
    return { label: "Market", color: "text-blue-400", dot: "bg-blue-400" };
  if (t.includes("pest") || t.includes("disease") || t.includes("worm") || t.includes("virus"))
    return { label: "Pest & Disease", color: "text-red-400", dot: "bg-red-400" };
  if (t.includes("whatsapp") || t.includes("263"))
    return { label: "WhatsApp", color: "text-green-400", dot: "bg-green-400" };
  return { label: "Farming", color: "text-[#71767B]", dot: "bg-[#71767B]" };
}

function VoteButton({ convId, score }: { convId: number; score: number }) {
  const key = `vote_${convId}`;
  const [vote, setVote] = useState<1 | -1 | 0>(() => {
    const v = localStorage.getItem(key);
    return v ? (parseInt(v) as 1 | -1 | 0) : 0;
  });

  const handleVote = (dir: 1 | -1, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = vote === dir ? 0 : dir;
    setVote(next);
    localStorage.setItem(key, String(next));
  };

  const total = score + vote;

  return (
    <div className="flex flex-col items-center gap-0.5 mr-3 shrink-0" onClick={(e) => e.preventDefault()}>
      <button
        onClick={(e) => handleVote(1, e)}
        className={`p-0.5 rounded transition-colors hover:text-[#f97316] ${vote === 1 ? "text-[#f97316]" : "text-[#71767B]"}`}
      >
        <ChevronUp className="w-5 h-5" />
      </button>
      <span className={`text-[12px] font-bold tabular-nums ${vote === 1 ? "text-[#f97316]" : vote === -1 ? "text-blue-400" : "text-[#71767B]"}`}>
        {total}
      </span>
      <button
        onClick={(e) => handleVote(-1, e)}
        className={`p-0.5 rounded transition-colors hover:text-blue-400 ${vote === -1 ? "text-blue-400" : "text-[#71767B]"}`}
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [askText, setAskText] = useState("");
  const [sort, setSort] = useState<"new" | "hot" | "top">("new");
  const { sendMessage, isStreaming } = useChatStream();

  const { data: conversations = [], isLoading } = useListConversations();
  const { data: marketPrices = [] } = useListMarketPrices();

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

  const sorted = [...conversations].sort((a, b) => {
    if (sort === "hot") return (b.id % 17) - (a.id % 17);
    if (sort === "top") return (b.id % 29) - (a.id % 29);
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-[1280px] mx-auto flex">

        {/* CENTER FEED */}
        <div className="flex-1 min-w-0 border-r border-l border-[#2F3336] min-h-full">

          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-[#2F3336] px-4 py-3">
            <h1 className="text-[20px] font-black text-[#E7E9EA]">Home</h1>
          </div>

          {/* Compose box */}
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

                {/* Quick prompts */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {QUICK_PROMPTS.map(({ label, text }) => (
                    <button
                      key={label}
                      onClick={() => handlePrompt(text)}
                      className="text-[12px] text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#22c55e]/10 rounded-full px-3 py-1 transition-colors font-medium"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-full hover:bg-[#22c55e]/10 text-[#22c55e] transition-colors">
                      <Image className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-full hover:bg-[#22c55e]/10 text-[#22c55e] transition-colors">
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={handleAsk}
                    disabled={!askText.trim() || isStreaming}
                    className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[15px] px-5 py-2 rounded-full transition-colors"
                    data-testid="button-ask-submit"
                  >
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
              <button
                key={key}
                onClick={() => setSort(key as "new" | "hot" | "top")}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-[14px] font-bold border-b-2 transition-colors ${
                  sort === key
                    ? "text-[#E7E9EA] border-[#22c55e]"
                    : "text-[#71767B] border-transparent hover:text-[#E7E9EA] hover:bg-white/5"
                }`}
              >
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
              <p className="text-[#71767B] text-[15px] mb-6 max-w-xs mx-auto">
                Ask your first farming question and it will appear in your feed.
              </p>
              <button
                onClick={() => handlePrompt("Hello Mshauri, I need farming advice.")}
                className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-6 py-3 rounded-full text-[15px] transition-colors"
              >
                Ask a question
              </button>
            </div>
          ) : (
            sorted.map((conv, idx) => {
              const cat = getCategoryLabel(conv.title || "");
              const baseScore = 1 + (conv.id * 7 + idx * 3) % 23;
              return (
                <Link key={conv.id} href={`/conversations/${conv.id}`}>
                  <div
                    className="group border-b border-[#2F3336] px-4 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    data-testid={`card-conversation-${conv.id}`}
                  >
                    <div className="flex gap-0">
                      {/* Upvote column */}
                      <VoteButton convId={conv.id} score={baseScore} />

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#1D9BF0]/20 flex items-center justify-center shrink-0 mr-3 text-[#1D9BF0] font-bold text-[14px]">
                        {conv.whatsappPhone ? "📱" : "F"}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Author line */}
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="font-bold text-[15px] text-[#E7E9EA] leading-none">
                            {conv.whatsappPhone ? `Farmer ${conv.whatsappPhone.slice(-4)}` : "Farmer"}
                          </span>
                          <span className={`text-[13px] font-semibold ${cat.color}`}>· {cat.label}</span>
                          <span className="text-[#71767B] text-[13px] ml-auto shrink-0">
                            {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                          </span>
                        </div>

                        {/* Title */}
                        <p className="text-[15px] text-[#E7E9EA] leading-snug mb-3 group-hover:text-white transition-colors">
                          {conv.title || "New Conversation"}
                        </p>

                        {/* Action bar */}
                        <div className="flex items-center gap-1 -ml-2" onClick={(e) => e.preventDefault()}>
                          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-[#1D9BF0]/10 hover:text-[#1D9BF0] text-[#71767B] transition-colors group/btn">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-[13px]">{(conv.id * 3) % 7}</span>
                          </button>
                          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-[#00BA7C]/10 hover:text-[#00BA7C] text-[#71767B] transition-colors">
                            <Repeat2 className="w-4 h-4" />
                            <span className="text-[13px]">{(conv.id * 2) % 5}</span>
                          </button>
                          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-red-500/10 hover:text-red-400 text-[#71767B] transition-colors">
                            <Heart className="w-4 h-4" />
                            <span className="text-[13px]">{(conv.id * 5) % 13}</span>
                          </button>
                          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-[#1D9BF0]/10 hover:text-[#1D9BF0] text-[#71767B] transition-colors">
                            <Bookmark className="w-4 h-4" />
                          </button>
                          <button className="ml-auto flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-[#1D9BF0]/10 hover:text-[#1D9BF0] text-[#71767B] transition-colors">
                            <Share className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="hidden lg:flex flex-col w-[350px] shrink-0 px-5 py-3 gap-4">
          {/* Search */}
          <div className="bg-[#202327] rounded-full px-4 py-2.5 flex items-center gap-2 sticky top-3">
            <Search className="w-4 h-4 text-[#71767B] shrink-0" />
            <span className="text-[15px] text-[#71767B]">Search Mshauri</span>
          </div>

          {/* Trending topics */}
          <div className="bg-[#16181C] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2F3336]">
              <h2 className="text-[20px] font-black text-[#E7E9EA]">Trending in Zimbabwe</h2>
            </div>
            {TRENDING.map(({ tag, posts, hot }, i) => (
              <button
                key={tag}
                onClick={() => {}}
                className="w-full flex items-start justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-[#2F3336] last:border-0 text-left"
              >
                <div>
                  <p className="text-[13px] text-[#71767B]">
                    Farming · {i + 1}
                    {hot && <span className="ml-1 text-[#f97316]">🔥</span>}
                  </p>
                  <p className="font-bold text-[15px] text-[#E7E9EA]">#{tag}</p>
                  <p className="text-[13px] text-[#71767B]">{posts}</p>
                </div>
                <MoreHorizontal className="w-4 h-4 text-[#71767B] mt-1 shrink-0" />
              </button>
            ))}
            <button className="w-full px-4 py-3 text-[15px] text-[#22c55e] hover:bg-white/5 transition-colors text-left">
              Show more
            </button>
          </div>

          {/* Market prices */}
          {marketPrices.length > 0 && (
            <div className="bg-[#16181C] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2F3336] flex items-center justify-between">
                <h2 className="text-[20px] font-black text-[#E7E9EA]">Market Prices</h2>
                <Link href="/market-prices">
                  <span className="text-[14px] text-[#22c55e] hover:underline cursor-pointer">View all</span>
                </Link>
              </div>
              {marketPrices.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b border-[#2F3336] last:border-0">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#22c55e]" />
                    <span className="text-[15px] text-[#E7E9EA] font-medium">{item.commodity}</span>
                  </div>
                  <span className="text-[14px] font-bold text-[#22c55e]">${Number(item.priceUsd).toFixed(2)}/{item.unit}</span>
                </div>
              ))}
            </div>
          )}

          {/* Who to follow — Mshauri edition */}
          <div className="bg-[#16181C] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2F3336]">
              <h2 className="text-[20px] font-black text-[#E7E9EA]">Who's Using Mshauri</h2>
            </div>
            {[
              { name: "Mashonaland Farmer", handle: "Harare", icon: "🌽", q: "Ask about crop rotation" },
              { name: "Matabeleland Farmer", handle: "Bulawayo", icon: "🐄", q: "Ask about livestock care" },
              { name: "Midlands Farmer", handle: "Gweru", icon: "🌱", q: "Ask about soil health" },
            ].map(({ name, handle, icon, q }) => (
              <button
                key={handle}
                onClick={() => handlePrompt(q)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-[#2F3336] last:border-0 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-xl shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-[#E7E9EA] truncate">{name}</p>
                  <p className="text-[13px] text-[#71767B]">{handle}</p>
                </div>
                <span className="bg-[#E7E9EA] hover:bg-white text-black font-bold text-[13px] px-3.5 py-1.5 rounded-full transition-colors shrink-0">
                  Ask
                </span>
              </button>
            ))}
          </div>

          {/* WhatsApp */}
          <div className="bg-[#16181C] rounded-2xl px-4 py-4 border border-[#2F3336]">
            <p className="text-[20px] font-black text-[#E7E9EA] mb-1">📱 Also on WhatsApp</p>
            <p className="text-[14px] text-[#71767B] mb-3 leading-relaxed">
              Chat with Mshauri in the field — works with low data in English, Shona, or Ndebele.
            </p>
            <div className="bg-[#22c55e] rounded-full px-4 py-2 text-center text-white font-bold text-[14px]">
              Send "Hi" on WhatsApp
            </div>
          </div>

          {/* Footer */}
          <p className="text-[13px] text-[#71767B] px-1 pb-4 leading-relaxed">
            Mshauri AI · Maricho Media · Zimbabwe 2024
            <br />Built for smallholder farmers across Southern Africa.
          </p>
        </div>
      </div>
    </div>
  );
}
