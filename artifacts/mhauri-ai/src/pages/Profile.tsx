import { useState, FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { User, MapPin, Star, Edit2, Check, X, LogOut } from "lucide-react";
import { useAuth, type UserRole } from "@/hooks/use-auth";

const ROLE_LABELS: Record<UserRole, string> = {
  farmer: "Farmer", agribusiness: "Agribusiness", extension_officer: "Extension Officer",
  researcher: "Researcher", ngo: "NGO / Development Partner",
};

const ROLE_COLORS: Record<UserRole, string> = {
  farmer: "text-green-400 bg-green-400/10",
  agribusiness: "text-blue-400 bg-blue-400/10",
  extension_officer: "text-yellow-400 bg-yellow-400/10",
  researcher: "text-purple-400 bg-purple-400/10",
  ngo: "text-orange-400 bg-orange-400/10",
};

const LOCATIONS = [
  "Harare", "Bulawayo", "Mutare", "Gweru", "Kwekwe", "Kadoma", "Masvingo",
  "Chinhoyi", "Bindura", "Gwanda", "Lupane", "Beitbridge", "Victoria Falls",
];

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", role: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto mb-4 text-[#71767B]" />
          <h2 className="text-[#E7E9EA] font-bold text-lg mb-2">Sign in to view your profile</h2>
          <p className="text-[#71767B] text-sm mb-6">Join Mshauri to participate in discussions</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login">
              <button className="px-6 py-2.5 border border-[#2F3336] rounded-full text-[#E7E9EA] hover:bg-white/10 transition-colors font-medium">Sign in</button>
            </Link>
            <Link href="/register">
              <button className="px-6 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] rounded-full text-white transition-colors font-bold">Register</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function startEdit() {
    setForm({ name: user!.name, location: user!.location ?? "", role: user!.role });
    setEditing(true);
    setError("");
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEditing(false);
      window.location.reload();
    } catch {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    setLocation("/");
  }

  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Avatar + basic info */}
        <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-6 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#22c55e]/20 border-2 border-[#22c55e]/40 flex items-center justify-center text-[#22c55e] font-black text-xl">
                {initials}
              </div>
              <div>
                <h1 className="text-[#E7E9EA] font-bold text-xl">{user.name}</h1>
                <p className="text-[#71767B] text-sm">{user.email}</p>
                <span className={`inline-flex mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            </div>
            <button onClick={startEdit}
              className="p-2 rounded-full border border-[#2F3336] hover:bg-white/10 text-[#71767B] transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#2F3336]">
            {user.location && (
              <span className="flex items-center gap-1.5 text-[#71767B] text-sm">
                <MapPin className="w-4 h-4" />{user.location}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[#71767B] text-sm">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-[#E7E9EA] font-medium">{user.reputationScore}</span> reputation
            </span>
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <form onSubmit={saveEdit} className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-5 mb-4 flex flex-col gap-3">
            <h2 className="text-[#E7E9EA] font-bold">Edit Profile</h2>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#71767B] text-sm">Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required
                className="bg-black border border-[#2F3336] rounded-lg px-3 py-2.5 text-[#E7E9EA] text-sm focus:outline-none focus:border-[#22c55e]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[#71767B] text-sm">Location</label>
              <select value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="bg-black border border-[#2F3336] rounded-lg px-3 py-2.5 text-[#E7E9EA] text-sm focus:outline-none focus:border-[#22c55e]">
                <option value="">None</option>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[#71767B] text-sm">Role</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="bg-black border border-[#2F3336] rounded-lg px-3 py-2.5 text-[#E7E9EA] text-sm focus:outline-none focus:border-[#22c55e]">
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#2F3336] text-[#71767B] text-sm hover:bg-white/5">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#22c55e] text-white text-sm font-bold hover:bg-[#16a34a] disabled:opacity-60">
                <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}

        {/* Sign out */}
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
