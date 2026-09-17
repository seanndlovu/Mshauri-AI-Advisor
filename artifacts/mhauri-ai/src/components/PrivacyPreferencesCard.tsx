import { useEffect, useState } from "react";
import { BarChart3, Check, Mail, ShieldCheck } from "lucide-react";

type PrivacyPreferences = {
  analyticsConsent: boolean;
  marketingConsent: boolean;
  hasSavedPreferences: boolean;
};

export default function PrivacyPreferencesCard() {
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    analyticsConsent: false,
    marketingConsent: false,
    hasSavedPreferences: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/privacy/preferences", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load privacy choices.");
        return response.json() as Promise<PrivacyPreferences>;
      })
      .then((data) => {
        if (!cancelled) setPreferences(data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load privacy choices.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  async function saveChoices() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/privacy/preferences", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analyticsConsent: preferences.analyticsConsent,
          marketingConsent: preferences.marketingConsent,
        }),
      });
      const data = await response.json() as PrivacyPreferences & { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save privacy choices.");
      setPreferences(data);
      setMessage("Your choices have been saved.");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to save privacy choices.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-4 rounded-2xl border border-[#2F3336] bg-[#16181C] overflow-hidden">
      <div className="border-b border-[#2F3336] px-5 py-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#22c55e]" />
          <div>
            <h2 className="text-[15px] font-bold text-[#E7E9EA]">Privacy and communication choices</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[#9aa0a6]">
              You are in control. Required service information is separate from optional analytics and marketing.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex gap-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]" />
          <div>
            <h3 className="text-[13px] font-semibold text-[#E7E9EA]">1. Keep Mshauri working</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-[#9aa0a6]">
              To provide your account and the core Mshauri service, we use account details, authentication, and basic app operation.
            </p>
          </div>
        </div>

        <label className="flex cursor-pointer gap-3">
          <input
            type="checkbox"
            checked={preferences.analyticsConsent}
            onChange={(event) => setPreferences((current) => ({
              ...current,
              analyticsConsent: event.target.checked,
            }))}
            disabled={loading || saving}
            className="mt-1 h-4 w-4 shrink-0 accent-[#22c55e]"
          />
          <span>
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#E7E9EA]">
              <BarChart3 className="h-4 w-4 text-[#22c55e]" />
              2. Help us improve Mshauri
            </span>
            <span className="mt-1 block text-[12px] leading-relaxed text-[#9aa0a6]">
              We use anonymous usage patterns, such as popular features and farming topics, to make the app more useful. This does not include your password or private conversation content.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer gap-3">
          <input
            type="checkbox"
            checked={preferences.marketingConsent}
            onChange={(event) => setPreferences((current) => ({
              ...current,
              marketingConsent: event.target.checked,
            }))}
            disabled={loading || saving}
            className="mt-1 h-4 w-4 shrink-0 accent-[#22c55e]"
          />
          <span>
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#E7E9EA]">
              <Mail className="h-4 w-4 text-[#22c55e]" />
              3. Optional marketing messages
            </span>
            <span className="mt-1 block text-[12px] leading-relaxed text-[#9aa0a6]">
              Get useful farming tips, market updates, and relevant Mshauri news by email or WhatsApp. You can unsubscribe at any time.
            </span>
          </span>
        </label>

        {error && <p className="text-[12px] text-red-300">{error}</p>}
        {message && <p className="text-[12px] font-semibold text-[#4ade80]">{message}</p>}

        <button
          type="button"
          onClick={saveChoices}
          disabled={loading || saving}
          className="w-full rounded-full bg-[#22c55e] py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : preferences.hasSavedPreferences ? "Update choices" : "Save choices"}
        </button>
      </div>
    </section>
  );
}