import { useState, useEffect, useRef } from "react";
import { X, MapPin, Loader2, Plus, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateCommunityModal } from "./CreateCommunityModal";

interface Community { id: number; slug: string; name: string; description: string; memberCount: number; postCount: number; }

const COMMUNITY_ICONS: Record<string, string> = {
  maize:"🌽", livestock:"🐄", poultry:"🐔", vegetables:"🥬",
  tobacco:"🌿", pests:"🐛", irrigation:"💧", agribusiness:"💼",
  climate:"🌦️", soils:"🪱", crops:"🌾", diseases:"🦠",
  faq:"❓", machinery:"⚙️", maricho:"📰", veterinary:"🐾",
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
  const titleRef = useRef<HTMLTextAreaElement>(null);

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
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showAllCommunities, setShowAllCommunities] = useState(false);

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
    if (open) setTimeout(() => titleRef.current?.focus(), 80);
  }, [open]);

  const selectedCommunity = communities.find(c => c.id === communityId);

  function resetAndClose() {
    setTitle(""); setContent(""); setLocation(""); setCommunityId(""); setType("question");
    setShowDetails(false); setShowLocation(false); setShowAllCommunities(false);
    setShowCreateCommunity(false);
    onClose();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId, type, title: title.trim(), content: content.trim() || title.trim(), location: location.trim() || undefined }),
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

  const visibleCommunities = showAllCommunities ? communities : communities.slice(0, 12);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetAndClose} />

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

            {/* ── Community selector (inline) ── */}
            <div className="px-4 pt-4 pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">Post to community</span>
                {selectedCommunity && (
                  <span className="text-[11px] text-[#22c55e] font-bold">
                    {COMMUNITY_ICONS[selectedCommunity.slug] ?? "🌱"} r/{selectedCommunity.slug} ✓
                  </span>
                )}
              </div>

              {loadingCommunities ? (
                <div className="flex items-center gap-2 py-2 text-[var(--text-3)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[12px]">Loading communities…</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {visibleCommunities.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCommunityId(c.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-bold border transition-all ${
                        communityId === c.id
                          ? "bg-[#22c55e]/15 border-[#22c55e]/60 text-[#22c55e]"
                          : "bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-2)] hover:border-[var(--text-2)]/50 hover:text-[var(--text-1)]"
                      }`}
                    >
                      <span>{COMMUNITY_ICONS[c.slug] ?? "🌱"}</span>
                      <span>r/{c.slug}</span>
                    </button>
                  ))}

                  {communities.length > 12 && (
                    <button
                      type="button"
                      onClick={() => setShowAllCommunities(o => !o)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-bold border border-[var(--border-color)] text-[var(--text-3)] hover:text-[var(--text-2)] bg-[var(--bg-subtle)] transition-all"
                    >
                      {showAllCommunities ? "Show less" : `+${communities.length - 12} more`}
                      <ChevronDown className={`w-3 h-3 transition-transform ${showAllCommunities ? "rotate-180" : ""}`} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowCreateCommunity(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-bold border border-dashed border-[#22c55e]/40 text-[#22c55e] hover:border-[#22c55e]/70 hover:bg-[#22c55e]/5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New
                  </button>
                </div>
              )}
            </div>

            {/* ── Title ── */}
            <div className="px-4 pt-4 pb-2">
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

            {/* ── Details ── */}
            <div className="px-4 py-3 min-h-[56px]">
              {showDetails ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={4}
                  placeholder="Share the details…"
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

            {/* ── Actions ── */}
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
