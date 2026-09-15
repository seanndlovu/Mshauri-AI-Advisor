import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, UserProfile, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
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
import LegacyLogin from "@/pages/LegacyLogin";
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
import AdminStaff from "@/pages/AdminStaff";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/mshauri-logo.png`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#22c55e",
    colorForeground: "#e8f5e9",
    colorMutedForeground: "#7aad80",
    colorDanger: "#ef4444",
    colorBackground: "#0f1e0f",
    colorInput: "#111e11",
    colorInputForeground: "#e8f5e9",
    colorNeutral: "#2a4030",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0f1e0f] border border-[#1a3020] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: { color: "#e8f5e9", fontWeight: 900 },
    headerSubtitle: { color: "#9ccaa2" },
    socialButtonsBlockButtonText: { color: "#e8f5e9", fontWeight: 600 },
    formFieldLabel: { color: "#cde8d0" },
    footerActionLink: { color: "#4ade80", fontWeight: 700 },
    footerActionText: { color: "#9ccaa2" },
    dividerText: { color: "#9ccaa2" },
    identityPreviewEditButton: { color: "#4ade80" },
    formFieldSuccessText: { color: "#4ade80" },
    alertText: { color: "#fecaca" },
    logoBox: "h-20",
    logoImage: "h-16 w-16 object-contain",
    socialButtonsBlockButton: { borderColor: "#2a4030", backgroundColor: "#162616", color: "#e8f5e9" },
    formButtonPrimary: { backgroundColor: "#22c55e", color: "#ffffff", fontWeight: 700 },
    formFieldInput: { backgroundColor: "#111e11", borderColor: "#2a4030", color: "#e8f5e9" },
    footerAction: "bg-transparent",
    dividerLine: { backgroundColor: "#2a4030" },
    alert: { backgroundColor: "rgba(127, 29, 29, 0.4)", borderColor: "#991b1b" },
    otpCodeFieldInput: { backgroundColor: "#111e11", borderColor: "#2a4030", color: "#e8f5e9" },
    formFieldRow: { color: "#e8f5e9" },
    main: { color: "#e8f5e9" },
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const userId = user?.id ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      queryClient.clear();
    }
    previousUserId.current = userId;
  }), [addListener]);
  return null;
}

function AccountSecurity() {
  return (
    <div className="min-h-full overflow-y-auto bg-background p-4 md:p-8">
      <UserProfile routing="path" path={`${basePath}/account-security`} />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={Login} />
      <Route path="/sign-up/*?" component={Register} />
      <Route path="/legacy-sign-in" component={LegacyLogin} />
      <Route path="/login">{() => { window.location.replace(`${basePath}/sign-in`); return null; }}</Route>
      <Route path="/register">{() => { window.location.replace(`${basePath}/sign-up`); return null; }}</Route>
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
            <Route path="/admin/staff" component={AdminStaff} />
            <Route path="/account-security/*?" component={AccountSecurity} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        socialButtonsBlockButton: "Continue with {{provider|titleize}}",
        signIn: { start: { title: "Welcome back", subtitle: "Continue with Google or email" } },
        signUp: { start: { title: "Join Mshauri", subtitle: "Create an account with Google or email" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
