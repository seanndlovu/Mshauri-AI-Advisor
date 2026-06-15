import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Community { id: number; slug: string; name: string; description: string; memberCount: number; postCount: number; }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (community: Community) => void;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function CreateCommunityModal({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setName(""); setSlug(""); setSlugManual(false); setDescription(""); setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!slugManual) setSlug(slugify(name));
  }, [name, slugManual]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !slug.trim() || !description.trim()) {
      setError("All fields are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      toast({ title: `r/${data.slug} created! 🌱`, description: "Your community is live." });
      onCreated(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[480px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-[var(--text-1)] font-bold text-[16px]">Create Community</h2>
          <button onClick={onClose} className="p-1.5 rounded-full text-[var(--text-2)] hover:bg-[var(--bg-subtle)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-2)] mb-1.5 uppercase tracking-wide">
              Community Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Aquaculture Zimbabwe"
              maxLength={80}
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-[var(--text-1)] text-[14px] placeholder-[var(--text-3)] focus:outline-none focus:border-[#22c55e]/60 transition-colors"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-2)] mb-1.5 uppercase tracking-wide">
              URL Slug <span className="text-[var(--text-3)] font-normal normal-case">(r/slug)</span>
            </label>
            <div className="flex items-center gap-0 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-lg overflow-hidden focus-within:border-[#22c55e]/60 transition-colors">
              <span className="px-3 text-[var(--text-3)] text-[14px] shrink-0">r/</span>
              <input
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugManual(true); }}
                placeholder="aquaculture-zw"
                maxLength={40}
                className="flex-1 bg-transparent py-2.5 pr-3 text-[var(--text-1)] text-[14px] placeholder-[var(--text-3)] focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-[var(--text-3)] mt-1">Only letters, numbers, and hyphens. Cannot be changed later.</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-2)] mb-1.5 uppercase tracking-wide">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this community about? Who should join?"
              maxLength={300}
              rows={3}
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-[var(--text-1)] text-[14px] placeholder-[var(--text-3)] focus:outline-none focus:border-[#22c55e]/60 transition-colors resize-none"
            />
            <p className="text-[11px] text-[var(--text-3)] mt-1">{description.length}/300</p>
          </div>

          {error && (
            <p className="text-red-400 text-[12px] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-[var(--border-color)] text-[var(--text-2)] text-[13px] font-bold hover:bg-[var(--bg-subtle)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !name.trim() || !slug.trim() || !description.trim()}
              className="flex-1 py-2.5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 text-white text-[13px] font-bold transition-colors flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : "Create Community"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
