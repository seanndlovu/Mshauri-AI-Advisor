import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useLocation, Link } from "wouter";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useAuth } from "@/hooks/use-auth";
import { Mic, MicOff, Paperclip, Send, X, MessageCircle, Share2, TrendingUp, FileText, ExternalLink, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FeaturedStoryCarousel } from "@/components/home/FeaturedStoryCarousel";
import { ContinueLearning } from "@/components/home/ContinueLearning";
import { CommunityDiscussions } from "@/components/home/CommunityDiscussions";
import { MarketPriceCarousel } from "@/components/home/MarketPriceCarousel";
import { SponsoredAd } from "@/components/SponsoredAd";

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

interface ZmxPost { id: number; title: string; link: string; date: string; }

function ZmxPartnerCard() {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<ZmxPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (posts.length > 0) return;
    setLoading(true);
    setError(false);
    fetch("/api/zmx/feed", { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error("feed error"); return r.json(); })
      .then((data: ZmxPost[]) => { setPosts(data); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [posts.length]);

  function relativeDate(iso: string) {
    const d = new Date(iso);
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  }

  return (
    <>
      {/* Partner card — with inline feed preview */}
      <div className="bg-[#16181C] border border-[#2F3336] rounded-xl overflow-hidden">

        {/* ZMX branding row */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] transition-colors group text-left border-b border-[#2F3336]"
          onClick={() => setOpen(true)}
        >
          {/* ZMX logo on white pill */}
          <div className="shrink-0 bg-white rounded-lg px-2 py-1.5 flex items-center justify-center h-9 w-[64px]">
            <img src="/logos/zmx-logo.png" alt="ZMX" className="h-full w-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[#E7E9EA] font-bold text-[11px] leading-tight">Zimbabwe Mercantile Exchange</div>
            <div className="text-[#71767B] text-[10px] mt-0.5">Commodity trading &amp; market data</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[#22c55e] text-[9px] font-bold">LIVE</span>
            <ChevronRight className="w-3 h-3 text-[#818384] group-hover:text-[#22c55e] transition-colors" />
          </div>
        </button>

        {/* Inline market feed preview */}
        {loading && (
          <div className="flex items-center justify-center py-5">
            <div className="w-4 h-4 rounded-full border-2 border-[#2F3336] border-t-[#3b82f6] animate-spin" />
          </div>
        )}
        {!loading && !error && posts.slice(0, 3).map((post, i) => (
          <a
            key={post.id}
            href={post.link}
            target="_blank"
            rel="noreferrer"
            className={`flex items-start gap-2.5 px-4 py-2.5 hover:bg-white/[0.025] transition-colors group ${i < 2 ? "border-b border-[#2F3336]" : ""}`}
          >
            <div className="w-1 h-1 rounded-full bg-[#3b82f6] mt-[7px] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[#C7C9CC] text-[11px] leading-snug group-hover:text-[#3b82f6] transition-colors line-clamp-2">
                {post.title}
              </div>
              <div className="text-[#5B5F65] text-[10px] mt-0.5">{relativeDate(post.date)}</div>
            </div>
            <ExternalLink className="w-3 h-3 text-[#5B5F65] group-hover:text-[#3b82f6] transition-colors shrink-0 mt-1" />
          </a>
        ))}

        {/* See all */}
        {!loading && posts.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-1 py-2.5 text-[#5B5F65] hover:text-[#3b82f6] text-[10px] font-bold transition-colors border-t border-[#2F3336]"
          >
            See all ZMX market updates <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Slide-in panel with live ZMX feed */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative ml-auto w-full max-w-lg h-full bg-[#0f1011] border-l border-[#2F3336] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2F3336] shrink-0">
              <div className="shrink-0 bg-white rounded-lg px-2 py-1 flex items-center justify-center h-8 w-[56px]">
                <img src="/logos/zmx-logo.png" alt="ZMX" className="h-full w-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#E7E9EA] font-bold text-[13px] leading-tight">Zimbabwe Mercantile Exchange</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[#22c55e] text-[10px] font-bold">Live trading feed</span>
                </div>
              </div>
              <a
                href="https://zmx.co.zw"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full text-[#818384] hover:text-[#22c55e] hover:bg-white/5 transition-colors"
                onClick={e => e.stopPropagation()}
                title="Open ZMX website"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full text-[#818384] hover:text-[#E7E9EA] hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Trade platform CTA */}
            <div className="px-4 py-3 border-b border-[#2F3336] bg-[#0a1628]/60 shrink-0">
              <div className="text-[#71767B] text-[11px] mb-2">Access Zimbabwe's commodity exchange</div>
              <div className="flex gap-2">
                <a
                  href="https://system.zmx.co.zw/ZMX_web/login.php#!/home"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors"
                >
                  <TrendingUp className="w-3 h-3" /> Trade on Web
                </a>
                <a
                  href="tel:*727#"
                  className="flex items-center gap-1.5 border border-[#2F3336] hover:border-[#3b82f6]/50 text-[#E7E9EA] hover:text-[#3b82f6] text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors"
                >
                  *727# USSD
                </a>
              </div>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center h-32">
                  <div className="w-5 h-5 rounded-full border-2 border-[#2F3336] border-t-[#3b82f6] animate-spin" />
                </div>
              )}
              {error && !loading && (
                <div className="flex flex-col items-center justify-center h-32 gap-2 px-6 text-center">
                  <div className="text-[#71767B] text-[12px]">Could not load ZMX feed right now.</div>
                  <button
                    onClick={() => { setPosts([]); setError(false); setLoading(true); fetch("/api/zmx/feed", { credentials: "include" }).then(r => r.json()).then((d: ZmxPost[]) => setPosts(d)).catch(() => setError(true)).finally(() => setLoading(false)); }}
                    className="text-[#3b82f6] text-[11px] font-bold hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loading && !error && posts.length > 0 && (
                <div className="divide-y divide-[#2F3336]">
                  {posts.map(post => (
                    <a
                      key={post.id}
                      href={post.link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.025] transition-colors group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] mt-[6px] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[#E7E9EA] text-[12px] font-medium leading-snug group-hover:text-[#3b82f6] transition-colors line-clamp-2">
                          {post.title}
                        </div>
                        <div className="text-[#71767B] text-[10px] mt-1">{relativeDate(post.date)}</div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-[#818384] group-hover:text-[#3b82f6] transition-colors shrink-0 mt-1" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-[#2F3336] shrink-0">
              <a href="https://zmx.co.zw/market-data/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 text-[#71767B] hover:text-[#3b82f6] text-[11px] transition-colors">
                View all market data on ZMX <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
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
    fetch("/api/posts?sort=top&limit=3", { credentials: "include" })
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

      {/* Partners — ZMX */}
      <div className="mt-4 pt-3 border-t border-[#2F3336]">
        <p className="text-[10px] font-bold text-[#818384] uppercase tracking-wider mb-2">Partners</p>
        <ZmxPartnerCard />
      </div>

      <SponsoredAd className="mt-4" />

    </div>
  );
}


export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [askText, setAskText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; mimeType: string; dataUrl: string } | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceUnsupported, setVoiceUnsupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, isStreaming } = useChatStream();

  const ALLOWED_DOCUMENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/csv",
  ];
  const MAX_FILE_BYTES = 10 * 1024 * 1024;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [askText]);

  function handleSubmit() {
    if ((!askText.trim() && !imageBase64 && !attachedFile) || isStreaming) return;
    const t = askText; const img = imageBase64; const file = attachedFile;
    setAskText(""); setImageBase64(null); setAttachedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    sendMessage(t, img, file, (id: number) => setLocation(`/conversations/${id}`));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setAttachError(null);

    if (file.size > MAX_FILE_BYTES) {
      setAttachError("File is too large. Max size is 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.type);

    if (!isImage && !isDocument) {
      setAttachError("Only images, PDF, Word, and text files are supported — no video or audio.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (isImage) {
        setImageBase64(dataUrl);
        setAttachedFile(null);
      } else {
        setAttachedFile({ name: file.name, mimeType: file.type, dataUrl });
        setImageBase64(null);
      }
    };
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
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="h-full flex overflow-hidden bg-[#0f1011] ms-theme-transition">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-10">

          <div className="mb-5">
            <a
              href="https://marichomedia.com/"
              target="_blank"
              rel="noreferrer"
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#4ade80]/55 bg-gradient-to-r from-[#14532d] via-[#166534] to-[#15803d] px-3.5 py-2 text-[11px] font-bold text-white shadow-[0_6px_18px_rgba(20,83,45,0.28)] transition-all hover:-translate-y-0.5 hover:border-[#86efac] hover:shadow-[0_8px_22px_rgba(20,83,45,0.4)]"
            >
              <span className="h-2 w-2 rounded-full bg-[#bbf7d0] shadow-[0_0_8px_rgba(187,247,208,0.9)]" aria-hidden="true" />
              Visit Maricho Media
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <h1 className="text-[#E7E9EA] font-black text-[22px] leading-tight">
              {firstName ? `Good ${time}, ${firstName}` : `Good ${time}`}
            </h1>
            <p className="text-[#71767B] text-[13px] mt-1">
              Ask smarter. Analyze faster. Power better decisions across the global food system.
            </p>
          </div>

          <MarketPriceCarousel />

          <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 mb-6 focus-within:border-[#22c55e]/50 transition-colors">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#2F3336]">
              <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-8 h-8 object-contain shrink-0" />
              <div>
                <div className="text-[#E7E9EA] font-bold text-[14px] leading-tight">Ask Mshauri</div>
                <div className="text-[#71767B] text-[11px]">The global food systems intelligence OS</div>
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

            {attachedFile && (
              <div className="flex items-center gap-2 mb-3 bg-[#0f1011] border border-[#2F3336] rounded-xl px-3 py-2 w-fit max-w-full">
                <FileText className="w-4 h-4 text-[#22c55e] shrink-0" />
                <span className="text-[#E7E9EA] text-[12px] truncate max-w-[200px]">{attachedFile.name}</span>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="w-4 h-4 shrink-0 flex items-center justify-center text-[#71767B] hover:text-[#ef4444] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {attachError && (
              <div className="text-[#ef4444] text-[11px] mb-2">{attachError}</div>
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
                  title="Attach an image, PDF, Word, or text file"
                  className="p-2 rounded-full text-[#71767B] hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-all"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {isListening && <span className="text-[#22c55e] text-[11px] font-bold animate-pulse ml-1">Listening…</span>}
                {voiceUnsupported && <span className="text-[#71767B] text-[11px] ml-1">Voice unavailable</span>}
              </div>
              <button
                onClick={handleSubmit}
                disabled={(!askText.trim() && !imageBase64 && !attachedFile) || isStreaming}
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
