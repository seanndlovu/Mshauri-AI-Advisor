import { useCallback, useEffect, useRef, useState } from "react";

type SponsoredCampaign = {
  id: number;
  advertiserName: string;
  targetUrl: string;
  imageUrl: string;
  altText: string;
  placement?: "sidebar_square";
};

const FALLBACK_AD: SponsoredCampaign = {
  id: 0,
  advertiserName: "Mshauri",
  targetUrl: "mailto:ads@maricho.media",
  imageUrl: "/ads/mshauri-advertise.png",
  altText: "Advertise with Mshauri",
};

export function SponsoredAd({ className = "" }: { className?: string }) {
  const [campaign, setCampaign] = useState<SponsoredCampaign>(FALLBACK_AD);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const adRef = useRef<HTMLAnchorElement>(null);
  const trackedImpression = useRef<number | null>(null);

  const getVisitorToken = useCallback(() => {
    const storageKey = "mshauri-anonymous-analytics-token";
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const token = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(storageKey, token);
    return token;
  }, []);

  const trackEvent = useCallback((eventType: "impression" | "click") => {
    if (!analyticsConsent || campaign.id === 0) return;
    void fetch("/api/ads/events", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adId: campaign.id,
        eventType,
        placement: campaign.placement ?? "sidebar_square",
        pagePath: window.location.pathname,
        visitorToken: getVisitorToken(),
      }),
    }).catch(() => undefined);
  }, [analyticsConsent, campaign, getVisitorToken]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ads?placement=sidebar_square", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (payload?.ad) setCampaign(payload.ad);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/privacy/preferences", { credentials: "include" })
      .then((response) => response.ok ? response.json() as Promise<{ analyticsConsent?: boolean }> : null)
      .then((preferences) => {
        if (!cancelled) setAnalyticsConsent(preferences?.analyticsConsent === true);
      })
      .catch(() => {
        if (!cancelled) setAnalyticsConsent(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!analyticsConsent || campaign.id === 0 || trackedImpression.current === campaign.id) return;
    const element = adRef.current;
    if (!element) return;
    const sessionKey = `mshauri-ad-impression:${campaign.id}:${window.location.pathname}`;
    if (window.sessionStorage.getItem(sessionKey)) return;

    const recordImpression = () => {
      if (trackedImpression.current === campaign.id) return;
      trackedImpression.current = campaign.id;
      window.sessionStorage.setItem(sessionKey, "1");
      trackEvent("impression");
    };

    if (!("IntersectionObserver" in window)) {
      recordImpression();
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        recordImpression();
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [analyticsConsent, campaign.id, trackEvent]);

  const isFallback = campaign.id === 0;
  return (
    <section className={`border-t border-[#2F3336] pt-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-[#818384] uppercase tracking-wider">Sponsored</span>
        <a href="mailto:ads@maricho.media" className="text-[#4a5260] hover:text-[#22c55e] text-[9px] transition-colors">Advertise</a>
      </div>
      <a
        ref={adRef}
        href={campaign.targetUrl}
        target={isFallback ? undefined : "_blank"}
        rel={isFallback ? undefined : "noopener noreferrer sponsored"}
        className="mx-auto block w-full max-w-[217px] aspect-square overflow-hidden rounded-xl border border-[#2F3336] bg-[#16181C] hover:border-[#22c55e]/50 transition-colors"
        aria-label={`Sponsored: ${campaign.advertiserName}`}
        onClick={() => {
          if (!isFallback) trackEvent("click");
        }}
      >
        <img src={campaign.imageUrl} alt={campaign.altText} className="w-full h-full object-contain" />
      </a>
      {!isFallback && <p className="mt-1.5 text-center text-[9px] text-[#4a5260] truncate">{campaign.advertiserName}</p>}
    </section>
  );
}