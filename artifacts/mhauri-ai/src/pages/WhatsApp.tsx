import { useState } from "react";
import { CheckCircle, MessageCircle, Bell, Bot, Zap, Shield, ChevronRight, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const FEATURES = [
  { icon: "🤖", title: "AI Farm Advisor", desc: "Ask Mshauri anything in Shona, Ndebele or English — get instant expert answers." },
  { icon: "🚨", title: "Disease Alerts",  desc: "Receive early warnings for pest outbreaks and plant diseases near your area." },
  { icon: "📈", title: "Market Prices",   desc: "Get daily commodity prices — maize, tobacco, cotton and more — every morning." },
  { icon: "🌧️", title: "Weather Updates", desc: "Localised 7-day forecasts and rainfall warnings for your farming area." },
  { icon: "💡", title: "Opportunities",   desc: "New grants, input subsidy schemes, and buyer opportunities sent direct to you." },
];

const HOW_IT_WORKS = [
  { step: "1", text: "Enter your WhatsApp number below" },
  { step: "2", text: "You'll receive a welcome message from Mshauri" },
  { step: "3", text: "Reply 'Hi' to activate your account" },
  { step: "4", text: "Ask questions or receive daily alerts" },
];

const SAMPLE_MESSAGES = [
  { from: "user",    text: "Ndiani anomhanya maize yakabviswa nematambudziko" },
  { from: "mshauri", text: "📊 Fall armyworm risk is HIGH in your area (Bindura / Shamva). Spray with chlorpyrifos 48 EC at 1.5L/ha in the evening. Scout every 3 days. Need spray timing tips?" },
  { from: "user",    text: "Market price for maize today?" },
  { from: "mshauri", text: "💰 Maize prices today:\n• GMB: $190/tonne\n• Open market: $210–$230/tonne\n• Trend: ↑ 4.2% this week\n\nBest time to sell: prices usually peak Jan–Feb. Hold if you can store safely." },
];

export default function WhatsApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState(user ? "" : "");
  const [submitting, setSubmitting] = useState(false);
  const [connected, setConnected] = useState(false);

  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("0")) return "+263" + digits.slice(1);
    if (digits.startsWith("263")) return "+" + digits;
    return "+" + digits;
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      toast({ title: "Enter your number", description: "Please enter your WhatsApp number.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/whatsapp/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formatPhone(phone) }),
      });
      if (!res.ok) throw new Error("Failed");
      setConnected(true);
      toast({ title: "Connected! 🎉", description: "Check your WhatsApp for a welcome message from Mshauri." });
    } catch {
      toast({ title: "Error", description: "Could not connect. Please check the number and try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1b]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="bg-gradient-to-br from-[#075e54] to-[#128c7e] rounded-xl p-6 mb-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5" style={{ transform: "translate(30%,-30%)" }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5" style={{ transform: "translate(-30%,30%)" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0">
                <MessageCircle className="w-7 h-7 text-[#128c7e]" />
              </div>
              <div>
                <h1 className="text-white font-black text-[20px] leading-tight">Mshauri on WhatsApp</h1>
                <p className="text-white/70 text-[12px]">Farm intelligence in your pocket, 24/7</p>
              </div>
            </div>
            <p className="text-white/80 text-[13px] leading-relaxed">
              Get AI-powered farming advice, market prices, disease alerts and weather updates directly on WhatsApp — no app needed.
            </p>
          </div>
        </div>

        <div className="flex gap-5 flex-col lg:flex-row">
          {/* Left column */}
          <div className="flex-1 min-w-0">
            {/* Connect form */}
            {connected ? (
              <div className="bg-[#1e2025] border border-[#22c55e]/40 rounded-xl p-6 mb-5 flex flex-col items-center text-center">
                <CheckCircle className="w-14 h-14 text-[#22c55e] mb-3" />
                <h2 className="text-[#d7dadc] font-black text-[18px] mb-1">You're Connected!</h2>
                <p className="text-[#818384] text-[13px] mb-4">Check your WhatsApp for a welcome message from Mshauri. Reply "Hi" to begin.</p>
                <a
                  href="https://wa.me/message/start"
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 bg-[#25d366] hover:bg-[#1fbd57] text-white font-bold px-5 py-2.5 rounded-full transition-colors text-[13px]"
                >
                  <MessageCircle className="w-4 h-4" /> Open WhatsApp
                </a>
              </div>
            ) : (
              <div className="bg-[#1e2025] border border-[#343536] rounded-xl p-5 mb-5">
                <h2 className="text-[#d7dadc] font-bold text-[15px] mb-1">Connect your WhatsApp</h2>
                <p className="text-[#818384] text-[12px] mb-4">Enter your number and we'll send you a welcome message to get started.</p>
                <form onSubmit={handleConnect} className="flex flex-col gap-3">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#818384]" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+263 7X XXX XXXX"
                      className="w-full bg-[#272729] border border-[#343536] rounded-lg pl-10 pr-3 py-3 text-[#d7dadc] text-[13px] placeholder-[#4a5568] focus:outline-none focus:border-[#25d366]/60 transition-colors"
                    />
                  </div>
                  <button
                    type="submit" disabled={submitting}
                    className="flex items-center justify-center gap-2 bg-[#25d366] hover:bg-[#1fbd57] disabled:opacity-50 text-white font-bold py-3 rounded-full text-[14px] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {submitting ? "Connecting…" : "Connect on WhatsApp"}
                  </button>
                  <p className="text-[#4a5568] text-[10px] text-center">
                    Your number is only used to send Mshauri alerts. We never share it.
                  </p>
                </form>
              </div>
            )}

            {/* How it works */}
            <div className="bg-[#1e2025] border border-[#343536] rounded-xl p-5 mb-5">
              <h2 className="text-[#d7dadc] font-bold text-[13px] uppercase tracking-wider mb-3">How It Works</h2>
              <div className="flex flex-col gap-3">
                {HOW_IT_WORKS.map(s => (
                  <div key={s.step} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#25d366]/20 border border-[#25d366]/30 text-[#25d366] font-black text-[12px] flex items-center justify-center shrink-0">
                      {s.step}
                    </div>
                    <span className="text-[#d7dadc] text-[13px]">{s.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample conversation */}
            <div className="bg-[#1e2025] border border-[#343536] rounded-xl p-5">
              <h2 className="text-[#d7dadc] font-bold text-[13px] uppercase tracking-wider mb-3">Sample Conversation</h2>
              <div className="bg-[#0a1a15] rounded-lg p-3 flex flex-col gap-2">
                {SAMPLE_MESSAGES.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-lg text-[12px] leading-relaxed whitespace-pre-line ${
                      msg.from === "user"
                        ? "bg-[#25d366]/80 text-white"
                        : "bg-[#1e2025] border border-[#343536] text-[#d7dadc]"
                    }`}>
                      {msg.from === "mshauri" && (
                        <div className="text-[#25d366] font-bold text-[10px] mb-0.5">🤖 Mshauri</div>
                      )}
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:w-[260px] shrink-0 flex flex-col gap-4">
            {/* Features */}
            <div className="bg-[#1e2025] border border-[#343536] rounded-xl p-4">
              <h2 className="text-[#d7dadc] font-bold text-[12px] uppercase tracking-wider mb-3">What You Get</h2>
              <div className="flex flex-col gap-3">
                {FEATURES.map(f => (
                  <div key={f.title} className="flex items-start gap-2.5">
                    <span className="text-xl shrink-0">{f.icon}</span>
                    <div>
                      <div className="text-[#d7dadc] font-semibold text-[12px]">{f.title}</div>
                      <div className="text-[#818384] text-[11px] leading-relaxed">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-[#1e2025] border border-[#343536] rounded-xl p-4">
              <h2 className="text-[#d7dadc] font-bold text-[12px] uppercase tracking-wider mb-3">Platform Stats</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Farmers",   value: "1,204", icon: <Bot className="w-4 h-4 text-[#22c55e]" /> },
                  { label: "Messages",  value: "45K+",  icon: <MessageCircle className="w-4 h-4 text-[#25d366]" /> },
                  { label: "Alerts",    value: "2,100", icon: <Bell className="w-4 h-4 text-yellow-400" /> },
                  { label: "Uptime",    value: "99.9%", icon: <Zap className="w-4 h-4 text-purple-400" /> },
                ].map(s => (
                  <div key={s.label} className="bg-[#272729] rounded-lg p-3 flex flex-col items-center text-center">
                    {s.icon}
                    <div className="text-[#d7dadc] font-black text-[16px] mt-1">{s.value}</div>
                    <div className="text-[#818384] text-[10px]">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust */}
            <div className="bg-[#1e2025] border border-[#343536] rounded-xl p-4 flex items-start gap-2">
              <Shield className="w-5 h-5 text-[#22c55e] shrink-0 mt-0.5" />
              <p className="text-[#818384] text-[11px] leading-relaxed">
                Powered by Maricho Media. Your data is private and never sold. WhatsApp messages are end-to-end encrypted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
