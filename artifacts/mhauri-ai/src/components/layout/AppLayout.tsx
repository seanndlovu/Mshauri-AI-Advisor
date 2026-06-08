import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  useListConversations,
  useDeleteConversation,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Menu, BookOpen, Users, TrendingUp, Radio, BarChart3, MessageSquare, Trash2 } from "lucide-react";
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

const NAV_ITEMS = [
  { path: "/", label: "Feed", icon: "🌱", testId: "button-home" },
  { path: "/knowledge-base", label: "Knowledge Base", icon: "📚", testId: "button-knowledge-base" },
  { path: "/farmers", label: "Farmers", icon: "👤", testId: "button-farmers" },
  { path: "/market-prices", label: "Market Prices", icon: "💰", testId: "button-market-prices" },
  { path: "/broadcasts", label: "Broadcasts", icon: "📢", testId: "button-broadcasts" },
  { path: "/analytics", label: "Analytics", icon: "📊", testId: "button-analytics" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#DAE0E6] font-[Inter,system-ui,sans-serif]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#EDEFF1] shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#EDEFF1] bg-white z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">M</div>
            <span className="font-bold text-[#1c1c1c] text-base">Mshauri</span>
          </div>
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[#878A8C]">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-white border-r-0">
              <SidebarContent onNavigate={() => setIsMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location, setLocation] = useLocation();
  const { data: conversations, isLoading } = useListConversations();
  const deleteConversation = useDeleteConversation();
  const queryClient = useQueryClient();

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteConversation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    if (location === `/conversations/${id}`) {
      setLocation("/");
      if (onNavigate) onNavigate();
    }
  };

  const handleNav = (path: string) => {
    setLocation(path);
    if (onNavigate) onNavigate();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#EDEFF1] flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">M</div>
        <div>
          <div className="font-bold text-[#1c1c1c] text-base leading-none">Mshauri</div>
          <div className="text-[10px] text-[#878A8C] leading-none mt-0.5">AI Agricultural Assistant</div>
        </div>
      </div>

      {/* Ask CTA */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-full text-sm transition-colors"
          onClick={() => handleNav("/")}
          data-testid="button-new-chat"
        >
          + Ask a Question
        </button>
      </div>

      {/* Nav links */}
      <nav className="px-2 py-1 shrink-0">
        {NAV_ITEMS.map(({ path, label, icon, testId }) => {
          const isActive = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              data-testid={testId}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left ${
                isActive
                  ? "bg-[#F6F7F8] text-[#1c1c1c] font-bold"
                  : "text-[#1c1c1c] hover:bg-[#F6F7F8]"
              }`}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-1 border-t border-[#EDEFF1] shrink-0" />

      {/* Past conversations label */}
      <div className="px-5 py-1.5 text-[10px] font-semibold text-[#878A8C] uppercase tracking-wider shrink-0">
        Past Conversations
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1 px-2">
        <div className="flex flex-col gap-0.5 pb-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-[#F6F7F8] animate-pulse mx-1" />
            ))
          ) : conversations?.length === 0 ? (
            <div className="text-xs text-[#878A8C] px-3 py-4 text-center leading-relaxed">
              No conversations yet.
              <br />Start by asking a question!
            </div>
          ) : (
            conversations?.map((conv) => {
              const isActive = location === `/conversations/${conv.id}`;
              return (
                <Link key={conv.id} href={`/conversations/${conv.id}`} onClick={onNavigate}>
                  <div
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isActive ? "bg-[#F6F7F8] text-[#1c1c1c]" : "hover:bg-[#F6F7F8] text-[#1c1c1c]"
                    }`}
                    data-testid={`link-conversation-${conv.id}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 text-[#878A8C] shrink-0" />
                      <div className="flex flex-col overflow-hidden min-w-0">
                        <span className="truncate text-[12px] font-medium">
                          {conv.title || "New Conversation"}
                        </span>
                        <span className="text-[10px] text-[#878A8C]">
                          {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500 shrink-0 ml-1"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-delete-conv-${conv.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this conversation and all its messages. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => handleDelete(conv.id, e as React.MouseEvent)}
                            className="bg-red-500 hover:bg-red-600 text-white"
                          >
                            Delete
                          </AlertDialogAction>
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
    </div>
  );
}
