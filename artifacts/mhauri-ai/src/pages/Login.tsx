import { useState, FormEvent } from "react";
import { useLocation, Link } from "wouter";
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 ms-theme-transition">
      {/* Subtle blob in background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="ms-blob ms-blob-1" style={{ top: "-120px", left: "30%" }} />
        <div className="ms-blob ms-blob-2" style={{ bottom: "-80px", right: "-60px" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/mshauri-logo.png?v=2"
            alt="Mshauri"
            className="w-20 h-20 object-contain mb-4 drop-shadow-md"
          />
          <h1 className="text-foreground text-2xl font-black">Sign in to Mshauri</h1>
          <p className="text-muted-foreground text-sm mt-1">The Global Food Systems Intelligence OS</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
              className="bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-white font-bold py-3 rounded-full transition-colors mt-2 shadow-sm"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-muted-foreground text-sm mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-[#22c55e] hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
