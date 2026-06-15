import { useState, useEffect, useRef } from "react";
import { X, MapPin, Loader2, Plus, Search, ChevronDown, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CreateCommunityModal } from "./CreateCommunityModal";

interface Community {
  id: number;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  postCount: number;
}

const COMMUNITY_ICONS: Record<string, string> = {
  maize: "🌽", livestock: "🐄", poultry: "🐔", vegetables: "🥬",
  tobacco: "🌿", pests: "🐛", irrigation: "💧", agribusiness: "💼",
  climate: "🌦️", soils: "🪱", crops: "🌾", diseases: "🦠",
  faq: "❓", machinery: "⚙️", maricho: "📰", veterinary: "🐾",
};

const COMMUNITY_COLORS: Record<string, string> = {
  maize: "#f59e0b", livestock: "#6b7280", poultry: "#f97316", vegetables: "#22c55e",
  tobacco: "#84cc16", pests: "#ef4444", irrigation: "#3b82f6", agribusiness: "#8b5cf6",
  climate: "#06b6d4", soils: "#a78bfa", crops: "#10b981", diseases: "#f43f5e",
  faq: "#6366f1", machinery: "#64748b", maricho: "#0ea5e9", veterinary: "#ec4899",
};

const POST_TYPES = [
  { value: "question",       label: "Question",      icon: "❓" },
  { value: "disease_report", label: "Disease Alert", icon: "🦠" },
  { value: "market_price",   label: "Market Update", icon: "📈" },
  { value: "opportunity",    label: "Opportunity",   icon: "💡" },
  { value: "success_story",  label: "Success Story", icon: "✅" },
  { value: "weather",        label: "Weather",       icon: "🌦️" },
];

interface Props { open: boolean; onClose: () => void; onCreated: () => void; }

