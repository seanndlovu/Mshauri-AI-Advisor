import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Users, TrendingUp, Sprout, Plus, Sparkles } from "lucide-react";

interface Community {
  id: number;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  postCount: number;
}

const COMMUNITY_ICONS: Record<string, string> = {
  maize: "🌽", livestock: "🐄", poultry: "🐔", irrigation: "💧",
  climate: "🌦️", agribusiness: "💼", tobacco: "🌿", vegetables: "🥬",
  pests: "🐛", soils: "🪱", crops: "🌾", diseases: "🦠",
  faq: "❓", machinery: "⚙️", maricho: "📰", veterinary: "🐾",
};

export default function Communities() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetch("/api/communities")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCommunities(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("create") === "1") setShowPicker(true);
  }, [search]);

  function pickCommunity(slug: string) {
    setShowPicker(false);
    setLocation(`/communities/${slug}?compose=1`);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[#E7E9EA] text-xl font-bold">Communities</h1>
            <p className="text-[#71767B] text-sm mt-0.5">Connect, share knowledge, and solve challenges together</p>
          </div>
          <button
            onClick={() => setShowPicker(true)}
            title="Create post"
            className="shrink-0 flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-[12px] font-bold px-3.5 py-2 rounded-full transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Create
          </button>
        </div>

        {/* What are communities — explanation banner */}
        <div className="mb-5 bg-[#16181C] border border-[#2F3336] rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <p className="text-[#C4C9CF] text-[13px] leading-relaxed">
              <span className="text-[#E7E9EA] font-semibold">Mshauri Communities</span> are spaces where people with shared interests connect to ask questions, share knowledge, exchange ideas, and learn from one another. Join discussions, discover new insights, get advice from experts and peers, and work together to solve challenges across the global food system.
            </p>
          </div>
          <Link href="/ask">
            <div className="flex items-center justify-between gap-2.5 px-4 py-2.5 border-t border-[#2F3336] bg-[#22c55e]/5 hover:bg-[#22c55e]/10 transition-colors cursor-pointer group">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                <p className="text-[#22c55e] text-[12px] font-medium">
                  Have a question? Ask Mshauri AI for an instant expert answer
                </p>
              </div>
              <span className="text-[#22c55e] text-[11px] font-bold shrink-0 group-hover:underline">Ask now →</span>
            </div>
          </Link>
        </div>

        {showPicker && (
          <div className="mb-4 bg-[#16181C] border border-[#2F3336] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#E7E9EA] text-sm font-semibold">Choose a community to post in</p>
              <button onClick={() => setShowPicker(false)} className="p-1 rounded-full text-[#71767B] hover:bg-white/5 text-sm">✕</button>
            </div>
            {communities.length === 0 ? (
              <p className="text-[#71767B] text-sm">No communities available yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {communities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pickCommunity(c.slug)}
                    className="flex items-center gap-1.5 bg-[#272729] hover:bg-[#343536] text-[#E7E9EA] text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors"
                  >
                    <span>{COMMUNITY_ICONS[c.slug] ?? "🌱"}</span> r/{c.slug}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-16 text-[#71767B]">
            <Sprout className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No communities yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0 bg-[#1e2025] border border-[#343536] rounded-2xl overflow-hidden">
            {communities.map((c, i) => {
              const icon = COMMUNITY_ICONS[c.slug] ?? "🌱";
              return (
                <Link key={c.id} href={`/communities/${c.slug}`}>
                  <div className={`flex items-center gap-4 px-4 py-4 hover:bg-white/5 cursor-pointer transition-colors ${i < communities.length - 1 ? "border-b border-[#2F3336]" : ""}`}>
                    <div className="w-12 h-12 rounded-full bg-[#16181C] border border-[#2F3336] flex items-center justify-center text-2xl shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[#E7E9EA] font-bold text-[15px]">r/{c.slug}</span>
                        {c.postCount > 50 && (
                          <span className="flex items-center gap-1 text-[10px] text-[#22c55e] font-medium">
                            <TrendingUp className="w-3 h-3" /> Trending
                          </span>
                        )}
                      </div>
                      <p className="text-[#71767B] text-sm truncate">{c.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[12px] text-[#71767B]">
                          <Users className="w-3 h-3" /> {c.memberCount.toLocaleString()} members
                        </span>
                        <span className="text-[12px] text-[#71767B]">{c.postCount.toLocaleString()} posts</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
