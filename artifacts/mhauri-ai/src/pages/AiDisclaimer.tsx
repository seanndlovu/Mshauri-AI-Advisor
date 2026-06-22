import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    title: "What Mshauri AI Is",
    body: `Mshauri AI is an artificial intelligence-powered information and advisory tool designed to support farmers, agribusinesses, and agricultural professionals across Zimbabwe and Africa. It provides informational assistance on crop production, livestock management, weather patterns, pest control, market prices, and general farming practices.`,
  },
  {
    title: "AI Does Not Replace Professional Advice",
    body: `Information provided by Mshauri AI is for general educational and informational purposes only. It does not constitute professional agronomic, veterinary, medical, financial, or legal advice.\n\nAlways consult qualified professionals — including certified agronomists, veterinarians, extension officers, financial advisors, and legal counsel — before making significant farming, livestock, business, or financial decisions.`,
  },
  {
    title: "AI Can Make Mistakes",
    body: `Mshauri AI is powered by large language models that can produce incorrect, incomplete, or outdated information. The system may:\n• Provide advice unsuitable for your specific soil, climate, or crop variety\n• Generate recommendations based on general knowledge that may not apply locally\n• Occasionally "hallucinate" — produce plausible-sounding but factually incorrect information\n• Reflect outdated data on prices, regulations, or best practices\n\nAlways independently verify important information before acting upon it.`,
  },
  {
    title: "Agricultural Risk Acknowledgement",
    body: `Farming, livestock production, veterinary care, pest management, and agricultural decision-making involve inherent risks that cannot be fully predicted or controlled. Mshauri AI does not guarantee:\n• Crop yields or livestock performance\n• Disease prevention or pest control outcomes\n• Weather forecasts or climate predictions\n• Market prices or financial results\n• Business success or profitability\n\nYou remain solely responsible for all farming, livestock, veterinary, operational, financial, and business decisions made using information provided by Mshauri AI.`,
  },
  {
    title: "Your Data and AI Training",
    body: `Conversations and content you submit to Mshauri AI may be used to improve and train our AI systems. This may include conversations, uploaded images, audio recordings, documents, and feedback. Where practical, Maricho Media aggregates or anonymises data before using it for AI improvement activities.\n\nFor full details, see our Privacy Policy or contact privacy@marichomedia.com.`,
  },
  {
    title: "Responsible Use",
    body: `You agree not to:\n• Use Mshauri AI to generate harmful, deceptive, or fraudulent content\n• Present AI-generated content as verified professional advice without independent verification\n• Use AI outputs to impersonate experts, government officials, or other individuals\n• Rely solely on Mshauri AI for decisions that could significantly affect human health, animal welfare, or financial outcomes\n\nMaricho Media reserves the right to restrict access to the platform where it is used irresponsibly or in violation of our Terms of Service.`,
  },
  {
    title: "Limitation of Liability",
    body: `To the maximum extent permitted by law, Five Talents (Pvt) Ltd., Maricho Media, and Mshauri AI are not liable for any direct or indirect damages, crop losses, livestock losses, financial losses, business interruption, or other harm arising from decisions made based on AI-generated content.\n\nUse of Mshauri AI is entirely at your own risk.`,
  },
  {
    title: "Contact",
    body: `Questions about AI usage or this disclaimer:\nFive Talents (Pvt) Ltd. / Maricho Media · Zimbabwe\nEmail: privacy@marichomedia.com`,
  },
];

export default function AiDisclaimer() {
  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1b]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/">
          <button className="flex items-center gap-2 text-[#71767B] hover:text-[#E7E9EA] mb-6 transition-colors text-[13px]">
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </button>
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-xl">🤖</div>
            <div>
              <h1 className="text-[#E7E9EA] font-black text-[22px]">AI Usage Disclaimer</h1>
              <p className="text-[#71767B] text-[12px]">Five Talents (Pvt) Ltd. / Maricho Media · Effective June 22, 2026</p>
            </div>
          </div>
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
            <p className="text-yellow-400 text-[13px] font-semibold">⚠️ Important</p>
            <p className="text-[#71767B] text-[12px] mt-1">Mshauri AI provides informational assistance only. Always verify recommendations with qualified professionals before making important farming or business decisions.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {SECTIONS.map(s => (
            <div key={s.title} className="bg-[#16181C] border border-[#2F3336] rounded-xl p-5">
              <h3 className="text-[#E7E9EA] font-bold text-[14px] mb-2">{s.title}</h3>
              <p className="text-[#71767B] text-[13px] leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
