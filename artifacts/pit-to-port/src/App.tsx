import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center">
        <div className="text-muted-foreground font-mono text-sm">Authenticating...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono text-lg">
            PP
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Pit-to-Port Command</h1>
            <p className="text-muted-foreground text-sm mt-1">Weighbridge Reconciliation System</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground max-w-xs">
            Operator access required. Sign in to view and manage reconciliation records.
          </p>
          <button
            onClick={login}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate>
            <Router />
          </AuthGate>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
