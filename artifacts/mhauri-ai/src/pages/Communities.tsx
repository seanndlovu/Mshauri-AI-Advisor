import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Users, TrendingUp, Plus, Sprout } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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
  pests: "🐛", soils: "🪱",
};

export default function Communities() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/communities")
      .then((r) => r.json())
      .then((data) => { setCommunities(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[#E7E9EA] text-xl font-bold">Communities</h1>
            <p className="text-[#71767B] text-sm mt-0.5">Join discussions with Zimbabwe's farming community</p>
          </div>
        </div>

        {/* Community list */}
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
          <div className="flex flex-col gap-0">
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
                      <p className="text-[#71767B] text-sm truncate">{c.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[12px] text-[#71767B]">
                          <Users className="w-3 h-3" /> {c.memberCount.toLocaleString()} members
                        </span>
                        <span className="text-[12px] text-[#71767B]">{c.postCount.toLocaleString()} posts</span>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-[#22c55e] shrink-0" />
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
