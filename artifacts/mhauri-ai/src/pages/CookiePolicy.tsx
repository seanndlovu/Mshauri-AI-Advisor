import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    title: "What Are Cookies?",
    body: `Cookies are small text files placed on your device by websites you visit. They are widely used to make websites function correctly, improve user experience, and provide information to site owners. Some cookies are essential for the platform to work; others are optional and require your consent.`,
  },
  {
    title: "Cookies We Use",
    body: `Essential cookies (required for the platform to function):\n• Session cookie — keeps you logged in during your visit. Set when you sign in and deleted when you close your browser or sign out.\n• CSRF / security token — protects your account from cross-site request forgery attacks.\n\nFunctional cookies (improve your experience):\n• Theme preference — remembers whether you prefer dark or light mode.\n• Feed preferences — remembers your sort and filter choices on the community feed.`,
  },
  {
    title: "What We Do Not Use",
    body: `Mshauri AI does not currently use:\n• Third-party advertising or tracking cookies\n• Cross-site behavioural tracking\n• Social media pixel tracking\n• Analytics cookies from third-party providers\n\nWe may update this policy if these practices change. Any material change will be communicated to users in advance.`,
  },
  {
    title: "Local Storage",
    body: `In addition to cookies, we use browser local storage and session storage to:\n• Cache your authentication state between page loads\n• Store temporary UI preferences (e.g., sidebar state, dismissed banners)\n• Maintain your market price and community filter selections\n\nThis data is stored on your device and is not transmitted to our servers unless explicitly required by a feature.`,
  },
  {
    title: "Managing Cookies",
    body: `You can manage, disable, or delete cookies at any time through your browser settings. Note that disabling essential cookies (such as session cookies) will prevent you from staying logged in and may break core platform functionality.\n\nBrowser-specific guides:\n• Chrome: Settings → Privacy and security → Cookies\n• Firefox: Settings → Privacy & Security → Cookies\n• Safari: Preferences → Privacy → Manage Website Data\n• Edge: Settings → Cookies and site permissions`,
  },
  {
    title: "Consent",
    body: `By using Mshauri AI, you consent to the use of essential cookies as described in this policy. These are strictly necessary for the platform to function and cannot be disabled without affecting core service delivery.\n\nFunctional and preference cookies are used only where necessary to maintain your chosen settings. They do not track your behaviour across other websites.`,
  },
  {
    title: "Changes to This Policy",
    body: `We may update this Cookie Policy from time to time. The effective date at the top of this page will reflect the most recent update. Continued use of the platform after changes take effect constitutes acceptance of the revised policy.`,
  },
  {
    title: "Contact",
    body: `For questions about our use of cookies:\nFive Talents (Pvt) Ltd. / Maricho Media · Zimbabwe\nEmail: privacy@marichomedia.com\nWebsite: mshauri.marichomedia.com`,
  },
];

export default function CookiePolicy() {
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
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-xl">🍪</div>
            <div>
              <h1 className="text-[#E7E9EA] font-black text-[22px]">Cookie Policy</h1>
              <p className="text-[#71767B] text-[12px]">Five Talents (Pvt) Ltd. / Maricho Media · Effective June 22, 2026</p>
            </div>
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
