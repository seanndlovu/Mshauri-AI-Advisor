import { type FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";

export default function LegacyLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/legacy-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const body = contentType.includes("application/json")
        ? await response.json() as { error?: string }
        : { error: "The authentication server returned an unexpected response. Please use secure sign-in or try again later." };
      if (!response.ok) throw new Error(body.error || "Sign-in failed");
      setLocation("/");
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4">
      <div className="ms-blob ms-blob-1 fixed" style={{ top: "-120px", left: "30%" }} />
      <form onSubmit={submit} className="legacy-login-form relative z-10 w-full max-w-md rounded-2xl border border-[#1a3020] bg-[#0f1e0f] p-8 shadow-2xl">
        <img src="/mshauri-logo.png" alt="Mshauri" className="mx-auto mb-4 h-16 w-16 object-contain" />
        <h1 className="text-center text-2xl font-black text-[#e8f5e9]">Existing Mshauri account</h1>
        <p className="mb-6 mt-2 text-center text-sm text-[#7aad80]">Sign in with the password you already use.</p>
        {error && <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}
        <label className="mb-1.5 block text-sm font-semibold text-[#cde8d0]">Email</label>
        <input className="mb-4 w-full rounded-xl border border-[#2a4030] bg-[#111e11] px-4 py-3 text-[#e8f5e9]" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="mb-1.5 block text-sm font-semibold text-[#cde8d0]">Password</label>
        <input className="mb-5 w-full rounded-xl border border-[#2a4030] bg-[#111e11] px-4 py-3 text-[#e8f5e9]" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="w-full rounded-full bg-[#22c55e] py-3 font-bold text-white hover:bg-[#16a34a] disabled:opacity-60">
          {loading ? "Signing in…" : "Sign in with existing password"}
        </button>
        <p className="mt-5 text-center text-sm text-[#7aad80]">
          Want Google, a sign-in link, or password recovery?{" "}
          <Link href="/sign-in" className="font-semibold text-[#4ade80] hover:underline">Use secure sign-in</Link>
        </p>
      </form>
    </div>
  );
}