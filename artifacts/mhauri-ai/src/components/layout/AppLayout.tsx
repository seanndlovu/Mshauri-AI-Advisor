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
  Home, BookOpen, Users, Radio,
  MessageSquare, Trash2, Sprout, Menu, Bot,
  BarChart2, TrendingUp, Globe, UserCircle,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";

const PRIMARY_NAV = [
  { path: "/", label: "Home", icon: Home, testId: "button-home", exact: true },
  { path: "/communities", label: "Communities", icon: Globe, testId: "button-communities" },
  { path: "/ask", label: "Ask AI", icon: Bot, testId: "button-ask-ai" },
  { path: "/prices", label: "Prices", icon: TrendingUp, testId: "button-prices" },
  { path: "/profile", label: "Profile", icon: UserCircle, testId: "button-profile" },
];

const ADMIN_NAV = [
  { path: "/knowledge-base", label: "Knowledge Base", icon: BookOpen, testId: "button-knowledge-base" },
  { path: "/farmers", label: "Farmers", icon: Users, testId: "button-farmers" },
  { path: "/broadcasts", label: "Broadcasts", icon: Radio, testId: "button-broadcasts" },
  { path: "/analytics", label: "Analytics", icon: BarChart2, testId: "button-analytics" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full bg-black font-[Inter,system-ui,sans-serif] text-[#E7E9EA] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[72px] xl:w-[275px] bg-black border-r border-[#2F3336] shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-black rounded-full flex items-center justify-center border border-[#2F3336]">
            <Menu className="w-5 h-5 text-[#E7E9EA]" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[275px] p-0 bg-black border-r border-[#2F3336]">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-[#2F3336] flex">
        {PRIMARY_NAV.map(({ path, label, icon: Icon, exact }) => (
          <MobileNavItem key={path} path={path} label={label} Icon={Icon} exact={exact} />
        ))}
      </nav>

      {/* Main content — add pb-16 on mobile for bottom nav */}
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
      className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isActive ? "text-[#22c55e]" : "text-[#71767B]"}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
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

  const nav = (path: string) => {
    setLocation(path);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full px-2 xl:px-4 py-3">
      {/* Logo */}
      <Link href="/">
        <div
          className="flex items-center gap-3 mb-1 p-3 rounded-full hover:bg-white/10 transition-colors cursor-pointer w-fit"
          onClick={() => onNavigate?.()}
        >
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            <Sprout className="w-7 h-7 text-[#22c55e]" />
          </div>
          <span className="hidden xl:block font-black text-[#E7E9EA] text-xl tracking-tight">mshauri</span>
        </div>
      </Link>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5 mb-4">
        {PRIMARY_NAV.map(({ path, label, icon: Icon, testId, exact }) => {
          const isActive = exact ? location === path : location === path || location.startsWith(path + "/");
          return (
            <button
              key={path}
              onClick={() => nav(path)}
              data-testid={testId}
              className={`flex items-center gap-4 p-3 rounded-full transition-colors text-left w-full hover:bg-white/10 ${
                isActive ? "font-bold text-[#E7E9EA]" : "font-normal text-[#E7E9EA]"
              }`}
            >
              <Icon className={`w-[26px] h-[26px] shrink-0 ${isActive ? "text-[#22c55e]" : "text-[#E7E9EA]"}`} />
              <span className="hidden xl:block text-[19px] leading-none">{label}</span>
              {isActive && <div className="hidden xl:block ml-auto w-1.5 h-1.5 rounded-full bg-[#22c55e]" />}
            </button>
          );
        })}
      </nav>

      {/* Auth CTA or user pill */}
      <div className="mb-4">
        {user ? (
          <button
            onClick={() => nav("/ask")}
            data-testid="button-new-chat"
            className="w-full xl:flex hidden items-center justify-center bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-[17px] py-3.5 rounded-full transition-colors"
          >
            Ask Mshauri
          </button>
        ) : (
          <button
            onClick={() => nav("/register")}
            className="w-full xl:flex hidden items-center justify-center bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-[17px] py-3.5 rounded-full transition-colors"
          >
            Join Community
          </button>
        )}
        <button
          onClick={() => nav(user ? "/ask" : "/register")}
          className="xl:hidden flex items-center justify-center w-12 h-12 bg-[#22c55e] hover:bg-[#16a34a] rounded-full transition-colors mx-auto"
        >
          <Bot className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Admin section */}
      <div className="mb-4">
        <p className="hidden xl:block text-[11px] font-bold text-[#71767B] uppercase tracking-widest px-3 mb-2">Admin</p>
        <div className="flex flex-col gap-0.5">
          {ADMIN_NAV.map(({ path, label, icon: Icon, testId }) => {
            const isActive = location.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => nav(path)}
                data-testid={testId}
                className={`flex items-center gap-4 p-3 rounded-full transition-colors text-left w-full hover:bg-white/10 text-[#71767B] hover:text-[#E7E9EA] ${isActive ? "font-bold text-[#E7E9EA]" : ""}`}
              >
                <Icon className={`w-[22px] h-[22px] shrink-0 ${isActive ? "text-[#22c55e]" : ""}`} />
                <span className="hidden xl:block text-[16px] leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent conversations */}
      <div className="flex-1 min-h-0 flex flex-col">
        <p className="hidden xl:block text-[12px] font-bold text-[#71767B] uppercase tracking-widest px-3 mb-2">
          Recent Chats
        </p>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-0.5 pb-4">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse mx-1" />
                ))
              : conversations?.map((conv) => {
                  const isActive = location === `/conversations/${conv.id}`;
                  return (
                    <Link key={conv.id} href={`/conversations/${conv.id}`} onClick={onNavigate}>
                      <div
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                          isActive ? "bg-white/10" : "hover:bg-white/5"
                        }`}
                        data-testid={`link-conversation-${conv.id}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <MessageSquare className="w-4 h-4 text-[#71767B] shrink-0" />
                          <div className="hidden xl:flex flex-col min-w-0">
                            <span className="truncate text-[13px] font-medium text-[#E7E9EA]">
                              {conv.title || "New Conversation"}
                            </span>
                            <span className="text-[11px] text-[#71767B]">
                              {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 opacity-0 group-hover:opacity-100 hidden xl:flex hover:bg-red-900/30 hover:text-red-400 shrink-0 ml-1"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`button-delete-conv-${conv.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#16181C] border border-[#2F3336] text-[#E7E9EA]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-[#E7E9EA]">Delete conversation?</AlertDialogTitle>
                              <AlertDialogDescription className="text-[#71767B]">
                                This will permanently remove this conversation and all messages.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-transparent border border-[#2F3336] text-[#E7E9EA] hover:bg-white/10" onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => handleDelete(conv.id, e as React.MouseEvent)}
                                className="bg-red-500 hover:bg-red-600 text-white border-0"
                              >Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
