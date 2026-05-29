import { UploadForm } from "@/components/upload-form";
import { StatsCards } from "@/components/stats-cards";
import { HighRiskVehicles } from "@/components/high-risk-vehicles";
import { ReconciliationList } from "@/components/reconciliation-list";
import { useAuth } from "@workspace/replit-auth-web";
import { LogOut, User } from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ?? user?.email ?? "Operator";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-border/40 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono">
              PP
            </div>
            <h1 className="text-lg font-bold tracking-tight">Pit-to-Port Command</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="font-mono">{displayName}</span>
            </div>
            <div className="text-sm text-muted-foreground font-mono hidden md:block">
              {new Date().toISOString().split("T")[0]}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-md hover:bg-muted/50 transition-colors font-mono"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <StatsCards />
        <HighRiskVehicles />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <UploadForm />
          </div>
          <div className="lg:col-span-2">
            <ReconciliationList />
          </div>
        </div>
      </main>
    </div>
  );
}
