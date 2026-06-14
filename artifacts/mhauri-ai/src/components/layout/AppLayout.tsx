import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  useListConversations,
  useDeleteConversation,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home, Globe, Bot, TrendingUp, BookOpen, UserCircle,
  Settings, Trash2, Menu, PenSquare, ChevronDown,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface Community { id: number; slug: string; name: string; memberCount: number; }

const COMMUNITY_ICONS: Record<string, string> = {
  maize:"🌽", livestock:"🐄", poultry:"🐔", vegetables:"🥬",
  tobacco:"🌿", pests:"🐛", irrigation:"💧", agribusiness:"💼",
  climate:"🌦️", soils:"🪱",
};

const MOBILE_NAV = [
  { path:"/",             label:"Feed",       icon:Home,        exact:true },
  { path:"/communities",  label:"Communities",icon:Globe        },
  { path:"/ask",          label:"AI",         icon:Bot          },
  { path:"/prices",       label:"Markets",    icon:TrendingUp   },
  { path:"/profile",      label:"Profile",    icon:UserCircle   },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full bg-[#1a1a1b] text-[#d7dadc] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] bg-[#1a1a1b] border-r border-[#343536] shrink-0 h-full overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-[#272729] rounded-full flex items-center justify-center border border-[#343536]">
            <Menu className="w-5 h-5 text-[#d7dadc]" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] p-0 bg-[#1a1a1b] border-r border-[#343536]">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1a1a1b] border-t border-[#343536] flex">
        {MOBILE_NAV.map(({ path, label, icon: Icon, exact }) => (
          <MobileTab key={path} path={path} label={label} Icon={Icon} exact={exact} />
        ))}
      </nav>

      {/* Main */}
      <main className="flex-1 overflow-hidden min-w-0 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}

function MobileTab({ path, label, Icon, exact }: { path:string; label:string; Icon:React.ElementType; exact?:boolean }) {
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

function NavLink({ path, label, icon: Icon, exact, badge, onClick }: {
  path: string; label: string; icon: React.ElementType; exact?: boolean;
  badge?: string; onClick?: () => void;
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
      {badge && (
        <span className="text-[10px] font-black text-[#22c55e] bg-[#22c55e]/15 px-1.5 py-0.5 rounded-full">{badge}</span>
      )}
    </button>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [showAllComm, setShowAllComm] = useState(false);
  const { data: conversations } = useListConversations();
  const deleteConversation = useDeleteConversation();
  const queryClient = useQueryClient();

  useEffect(() => {
    fetch("/api/communities").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setCommunities(d);
    }).catch(() => {});
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    await deleteConversation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    if (location === `/conversations/${id}`) setLocation("/");
  };

  const visibleComm = showAllComm ? communities : communities.slice(0, 6);
  const initials = user?.name?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

  return (
    <div className="flex flex-col h-full py-3">
      {/* Logo */}
      <Link href="/">
        <div
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-4 py-2.5 mb-2 cursor-pointer hover:bg-[#272729] rounded-lg mx-2 transition-colors"
        >
          <img src="/mshauri-logo.png" alt="Mshauri" className="w-9 h-9 object-contain shrink-0" />
          <div>
            <div className="font-black text-[#c8a84b] text-[15px] tracking-tight leading-none">mshauri</div>
            <div className="text-[#5a4020] text-[9px] font-semibold uppercase tracking-wide mt-0.5">Agriculture & Climate Intelligence</div>
          </div>
        </div>
      </Link>

      {/* Create post CTA */}
      <div className="px-3 mb-3">
        <button
          onClick={() => { setLocation("/communities"); onNavigate?.(); }}
          className="w-full flex items-center justify-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-2 rounded-full text-[13px] transition-colors"
        >
          <PenSquare className="w-4 h-4" /> Create Post
        </button>
      </div>

      {/* Main nav */}
      <nav className="px-2 mb-2 flex flex-col gap-0.5">
        <NavLink path="/" label="Home" icon={Home} exact onClick={onNavigate} />
        <NavLink path="/communities" label="Communities" icon={Globe} onClick={onNavigate} />
        <NavLink path="/ask" label="Ask Mshauri AI" icon={Bot} onClick={onNavigate} />
        <NavLink path="/prices" label="Market Prices" icon={TrendingUp} onClick={onNavigate} />
        <NavLink path="/knowledge-base" label="Knowledge Base" icon={BookOpen} onClick={onNavigate} />
      </nav>

      {/* Divider + Communities */}
      <div className="mx-3 border-t border-[#343536] my-2" />
      <div className="px-3 mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#818384] uppercase tracking-wider">Communities</span>
      </div>
      <div className="px-2 flex flex-col gap-0.5">
        {visibleComm.map(c => {
          const active = location === `/communities/${c.slug}`;
          return (
            <Link key={c.id} href={`/communities/${c.slug}`} onClick={onNavigate}>
              <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                active ? "bg-[#272729] text-[#d7dadc]" : "text-[#818384] hover:bg-[#272729] hover:text-[#d7dadc]"
              }`}>
                <span className="text-base shrink-0">{COMMUNITY_ICONS[c.slug] ?? "🌱"}</span>
                <span className="text-[13px] truncate">r/{c.slug}</span>
              </div>
            </Link>
          );
        })}
        {communities.length > 6 && (
          <button
            onClick={() => setShowAllComm(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 text-[#818384] hover:text-[#d7dadc] text-[12px] transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllComm ? "rotate-180" : ""}`} />
            {showAllComm ? "Show less" : `${communities.length - 6} more…`}
          </button>
        )}
      </div>

      {/* Recent AI chats */}
      {conversations && conversations.length > 0 && (
        <>
          <div className="mx-3 border-t border-[#343536] my-2" />
          <div className="px-3 mb-1.5">
            <span className="text-[10px] font-bold text-[#818384] uppercase tracking-wider">Recent Chats</span>
          </div>
          <div className="px-2 flex flex-col gap-0.5 overflow-y-auto max-h-28">
            {conversations.slice(0, 4).map(conv => {
              const active = location === `/conversations/${conv.id}`;
              return (
                <Link key={conv.id} href={`/conversations/${conv.id}`} onClick={onNavigate}>
                  <div className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-[12px] ${
                    active ? "bg-[#272729] text-[#d7dadc]" : "text-[#818384] hover:bg-[#272729] hover:text-[#d7dadc]"
                  }`}>
                    <span className="truncate flex-1">🤖 {conv.title || "Chat"}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"
                          className="w-5 h-5 opacity-0 group-hover:opacity-100 hover:bg-red-900/30 hover:text-red-400 shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#272729] border border-[#343536] text-[#d7dadc]">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                          <AlertDialogDescription className="text-[#818384]">This will permanently remove this conversation.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-transparent border border-[#343536] text-[#d7dadc]" onClick={e => e.stopPropagation()}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={e => handleDelete(conv.id, e as React.MouseEvent)} className="bg-red-500 hover:bg-red-600 text-white border-0">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom nav */}
      <div className="mx-3 border-t border-[#343536] pt-2 mt-2">
        <nav className="flex flex-col gap-0.5 px-[-1px]">
          <NavLink path="/profile" label="Profile" icon={UserCircle} onClick={onNavigate} />
          <NavLink path="/settings" label="Settings" icon={Settings} onClick={onNavigate} />
        </nav>
      </div>

      {/* User card */}
      <div className="mx-3 mt-2">
        {user ? (
          <Link href="/profile" onClick={onNavigate}>
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#272729] hover:bg-[#2d2e30] cursor-pointer transition-colors border border-[#343536]">
              <div className="w-8 h-8 shrink-0 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] font-black text-[11px]">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#d7dadc] text-[12px] font-semibold truncate">{user.name}</div>
                <div className="text-[#818384] text-[10px]">Karma: {user.reputationScore}</div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Link href="/register" onClick={onNavigate}>
              <button className="w-full py-2 bg-[#22c55e] hover:bg-[#16a34a] rounded-full text-white text-[12px] font-bold transition-colors">
                Sign Up
              </button>
            </Link>
            <Link href="/login" onClick={onNavigate}>
              <button className="w-full py-2 border border-[#343536] hover:bg-[#272729] rounded-full text-[#818384] text-[12px] transition-colors">
                Log In
              </button>
            </Link>
          </div>
        )}
      </div>
      <div className="h-3" />
    </div>
  );
}
