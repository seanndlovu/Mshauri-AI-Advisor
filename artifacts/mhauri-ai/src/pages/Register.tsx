import { useState, FormEvent } from "react";
import { useLocation, Link } from "wouter";
import { Sprout } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ROLES = [
  { value: "farmer", label: "Farmer" },
  { value: "agribusiness", label: "Agribusiness" },
  { value: "extension_officer", label: "Extension Officer" },
  { value: "researcher", label: "Researcher" },
  { value: "ngo", label: "NGO / Development Partner" },
];

const LOCATIONS = [
  "Harare", "Bulawayo", "Mutare", "Gweru", "Kwekwe", "Kadoma", "Masvingo",
  "Chinhoyi", "Bindura", "Gwanda", "Lupane", "Beitbridge", "Victoria Falls",
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", name: "", location: "", role: "farmer" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ ...form, location: form.location || undefined });
      setLocation("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-16 h-16 object-contain mb-3" />
          <h1 className="text-[#E7E9EA] text-2xl font-black">Join Mshauri</h1>
          <p className="text-[#71767B] text-sm mt-1">The Global Food Systems Intelligence OS</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {[
            { field: "name", label: "Username", type: "text", placeholder: "e.g. john_moyo" },
            { field: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            { field: "password", label: "Password (min 6 chars)", type: "password", placeholder: "••••••••" },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field} className="flex flex-col gap-1.5">
              <label className="text-[#71767B] text-sm font-medium">{label}</label>
              <input
                type={type}
                value={form[field as keyof typeof form]}
                onChange={(e) => set(field, e.target.value)}
                required
                placeholder={placeholder}
                className="bg-[#16181C] border border-[#2F3336] rounded-lg px-4 py-3 text-[#E7E9EA] placeholder-[#71767B] focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <label className="text-[#71767B] text-sm font-medium">Role</label>
            <select
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              className="bg-[#16181C] border border-[#2F3336] rounded-lg px-4 py-3 text-[#E7E9EA] focus:outline-none focus:border-[#22c55e] transition-colors"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[#71767B] text-sm font-medium">Location (optional)</label>
            <select
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              className="bg-[#16181C] border border-[#2F3336] rounded-lg px-4 py-3 text-[#E7E9EA] focus:outline-none focus:border-[#22c55e] transition-colors"
            >
              <option value="">Select your location</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-white font-bold py-3 rounded-full transition-colors mt-2"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-[#71767B] text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#22c55e] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
