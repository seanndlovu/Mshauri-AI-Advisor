import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListConversations,
  useDeleteConversation,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Home, Map, Globe, Bot, TrendingUp, Cloud,
  Lightbulb, BookOpen, Bell, BarChart2, MessageSquare,
  Bookmark, UserCircle, Settings, Trash2, Sprout,
  Menu, X, ChevronRight, Star,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const ROLE_LABELS: Record<string, string> = {
  farmer: "Farmer", agribusiness: "Agribusiness", extension_officer: "Extension Officer",
  researcher: "Researcher", ngo: "NGO Partner",
};

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  exact?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { path: "/", label: "Feed", icon: Home, exact: true },
  { path: "/map", label: "Map", icon: Map },
  { path: "/communities", label: "Communities", icon: Globe },
  { path: "/ask", label: "AI Advisor", icon: Bot },
  { path: "/prices", label: "Markets", icon: TrendingUp },
  { path: "/weather", label: "Weather", icon: Cloud },
  { path: "/opportunities", label: "Opportunities", icon: Lightbulb },
  { path: "/knowledge-base", label: "Knowledge", icon: BookOpen },
  { path: "/alerts", label: "Alerts", icon: Bell, badge: "3", badgeColor: "bg-red-500" },
];

const SECONDARY_NAV: NavItem[] = [
  { path: "/analytics", label: "Dashboard", icon: BarChart2, badge: "NEW", badgeColor: "bg-[#22c55e]" },
  { path: "/broadcasts", label: "Messages", icon: MessageSquare, badge: "5", badgeColor: "bg-blue-500" },
  { path: "/saved", label: "Saved", icon: Bookmark },
  { path: "/profile", label: "Profile", icon: UserCircle },
  { path: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV: NavItem[] = [
  { path: "/", label: "Feed", icon: Home, exact: true },
  { path: "/communities", label: "Communities", icon: Globe },
  { path: "/ask", label: "AI", icon: Bot },
  { path: "/prices", label: "Markets", icon: TrendingUp },
  { path: "/profile", label: "Profile", icon: UserCircle },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full bg-black font-[Inter,system-ui,sans-serif] text-[#E7E9EA] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[60px] xl:w-[220px] bg-[#080d10] border-r border-[#131a1f] shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-[#080d10] rounded-full flex items-center justify-center border border-[#1f2937]">
            <Menu className="w-5 h-5 text-[#E7E9EA]" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[220px] p-0 bg-[#080d10] border-r border-[#131a1f]">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080d10] border-t border-[#1f2937] flex">
        {MOBILE_NAV.map(({ path, label, icon: Icon, exact }) => (
          <MobileNavItem key={path} path={path} label={label} Icon={Icon} exact={exact} />
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden min-w-0 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}

function MobileNavItem({ path, label, Icon, exact }: { path: string; label: string; Icon: React.ElementType; exact?: boolean }) {
  const [location, setLocation] = useLocation();
  const isActive = exact ? location === path : location === path || location.startsWith(path + "/");
  return (
    <button
      onClick={() => setLocation(path)}
      className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isActive ? "text-[#22c55e]" : "text-[#3a5060]"}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function NavButton({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const [location, setLocation] = useLocation();
  const isActive = item.exact
    ? location === item.path
    : location === item.path || location.startsWith(item.path + "/");

  return (
    <button
      onClick={() => { setLocation(item.path); onNavigate?.(); }}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left group ${
        isActive
          ? "bg-[#0f1f12] text-[#22c55e]"
          : "text-[#3a5a60] hover:text-[#8ab0b8] hover:bg-[#0a1520]"
      }`}
    >
      <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-[#22c55e]" : ""}`} />
      <span className="hidden xl:block text-[13px] font-medium flex-1">{item.label}</span>
      {item.badge && (
        <span className={`hidden xl:flex items-center justify-center min-w-[18px] h-[18px] rounded-full ${item.badgeColor} text-white text-[9px] font-black px-1`}>
          {item.badge}
        </span>
      )}
      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#22c55e] rounded-r" />}
    </button>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: conversations, isLoading } = useListConversations();
  const deleteConversation = useDeleteConversation();
  const queryClient = useQueryClient();

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteConversation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    if (location === `/conversations/${id}`) setLocation("/");
  };

  return (
    <div className="flex flex-col h-full py-3">
      {/* Logo */}
      <Link href="/">
        <div
          onClick={() => onNavigate?.()}
          className="flex items-center gap-2.5 px-3 py-2 mb-3 cursor-pointer hover:bg-[#0a1520] rounded-lg mx-2 transition-colors"
        >
          <div className="w-8 h-8 shrink-0 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/20 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-[#22c55e]" />
          </div>
          <div className="hidden xl:flex flex-col min-w-0">
            <span className="font-black text-[#e7e9ea] text-[14px] tracking-tight leading-none">mshauri</span>
            <span className="text-[#2a5040] text-[8px] font-bold uppercase tracking-[0.08em] leading-tight mt-0.5">
              Agri Intelligence
            </span>
          </div>
        </div>
      </Link>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5 px-2 mb-2">
        {PRIMARY_NAV.map((item) => <NavButton key={item.path} item={item} onNavigate={onNavigate} />)}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-[#131a1f] my-2" />

      {/* Secondary nav */}
      <nav className="flex flex-col gap-0.5 px-2">
        {SECONDARY_NAV.map((item) => <NavButton key={item.path} item={item} onNavigate={onNavigate} />)}
      </nav>

      {/* Recent chats — small */}
      {conversations && conversations.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col mt-2 px-2 overflow-hidden">
          <p className="hidden xl:block text-[9px] font-bold text-[#2a3a48] uppercase tracking-[0.15em] px-1 mb-1.5">
            Recent
          </p>
          <div className="flex flex-col gap-0.5 overflow-y-auto">
            {isLoading
              ? null
              : conversations.slice(0, 5).map((conv) => {
                  const isActive = location === `/conversations/${conv.id}`;
                  return (
                    <Link key={conv.id} href={`/conversations/${conv.id}`} onClick={onNavigate}>
                      <div className={`group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-colors ${isActive ? "bg-[#0a1520]" : "hover:bg-[#0a1520]"}`}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare className="w-3.5 h-3.5 text-[#2a4050] shrink-0" />
                          <span className="hidden xl:block truncate text-[11px] text-[#5a7080]">
                            {conv.title || "Conversation"}
                          </span>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost" size="icon"
                              className="w-5 h-5 opacity-0 group-hover:opacity-100 hidden xl:flex hover:bg-red-900/30 hover:text-red-400 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#0d1117] border border-[#1f2937] text-[#E7E9EA]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                              <AlertDialogDescription className="text-[#4a6a7a]">
                                This will permanently remove this conversation.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-transparent border border-[#1f2937] text-[#E7E9EA] hover:bg-white/10" onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={(e) => handleDelete(conv.id, e as React.MouseEvent)} className="bg-red-500 hover:bg-red-600 text-white border-0">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User profile card */}
      <div className="mx-2 mt-2">
        <div className="border-t border-[#131a1f] pt-3">
          {user ? (
            <Link href="/profile">
              <div onClick={onNavigate} className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl bg-[#0a1520] hover:bg-[#0d1a28] cursor-pointer transition-colors border border-[#131a1f]">
                {/* Avatar */}
                <div className="w-8 h-8 shrink-0 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] font-black text-[12px]">
                  {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden xl:flex flex-col flex-1 min-w-0">
                  <span className="text-[#c0d0c8] text-[11px] font-semibold truncate">{user.name}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-2.5 h-2.5 text-[#f59e0b]" />
                    <span className="text-[#3a5060] text-[9px]">
                      Level 7 • {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </div>
                  {/* XP bar */}
                  <div className="mt-1 h-1 bg-[#1a2a2a] rounded-full overflow-hidden">
                    <div className="h-full bg-[#22c55e] rounded-full" style={{ width: `${(user.reputationScore % 100) || 42}%` }} />
                  </div>
                  <span className="text-[#2a3a40] text-[8px] mt-0.5">
                    {user.reputationScore} / {Math.ceil((user.reputationScore + 1) / 100) * 100} XP
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Link href="/register">
                <button onClick={onNavigate} className="w-full py-2 bg-[#22c55e] hover:bg-[#16a34a] rounded-lg text-white text-[11px] font-bold transition-colors hidden xl:block">
                  Join Community
                </button>
              </Link>
              <Link href="/login">
                <button onClick={onNavigate} className="w-full py-2 border border-[#1f2937] hover:bg-[#0a1520] rounded-lg text-[#5a8080] text-[11px] transition-colors hidden xl:block">
                  Sign In
                </button>
              </Link>
              <Link href="/register">
                <div onClick={onNavigate} className="xl:hidden flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e]">
                  <UserCircle className="w-5 h-5" />
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
