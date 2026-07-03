import { useState, FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, LogOut, Check, X, ChevronRight } from "lucide-react";
import { useAuth, type UserRole } from "@/hooks/use-auth";

/* ─── constants ───────────────────────────────────────── */
const ROLE_LABELS: Record<UserRole, string> = {
  farmer:           "Farmer",
  agribusiness:     "Agribusiness",
  extension_officer:"Extension Officer",
  researcher:       "Researcher",
  ngo:              "NGO / Development Partner",
};

const ROLE_COLORS: Record<UserRole, { text: string; bg: string; border: string }> = {
  farmer:           { text: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/20"  },
  agribusiness:     { text: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/20"   },
  extension_officer:{ text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  researcher:       { text: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  ngo:              { text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
};

const LOCATIONS = [
  "Harare", "Bulawayo", "Mutare", "Gweru", "Kwekwe", "Kadoma", "Masvingo",
  "Chinhoyi", "Bindura", "Gwanda", "Lupane", "Beitbridge", "Victoria Falls",
];

/* Animal emojis matching the Shona names */
const ANIMALS = [
  { name: "Shumba",  emoji: "🦁" },
  { name: "Nzou",    emoji: "🐘" },
  { name: "Mhofu",   emoji: "🦌" },
  { name: "Mvuu",    emoji: "🦛" },
  { name: "Ngwe",    emoji: "🐆" },
  { name: "Nyati",   emoji: "🐃" },
  { name: "Hove",    emoji: "🐟" },
  { name: "Mhara",   emoji: "🐾" },
  { name: "Bveni",   emoji: "🦍" },
  { name: "Tsoko",   emoji: "🐒" },
];

function getAnonymousId(userId: number): { display: string; emoji: string } {
  const animal = ANIMALS[userId % ANIMALS.length];
  const num = 100 + ((userId * 127) % 900);
  return { display: `${animal.name}-${num}`, emoji: animal.emoji };
}

/* ─── Guest view ──────────────────────────────────────── */
function GuestView() {
  return (
    <div className="h-full overflow-y-auto bg-background ms-theme-transition">
      <div className="max-w-lg mx-auto px-4 pt-16 pb-10 flex flex-col items-center text-center">
        <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-24 h-24 object-contain mb-5 drop-shadow-md" />
        <h2 className="text-foreground font-bold text-[22px] mb-2">You're browsing as a guest</h2>
        <p className="text-muted-foreground text-[14px] leading-relaxed mb-8 max-w-sm">
          Sign in to save your conversations, track your questions, and build your reputation among Zimbabwean farmers.
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          <Link href="/login" className="flex-1">
            <button className="w-full px-5 py-3 border border-border rounded-full text-foreground hover:bg-muted transition-colors font-semibold text-[14px]">
              Sign In
            </button>
          </Link>
          <Link href="/register" className="flex-1">
            <button className="w-full px-5 py-3 bg-[#22c55e] hover:bg-[#16a34a] rounded-full text-white transition-colors font-bold text-[14px]">
              Create Account
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Me page ────────────────────────────────────── */
export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [editSettings, setEditSettings] = useState(false);
  const [form, setForm] = useState({ location: "", role: "" as UserRole | "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  if (!user) return <GuestView />;

  const { display: anonId, emoji: anonEmoji } = getAnonymousId(user.id);
  const roleStyle = ROLE_COLORS[user.role];

  function openSettings() {
    setForm({ location: user!.location ?? "", role: user!.role });
    setEditSettings(true);
    setError("");
    setSaved(false);
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: form.location, role: form.role }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setEditSettings(false);
      window.location.reload();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    setLocation("/");
  }

  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1b]">
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Identity card */}
        <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-6 mb-4 text-center">
          {/* Animal avatar */}
          <div className="w-20 h-20 rounded-full bg-[#22c55e]/10 border-2 border-[#22c55e]/25 flex items-center justify-center mx-auto mb-3 text-4xl">
            {anonEmoji}
          </div>

          {/* Anonymous ID */}
          <h1 className="text-[#E7E9EA] font-black text-[24px] tracking-tight mb-2">
            {anonId}
          </h1>

          {/* Role badge */}
          <span className={`inline-flex items-center text-[12px] font-bold px-3 py-1 rounded-full border ${roleStyle.text} ${roleStyle.bg} ${roleStyle.border}`}>
            {ROLE_LABELS[user.role]}
          </span>

          {/* Location */}
          {user.location && (
            <div className="flex items-center justify-center gap-1.5 mt-3 text-[#71767B] text-[13px]">
              <MapPin className="w-3.5 h-3.5" />
              {user.location}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-0 mt-5 pt-5 border-t border-[#2F3336]">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[#E7E9EA] font-black text-[20px]">{user.reputationScore}</span>
              <span className="text-[#71767B] text-[10px] uppercase tracking-wider font-semibold">Reputation</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 border-x border-[#2F3336]">
              <span className="text-[#E7E9EA] font-black text-[20px]">—</span>
              <span className="text-[#71767B] text-[10px] uppercase tracking-wider font-semibold">Questions</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[#E7E9EA] font-black text-[20px]">—</span>
              <span className="text-[#71767B] text-[10px] uppercase tracking-wider font-semibold">Helpful</span>
            </div>
          </div>
        </div>

        {/* Privacy note */}
        <p className="text-[#71767B] text-[11px] text-center mb-4 px-2">
          Your identity is anonymous. Real name and contact details are never shown publicly.
        </p>

        {/* Settings section */}
        {!editSettings ? (
          <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl overflow-hidden mb-4">
            <div className="px-5 py-3.5 border-b border-[#2F3336]">
              <h2 className="text-[#E7E9EA] font-bold text-[13px] uppercase tracking-wider">Settings</h2>
            </div>

            <button onClick={openSettings}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors border-b border-[#2F3336]">
              <div className="text-left">
                <div className="text-[#E7E9EA] text-[14px] font-medium">Location</div>
                <div className="text-[#71767B] text-[12px]">{user.location || "Not set"}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#71767B]" />
            </button>

            <button onClick={openSettings}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors">
              <div className="text-left">
                <div className="text-[#E7E9EA] text-[14px] font-medium">Role</div>
                <div className="text-[#71767B] text-[12px]">{ROLE_LABELS[user.role]}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#71767B]" />
            </button>
          </div>
        ) : (
          <form onSubmit={saveSettings} className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-5 mb-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[#E7E9EA] font-bold text-[14px]">Edit Settings</h2>
              <button type="button" onClick={() => setEditSettings(false)}
                className="p-1.5 rounded-full hover:bg-white/5 text-[#71767B] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && <p className="text-red-400 text-[13px]">{error}</p>}

            <div className="flex flex-col gap-1.5">
              <label className="text-[#71767B] text-[12px] font-semibold uppercase tracking-wider">Location</label>
              <select
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="bg-black border border-[#2F3336] rounded-xl px-3 py-2.5 text-[#E7E9EA] text-[14px] focus:outline-none focus:border-[#22c55e] transition-colors"
              >
                <option value="">Not set</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[#71767B] text-[12px] font-semibold uppercase tracking-wider">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                className="bg-black border border-[#2F3336] rounded-xl px-3 py-2.5 text-[#E7E9EA] text-[14px] focus:outline-none focus:border-[#22c55e] transition-colors"
              >
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <button type="submit" disabled={saving}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-white font-bold text-[14px] transition-colors">
              <Check className="w-4 h-4" /> {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        )}

        {saved && (
          <p className="text-[#22c55e] text-[13px] text-center mb-3 font-semibold">✓ Settings saved</p>
        )}

        {/* Sign out */}
        <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-500/5 transition-colors group"
          >
            <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
            <span className="text-red-400 group-hover:text-red-300 text-[14px] font-semibold transition-colors">Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
}