export function CreatePostModal({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [communityId, setCommunityId] = useState<number | "">("");
  const [type, setType] = useState("question");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setLoadingCommunities(true);
      fetch("/api/communities")
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setCommunities(d); })
        .catch(() => {})
        .finally(() => setLoadingCommunities(false));
    }
  }, [open]);

  useEffect(() => {
    if (showPicker) setTimeout(() => searchRef.current?.focus(), 60);
    else setTimeout(() => titleRef.current?.focus(), 60);
  }, [showPicker, open]);

  const selectedCommunity = communities.find(c => c.id === communityId);
  const filtered = search.trim()
    ? communities.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase()) ||
        (c.description ?? "").toLowerCase().includes(search.toLowerCase()))
    : communities;

  function resetAndClose() {
    setTitle(""); setContent(""); setLocation(""); setCommunityId(""); setType("question");
    setShowDetails(false); setShowLocation(false); setShowPicker(false); setSearch("");
    setShowCreateCommunity(false);
    onClose();
  }

  function pickCommunity(id: number) {
    setCommunityId(id);
    setShowPicker(false);
    setSearch("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!communityId || !title.trim()) {
      toast({ title: "Missing fields", description: "Choose a community and add a title.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId, type,
          title: title.trim(),
          content: content.trim() || title.trim(),
          location: location.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Posted! 🌱", description: "Your post is live." });
      resetAndClose();
      onCreated();
    } catch {
      toast({ title: "Error", description: "Could not create post. Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetAndClose} />

      {/* ── Main post form ── */}
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[560px] shadow-2xl flex flex-col max-h-[94dvh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] shrink-0">
          <h2 className="text-[var(--text-1)] font-bold text-[15px]">Create Post</h2>
          <button onClick={resetAndClose} className="p-1.5 rounded-full text-[var(--text-2)] hover:bg-[var(--bg-subtle)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit}>

            {/* ── Community selector button ── */}
            <div className="px-4 pt-3 pb-3 border-b border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border transition-all text-left ${
                  selectedCommunity
                    ? "border-[#22c55e]/40 bg-[#22c55e]/5"
                    : "border-[var(--border-color)] bg-[var(--bg-subtle)] hover:border-[var(--text-3)]/40"
                }`}
              >
                {selectedCommunity ? (
                  <>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[14px] shrink-0"
                      style={{ background: COMMUNITY_COLORS[selectedCommunity.slug] ?? "#22c55e" }}
                    >
                      {COMMUNITY_ICONS[selectedCommunity.slug] ?? "🌱"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--text-1)] font-bold text-[13px]">r/{selectedCommunity.slug}</div>
                      <div className="text-[var(--text-3)] text-[10px]">{selectedCommunity.memberCount.toLocaleString()} members</div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[var(--text-3)] shrink-0" />
                  </>
                ) : (
                  <>
                    <div className="w-7 h-7 rounded-full bg-[var(--border-color)] flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5 text-[var(--text-3)]" />
                    </div>
                    <span className="flex-1 text-[var(--text-3)] text-[13px] font-semibold">Select Community</span>
                    <ChevronDown className="w-4 h-4 text-[var(--text-3)] shrink-0" />
                  </>
                )}
              </button>
            </div>

            {/* ── Title ── */}
            <div className="px-4 pt-3 pb-2">
              <textarea
                ref={titleRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="What's on your mind? *"
                className="w-full bg-transparent text-[var(--text-1)] text-[15px] font-semibold placeholder-[var(--text-3)] focus:outline-none resize-none leading-snug"
              />
            </div>

            {/* ── Post type chips ── */}
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {POST_TYPES.map(pt => (
                <button
                  key={pt.value} type="button"
                  onClick={() => setType(pt.value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    type === pt.value
                      ? "border-[#22c55e]/60 bg-[#22c55e]/15 text-[#22c55e]"
                      : "border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-2)] hover:border-[var(--text-2)]/40 hover:text-[var(--text-1)]"
                  }`}
                >
                  {pt.icon} {pt.label}
                </button>
              ))}
            </div>

            <div className="border-t border-[var(--border-color)]" />

            {/* ── Details (optional) ── */}
            <div className="px-4 py-3 min-h-[56px]">
              {showDetails ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={4}
                  placeholder="Share more details…"
                  className="w-full bg-transparent text-[var(--text-1)] text-[13px] placeholder-[var(--text-3)] focus:outline-none resize-none"
                  autoFocus
                />
              ) : (
                <button type="button" onClick={() => setShowDetails(true)}
                  className="text-[var(--text-3)] text-[13px] hover:text-[var(--text-2)] transition-colors w-full text-left"
                >
                  + Add details (optional)
                </button>
              )}
            </div>

            {/* ── Location ── */}
            {showLocation && (
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 bg-[var(--bg-subtle)] rounded-lg px-3 py-2">
                  <MapPin className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Harare, Gweru, Matabeleland North…"
                    className="flex-1 bg-transparent text-[var(--text-1)] text-[12px] placeholder-[var(--text-3)] focus:outline-none"
                    autoFocus
                  />
                  <button type="button" onClick={() => { setShowLocation(false); setLocation(""); }}>
                    <X className="w-3.5 h-3.5 text-[var(--text-3)]" />
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-[var(--border-color)]" />

            {/* ── Bottom actions ── */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowLocation(l => !l)}
                className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                  showLocation
                    ? "border-[#22c55e]/50 text-[#22c55e] bg-[#22c55e]/10"
                    : "border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {location || "Add location"}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={resetAndClose}
                  className="px-4 py-2 rounded-full text-[var(--text-2)] text-[13px] font-bold hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !communityId}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 rounded-full text-white text-[13px] font-bold transition-colors"
                >
                  {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Posting…</> : "Post"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Community Picker popup (Reddit-style "Post to") ── */}
      {showPicker && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end sm:items-center sm:justify-center">
          <div className="absolute inset-0" onClick={() => { setShowPicker(false); setSearch(""); }} />
          <div className="relative bg-[#1a1a1b] border border-[var(--border-color)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[480px] shadow-2xl flex flex-col max-h-[75dvh] sm:max-h-[560px] overflow-hidden">

            {/* Picker header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-color)] shrink-0">
              <h3 className="text-[var(--text-1)] font-bold text-[15px]">Post to</h3>
              <button
                onClick={() => { setShowPicker(false); setSearch(""); }}
                className="p-1.5 rounded-full text-[var(--text-2)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2.5 border-b border-[var(--border-color)] shrink-0">
              <div className="flex items-center gap-2 bg-[var(--bg-subtle)] rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-[var(--text-3)] shrink-0" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search communities"
                  className="flex-1 bg-transparent text-[var(--text-1)] text-[13px] placeholder-[var(--text-3)] focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")}>
                    <X className="w-3.5 h-3.5 text-[var(--text-3)]" />
                  </button>
                )}
              </div>
            </div>

            {/* Community list */}
            <div className="overflow-y-auto flex-1">
              {loadingCommunities ? (
                <div className="flex items-center justify-center py-10 text-[var(--text-3)]">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-[13px]">Loading…</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-3)] text-[13px]">
                  No communities found{search ? ` for "${search}"` : ""}
                </div>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickCommunity(c.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[var(--bg-subtle)] transition-colors border-b border-[var(--border-color)]/50 last:border-0 ${
                      communityId === c.id ? "bg-[#22c55e]/8" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[20px] shrink-0 shadow-sm"
                      style={{ background: COMMUNITY_COLORS[c.slug] ?? "#22c55e" }}
                    >
                      {COMMUNITY_ICONS[c.slug] ?? "🌱"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--text-1)] font-bold text-[13px]">r/{c.slug}</span>
                        {communityId === c.id && (
                          <span className="text-[10px] text-[#22c55e] font-bold">✓</span>
                        )}
                      </div>
                      <div className="text-[var(--text-3)] text-[11px] mt-0.5">
                        {c.memberCount.toLocaleString()} members
                        {c.description ? ` · ${c.description}` : ""}
                      </div>
                    </div>
                  </button>
                ))
              )}

              {/* Create a community row */}
              {user ? (
                <button
                  type="button"
                  onClick={() => { setShowPicker(false); setShowCreateCommunity(true); }}
                  className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-[var(--bg-subtle)] transition-colors border-t border-[var(--border-color)]"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] border border-dashed border-[#22c55e]/50 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-[#22c55e]" />
                  </div>
                  <div>
                    <div className="text-[#22c55e] font-bold text-[13px]">Start a community</div>
                    <div className="text-[var(--text-3)] text-[11px] mt-0.5">Create your own farming community</div>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-3 w-full px-4 py-3.5 border-t border-[var(--border-color)] opacity-60">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] border border-dashed border-[#2F3336] flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-[#71767B]" />
                  </div>
                  <div>
                    <div className="text-[#71767B] font-bold text-[13px]">Start a community</div>
                    <div className="text-[#71767B] text-[11px] mt-0.5">Sign in to create your own community</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Community modal */}
      <CreateCommunityModal
        open={showCreateCommunity}
        onClose={() => setShowCreateCommunity(false)}
        onCreated={(c) => {
          setCommunities(prev => [...prev, c]);
          setCommunityId(c.id);
          setShowCreateCommunity(false);
        }}
      />
    </div>
  );
}
