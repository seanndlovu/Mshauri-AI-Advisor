import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  TrendingUp, UserCircle,
  Menu, Sun, Moon,
  ChevronUp, ChevronDown, Settings,
  Users, BookOpen, LayoutDashboard, Zap, Sparkles,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { DailyQuiz } from "@/components/game/DailyQuiz";

const MAIN_NAV = [
  { path: "/",         label: "Home",      icon: LayoutDashboard, exact: true },
  { path: "/feed",     label: "Community", icon: Users                        },
  { path: "/magazine", label: "Magazine",  icon: BookOpen                     },
  { path: "/prices",   label: "Markets",   icon: TrendingUp                   },
];

const MOBILE_NAV = [
  { path: "/",       label: "Home",      icon: LayoutDashboard, exact: true },
  { path: "/feed",   label: "Community", icon: Users                        },
  { path: "/prices", label: "Markets",   icon: TrendingUp                   },
  { path: "/me",     label: "Me",        icon: UserCircle                   },
];

const WA_LINK = "https://wa.me/263714280244?text=Hi%2C%20I%20want%20to%20connect%20with%20Mshauri";

function WhatsAppFAB() {
  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#1fbd57] shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full bg-[#1a1a1b] text-[#d7dadc] overflow-hidden ms-theme-transition">
      <aside className="hidden md:flex flex-col w-[240px] bg-[#1a1a1b] border-r border-[#343536] shrink-0 h-full overflow-y-auto ms-theme-transition">
        <SidebarContent onPlayQuiz={() => setQuizOpen(true)} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-[#272729] rounded-full flex items-center justify-center border border-[#343536] ms-theme-transition">
            <Menu className="w-5 h-5 text-[#d7dadc]" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] p-0 bg-[#1a1a1b] border-r border-[#343536] ms-theme-transition">
          <SidebarContent onNavigate={() => setMobileOpen(false)} onPlayQuiz={() => { setMobileOpen(false); setQuizOpen(true); }} />
        </SheetContent>
      </Sheet>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1a1a1b] border-t border-[#343536] flex ms-theme-transition">
        {MOBILE_NAV.map(({ path, label, icon: Icon, exact }) => (
          <MobileTab key={path} path={path} label={label} Icon={Icon} exact={exact} />
        ))}
      </nav>

      <WhatsAppFAB />

      <main className="flex-1 overflow-hidden min-w-0 pb-16 md:pb-0">
        {children}
      </main>

      <DailyQuiz open={quizOpen} onClose={() => setQuizOpen(false)} />
    </div>
  );
}

