import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListConversations,
  useDeleteConversation,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Menu, MessageSquare, Trash2, Sprout, BookOpen, Users, TrendingUp, Radio, BarChart3, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const FRONT_NAV = [
  { path: "/", label: "Feed", icon: Sprout, testId: "button-home" },
  { path: "/knowledge-base", label: "Knowledge Base", icon: BookOpen, testId: "button-knowledge-base" },
  { path: "/farmers", label: "Farmers", icon: Users, testId: "button-farmers" },
  { path: "/market-prices", label: "Market Prices", icon: TrendingUp, testId: "button-market-prices" },
  { path: "/broadcasts", label: "Broadcasts", icon: Radio, testId: "button-broadcasts" },
];

const BACK_NAV = [
  { path: "/analytics", label: "Analytics", icon: BarChart3, testId: "button-analytics" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh] w-full font-[Inter,system-ui,sans-serif] bg-[#F3F4F6]">
      {/* Announce bar */}
      <div className="bg-[#14532d] text-emerald-100 text-[11px] font-medium py-1.5 px-4 text-center tracking-wide shrink-0 hidden md:block">
        🌱 Mshauri AI — Zimbabwe's Agricultural Assistant &nbsp;·&nbsp; Available 24/7 on WhatsApp &nbsp;·&nbsp; English · Shona · Ndebele
      </div>

      {/* Main header */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 max-w-[1400px] mx-auto">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="w-9 h-9 bg-[#15803d] rounded-lg flex items-center justify-center shrink-0 group-hover:bg-[#166534] transition-colors">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-black text-[#111827] text-lg leading-none tracking-tight">mshauri</div>
                <div className="text-[9px] text-[#6B7280] leading-none mt-0.5 uppercase tracking-widest">AI Agricultural Assistant</div>
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {FRONT_NAV.map(({ path, label, icon: Icon, testId }) => (
              <NavLink key={path} path={path} label={label} Icon={Icon} testId={testId} />
            ))}
            <div className="w-px h-5 bg-gray-200 mx-1" />
            {BACK_NAV.map(({ path, label, icon: Icon, testId }) => (
              <NavLink key={path} path={path} label={label} Icon={Icon} testId={testId} />
            ))}
          </nav>

          {/* Right: Ask button + mobile menu */}
          <div className="flex items-center gap-2">
            <Link href="/">
              <button
                className="hidden md:flex items-center gap-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-[13px] font-bold px-4 py-2 rounded-lg transition-colors"
                data-testid="button-new-chat"
              >
                + Ask Mshauri
              </button>
            </Link>
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-gray-600">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-white">
                <MobileSidebar onNavigate={() => setIsMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile nav strip */}
        <div className="md:hidden flex overflow-x-auto border-t border-gray-100 px-2 gap-1 pb-1">
          {[...FRONT_NAV, ...BACK_NAV].map(({ path, label, icon: Icon, testId }) => (
            <MobileNavTab key={path} path={path} label={label} Icon={Icon} testId={testId} />
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-200 shrink-0">
          <DesktopSidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ path, label, Icon, testId }: { path: string; label: string; Icon: React.ComponentType<{ className?: string }>; testId: string }) {
  const [location] = useLocation();
  const isActive = path === "/" ? location === "/" : location.startsWith(path);
  return (
    <Link href={path}>
      <button
        data-testid={testId}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
          isActive ? "text-[#15803d] bg-emerald-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }`}
      >
        <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#15803d]" : "text-gray-400"}`} />
        {label}
      </button>
    </Link>
  );
}

function MobileNavTab({ path, label, Icon, testId }: { path: string; label: string; Icon: React.ComponentType<{ className?: string }>; testId: string }) {
  const [location] = useLocation();
  const isActive = path === "/" ? location === "/" : location.startsWith(path);
  return (
    <Link href={path}>
      <button
        data-testid={testId}
        className={`flex items-center gap-1 px-3 py-2 text-[11px] font-semibold whitespace-nowrap transition-colors border-b-2 ${
          isActive ? "text-[#15803d] border-[#15803d]" : "text-gray-500 border-transparent"
        }`}
      >
        <Icon className="w-3 h-3" />
        {label}
      </button>
    </Link>
  );
}

function DesktopSidebar() {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full py-4">
      <div className="px-3 mb-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">Main</p>
        {FRONT_NAV.map(({ path, label, icon: Icon, testId }) => {
          const isActive = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <Link key={path} href={path}>
              <button
                data-testid={testId}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold mb-0.5 transition-colors text-left ${
                  isActive ? "bg-emerald-50 text-[#15803d]" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#15803d]" : "text-gray-400"}`} />
                {label}
              </button>
            </Link>
          );
        })}
      </div>

      <div className="px-3 mb-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1 mt-2">Admin</p>
        {BACK_NAV.map(({ path, label, icon: Icon, testId }) => {
          const isActive = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <Link key={path} href={path}>
              <button
                data-testid={testId}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold mb-0.5 transition-colors text-left ${
                  isActive ? "bg-emerald-50 text-[#15803d]" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#15803d]" : "text-gray-400"}`} />
                {label}
              </button>
            </Link>
          );
        })}
      </div>

      <div className="mx-3 border-t border-gray-100 mt-1 mb-3" />

      <div className="px-3 flex-1 overflow-hidden flex flex-col min-h-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Past Conversations</p>
        <PastConversations />
      </div>
    </div>
  );
}

function MobileSidebar({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex flex-col h-full pt-6">
      <div className="px-4 mb-4 flex items-center gap-2.5">
        <div className="w-9 h-9 bg-[#15803d] rounded-lg flex items-center justify-center">
          <Sprout className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-black text-[#111827] text-lg leading-none">mshauri</div>
          <div className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">AI Agricultural Assistant</div>
        </div>
      </div>
      <Link href="/" onClick={onNavigate}>
        <button className="mx-4 mb-4 w-[calc(100%-2rem)] bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
          + Ask Mshauri
        </button>
      </Link>
      <div className="px-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">Main</p>
        {FRONT_NAV.map(({ path, label, icon: Icon, testId }) => (
          <Link key={path} href={path} onClick={onNavigate}>
            <button data-testid={testId} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-gray-700 hover:bg-gray-50 text-left mb-0.5">
              <Icon className="w-4 h-4 text-gray-400" /> {label}
            </button>
          </Link>
        ))}
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1 mt-3">Admin</p>
        {BACK_NAV.map(({ path, label, icon: Icon, testId }) => (
          <Link key={path} href={path} onClick={onNavigate}>
            <button data-testid={testId} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-gray-700 hover:bg-gray-50 text-left mb-0.5">
              <Icon className="w-4 h-4 text-gray-400" /> {label}
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PastConversations() {
  const [location, setLocation] = useLocation();
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

  if (isLoading) return (
    <div className="space-y-1.5">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}
    </div>
  );

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-0.5 pb-4">
        {!conversations?.length ? (
          <p className="text-[11px] text-gray-400 px-2 py-3 text-center">No conversations yet</p>
        ) : (
          conversations.map((conv) => {
            const isActive = location === `/conversations/${conv.id}`;
            return (
              <Link key={conv.id} href={`/conversations/${conv.id}`}>
                <div
                  className={`group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                    isActive ? "bg-emerald-50" : "hover:bg-gray-50"
                  }`}
                  data-testid={`link-conversation-${conv.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare className={`w-3 h-3 shrink-0 ${isActive ? "text-[#15803d]" : "text-gray-400"}`} />
                    <div className="min-w-0">
                      <p className={`truncate text-[11px] font-semibold leading-tight ${isActive ? "text-[#15803d]" : "text-gray-700"}`}>
                        {conv.title || "New Conversation"}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`button-delete-conv-${conv.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove this conversation. This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => handleDelete(conv.id, e as React.MouseEvent)} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}
