import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useSyncUser, useGetMe } from "@workspace/api-client-react";

import { Home } from "@/pages/Home";
import { Dashboard } from "@/pages/Dashboard";
import { Plans } from "@/pages/Plans";
import { Payment } from "@/pages/Payment";
import { Proxies } from "@/pages/Proxies";
import { Usage } from "@/pages/Usage";
import { Admin } from "@/pages/Admin";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(184, 100%, 50%)",
    colorBackground: "hsl(240, 10%, 4%)",
    colorInputBackground: "hsl(240, 3.7%, 15.9%)",
    colorText: "hsl(0, 0%, 98%)",
    colorTextSecondary: "hsl(240, 5%, 64.9%)",
    colorInputText: "hsl(0, 0%, 98%)",
    colorNeutral: "hsl(240, 5%, 64.9%)",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "border border-border shadow-lg rounded-2xl w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none border-t border-border",
    headerTitle: { color: "hsl(0, 0%, 98%)" },
    headerSubtitle: { color: "hsl(240, 5%, 64.9%)" },
    socialButtonsBlockButtonText: { color: "hsl(0, 0%, 98%)" },
    formFieldLabel: { color: "hsl(0, 0%, 98%)" },
    footerActionLink: { color: "hsl(184, 100%, 50%)" },
    footerActionText: { color: "hsl(240, 5%, 64.9%)" },
    dividerText: { color: "hsl(240, 5%, 64.9%)" },
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function GlobalAuthSync() {
  const { isSignedIn } = useUser();
  const syncUser = useSyncUser();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (isSignedIn && !hasSynced.current) {
      hasSynced.current = true;
      syncUser.mutate();
    }
  }, [isSignedIn, syncUser]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Component />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { data: user } = useGetMe();
  
  return (
    <>
      <Show when="signed-in">
        {user?.role === "admin" ? (
          <AppLayout>
            <Component />
          </AppLayout>
        ) : (
          <Redirect to="/dashboard" />
        )}
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <GlobalAuthSync />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/plans">
              <AppLayout>
                <Plans />
              </AppLayout>
            </Route>
            <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/payment"><ProtectedRoute component={Payment} /></Route>
            <Route path="/proxies"><ProtectedRoute component={Proxies} /></Route>
            <Route path="/usage"><ProtectedRoute component={Usage} /></Route>
            <Route path="/admin"><AdminRoute component={Admin} /></Route>
            <Route>
              <div className="flex h-screen items-center justify-center bg-background text-foreground">
                <h1 className="text-2xl font-bold">404 - Not Found</h1>
              </div>
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;