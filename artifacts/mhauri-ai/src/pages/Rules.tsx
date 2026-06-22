import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const RULES = [
  {
    num: 1, title: "Respect Other People",
    body: `Treat all users with dignity and respect. Do not harass, bully, threaten, or intimidate others. Do not target people based on race, nationality, ethnicity, disability, age, religion, gender, sexual orientation, or other protected characteristics. Do not use hate speech or discriminatory language. Healthy debate is encouraged. Abuse is not.`,
  },
  {
    num: 2, title: "No Harmful or Dangerous Content",
    body: `Do not post or share content that promotes violence, encourages self-harm or animal cruelty, promotes terrorism or extremist activity, provides instructions for illegal or dangerous activities, or encourages harmful agricultural, veterinary, medical, or chemical practices. Content that could endanger people, animals, crops, or property may be removed without notice.`,
  },
  {
    num: 3, title: "No Fraud, Scams, or Misrepresentation",
    body: `Do not impersonate individuals, organisations, businesses, government agencies, or experts. Do not misrepresent qualifications or professional credentials. Do not operate scams, pyramid schemes, or fraudulent programs. Do not share misleading financial, agricultural, veterinary, or business information intended to deceive others. Users must act honestly and in good faith.`,
  },
  {
    num: 4, title: "Respect Privacy",
    body: `Do not publish or share personal phone numbers without consent, home addresses, identity documents, banking details, passwords or login credentials, or private communications without authorisation. Respect the privacy and safety of others at all times.`,
  },
  {
    num: 5, title: "Use Accurate Information",
    body: `Users should make reasonable efforts to provide accurate information. Do not knowingly spread misinformation, share false agricultural advice, fabricate research findings, or publish manipulated information intended to mislead others. Mshauri AI may generate incorrect information — always independently verify important recommendations before acting upon them.`,
  },
  {
    num: 6, title: "No Illegal Activities",
    body: `Do not use the Services to violate any applicable law, sell illegal goods or services, commit fraud, launder money, facilitate cybercrime, distribute malware, or engage in unauthorised access to systems or data. Illegal activity may be reported to law enforcement authorities.`,
  },
  {
    num: 7, title: "Respect Intellectual Property",
    body: `Only upload content that you own or have permission to use. Do not upload copyrighted material without authorisation, infringe trademarks, share pirated software, or copy proprietary content without permission. Users remain responsible for all content they submit.`,
  },
  {
    num: 8, title: "No Spam or Platform Abuse",
    body: `Do not send spam messages, flood discussions, manipulate engagement metrics, create fake accounts, use automated bots without authorisation, or scrape platform content without permission. We reserve the right to remove spam and abusive activity.`,
  },
  {
    num: 9, title: "Responsible Use of AI",
    body: `When using Mshauri AI, verify important recommendations before implementation. Do not present AI-generated content as professional advice without verification. Do not use AI to create harmful, deceptive, or fraudulent content. Do not use AI outputs to impersonate others. Users remain responsible for all decisions made using AI-generated information.`,
  },
  {
    num: 10, title: "Agricultural and Livestock Safety",
    body: `Agricultural and livestock recommendations should be used responsibly. Do not encourage unsafe pesticide use, promote harmful veterinary treatments, recommend illegal chemicals or substances, or share advice likely to cause harm to crops, livestock, wildlife, or people. Always consult qualified professionals where appropriate.`,
  },
  {
    num: 11, title: "Child Safety",
    body: `We have zero tolerance for content that exploits children, endangers children, sexualises minors, or encourages abuse of children. Any such content will be removed immediately and may be reported to relevant authorities.`,
  },
  {
    num: 12, title: "Graphic and Sensitive Content",
    body: `Users must not post excessively graphic, disturbing, or violent content. Where educational or newsworthy content contains sensitive material, it should be appropriately labelled and shared responsibly.`,
  },
  {
    num: 13, title: "Reporting Violations",
    body: `Users are encouraged to report violations of these Rules. Maricho Media may investigate reports and take appropriate action, including content removal, warning notices, account restrictions, temporary suspensions, permanent bans, or referral to authorities where required.`,
  },
  {
    num: 14, title: "Enforcement",
    body: `Maricho Media reserves the right to remove content, restrict visibility of content, suspend accounts, terminate accounts, or limit access to services where it reasonably believes a violation of these Rules, applicable law, or platform policies has occurred.`,
  },
  {
    num: 15, title: "Community First",
    body: `Mshauri AI and Maricho Media exist to support learning, collaboration, innovation, agriculture, journalism, entrepreneurship, and community development. Users should contribute constructively and help create a trustworthy, respectful, and useful environment for everyone.`,
  },
];

export default function Rules() {
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
            <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-xl">📜</div>
            <div>
              <h1 className="text-[#E7E9EA] font-black text-[22px]">Mshauri Community Rules</h1>
              <p className="text-[#71767B] text-[12px]">Maricho Media · Effective June 22, 2026</p>
            </div>
          </div>
          <p className="text-[#71767B] text-[13px] leading-relaxed border-l-2 border-[#22c55e]/40 pl-4 mt-4">
            These rules apply to all users of Mshauri AI, mshauri.marichomedia.com, Maricho Media websites, WhatsApp services, mobile applications, and community spaces. Our goal is to create a safe, respectful, and productive environment for farmers across Zimbabwe, SADC, and Africa.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {RULES.map(rule => (
            <div key={rule.num} className="bg-[#16181C] border border-[#2F3336] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] font-black text-[11px] shrink-0 mt-0.5">
                  {rule.num}
                </div>
                <div>
                  <h3 className="text-[#E7E9EA] font-bold text-[14px] mb-1">Rule {rule.num}: {rule.title}</h3>
                  <p className="text-[#71767B] text-[13px] leading-relaxed">{rule.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-[#16181C] border border-[#2F3336] rounded-xl p-5">
          <h3 className="text-[#E7E9EA] font-bold text-[14px] mb-2">Contact</h3>
          <p className="text-[#71767B] text-[13px]">
            Community Safety Team · Maricho Media / Five Talents (Pvt) Ltd., Zimbabwe<br />
            Email: <a href="mailto:privacy@marichomedia.com" className="text-[#22c55e] hover:underline">privacy@marichomedia.com</a> ·{" "}
            Website: <a href="https://mshauri.marichomedia.com" className="text-[#22c55e] hover:underline">mshauri.marichomedia.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
