import { useState, KeyboardEvent } from "react";
import { useLocation } from "wouter";
import {
  useListConversations,
  useListMarketPrices,
} from "@workspace/api-client-react";
import { useChatStream } from "@/hooks/use-chat-stream";
import { formatDistanceToNow } from "date-fns";
import { Camera, Mic, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "wouter";

const TOPIC_TAGS = [
  "Crop Health", "Soil", "Planting", "Market", "Irrigation",
  "Livestock", "Alert", "Weather", "Pest Control",
];

const TAG_COLORS: Record<string, string> = {
  "Crop Health": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Market":     "bg-blue-50 text-blue-700 border-blue-200",
  "Planting":   "bg-sky-50 text-sky-700 border-sky-200",
  "Soil":       "bg-amber-50 text-amber-700 border-amber-200",
  "Alert":      "bg-red-50 text-red-600 border-red-200",
  "Livestock":  "bg-purple-50 text-purple-700 border-purple-200",
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [askText, setAskText] = useState("");
  const { sendMessage, isStreaming } = useChatStream();

  const { data: conversations = [], isLoading: convsLoading } = useListConversations();
  const { data: marketPrices = [] } = useListMarketPrices();

  const handleAsk = () => {
    if (!askText.trim() || isStreaming) return;
    const text = askText;
    setAskText("");
    sendMessage(text, null, (newConvId: number) => {
      setLocation(`/conversations/${newConvId}`);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handlePrompt = (text: string) => {
    sendMessage(text, null, (newConvId: number) => {
      setLocation(`/conversations/${newConvId}`);
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Top search bar */}
      <div className="bg-white border-b border-[#EDEFF1] px-4 py-2.5 sticky top-0 z-10 flex items-center gap-3">
        <div className="flex-1 bg-[#F6F7F8] border border-[#EDEFF1] rounded-full px-4 py-2 flex items-center gap-2 max-w-xl cursor-text">
          <svg className="w-4 h-4 text-[#878A8C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[#878A8C] text-sm">Search conversations…</span>
        </div>
        <button
          onClick={() => handlePrompt("Hello Mshauri, I need farming advice.")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
        >
          Ask
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 flex gap-4">
        {/* Main feed */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Ask box */}
          <div className="bg-white rounded-lg border border-[#EDEFF1] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0 mt-0.5">F</div>
              <div className="flex-1">
                <textarea
                  value={askText}
                  onChange={(e) => setAskText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your crops, soil, pests, or prices… (English, Shona, Ndebele)"
                  rows={2}
                  className="w-full bg-[#F8F9FA] border border-[#EDEFF1] rounded-lg px-4 py-2.5 text-[13px] text-[#1c1c1c] placeholder:text-[#878A8C] focus:outline-none focus:border-emerald-400 resize-none transition-colors"
                  data-testid="input-ask-home"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button className="flex items-center gap-1.5 text-[11px] text-[#878A8C] hover:text-emerald-600 bg-[#F6F7F8] border border-[#EDEFF1] rounded-md px-2.5 py-1 transition-colors">
                    <Camera className="w-3 h-3" /> Add Photo
                  </button>
                  <button className="flex items-center gap-1.5 text-[11px] text-[#878A8C] hover:text-emerald-600 bg-[#F6F7F8] border border-[#EDEFF1] rounded-md px-2.5 py-1 transition-colors">
                    <Mic className="w-3 h-3" /> Voice Note
                  </button>
                  <button
                    onClick={handleAsk}
                    disabled={!askText.trim() || isStreaming}
                    className="ml-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-semibold px-4 py-1.5 rounded-lg transition-colors"
                    data-testid="button-ask-submit"
                  >
                    {isStreaming ? "Sending…" : "Ask Mshauri →"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick prompts */}
          <div className="bg-white rounded-lg border border-[#EDEFF1] px-4 py-3">
            <p className="text-[11px] text-[#878A8C] font-semibold uppercase tracking-wider mb-2">Quick Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "🌽 Maize disease help", text: "My maize leaves are turning yellow at the tips. What could be wrong and how do I fix it?" },
                { label: "💰 Harare market prices", text: "What are the current market prices for vegetables in Harare?" },
                { label: "🐄 Livestock health", text: "My cattle are coughing and seem weak. What should I do?" },
                { label: "🌱 Planting schedule", text: "When is the best time to plant tomatoes in Mashonaland?" },
              ].map(({ label, text }) => (
                <button
                  key={label}
                  onClick={() => handlePrompt(text)}
                  className="text-[12px] bg-[#F6F7F8] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-[#EDEFF1] rounded-full px-3 py-1.5 transition-colors text-[#1c1c1c] font-medium"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort bar */}
          <div className="bg-white rounded-lg border border-[#EDEFF1] px-4 py-2.5 flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs border-b-2 border-emerald-600 pb-0.5">
              🕐 Recent
            </button>
            <div className="ml-auto text-[11px] text-[#878A8C]">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Feed */}
          {convsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-[#EDEFF1] p-4 animate-pulse">
                <div className="h-3 bg-[#EDEFF1] rounded w-3/4 mb-2" />
                <div className="h-2 bg-[#EDEFF1] rounded w-full mb-1" />
                <div className="h-2 bg-[#EDEFF1] rounded w-2/3" />
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#EDEFF1] p-10 text-center">
              <div className="text-4xl mb-3">🌱</div>
              <h3 className="font-semibold text-[#1c1c1c] text-sm mb-1">No conversations yet</h3>
              <p className="text-xs text-[#878A8C]">Ask your first farming question above to get started.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <Link key={conv.id} href={`/conversations/${conv.id}`}>
                <div
                  className="bg-white rounded-lg border border-[#EDEFF1] hover:border-[#818384] transition-colors group cursor-pointer overflow-hidden"
                  data-testid={`card-conversation-${conv.id}`}
                >
                  <div className="flex">
                    {/* Vote-style accent */}
                    <div className="w-10 bg-[#F8F9FA] flex flex-col items-center justify-center py-4 shrink-0 border-r border-[#EDEFF1]">
                      <svg className="w-4 h-4 text-[#878A8C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] text-[#878A8C]">
                          {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                      <h3 className="font-semibold text-[#1c1c1c] text-[13px] leading-snug mb-1 group-hover:text-emerald-700 transition-colors">
                        {conv.title || "New Conversation"}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[11px] text-[#878A8C]">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          View conversation
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-[#878A8C]">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          Mshauri replied
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center pr-4">
                      <svg className="w-4 h-4 text-[#878A8C] group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Right sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block space-y-4">
          {/* About card */}
          <div className="bg-white rounded-lg border border-[#EDEFF1] overflow-hidden">
            <div className="bg-emerald-600 h-10" />
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 -mt-4 mb-3">
                <div className="w-10 h-10 bg-emerald-700 rounded-full border-4 border-white flex items-center justify-center text-white font-bold text-base">M</div>
              </div>
              <h2 className="font-bold text-[#1c1c1c] text-sm mb-1">About Mshauri</h2>
              <p className="text-[11px] text-[#878A8C] leading-relaxed mb-3">
                AI-powered agricultural assistant for Zimbabwean farmers. Ask in English, Shona, or Ndebele. Also available on WhatsApp.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3 text-center">
                <div>
                  <div className="font-bold text-[#1c1c1c] text-sm">{conversations.length}</div>
                  <div className="text-[10px] text-[#878A8C]">Questions</div>
                </div>
                <div>
                  <div className="font-bold text-[#1c1c1c] text-sm flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />24/7
                  </div>
                  <div className="text-[10px] text-[#878A8C]">Available</div>
                </div>
              </div>
            </div>
          </div>

          {/* Market snapshot */}
          {marketPrices.length > 0 && (
            <div className="bg-white rounded-lg border border-[#EDEFF1] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[10px] text-[#878A8C] uppercase tracking-wider">Market Prices</h3>
                <Link href="/market-prices">
                  <span className="text-[10px] text-emerald-600 font-medium hover:underline cursor-pointer">View all</span>
                </Link>
              </div>
              <div className="space-y-2">
                {marketPrices.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="text-[12px] text-[#1c1c1c] truncate mr-2">{item.cropName}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] font-bold text-[#1c1c1c]">
                        ${Number(item.pricePerKg).toFixed(2)}/kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topics */}
          <div className="bg-white rounded-lg border border-[#EDEFF1] p-4">
            <h3 className="font-bold text-[10px] text-[#878A8C] uppercase tracking-wider mb-3">Ask by Topic</h3>
            <div className="flex flex-wrap gap-1.5">
              {TOPIC_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handlePrompt(`Tell me about ${tag.toLowerCase()} in farming`)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors hover:opacity-80 ${
                    TAG_COLORS[tag] ?? "bg-[#F6F7F8] text-[#1c1c1c] border-[#EDEFF1]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp CTA */}
          <div className="bg-emerald-600 rounded-lg p-4 text-white">
            <div className="text-2xl mb-2">💬</div>
            <h3 className="font-bold text-sm mb-1">Also on WhatsApp</h3>
            <p className="text-[11px] text-emerald-100 mb-0 leading-relaxed">
              Chat with Mshauri directly in WhatsApp — works in the field with low data.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
