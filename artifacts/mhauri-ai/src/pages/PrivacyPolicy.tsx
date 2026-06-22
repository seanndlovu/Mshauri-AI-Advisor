import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Who We Are",
    body: `Mshauri AI is operated by Five Talents (Pvt) Ltd. ("we", "us", "our") — a Zimbabwe-registered company trading as Maricho Media. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use Mshauri AI, our website at mshauri.marichomedia.com, WhatsApp services, and related platforms.`,
  },
  {
    title: "2. Information We Collect",
    body: `We may collect:\n• Account information — name, email address, province, and role when you register\n• Conversation data — messages, questions, and AI chat history\n• Content you submit — posts, comments, images, audio, video, and documents\n• Usage data — pages visited, features used, timestamps, and interaction patterns\n• Device and technical data — IP address, browser type, and operating system\n• WhatsApp data — phone number, messages, and interactions through our WhatsApp bot`,
  },
  {
    title: "3. How We Use Your Information",
    body: `We use your information to:\n• Provide and operate the Mshauri AI platform\n• Personalise agricultural advice and recommendations\n• Improve and train our AI models with anonymised or aggregated data\n• Send service notifications, security alerts, and account updates\n• Conduct research, analytics, and platform development\n• Prevent fraud, abuse, and unauthorised access\n• Comply with applicable laws and regulations`,
  },
  {
    title: "4. AI Training",
    body: `Content you submit — including conversations, uploaded images, audio recordings, voice notes, documents, and feedback — may be used to improve, train, evaluate, and develop Mshauri AI. Where practical, Maricho Media may aggregate, anonymise, or pseudonymise information before using it for AI training and research. You may request information about the use of your personal data by contacting privacy@marichomedia.com.`,
  },
  {
    title: "5. Data Sharing",
    body: `We do not sell your personal information. We may share data with:\n• Cloud and infrastructure providers necessary to operate the platform\n• AI and analytics service providers under appropriate data processing agreements\n• Law enforcement or government bodies where required by law\n• Successor entities in the event of a merger, acquisition, or sale of assets\n\nAll third-party service providers are required to handle your data securely and in accordance with this policy.`,
  },
  {
    title: "6. Data Retention",
    body: `We retain your personal information for as long as your account is active or as required to provide the Services. When account data is no longer needed, we delete or anonymise it in accordance with our data retention schedule. Conversation histories may be retained for AI improvement and safety purposes in anonymised form.`,
  },
  {
    title: "7. Your Rights",
    body: `Subject to applicable law, you have the right to:\n• Access personal information we hold about you\n• Request correction of inaccurate information\n• Request deletion of your personal information\n• Withdraw consent where processing is consent-based\n• Object to certain uses of your information\n\nTo exercise any of these rights, contact us at privacy@marichomedia.com.`,
  },
  {
    title: "8. Security",
    body: `We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, loss, destruction, or alteration. However, no internet transmission is completely secure and we cannot guarantee absolute security.`,
  },
  {
    title: "9. Children",
    body: `Mshauri AI is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately at privacy@marichomedia.com.`,
  },
  {
    title: "10. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. Updated versions will be published on the platform and will become effective upon publication. Continued use of the Services after changes take effect constitutes acceptance of the revised policy. We encourage you to review this policy periodically.`,
  },
  {
    title: "11. Contact",
    body: `Five Talents (Pvt) Ltd. / Maricho Media\nZimbabwe\nEmail: privacy@marichomedia.com\nWebsite: mshauri.marichomedia.com`,
  },
];

export default function PrivacyPolicy() {
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
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xl">🔒</div>
            <div>
              <h1 className="text-[#E7E9EA] font-black text-[22px]">Privacy Policy</h1>
              <p className="text-[#71767B] text-[12px]">Five Talents (Pvt) Ltd. / Maricho Media · Effective June 22, 2026</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
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
