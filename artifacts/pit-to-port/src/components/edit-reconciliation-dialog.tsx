import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateReconciliation, ReconciliationLog, getListReconciliationsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function EditReconciliationDialog({ 
  log, 
  open, 
  onOpenChange 
}: { 
  log: ReconciliationLog | null, 
  open: boolean, 
  onOpenChange: (open: boolean) => void 
}) {
  const [truckReg, setTruckReg] = useState("");
  const [mineWeight, setMineWeight] = useState("");
  const [portWeight, setPortWeight] = useState("");
  const [consignment, setConsignment] = useState("");
  const [portRef, setPortRef] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useUpdateReconciliation({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Log Updated",
          description: "Reconciliation log corrected successfully.",
        });
        queryClient.invalidateQueries({ queryKey: getListReconciliationsQueryKey() });
        onOpenChange(false);
      },
      onError: (err) => {
        toast({
          title: "Update Failed",
          description: err.data?.error || err.message || "Failed to update log.",
          variant: "destructive"
        });
      }
    }
  });

  // Initialize form when log changes
  React.useEffect(() => {
    if (log) {
      setTruckReg(log.truck_reg);
      setMineWeight(log.mine_net_weight.toString());
      setPortWeight(log.port_net_weight.toString());
      setConsignment(log.consignment_note || "");
      setPortRef(log.port_reference || "");
    }
  }, [log]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!log) return;

    updateMutation.mutate({
      id: log.id,
      data: {
        truck_reg: truckReg,
        mine_net_weight: Number(mineWeight),
        port_net_weight: Number(portWeight),
        consignment_note: consignment || null,
        port_reference: portRef || null,
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Correct Reconciliation</DialogTitle>
          <DialogDescription>
            Make human corrections to the extracted values. Status and variance will be recalculated automatically.
            {log?.corrected_by && (
              <span className="block mt-1 text-amber-500/80 text-xs">
                Previously corrected by {log.corrected_by}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Truck Registration</Label>
              <Input value={truckReg} onChange={e => setTruckReg(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Consignment Note</Label>
              <Input value={consignment} onChange={e => setConsignment(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mine Net Weight (t)</Label>
              <Input type="number" step="0.01" value={mineWeight} onChange={e => setMineWeight(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Port Net Weight (t)</Label>
              <Input type="number" step="0.01" value={portWeight} onChange={e => setPortWeight(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Port Reference</Label>
              <Input value={portRef} onChange={e => setPortRef(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Corrections"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
