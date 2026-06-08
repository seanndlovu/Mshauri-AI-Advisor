import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  useListConversations, 
  useDeleteConversation,
  getListConversationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, Menu, Sprout, BookOpen, Users, TrendingUp, Radio, BarChart3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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

const NAV_ITEMS = [
  { path: "/knowledge-base", label: "Knowledge Base", icon: BookOpen, testId: "button-knowledge-base" },
  { path: "/farmers", label: "Farmers", icon: Users, testId: "button-farmers" },
  { path: "/market-prices", label: "Market Prices", icon: TrendingUp, testId: "button-market-prices" },
  { path: "/broadcasts", label: "Broadcasts", icon: Radio, testId: "button-broadcasts" },
  { path: "/analytics", label: "Analytics", icon: BarChart3, testId: "button-analytics" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r border-border bg-sidebar shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Sheet */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background z-10 shrink-0">
          <div className="flex items-center gap-2 font-medium text-primary">
            <Sprout className="w-5 h-5" />
            <span>Mhauri AI</span>
          </div>
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r-0">
              <SidebarContent onNavigate={() => setIsMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content Area */}
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

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex-shrink-0">
        <div className="hidden md:flex items-center gap-2 font-medium text-primary mb-6 px-2">
          <Sprout className="w-6 h-6" />
          <span className="text-lg">Mhauri AI</span>
        </div>
        <div className="flex flex-col gap-1">
          <Button 
            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg h-11 mb-1"
            onClick={() => {
              setLocation("/");
              if (onNavigate) onNavigate();
            }}
            data-testid="button-new-chat"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </Button>

          {NAV_ITEMS.map(({ path, label, icon: Icon, testId }) => {
            const isActive = location.startsWith(path);
            return (
              <Button
                key={path}
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-2 font-medium rounded-lg h-10 ${
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setLocation(path);
                  if (onNavigate) onNavigate();
                }}
                data-testid={testId}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-2 pt-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Past Conversations
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="flex flex-col gap-1 pb-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse mx-2" />
            ))
          ) : conversations?.length === 0 ? (
            <div className="text-sm text-muted-foreground px-4 py-6 text-center">
              No conversations yet. Start asking questions!
            </div>
          ) : (
            conversations?.map(conv => {
              const isActive = location === `/conversations/${conv.id}`;
              return (
                <Link key={conv.id} href={`/conversations/${conv.id}`} onClick={onNavigate}>
                  <div 
                    className={`group flex items-center justify-between p-2 md:p-3 rounded-lg cursor-pointer transition-colors ${
                      isActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-foreground hover:bg-muted/50"
                    }`}
                    data-testid={`link-conversation-${conv.id}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm">
                          {conv.title || "New Conversation"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-delete-conv-${conv.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
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
                            onClick={(e) => handleDelete(conv.id, e as any)}
                            className="bg-destructive hover:bg-destructive/90"
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
