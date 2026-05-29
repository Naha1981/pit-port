import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BarChart2, Users, Zap, AlertTriangle } from "lucide-react";

interface UserStat {
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  total: number;
  last7Days: number;
  lastHour: number;
  reconciled: number;
  warnings: number;
  critical: number;
}

interface DailyStat {
  date: string;
  total: number;
  reconciled: number;
  warnings: number;
  critical: number;
}

interface Totals {
  total: number;
  totalUsers: number;
  avgVariance: number | null;
  today: number;
}

interface UsageData {
  totals: Totals;
  perUser: UserStat[];
  daily: DailyStat[];
  rateLimitCap: number;
}

function displayName(u: UserStat): string {
  if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
  if (u.firstName) return u.firstName;
  if (u.email) return u.email;
  return "Unknown";
}

function initials(u: UserStat): string {
  if (u.firstName && u.lastName) return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  if (u.firstName) return u.firstName.slice(0, 2).toUpperCase();
  if (u.email) return u.email.slice(0, 2).toUpperCase();
  return "??";
}

function RateLimitBar({ used, cap }: { used: number; cap: number }) {
  const pct = Math.min((used / cap) * 100, 100);
  const color = pct >= 90 ? "bg-destructive" : pct >= 60 ? "bg-yellow-500" : "bg-primary";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono tabular-nums ${pct >= 90 ? "text-destructive" : "text-muted-foreground"}`}>
        {used}/{cap}
      </span>
      {pct >= 90 && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const CHART_COLORS = { reconciled: "#22c55e", warnings: "#f59e0b", critical: "#ef4444" };

export default function AdminUsage() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState<UsageData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || (user && user.role !== "admin")) {
      navigate("/");
      return;
    }

    fetch("/api/admin/usage", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<UsageData>;
      })
      .then(setData)
      .catch(() => setError("Failed to load usage data."))
      .finally(() => setFetching(false));
  }, [isLoading, isAuthenticated, user, navigate]);

  const chartData = data?.daily.map((d) => ({
    date: formatDate(d.date),
    Reconciled: d.reconciled,
    Warnings: d.warnings,
    Critical: d.critical,
  })) ?? [];

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
            <h1 className="text-lg font-bold tracking-tight">Usage Dashboard</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <BarChart2 className="h-3.5 w-3.5" />
            Admin only
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        {fetching ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-24 text-destructive text-sm font-mono">{error}</div>
        ) : data ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Reconciliations", value: data.totals.total, icon: <BarChart2 className="h-4 w-4" />, sub: `${data.totals.today} today` },
                { label: "Active Users", value: data.totals.totalUsers, icon: <Users className="h-4 w-4" />, sub: "submitted ≥1 record" },
                { label: "Avg Variance", value: data.totals.avgVariance != null ? `${data.totals.avgVariance}%` : "—", icon: <Zap className="h-4 w-4" />, sub: "across all records" },
                { label: "Rate Limit Cap", value: `${data.rateLimitCap}/hr`, icon: <AlertTriangle className="h-4 w-4" />, sub: "per user" },
              ].map(({ label, value, icon, sub }) => (
                <Card key={label} className="bg-card/50 border-border/50">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
                      <span className="text-muted-foreground">{icon}</span>
                    </div>
                    <p className="text-2xl font-bold font-mono">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Daily volume chart */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Daily Volume — Last 14 Days</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground font-mono">
                    No reconciliation data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                        labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="Reconciled" stackId="a" fill={CHART_COLORS.reconciled} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Warnings" stackId="a" fill={CHART_COLORS.warnings} />
                      <Bar dataKey="Critical" stackId="a" fill={CHART_COLORS.critical} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Per-user table */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Per-User Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.perUser.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground font-mono">No records submitted yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40 text-xs font-mono text-muted-foreground">
                          <th className="text-left px-4 py-2.5 font-normal">User</th>
                          <th className="text-right px-4 py-2.5 font-normal">Total</th>
                          <th className="text-right px-4 py-2.5 font-normal hidden sm:table-cell">7 days</th>
                          <th className="text-left px-4 py-2.5 font-normal hidden md:table-cell">Rate (this hr)</th>
                          <th className="text-left px-4 py-2.5 font-normal hidden lg:table-cell">Outcome split</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {data.perUser.map((u, i) => {
                          const name = displayName(u);
                          const init = initials(u);
                          const successRate = u.total > 0 ? Math.round((u.reconciled / u.total) * 100) : 0;
                          return (
                            <tr key={u.userId ?? i} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-7 w-7 shrink-0">
                                    <AvatarImage src={u.profileImageUrl ?? undefined} alt={name} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold font-mono">
                                      {init}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{name}</p>
                                    {u.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono tabular-nums">{u.total}</td>
                              <td className="px-4 py-3 text-right font-mono tabular-nums hidden sm:table-cell">{u.last7Days}</td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <RateLimitBar used={u.lastHour} cap={data.rateLimitCap} />
                              </td>
                              <td className="px-4 py-3 hidden lg:table-cell">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-500 border-green-500/30 font-mono">
                                    {u.reconciled} OK
                                  </Badge>
                                  {u.warnings > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-yellow-500 border-yellow-500/30 font-mono">
                                      {u.warnings} WARN
                                    </Badge>
                                  )}
                                  {u.critical > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30 font-mono">
                                      {u.critical} CRIT
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground font-mono ml-1">{successRate}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