function MobileTab({ path, label, Icon, exact }: { path: string; label: string; Icon: React.ElementType; exact?: boolean }) {
  const [location, setLocation] = useLocation();
  const active = exact ? location === path : location.startsWith(path);
  return (
    <button
      onClick={() => setLocation(path)}
      className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${active ? "text-[#22c55e]" : "text-[#818384]"}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function NavLink({ path, label, icon: Icon, exact, onClick }: {
  path: string; label: string; icon: React.ElementType; exact?: boolean; onClick?: () => void;
}) {
  const [location, setLocation] = useLocation();
  const active = exact ? location === path : location === path || location.startsWith(path + "/");
  return (
    <button
      onClick={() => { setLocation(path); onClick?.(); }}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
        active ? "bg-[#272729] text-[#d7dadc] font-semibold" : "text-[#818384] hover:bg-[#272729] hover:text-[#d7dadc]"
      }`}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span className="text-[13px] flex-1">{label}</span>
    </button>
  );
}

function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex items-center shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]"
      style={{
        width: 52, height: 28, transition: "background 0.3s ease, border-color 0.3s ease",
        background: isDark ? "linear-gradient(135deg,#0f1e12,#1a2e1c)" : "linear-gradient(135deg,#dcfce7,#bbf7d0)",
        border: isDark ? "1.5px solid #2a4030" : "1.5px solid #86efac",
        boxShadow: isDark ? "0 0 0 0px rgba(34,197,94,0)" : "0 0 10px rgba(34,197,94,0.18)",
      }}
    >
      <span
        className="absolute flex items-center justify-center rounded-full shadow-md"
        style={{
          width: 22, height: 22, top: 2, left: 2,
          transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease",
          transform: isDark ? "translateX(24px)" : "translateX(0px)",
          background: isDark ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#16a34a,#22c55e)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        }}
      >
        {isDark ? <Moon className="w-[11px] h-[11px] text-white" /> : <Sun className="w-[11px] h-[11px] text-white" />}
      </span>
    </button>
  );
}

const LEVELS_SIDEBAR = [
  { min: 0,     title: "Seed Farmer"          },
  { min: 500,   title: "Smallholder"           },
  { min: 1500,  title: "Field Farmer"          },
  { min: 3000,  title: "Crop Specialist"       },
  { min: 5500,  title: "Agronomy Expert"       },
  { min: 9000,  title: "Senior Grower"         },
  { min: 14000, title: "Field Expert"          },
  { min: 20000, title: "Master Farmer"         },
  { min: 28000, title: "Agricultural Advisor"  },
  { min: 38000, title: "Mshauri Champion"      },
];

function getLevelData(xp: number) {
  let current = LEVELS_SIDEBAR[0];
  let nextMin = LEVELS_SIDEBAR[1]?.min ?? LEVELS_SIDEBAR[0].min + 500;
  for (let i = 0; i < LEVELS_SIDEBAR.length; i++) {
    if (xp >= LEVELS_SIDEBAR[i].min) {
      current = LEVELS_SIDEBAR[i];
      nextMin = LEVELS_SIDEBAR[i + 1]?.min ?? LEVELS_SIDEBAR[i].min + 10000;
    }
  }
  const progress = Math.min(100, ((xp - current.min) / (nextMin - current.min)) * 100);
  return { title: current.title, progress };
}

function GameSidebarBlock({ onPlayNow }: { onPlayNow: () => void }) {
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mshauri_game");
      if (raw) {
        const data = JSON.parse(raw) as { xp?: number; streak?: number };
        setXp(data.xp ?? 0);
        setStreak(data.streak ?? 0);
      }
    } catch {}
    fetch("/api/game/stats", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d && typeof d.xp === "number") { setXp(d.xp); setStreak(d.streak ?? 0); } })
      .catch(() => {});
  }, []);

  const { title, progress } = getLevelData(xp);

  return (
    <>
      <div className="mx-3 border-t border-[#343536] my-2" />
      <div className="mx-3 border border-[#343536] rounded-xl p-3 mb-1 bg-[#1e2022]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#22c55e]" />
            <span className="text-[10px] font-bold text-[#818384] uppercase tracking-wider">Mshauri Game</span>
          </div>
          {streak > 0 && (
            <span className="text-[10px] text-orange-400 font-bold">🔥 {streak}d</span>
          )}
        </div>
        <div className="text-[#d7dadc] text-[12px] font-bold mb-1">{title}</div>
        <div className="w-full bg-[#343536] rounded-full h-1.5 mb-2">
          <div
            className="bg-[#22c55e] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#818384] text-[10px]">{xp.toLocaleString()} XP</span>
          <button
            onClick={onPlayNow}
            className="text-[#22c55e] text-[11px] font-bold hover:underline transition-colors"
          >
            Play Now →
          </button>
        </div>
      </div>
    </>
  );
}

const AVATAR_COLORS = [
  "#22c55e","#3b82f6","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#ec4899","#10b981","#f97316","#6366f1",
];
function avatarColor(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

interface Community { id: number; slug: string; name: string; memberCount: number; }

function CommunitiesSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(true);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [location] = useLocation();

  useEffect(() => {
    fetch("/api/communities", { credentials: "include" })
      .then(r => r.json())
      .then(d => Array.isArray(d) && setCommunities(d))
      .catch(() => {});
  }, []);

  if (communities.length === 0) return null;

  return (
    <>
      <div className="mx-3 border-t border-[#343536] my-2" />
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-3 mb-1 group"
      >
        <span className="text-[10px] font-bold text-[#818384] uppercase tracking-wider">Communities</span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-[#818384] group-hover:text-[#d7dadc]" />
          : <ChevronDown className="w-3.5 h-3.5 text-[#818384] group-hover:text-[#d7dadc]" />}
      </button>

      {open && (
        <div className="flex flex-col overflow-y-auto max-h-52">
          <Link href="/communities" onClick={onNavigate}>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg mx-1 text-[#818384] hover:bg-[#272729] hover:text-[#d7dadc] transition-colors group cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-[#272729] border border-[#343536] flex items-center justify-center shrink-0">
                <Settings className="w-3 h-3 text-[#818384]" />
              </div>
              <span className="text-[12px] flex-1">All Communities</span>
            </div>
          </Link>

          {communities.map(c => {
            const active = location.startsWith(`/communities/${c.slug}`);
            const color = avatarColor(c.slug);
            return (
              <Link key={c.id} href={`/communities/${c.slug}`} onClick={onNavigate}>
                <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg mx-1 transition-colors group cursor-pointer ${
                  active ? "bg-[#272729] text-[#d7dadc]" : "text-[#818384] hover:bg-[#272729] hover:text-[#d7dadc]"
                }`}>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[10px]"
                    style={{ backgroundColor: color }}
                  >
                    {c.name[0].toUpperCase()}
                  </div>
                  <span className="text-[12px] flex-1 truncate">m/{c.slug}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function AdPlaceholder() {
  return (
    <>
      <div className="mx-3 border-t border-[#343536] my-2" />
      <div className="px-3 mb-1">
        <span className="text-[10px] font-bold text-[#818384] uppercase tracking-wider">Ads</span>
      </div>
      <div className="mx-3 rounded-xl overflow-hidden border border-[#2F3336] bg-[#1a1c1f]">
        <img src="/ad-1money.png" alt="1Money — A NetOne Product" className="w-full object-contain" />
        <div className="px-3 py-2 text-center">
          <p className="text-[#4a5260] text-[9px]">Ads · <a href="mailto:ads@maricho.media" className="text-[#22c55e]/70 hover:text-[#22c55e]">Advertise</a></p>
        </div>
      </div>
    </>
  );
}

function SidebarContent({ onNavigate, onPlayQuiz }: { onNavigate?: () => void; onPlayQuiz: () => void }) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full py-3">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 mb-2 mx-2">
        <Link href="/" className="flex-1 min-w-0">
          <div onClick={onNavigate} className="flex items-center gap-2.5 cursor-pointer hover:bg-[#272729] rounded-lg transition-colors">
            <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-10 h-10 object-contain shrink-0" />
            <div className="min-w-0">
              <div className="font-black text-[#c8a84b] text-[15px] tracking-tight leading-none">mshauri</div>
              <div className="text-[#5a4020] text-[9px] font-semibold uppercase tracking-wide mt-0.5 leading-tight">The Global Food Systems<br/>Intelligence OS</div>
            </div>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      <div className="px-3 mb-3">
        <Link href="/" onClick={onNavigate}>
          <button className="w-full flex items-center justify-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-2 rounded-full text-[13px] transition-colors">
            <Sparkles className="w-4 h-4" />
            Ask Mshauri
          </button>
        </Link>
      </div>

      <nav className="px-2 mb-2 flex flex-col gap-0.5">
        {MAIN_NAV.map(({ path, label, icon, exact }) => (
          <NavLink key={path} path={path} label={label} icon={icon} exact={exact} onClick={onNavigate} />
        ))}
      </nav>

      <GameSidebarBlock onPlayNow={onPlayQuiz} />

      <CommunitiesSidebar onNavigate={onNavigate} />

      <AdPlaceholder />

      <div className="flex-1" />

      <div className="mx-3 mb-1">
        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 px-3 pt-2 pb-1">
          {([["Rules", "/rules"], ["Privacy", "/privacy"], ["AI Use", "/ai-disclaimer"], ["Cookies", "/cookies"]] as [string, string][]).map(([label, href]) => (
            <Link key={href} href={href} onClick={onNavigate}>
              <span className="text-[10px] text-[#818384] hover:text-[#d7dadc] cursor-pointer transition-colors">{label}</span>
            </Link>
          ))}
          <span className="text-[10px] text-[#818384] w-full mt-0.5">© 2026 Maricho Media</span>
        </div>
      </div>

      <div className="mx-3 mt-2">
        {user ? (
          <Link href="/me" onClick={onNavigate}>
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#272729] hover:bg-[#2d2e30] cursor-pointer transition-colors border border-[#343536]">
              <div className="w-8 h-8 shrink-0 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] font-black text-[11px]">
                {user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#d7dadc] text-[12px] font-semibold truncate">{user.name}</div>
                <div className="text-[#818384] text-[10px]">Reputation: {user.reputationScore}</div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Link href="/register" onClick={onNavigate}>
              <button className="w-full py-2 bg-[#22c55e] hover:bg-[#16a34a] rounded-full text-white text-[12px] font-bold transition-colors">Sign Up</button>
            </Link>
            <Link href="/login" onClick={onNavigate}>
              <button className="w-full py-2 border border-[#343536] hover:bg-[#272729] rounded-full text-[#818384] text-[12px] transition-colors">Log In</button>
            </Link>
          </div>
        )}
      </div>
      <div className="h-3" />
    </div>
  );
}
