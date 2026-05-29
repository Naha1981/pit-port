import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteReconciliation, ReconciliationLog, getListReconciliationsQueryKey, getGetReconciliationStatsQueryKey } from "@workspace/api-client-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export function DeleteReconciliationDialog({ 
  log, 
  open, 
  onOpenChange 
}: { 
  log: ReconciliationLog | null, 
  open: boolean, 
  onOpenChange: (open: boolean) => void 
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useDeleteReconciliation({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Log Deleted",
          description: "Reconciliation log removed successfully.",
        });
        queryClient.invalidateQueries({ queryKey: getListReconciliationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetReconciliationStatsQueryKey() });
        onOpenChange(false);
      },
      onError: (err) => {
        toast({
          title: "Delete Failed",
          description: err.data?.error || err.message || "Failed to delete log.",
          variant: "destructive"
        });
      }
    }
  });

  const handleDelete = () => {
    if (!log) return;
    deleteMutation.mutate({ id: log.id });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the reconciliation log for truck {log?.truck_reg}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => { e.preventDefault(); handleDelete(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Record"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
