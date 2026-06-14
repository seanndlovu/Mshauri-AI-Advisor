import { useState, FormEvent } from "react";
import { useLocation, Link } from "wouter";
import { Sprout } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Sprout className="w-10 h-10 text-[#22c55e] mb-3" />
          <h1 className="text-[#E7E9EA] text-2xl font-black">Sign in to Mshauri</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[#71767B] text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="bg-[#16181C] border border-[#2F3336] rounded-lg px-4 py-3 text-[#E7E9EA] placeholder-[#71767B] focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[#71767B] text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="bg-[#16181C] border border-[#2F3336] rounded-lg px-4 py-3 text-[#E7E9EA] placeholder-[#71767B] focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-white font-bold py-3 rounded-full transition-colors mt-2"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-[#71767B] text-sm mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-[#22c55e] hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
