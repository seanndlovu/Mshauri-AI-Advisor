import { useState, useEffect } from "react";
import { X, MapPin, Loader2, ChevronDown } from "lucide-react";
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
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communityId, setCommunityId] = useState<number | "">("");
  const [type, setType] = useState("question");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [location, setLocation] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && communities.length === 0) {
      fetch("/api/communities").then(r => r.json()).then(d => {
        if (Array.isArray(d)) setCommunities(d);
      }).catch(() => {});
    }
  }, [open]);

  const selectedCommunity = communities.find(c => c.id === communityId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!communityId || !title.trim()) {
      toast({ title: "Missing fields", description: "Please choose a community and add a title.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId, type,
          title: title.trim(),
          content: content.trim() || title.trim(),
          location: location.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Posted! 🌱", description: "Your post is live in the community." });
      setTitle(""); setContent(""); setLocation(""); setCommunityId(""); setType("question");
      setShowDetails(false); setShowLocation(false);
      onCreated();
      onClose();
    } catch {
      toast({ title: "Error", description: "Could not create post. Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">

        {/* Top bar — community selector */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <div className="relative">
            <button
              type="button"
              onClick={() => setCommunityOpen(o => !o)}
              className="flex items-center gap-1.5 bg-[var(--bg-page)] border border-[var(--border-color)] hover:border-[#22c55e]/50 rounded-full px-3 py-1.5 text-[12px] font-bold text-[var(--text-1)] transition-colors"
            >
              {selectedCommunity
                ? <><span>{COMMUNITY_ICONS[selectedCommunity.slug] ?? "🌱"}</span> r/{selectedCommunity.slug}</>
                : "Select Community"}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${communityOpen ? "rotate-180" : ""}`} />
            </button>
            {communityOpen && (
              <div className="absolute top-full mt-1 left-0 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 w-56 overflow-hidden">
                <div className="max-h-60 overflow-y-auto py-1">
                  {communities.map(c => (
                    <button
                      key={c.id} type="button"
                      onClick={() => { setCommunityId(c.id); setCommunityOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left hover:bg-[var(--bg-subtle)] transition-colors ${communityId === c.id ? "text-[#22c55e] font-bold" : "text-[var(--text-1)]"}`}
                    >
                      <span>{COMMUNITY_ICONS[c.slug] ?? "🌱"}</span>
                      <span>r/{c.slug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-[var(--text-2)] hover:bg-[var(--bg-subtle)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="px-4 pt-4 pb-2">
            <textarea
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="What's on your mind? *"
              className="w-full bg-transparent text-[var(--text-1)] text-[16px] font-semibold placeholder-[var(--text-3)] focus:outline-none resize-none leading-snug"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setShowDetails(true); } }}
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

          {/* Divider */}
          <div className="border-t border-[var(--border-color)]" />

          {/* Details (collapsible) */}
          <div className="px-4 py-3">
            {showDetails ? (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={5}
                autoFocus
                placeholder="Share the details..."
                className="w-full bg-transparent text-[var(--text-1)] text-[13px] placeholder-[var(--text-3)] focus:outline-none resize-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="text-[var(--text-3)] text-[13px] hover:text-[var(--text-2)] transition-colors w-full text-left"
              >
                Share the details... (optional)
              </button>
            )}
          </div>

          {/* Location (collapsible) */}
          {showLocation ? (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 bg-[var(--bg-subtle)] rounded-lg px-3 py-2">
                <MapPin className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Harare, Gweru, Matabeleland North…"
                  className="flex-1 bg-transparent text-[var(--text-1)] text-[12px] placeholder-[var(--text-3)] focus:outline-none"
                />
                <button type="button" onClick={() => { setShowLocation(false); setLocation(""); }} className="text-[var(--text-3)] hover:text-[var(--text-2)]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : null}

          {/* Divider */}
          <div className="border-t border-[var(--border-color)]" />

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => setShowLocation(l => !l)}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                showLocation
                  ? "border-[#22c55e]/50 text-[#22c55e] bg-[#22c55e]/10"
                  : "border-[var(--border-color)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {location || "Add location"}
            </button>
            <div className="flex gap-2">
              <button
                type="button" onClick={onClose}
                className="px-4 py-2 rounded-full text-[var(--text-2)] text-[13px] font-bold hover:bg-[var(--bg-subtle)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={submitting || !title.trim() || !communityId}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 rounded-full text-white text-[13px] font-bold transition-colors"
              >
                {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Posting…</> : "Post"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
