import { UploadForm } from "@/components/upload-form";
import { StatsCards } from "@/components/stats-cards";
import { HighRiskVehicles } from "@/components/high-risk-vehicles";
import { ReconciliationList } from "@/components/reconciliation-list";
import { useAuth } from "@workspace/replit-auth-web";
import { LogOut, User, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ?? user?.email ?? "Operator";

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.firstName
        ? user.firstName.slice(0, 2).toUpperCase()
        : user?.email
          ? user.email.slice(0, 2).toUpperCase()
          : "OP";

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

          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground font-mono hidden md:block">
              {new Date().toISOString().split("T")[0]}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={user?.profileImageUrl ?? undefined} alt={displayName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold font-mono">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    {user?.email && (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="gap-2 text-muted-foreground cursor-default">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-xs font-mono">Operator</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/audit-log")}
                  className="gap-2 cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Audit Log</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
