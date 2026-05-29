import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck, Monitor } from "lucide-react";

interface LoginEvent {
  id: number;
  userId: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Unknown";
  if (/mobile/i.test(ua)) return "Mobile Browser";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  if (/edge/i.test(ua)) return "Edge";
  return "Browser";
}

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

function initials(first: string | null, last: string | null, email: string | null): string {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "OP";
}

function displayName(first: string | null, last: string | null, email: string | null): string {
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (email) return email;
  return "Unknown";
}

export default function AuditLog() {
  const { isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    if (user && user.role !== "admin") {
      navigate("/");
      return;
    }

    fetch("/api/audit-log", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ events: LoginEvent[] }>;
      })
      .then((data) => setEvents(data.events))
      .catch(() => setError("Failed to load audit log."))
      .finally(() => setFetching(false));
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-border/40 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono">
              PP
            </div>
            <h1 className="text-lg font-bold tracking-tight">Audit Log</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <ShieldCheck className="h-3.5 w-3.5" />
            Sign-in history
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {fetching ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm font-mono">
            Loading events…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-24 text-destructive text-sm font-mono">
            {error}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 opacity-30" />
            <p className="text-sm font-mono">No sign-in events recorded yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-0 text-xs font-mono text-muted-foreground bg-muted/30 border-b border-border/40 px-4 py-2.5">
              <span className="pr-4">User</span>
              <span />
              <span className="pr-6 hidden sm:block">IP Address</span>
              <span>Timestamp</span>
            </div>
            <div className="divide-y divide-border/30">
              {events.map((ev) => {
                const { date, time } = formatDate(ev.createdAt);
                const name = displayName(ev.firstName, ev.lastName, ev.email);
                const init = initials(ev.firstName, ev.lastName, ev.email);
                const browser = parseUserAgent(ev.userAgent);
                return (
                  <div
                    key={ev.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-0 items-center px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="pr-4">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={ev.profileImageUrl ?? undefined} alt={name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold font-mono">
                          {init}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ev.email && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:block">
                            {ev.email}
                          </span>
                        )}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono gap-1 hidden md:flex">
                          <Monitor className="h-2.5 w-2.5" />
                          {browser}
                        </Badge>
                      </div>
                    </div>
                    <div className="pr-6 hidden sm:block">
                      <span className="text-xs font-mono text-muted-foreground">
                        {ev.ip ?? "—"}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-foreground">{time}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
