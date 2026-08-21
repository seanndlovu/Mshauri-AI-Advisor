import { useEffect, useState } from "react";

type SponsoredCampaign = {
  id: number;
  advertiserName: string;
  targetUrl: string;
  imageUrl: string;
  altText: string;
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

  const isFallback = campaign.id === 0;
  return (
    <section className={`border-t border-[#2F3336] pt-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-[#818384] uppercase tracking-wider">Sponsored</span>
        <a href="mailto:ads@maricho.media" className="text-[#4a5260] hover:text-[#22c55e] text-[9px] transition-colors">Advertise</a>
      </div>
      <a
        href={campaign.targetUrl}
        target={isFallback ? undefined : "_blank"}
        rel={isFallback ? undefined : "noopener noreferrer sponsored"}
        className="mx-auto block w-full max-w-[217px] aspect-square overflow-hidden rounded-xl border border-[#2F3336] bg-[#16181C] hover:border-[#22c55e]/50 transition-colors"
        aria-label={`Sponsored: ${campaign.advertiserName}`}
      >
        <img src={campaign.imageUrl} alt={campaign.altText} className="w-full h-full object-contain" />
      </a>
      {!isFallback && <p className="mt-1.5 text-center text-[9px] text-[#4a5260] truncate">{campaign.advertiserName}</p>}
    </section>
  );
}