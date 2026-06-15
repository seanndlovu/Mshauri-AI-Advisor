import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  useListConversations,
  useDeleteConversation,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home, Bot, TrendingUp, UserCircle,
  Trash2, Menu, PenSquare, Sun, Moon,
  ChevronUp, ChevronDown, Star, Settings,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { CreatePostModal } from "@/components/CreatePostModal";

const MAIN_NAV = [
  { path: "/",       label: "Home",    icon: Home,        exact: true  },
  { path: "/ask",    label: "Mshauri", icon: Bot                       },
  { path: "/prices", label: "Markets", icon: TrendingUp                },
  { path: "/me",     label: "Me",      icon: UserCircle                },
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

      {/* Mobile bottom nav — 4 tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1a1a1b] border-t border-[#343536] flex">
        {MAIN_NAV.map(({ path, label, icon: Icon, exact }) => (
          <MobileTab key={path} path={path} label={label} Icon={Icon} exact={exact} />
        ))}
      </nav>

      <main className="flex-1 overflow-hidden min-w-0 pb-16 md:pb-0">
        {children}
      </main>
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
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[#818384] hover:bg-[#272729] hover:text-[#d7dadc] transition-colors text-left"
    >
      {isDark
        ? <><Sun className="w-[18px] h-[18px] shrink-0" /><span className="text-[13px]">Light Mode</span></>
        : <><Moon className="w-[18px] h-[18px] shrink-0" /><span className="text-[13px]">Dark Mode</span></>}
    </button>
  );
}

// Deterministic avatar colour from community slug
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
      {/* Header row */}
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
        <div className="flex flex-col overflow-y-auto max-h-56">
          {/* Manage link */}
          <Link href="/communities" onClick={onNavigate}>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg mx-1 text-[#818384] hover:bg-[#272729] hover:text-[#d7dadc] transition-colors group cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-[#272729] border border-[#343536] flex items-center justify-center shrink-0">
                <Settings className="w-3 h-3 text-[#818384]" />
              </div>
              <span className="text-[12px] flex-1">Manage Communities</span>
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
                  {/* Avatar */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[10px]"
                    style={{ backgroundColor: color }}
                  >
                    {c.name[0].toUpperCase()}
                  </div>
                  <span className="text-[12px] flex-1 truncate">r/{c.slug}</span>
                  <Star className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: conversations } = useListConversations();
  const deleteConversation = useDeleteConversation();
  const queryClient = useQueryClient();

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    await deleteConversation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    if (location === `/conversations/${id}`) setLocation("/");
  };

  return (
    <div className="flex flex-col h-full py-3">
      {/* Logo */}
      <Link href="/">
        <div onClick={onNavigate} className="flex items-center gap-2.5 px-4 py-2.5 mb-2 cursor-pointer hover:bg-[#272729] rounded-lg mx-2 transition-colors">
          <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-10 h-10 object-contain shrink-0" />
          <div>
            <div className="font-black text-[#c8a84b] text-[15px] tracking-tight leading-none">mshauri</div>
            <div className="text-[#5a4020] text-[9px] font-semibold uppercase tracking-wide mt-0.5">Agriculture & Climate Intelligence</div>
          </div>
        </div>
      </Link>

      {/* Create Post CTA */}
      <div className="px-3 mb-3">
        <button
          onClick={() => setCreateOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-2 rounded-full text-[13px] transition-colors"
        >
          <PenSquare className="w-4 h-4" /> Create Post
        </button>
      </div>

      {/* Main nav — 4 destinations */}
      <nav className="px-2 mb-2 flex flex-col gap-0.5">
        {MAIN_NAV.map(({ path, label, icon, exact }) => (
          <NavLink key={path} path={path} label={label} icon={icon} exact={exact} onClick={onNavigate} />
        ))}
      </nav>

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

      {/* Communities list */}
      <CommunitiesSidebar onNavigate={onNavigate} />

      <div className="flex-1" />

      {/* Theme + user card */}
      <div className="mx-3 border-t border-[#343536] pt-2 mt-2">
        <ThemeToggle />
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

      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {}}
      />
    </div>
  );
}
