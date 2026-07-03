import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useLocation, Link } from "wouter";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useAuth } from "@/hooks/use-auth";
import { Mic, MicOff, Camera, Send, X, MessageCircle, Share2, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FeaturedStoryCarousel } from "@/components/home/FeaturedStoryCarousel";
import { ContinueLearning } from "@/components/home/ContinueLearning";
import { CommunityDiscussions } from "@/components/home/CommunityDiscussions";
import { MarketPriceCarousel } from "@/components/home/MarketPriceCarousel";

const EXAMPLES = [
  { label: "🌽 Maize disease",   text: "My maize leaves are turning yellow at the tips. What could be wrong?" },
  { label: "🐄 Cattle health",   text: "My cattle are coughing and seem weak. What should I do?" },
  { label: "🐛 Pest control",    text: "How do I control fall armyworm in my maize crop?" },
  { label: "💰 Market prices",   text: "Should I sell my tomatoes now or wait for prices to improve?" },
  { label: "🌧 Planting time",   text: "When is the best time to plant maize in Mashonaland this season?" },
];

type SpeechRecognitionConstructor = new () => {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((ev: { results: { [i: number]: { [i: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null; start: () => void;
};
declare global {
  interface Window { SpeechRecognition: SpeechRecognitionConstructor; webkitSpeechRecognition: SpeechRecognitionConstructor; }
}

interface Post { id: number; communityId: number; title: string; content: string; upvotes: number; commentCount: number; createdAt: string; imageUrl?: string | null; }
interface Community { id: number; slug: string; }

function getGreeting(): { time: string } {
  const h = new Date().getHours();
  return { time: h < 12 ? "morning" : h < 17 ? "afternoon" : "evening" };
}

function TrendingDiscussions() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    fetch("/api/communities", { credentials: "include" })
      .then(r => r.json())
      .then((d: Community[]) => {
        if (Array.isArray(d)) {
          const m = new Map<number, string>();
          d.forEach(c => m.set(c.id, c.slug));
          setCommunities(m);
        }
      }).catch(() => {});
    fetch("/api/posts?sort=top&limit=5", { credentials: "include" })
      .then(r => r.json())
      .then(d => Array.isArray(d) && setPosts(d))
      .catch(() => {});
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-[#22c55e]" />
        <h3 className="text-[#E7E9EA] font-bold text-[14px]">Trending</h3>
      </div>
      <div className="flex flex-col gap-2">
        {posts.length === 0 && (
          <div className="text-[#71767B] text-[12px]">Loading…</div>
        )}
        {posts.map((post, i) => {
          const slug = communities.get(post.communityId) ?? "community";
          return (
            <Link key={post.id} href={`/posts/${post.id}`}>
              <div className="group cursor-pointer">
                <div className="flex items-start gap-2 mb-0.5">
                  <span className="text-[#71767B] text-[12px] font-bold shrink-0 w-5">{i + 1}.</span>
                  <p className="text-[#E7E9EA] text-[13px] font-semibold leading-snug group-hover:text-white transition-colors line-clamp-2">
                    {post.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[#71767B] text-[11px] pl-5">
                  <span className="text-[#22c55e] font-semibold">m/{slug}</span>
                  <span className="flex items-center gap-0.5">
                    <MessageCircle className="w-3 h-3" />{post.commentCount}
                  </span>
                  <span>👍 {post.upvotes}</span>
                </div>
                {i < posts.length - 1 && <div className="mt-2 border-b border-[#2F3336]" />}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[#2F3336]">
        <p className="text-[10px] font-bold text-[#818384] uppercase tracking-wider mb-2">Ads</p>
        <div className="rounded-xl overflow-hidden border border-[#2F3336]">
          <img src="/ad-1money.png" alt="1Money" className="w-full object-contain" />
          <div className="px-2 py-1 text-center">
            <p className="text-[#4a5260] text-[9px]">Ads · <a href="mailto:ads@maricho.media" className="text-[#22c55e]/70 hover:text-[#22c55e]">Advertise</a></p>
          </div>
        </div>
      </div>

    </div>
  );
}


export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [askText, setAskText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceUnsupported, setVoiceUnsupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, isStreaming } = useChatStream();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [askText]);

  function handleSubmit() {
    if ((!askText.trim() && !imageBase64) || isStreaming) return;
    const t = askText; const img = imageBase64;
    setAskText(""); setImageBase64(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    sendMessage(t, img, (id: number) => setLocation(`/conversations/${id}`));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleVoice() {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { setVoiceUnsupported(true); setTimeout(() => setVoiceUnsupported(false), 3000); return; }
    if (isListening) return;
    const rec = new SR();
    rec.lang = "en-ZW"; rec.interimResults = false; rec.maxAlternatives = 1;
    setIsListening(true);
    rec.onresult = (ev) => { setAskText(prev => prev ? prev + " " + ev.results[0][0].transcript : ev.results[0][0].transcript); setIsListening(false); };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
  }

  const { time } = getGreeting();
  const firstName = user?.name?.split(" ")[0] ?? "Farmer";

  return (
    <div className="h-full flex overflow-hidden bg-[#0f1011] ms-theme-transition">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-10">

          <div className="mb-5">
            <h1 className="text-[#E7E9EA] font-black text-[22px] leading-tight">
              Good {time}, {firstName} 🌱
            </h1>
            <p className="text-[#71767B] text-[13px] mt-1">
              Get expert answers. Grow smarter. Feed the future.
            </p>
          </div>

          <MarketPriceCarousel />

          <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 mb-6 focus-within:border-[#22c55e]/50 transition-colors">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#2F3336]">
              <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-8 h-8 object-contain shrink-0" />
              <div>
                <div className="text-[#E7E9EA] font-bold text-[14px] leading-tight">Ask Mshauri</div>
                <div className="text-[#71767B] text-[11px]">Your intelligent agricultural assistant</div>
              </div>
            </div>

            {imageBase64 && (
              <div className="relative inline-block mb-3">
                <img src={imageBase64} alt="Attached" className="w-20 h-20 rounded-xl object-cover border border-[#2F3336]" />
                <button
                  onClick={() => setImageBase64(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#ef4444] rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={askText}
              onChange={e => setAskText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your food systems question…"
              rows={2}
              className="w-full bg-transparent text-[#E7E9EA] placeholder:text-[#71767B] text-[15px] leading-relaxed resize-none focus:outline-none min-h-[60px]"
            />

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2F3336]">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleVoice}
                  title={voiceUnsupported ? "Voice not available on this device" : "Voice input"}
                  className={`p-2 rounded-full transition-all ${
                    isListening ? "bg-[#22c55e]/20 text-[#22c55e] animate-pulse"
                    : voiceUnsupported ? "text-[#ef4444]"
                    : "text-[#71767B] hover:text-[#22c55e] hover:bg-[#22c55e]/10"
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach a photo"
                  className="p-2 rounded-full text-[#71767B] hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-all"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                {isListening && <span className="text-[#22c55e] text-[11px] font-bold animate-pulse ml-1">Listening…</span>}
                {voiceUnsupported && <span className="text-[#71767B] text-[11px] ml-1">Voice unavailable</span>}
              </div>
              <button
                onClick={handleSubmit}
                disabled={(!askText.trim() && !imageBase64) || isStreaming}
                className="flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-bold px-4 py-2 rounded-full transition-all"
              >
                {isStreaming ? (
                  <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Thinking…</>
                ) : (
                  <><Send className="w-3 h-3" /> Ask Mshauri</>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {EXAMPLES.map(({ label, text }) => (
              <button
                key={label}
                onClick={() => { setAskText(text); textareaRef.current?.focus(); }}
                className="text-[11px] text-[#E7E9EA] border border-[#2F3336] hover:border-[#22c55e]/40 hover:text-[#22c55e] hover:bg-[#22c55e]/5 bg-[#16181C] rounded-full px-3 py-1.5 transition-all"
              >
                {label}
              </button>
            ))}
          </div>

          <FeaturedStoryCarousel />
          <ContinueLearning />
          <CommunityDiscussions />
        </div>
      </div>

      <div className="hidden xl:flex flex-col w-[280px] shrink-0 border-l border-[#2F3336] bg-[#1a1a1b] overflow-y-auto ms-theme-transition">
        <TrendingDiscussions />
      </div>
    </div>
  );
}
