import { useState, useEffect } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Community { id: number; slug: string; name: string; }

const POST_TYPES = [
  { value: "question",       label: "Question",       icon: "❓", desc: "Ask the community" },
  { value: "disease_report", label: "Disease Alert",  icon: "🦠", desc: "Report pest or disease" },
  { value: "market_price",   label: "Market Update",  icon: "📈", desc: "Share price info" },
  { value: "opportunity",    label: "Opportunity",    icon: "💡", desc: "Grants, buyers, jobs" },
  { value: "success_story",  label: "Success Story",  icon: "✅", desc: "Share what worked" },
  { value: "weather",        label: "Weather Report", icon: "🌦️", desc: "Local weather update" },
];

interface Props { open: boolean; onClose: () => void; onCreated: () => void; }

export function CreatePostModal({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communityId, setCommunityId] = useState<number | "">("");
  const [type, setType] = useState("question");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && communities.length === 0) {
      fetch("/api/communities").then(r => r.json()).then(d => {
        if (Array.isArray(d)) setCommunities(d);
      }).catch(() => {});
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!communityId || !title.trim() || !content.trim()) {
      toast({ title: "Missing fields", description: "Please fill in community, title and content.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId, type, title: title.trim(), content: content.trim(), location: location.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Post created!", description: "Your post is live in the community." });
      setTitle(""); setContent(""); setLocation(""); setCommunityId(""); setType("question");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1e2025] border border-[#343536] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#343536]">
          <h2 className="font-bold text-[#d7dadc] text-[16px]">Create Post</h2>
          <button onClick={onClose} className="p-1.5 rounded-full text-[#818384] hover:bg-[#272729] hover:text-[#d7dadc] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Community */}
          <div>
            <label className="block text-[11px] font-bold text-[#818384] uppercase tracking-wider mb-1.5">Community *</label>
            <select
              value={communityId}
              onChange={e => setCommunityId(Number(e.target.value) || "")}
              className="w-full bg-[#272729] border border-[#343536] rounded-lg px-3 py-2.5 text-[#d7dadc] text-[13px] focus:outline-none focus:border-[#22c55e]/60 transition-colors"
            >
              <option value="">Select a community…</option>
              {communities.map(c => (
                <option key={c.id} value={c.id}>r/{c.slug} — {c.name}</option>
              ))}
            </select>
          </div>

          {/* Post type */}
          <div>
            <label className="block text-[11px] font-bold text-[#818384] uppercase tracking-wider mb-1.5">Post Type *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {POST_TYPES.map(pt => (
                <button
                  key={pt.value} type="button"
                  onClick={() => setType(pt.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-center transition-all ${
                    type === pt.value
                      ? "border-[#22c55e]/60 bg-[#22c55e]/10 text-[#22c55e]"
                      : "border-[#343536] bg-[#272729] text-[#818384] hover:border-[#818384]/40 hover:text-[#d7dadc]"
                  }`}
                >
                  <span className="text-xl">{pt.icon}</span>
                  <span className="text-[10px] font-bold">{pt.label}</span>
                  <span className="text-[9px] opacity-70 hidden sm:block">{pt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-[#818384] uppercase tracking-wider mb-1.5">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={300}
              placeholder="What do you want to share or ask?"
              className="w-full bg-[#272729] border border-[#343536] rounded-lg px-3 py-2.5 text-[#d7dadc] text-[13px] placeholder-[#4a5568] focus:outline-none focus:border-[#22c55e]/60 transition-colors"
            />
            <div className="text-right text-[10px] text-[#4a5568] mt-1">{title.length}/300</div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-[11px] font-bold text-[#818384] uppercase tracking-wider mb-1.5">Content *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
              placeholder="Share details, ask your question, or describe what you observed…"
              className="w-full bg-[#272729] border border-[#343536] rounded-lg px-3 py-2.5 text-[#d7dadc] text-[13px] placeholder-[#4a5568] focus:outline-none focus:border-[#22c55e]/60 transition-colors resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-[11px] font-bold text-[#818384] uppercase tracking-wider mb-1.5">Location <span className="text-[#4a5568] normal-case font-normal">(optional)</span></label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5568]" />
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Harare, Gweru, Matabeleland North…"
                className="w-full bg-[#272729] border border-[#343536] rounded-lg pl-9 pr-3 py-2.5 text-[#d7dadc] text-[13px] placeholder-[#4a5568] focus:outline-none focus:border-[#22c55e]/60 transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-[#343536] rounded-full text-[#818384] text-[13px] font-bold hover:bg-[#272729] hover:text-[#d7dadc] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 rounded-full text-white text-[13px] font-bold transition-colors"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting…</> : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
