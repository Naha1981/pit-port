import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListReconciliationsQueryKey, type ReconciliationLog } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  log: ReconciliationLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResolveReconciliationDialog({ log, open, onOpenChange }: Props) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  async function handleResolve() {
    if (!log) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reconciliations/${log.id}/resolve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution_note: note.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ["listReconciliations"] });
      toast({ title: "Marked as resolved", description: `Record #${log.id} has been reviewed and resolved.` });
      setNote("");
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Failed to resolve", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleClose(o: boolean) {
    if (!loading) {
      setNote("");
      onOpenChange(o);
    }
  }

  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Resolve Critical Record
          </DialogTitle>
          <DialogDescription>
            Mark this record as manually reviewed. A resolution note is optional but recommended for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex-1 min-w-0">
              <p className="font-mono font-bold text-sm">{log.truck_reg}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Variance: {log.variance > 0 ? "+" : ""}{log.variance.toFixed(2)}%
              </p>
            </div>
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 shrink-0">
              {log.status}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resolution-note" className="text-sm">
              Resolution note <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="resolution-note"
              placeholder="e.g. Weight difference explained by moisture loss during transit. Verified with shipping manifest ref. SM-4821."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none bg-background/50 border-border/50 focus-visible:ring-primary text-sm"
              rows={4}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground font-mono">{note.length}/500 chars</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resolving…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Mark Resolved</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
