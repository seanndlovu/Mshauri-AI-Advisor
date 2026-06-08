import { useState, KeyboardEvent } from "react";
import { useLocation, Link } from "wouter";
import { useListConversations, useListMarketPrices } from "@workspace/api-client-react";
import { useChatStream } from "@/hooks/use-chat-stream";
import { formatDistanceToNow } from "date-fns";
import { Camera, Mic, ChevronRight, ArrowUpRight, Wheat, Beef, CloudRain, AlertTriangle, Search } from "lucide-react";

const QUICK_PROMPTS = [
  { label: "🌽 Maize disease", emoji: "🌽", text: "My maize leaves are turning yellow at the tips. What could be wrong and how do I fix it?", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { label: "💰 Market prices", emoji: "💰", text: "What are the current market prices for vegetables in Harare?", color: "text-blue-700 bg-blue-50 border-blue-200" },
  { label: "🐄 Livestock health", emoji: "🐄", text: "My cattle are coughing and seem weak. What should I do?", color: "text-purple-700 bg-purple-50 border-purple-200" },
  { label: "🌱 Planting schedule", emoji: "🌱", text: "When is the best time to plant tomatoes in Mashonaland?", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { label: "🌧️ Irrigation advice", emoji: "🌧️", text: "How should I set up irrigation for my small vegetable garden?", color: "text-sky-700 bg-sky-50 border-sky-200" },
  { label: "🐛 Pest control", emoji: "🐛", text: "How do I control fall armyworm in my maize crop?", color: "text-red-700 bg-red-50 border-red-200" },
];

const TOPIC_TAGS = [
  { label: "Crop Health", color: "bg-emerald-600" },
  { label: "Livestock", color: "bg-purple-600" },
  { label: "Markets", color: "bg-blue-600" },
  { label: "Weather", color: "bg-sky-600" },
  { label: "Soil", color: "bg-amber-600" },
  { label: "Pest Control", color: "bg-red-600" },
  { label: "Irrigation", color: "bg-cyan-600" },
  { label: "Planting", color: "bg-lime-600" },
];

function getCategoryStyle(title: string): { label: string; color: string } {
  const t = title.toLowerCase();
  if (t.includes("cattle") || t.includes("livestock") || t.includes("goat") || t.includes("pig") || t.includes("poultry"))
    return { label: "Livestock", color: "text-purple-700 bg-purple-50" };
  if (t.includes("maize") || t.includes("crop") || t.includes("tobacco") || t.includes("soybean") || t.includes("sorghum"))
    return { label: "Crops", color: "text-emerald-700 bg-emerald-50" };
  if (t.includes("price") || t.includes("market") || t.includes("sell"))
    return { label: "Market", color: "text-blue-700 bg-blue-50" };
  if (t.includes("pest") || t.includes("disease") || t.includes("worm") || t.includes("virus"))
    return { label: "Pest & Disease", color: "text-red-700 bg-red-50" };
  if (t.includes("whatsapp") || t.includes("263"))
    return { label: "WhatsApp", color: "text-green-700 bg-green-50" };
  return { label: "Farming", color: "text-gray-700 bg-gray-100" };
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [askText, setAskText] = useState("");
  const [search, setSearch] = useState("");
  const { sendMessage, isStreaming } = useChatStream();

  const { data: conversations = [], isLoading: convsLoading } = useListConversations();
  const { data: marketPrices = [] } = useListMarketPrices();

  const filtered = search.trim()
    ? conversations.filter((c) => c.title?.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const handleAsk = () => {
    if (!askText.trim() || isStreaming) return;
    const text = askText;
    setAskText("");
    sendMessage(text, null, (id: number) => setLocation(`/conversations/${id}`));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); }
  };

  const handlePrompt = (text: string) => {
    sendMessage(text, null, (id: number) => setLocation(`/conversations/${id}`));
  };

  return (
    <div className="h-full overflow-y-auto bg-[#F3F4F6]">
      {/* Hero section — Maricho-style full-width banner */}
      <div className="bg-[#14532d] text-white">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-[#ea580c] text-white text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">AI Powered</span>
              <span className="text-emerald-300 text-[12px]">Zimbabwe Agricultural Assistant</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-2 leading-tight">
              Ask any farming question —<br />
              <span className="text-emerald-300">in Shona, Ndebele, or English</span>
            </h1>
            <p className="text-emerald-200 text-[13px] mb-5 leading-relaxed">
              Get expert advice on crops, livestock, market prices, and more. Available on web and WhatsApp.
            </p>

            {/* Ask box */}
            <div className="bg-white rounded-xl p-3 shadow-lg">
              <textarea
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. My maize is turning yellow, what is wrong? / Mombe yangu ine chirwere..."
                rows={2}
                className="w-full px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none resize-none border-0 bg-transparent"
                data-testid="input-ask-home"
              />
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-emerald-600 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 transition-colors">
                  <Camera className="w-3 h-3" /> Photo
                </button>
                <button className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-emerald-600 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 transition-colors">
                  <Mic className="w-3 h-3" /> Voice
                </button>
                <button
                  onClick={handleAsk}
                  disabled={!askText.trim() || isStreaming}
                  className="ml-auto bg-[#15803d] hover:bg-[#166534] disabled:opacity-50 text-white text-[12px] font-bold px-5 py-1.5 rounded-lg transition-colors"
                  data-testid="button-ask-submit"
                >
                  {isStreaming ? "Sending…" : "Ask Mshauri →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick topic chips below hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Quick Ask:</span>
          {QUICK_PROMPTS.map(({ label, text, color }) => (
            <button
              key={label}
              onClick={() => handlePrompt(text)}
              className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors hover:opacity-80 ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 flex gap-6">
        {/* Main feed */}
        <div className="flex-1 min-w-0">
          {/* Search + count bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 max-w-xs">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="text-[12px] text-gray-700 placeholder:text-gray-400 focus:outline-none bg-transparent flex-1"
              />
            </div>
            <span className="text-[12px] text-gray-500 font-medium">
              {filtered.length} conversation{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Section heading */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-black text-gray-800 uppercase tracking-wider border-l-4 border-[#15803d] pl-3">
              Recent Conversations
            </h2>
          </div>

          {/* Cards */}
          {convsLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="h-3.5 bg-gray-100 rounded w-1/4 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 && !convsLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wheat className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-800 text-base mb-1">
                {search ? "No results found" : "No conversations yet"}
              </h3>
              <p className="text-[12px] text-gray-500 mb-4">
                {search ? `No conversations match "${search}"` : "Ask your first farming question to get started."}
              </p>
              {!search && (
                <button
                  onClick={() => handlePrompt("Hello Mshauri, I need farming advice.")}
                  className="bg-[#15803d] hover:bg-[#166534] text-white text-[13px] font-bold px-5 py-2 rounded-lg transition-colors"
                >
                  Ask a question →
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((conv) => {
                const cat = getCategoryStyle(conv.title || "");
                return (
                  <Link key={conv.id} href={`/conversations/${conv.id}`}>
                    <div
                      className="group bg-white rounded-xl border border-gray-200 hover:border-[#15803d] hover:shadow-sm transition-all cursor-pointer overflow-hidden"
                      data-testid={`card-conversation-${conv.id}`}
                    >
                      <div className="flex items-stretch">
                        {/* Left accent bar */}
                        <div className="w-1 bg-[#15803d] shrink-0" />
                        <div className="flex-1 px-5 py-4 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${cat.color}`}>
                              {cat.label}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-[14px] leading-snug group-hover:text-[#15803d] transition-colors mb-2">
                            {conv.title || "New Conversation"}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              Mshauri replied
                            </span>
                            <span className="text-[11px] text-[#15803d] font-semibold group-hover:underline flex items-center gap-0.5">
                              View conversation <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center pr-4">
                          <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#15803d] transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="w-72 shrink-0 hidden xl:flex flex-col gap-4">
          {/* Market prices widget */}
          {marketPrices.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-[#14532d] px-4 py-3 flex items-center justify-between">
                <h3 className="font-bold text-white text-[12px] uppercase tracking-wider">Market Prices</h3>
                <Link href="/market-prices">
                  <span className="text-emerald-300 text-[11px] font-medium hover:text-white transition-colors cursor-pointer">View all →</span>
                </Link>
              </div>
              <div className="px-4 py-3 divide-y divide-gray-100">
                {marketPrices.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <span className="text-[12px] text-gray-700 font-medium truncate mr-2">{item.commodity}</span>
                    <span className="text-[12px] font-bold text-[#15803d] shrink-0">
                      ${Number(item.priceUsd).toFixed(2)}/{item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topic tags */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 px-4 py-3">
              <h3 className="font-bold text-white text-[12px] uppercase tracking-wider">Ask by Topic</h3>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {TOPIC_TAGS.map(({ label, color }) => (
                <button
                  key={label}
                  onClick={() => handlePrompt(`Give me advice about ${label.toLowerCase()} in Zimbabwe farming`)}
                  className={`${color} text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 text-[12px] uppercase tracking-wider mb-3">Mshauri Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: conversations.length, label: "Questions asked", icon: "💬" },
                { value: "24/7", label: "Always available", icon: "🟢" },
                { value: "3", label: "Languages", icon: "🗣️" },
                { value: "10+", label: "Knowledge sources", icon: "📚" },
              ].map(({ value, label, icon }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-lg mb-0.5">{icon}</div>
                  <div className="font-black text-gray-900 text-base leading-none">{value}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp CTA */}
          <div className="bg-[#128C7E] rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📱</span>
              <h3 className="font-black text-[14px]">Also on WhatsApp</h3>
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed mb-3">
              Chat with Mshauri directly in WhatsApp — works in the field with low data usage.
            </p>
            <div className="bg-white/10 rounded-lg px-3 py-2 text-[11px] font-bold text-white text-center">
              Send "Hi" to your Mshauri number
            </div>
          </div>

          {/* Alert box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-amber-800 mb-0.5">Season Reminder</p>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                Plan your summer crop inputs now. Contact your local Agritex officer for planting recommendations.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
