import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, AlertTriangle, Gauge, CheckCheck, X } from "lucide-react";

interface Notification {
  id: number;
  type: string;
  message: string;
  metadata: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotifIcon({ type }: { type: string }) {
  if (type === "CRITICAL_RECONCILIATION")
    return <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
  return <Gauge className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />;
}

export function NotificationsBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(() => {
    fetch("/api/notifications", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.notifications) setNotifs(data.notifications);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifs.filter((n) => !n.read).length;

  async function markAllRead() {
    setMarking(true);
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        credentials: "include",
      });
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread > 0) markAllRead();
        }}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              {notifs.some((n) => !n.read) && (
                <button
                  onClick={markAllRead}
                  disabled={marking}
                  title="Mark all as read"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground font-mono">
                No notifications yet
              </div>
            ) : (
              notifs.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 transition-colors ${
                    !n.read ? "bg-muted/20" : ""
                  }`}
                >
                  <NotifIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{n.message}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
