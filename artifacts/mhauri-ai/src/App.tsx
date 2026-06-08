import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Conversation from "@/pages/Conversation";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Farmers from "@/pages/Farmers";
import MarketPrices from "@/pages/MarketPrices";
import Broadcasts from "@/pages/Broadcasts";
import Analytics from "@/pages/Analytics";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/conversations/:id" component={Conversation} />
        <Route path="/knowledge-base" component={KnowledgeBase} />
        <Route path="/farmers" component={Farmers} />
        <Route path="/market-prices" component={MarketPrices} />
        <Route path="/broadcasts" component={Broadcasts} />
        <Route path="/analytics" component={Analytics} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
