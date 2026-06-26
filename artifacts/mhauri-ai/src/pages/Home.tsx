import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useLocation, Link } from "wouter";
import { useListConversations } from "@workspace/api-client-react";
import { useChatStream } from "@/hooks/use-chat-stream";
import { formatDistanceToNow } from "date-fns";
import { Mic, MicOff, Camera, Send, X, MessageSquare } from "lucide-react";
import { maskSensitive } from "@/lib/mask-sensitive";

/* ─── example prompts ─────────────────────────────────── */
const EXAMPLES = [
  { label: "🌽 Maize disease",    text: "My maize leaves are turning yellow at the tips. What could be wrong?" },
  { label: "🐄 Cattle health",    text: "My cattle are coughing and seem weak. What should I do?" },
  { label: "🐛 Pest control",     text: "How do I control fall armyworm in my maize crop?" },
  { label: "💰 Market prices",    text: "Should I sell my tomatoes now or wait for prices to improve?" },
  { label: "🌧 Planting time",    text: "When is the best time to plant maize in Mashonaland this season?" },
];

type SpeechRecognitionConstructor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: { [i: number]: { [i: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [askText, setAskText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceUnsupported, setVoiceUnsupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, isStreaming } = useChatStream();
  const { data: conversations = [] } = useListConversations();

  /* auto-grow textarea */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 220) + "px";
    }
  }, [askText]);

  /* focus textarea on mount */
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setAskText(e.target.value);
  }

  function handleSubmit() {
    if ((!askText.trim() && !imageBase64) || isStreaming) return;
    const t = askText;
    const img = imageBase64;
    setAskText("");
    setImageBase64(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    sendMessage(t, img, (id: number) => setLocation(`/conversations/${id}`));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  function handleExampleClick(text: string) {
    setAskText(text);
    textareaRef.current?.focus();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
    rec.lang = "en-ZW";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setIsListening(true);
    rec.onresult = (ev) => {
      const t = ev.results[0][0].transcript;
      setAskText(prev => prev ? prev + " " + t : t);
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
  }

  const recentConvs = [...conversations]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  return (
    <div className="h-full overflow-y-auto bg-[#0f1011]">
      <div className="max-w-[680px] mx-auto px-4 pt-12 pb-10">

        {/* Hero */}
        <div className="text-center mb-8">
          <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-20 h-20 object-contain mx-auto mb-5" />
          <h1 className="text-[#E7E9EA] font-black text-[28px] leading-tight mb-3">
            What can Mshauri help<br className="hidden sm:block" /> you with today?
          </h1>
          <p className="text-[#71767B] text-[15px] leading-relaxed max-w-md mx-auto">
            Explore markets, climate, policy, nutrition, trade, food security, investment and emerging trends.
          </p>
        </div>

        {/* Input box */}
        <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 mb-4 focus-within:border-[#22c55e]/50 transition-colors">
          {/* Image preview */}
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

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={askText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe your food systems question…"
            rows={3}
            className="w-full bg-transparent text-[#E7E9EA] placeholder:text-[#71767B] text-[16px] leading-relaxed resize-none focus:outline-none min-h-[80px]"
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#2F3336]">
            <div className="flex items-center gap-1">
              {/* Voice */}
              <button
                onClick={handleVoice}
                title={voiceUnsupported ? "Voice not available on this device" : "Voice input"}
                className={`p-2 rounded-full transition-all ${
                  isListening
                    ? "bg-[#22c55e]/20 text-[#22c55e] animate-pulse"
                    : voiceUnsupported
                    ? "text-[#ef4444]"
                    : "text-[#71767B] hover:text-[#22c55e] hover:bg-[#22c55e]/10"
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Photo */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach a photo"
                className="p-2 rounded-full text-[#71767B] hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-all"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />

              {/* Listening indicator */}
              {isListening && (
                <span className="text-[#22c55e] text-[11px] font-bold animate-pulse ml-1">Listening…</span>
              )}
              {voiceUnsupported && (
                <span className="text-[#71767B] text-[11px] ml-1">Voice unavailable on this device</span>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={(!askText.trim() && !imageBase64) || isStreaming}
              className="flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-bold px-4 py-2 rounded-full transition-all"
            >
              {isStreaming ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Thinking…
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Ask Mshauri
                </>
              )}
            </button>
          </div>
        </div>

        {/* Example chips */}
        <div className="mb-10">
          <p className="text-[#71767B] text-[11px] uppercase font-bold tracking-wider mb-2.5">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(({ label, text }) => (
              <button
                key={label}
                onClick={() => handleExampleClick(text)}
                className="text-[12px] text-[#E7E9EA] border border-[#2F3336] hover:border-[#22c55e]/40 hover:text-[#22c55e] hover:bg-[#22c55e]/5 bg-[#16181C] rounded-full px-3.5 py-1.5 transition-all"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent conversations */}
        {recentConvs.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-[#2F3336]" />
              <span className="text-[#71767B] text-[11px] uppercase font-bold tracking-wider">Recent conversations</span>
              <div className="h-px flex-1 bg-[#2F3336]" />
            </div>

            <div className="flex flex-col gap-2">
              {recentConvs.map(conv => (
                <Link key={conv.id} href={`/conversations/${conv.id}`}>
                  <div className="flex items-center gap-3 bg-[#16181C] border border-[#2F3336] hover:border-[#4a5568] rounded-2xl px-4 py-3 cursor-pointer transition-all group">
                    <div className="w-8 h-8 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/15 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-[#22c55e]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#E7E9EA] text-[13px] font-medium truncate group-hover:text-white transition-colors">
                        {maskSensitive(conv.title || "New conversation")}
                      </p>
                      <p className="text-[#71767B] text-[11px]">
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recentConvs.length === 0 && (
          <div className="text-center pt-4">
            <p className="text-[#71767B] text-[13px]">
              Your conversations will appear here after your first question.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
