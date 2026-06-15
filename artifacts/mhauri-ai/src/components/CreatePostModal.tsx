import { useState, useEffect, useRef } from "react";
import { X, MapPin, Loader2, Search, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Community { id: number; slug: string; name: string; }

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
  const [communityId, setCommunityId] = useState<number | "">("");
  const [type, setType] = useState("question");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Community picker panel state
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && communities.length === 0) {
      fetch("/api/communities").then(r => r.json()).then(d => {
        if (Array.isArray(d)) setCommunities(d);
      }).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (showPicker) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [showPicker]);

  useEffect(() => {
    if (open && !showPicker) {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, showPicker]);

  const selectedCommunity = communities.find(c => c.id === communityId);
  const filtered = search.trim()
    ? communities.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase()))
    : communities;

  function resetAndClose() {
    setTitle(""); setContent(""); setLocation(""); setCommunityId(""); setType("question");
    setShowDetails(false); setShowLocation(false); setShowPicker(false); setSearch("");
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

  return (
    /* Full-screen overlay */
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-start sm:pt-[5vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetAndClose} />

      {/* Modal — bottom-sheet on mobile, centered card on desktop */}
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[540px] shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">

        {/* ─── Community Picker Panel ─── */}
        {showPicker ? (
          <>
            {/* Picker header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-color)] shrink-0">
              <button
                onClick={() => { setShowPicker(false); setSearch(""); }}
                className="p-1 rounded-full text-[var(--text-2)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="text-[var(--text-1)] font-bold text-[15px]">Post to</h3>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-[var(--border-color)] shrink-0">
              <div className="flex items-center gap-2 bg-[var(--bg-subtle)] rounded-full px-3 py-2">
                <Search className="w-4 h-4 text-[var(--text-3)] shrink-0" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search communities…"
                  className="flex-1 bg-transparent text-[var(--text-1)] text-[13px] placeholder-[var(--text-3)] focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-[var(--text-3)] hover:text-[var(--text-2)]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Community list */}
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-[var(--text-3)] text-[13px]">No communities found</p>
              ) : filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCommunityId(c.id); setShowPicker(false); setSearch(""); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-subtle)] border-b border-[var(--border-color)]/40 ${
                    communityId === c.id ? "bg-[#22c55e]/8" : ""
                  }`}
                >
                  <span className="text-2xl shrink-0">{COMMUNITY_ICONS[c.slug] ?? "🌱"}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-bold ${communityId === c.id ? "text-[#22c55e]" : "text-[var(--text-1)]"}`}>
                      r/{c.slug}
                    </div>
                    <div className="text-[11px] text-[var(--text-2)] truncate">{c.name}</div>
                  </div>
                  {communityId === c.id && <span className="text-[#22c55e] text-lg">✓</span>}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* ─── Post Form ─── */
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] shrink-0">
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-2 bg-[var(--bg-subtle)] hover:bg-[var(--bg-vote)] border border-[var(--border-color)] rounded-full pl-3 pr-4 py-2 text-[12px] font-bold text-[var(--text-1)] transition-colors max-w-[70%]"
              >
                <span className="text-base shrink-0">{selectedCommunity ? (COMMUNITY_ICONS[selectedCommunity.slug] ?? "🌱") : "🌱"}</span>
                <span className="truncate">{selectedCommunity ? `r/${selectedCommunity.slug}` : "Select Community"}</span>
                <svg className="w-3 h-3 ml-1 shrink-0 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <button onClick={resetAndClose} className="p-2 rounded-full text-[var(--text-2)] hover:bg-[var(--bg-subtle)] transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              {/* Title */}
              <div className="px-4 pt-4 pb-2">
                <textarea
                  ref={titleRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="What's on your mind? *"
                  className="w-full bg-transparent text-[var(--text-1)] text-[16px] font-semibold placeholder-[var(--text-3)] focus:outline-none resize-none leading-snug"
                />
              </div>

              {/* Post type chips */}
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

              {/* Details */}
              <div className="px-4 py-3 min-h-[60px]">
                {showDetails ? (
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={4}
                    placeholder="Share the details…"
                    className="w-full bg-transparent text-[var(--text-1)] text-[13px] placeholder-[var(--text-3)] focus:outline-none resize-none"
                  />
                ) : (
                  <button type="button" onClick={() => setShowDetails(true)}
                    className="text-[var(--text-3)] text-[13px] hover:text-[var(--text-2)] transition-colors w-full text-left"
                  >
                    + Add details (optional)
                  </button>
                )}
              </div>

              {/* Location */}
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

              {/* Bottom actions */}
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
          </>
        )}
      </div>
    </div>
  );
}
