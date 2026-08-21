import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Conversation from "@/pages/Conversation";
import Farmers from "@/pages/Farmers";
import MarketPrices from "@/pages/MarketPrices";
import Broadcasts from "@/pages/Broadcasts";
import Analytics from "@/pages/Analytics";
import Feed from "@/pages/Feed";
import Communities from "@/pages/Communities";
import CommunityFeed from "@/pages/CommunityFeed";
import PostDetail from "@/pages/PostDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import Weather from "@/pages/Weather";
import WhatsApp from "@/pages/WhatsApp";
import Rules from "@/pages/Rules";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import AiDisclaimer from "@/pages/AiDisclaimer";
import CookiePolicy from "@/pages/CookiePolicy";
import Magazine from "@/pages/Magazine";
import AdminMarketPrices from "@/pages/AdminMarketPrices";
import AdminAds from "@/pages/AdminAds";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/ask" component={Home} />
            <Route path="/feed" component={Feed} />
            <Route path="/magazine" component={Magazine} />
            <Route path="/conversations/:id" component={Conversation} />
            <Route path="/communities" component={Communities} />
            <Route path="/communities/:slug" component={CommunityFeed} />
            <Route path="/posts/:id" component={PostDetail} />
            <Route path="/prices" component={MarketPrices} />
            <Route path="/weather" component={Weather} />
            <Route path="/whatsapp" component={WhatsApp} />
            <Route path="/profile" component={Profile} />
            <Route path="/me" component={Profile} />
            <Route path="/rules" component={Rules} />
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route path="/ai-disclaimer" component={AiDisclaimer} />
            <Route path="/cookies" component={CookiePolicy} />
            <Route path="/farmers" component={Farmers} />
            <Route path="/market-prices" component={MarketPrices} />
            <Route path="/broadcasts" component={Broadcasts} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/admin/market-prices" component={AdminMarketPrices} />
            <Route path="/admin/ads" component={AdminAds} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
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
