import React, { useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { useReconcileDocuments, getListReconciliationsQueryKey, getGetReconciliationStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export function UploadForm() {
  const [mineFile, setMineFile] = useState<File | null>(null);
  const [portFile, setPortFile] = useState<File | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const reconcileMutation = useReconcileDocuments({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Reconciliation Complete",
          description: "Documents processed successfully.",
        });
        setMineFile(null);
        setPortFile(null);
        // Refresh lists and stats
        queryClient.invalidateQueries({ queryKey: getListReconciliationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetReconciliationStatsQueryKey() });
      },
      onError: (err) => {
        toast({
          title: "Reconciliation Failed",
          description: err.error?.error || "Failed to process documents.",
          variant: "destructive"
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mineFile || !portFile) return;

    reconcileMutation.mutate({
      data: {
        mine_slip: mineFile,
        port_slip: portFile
      }
    });
  };

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-primary" />
          New Reconciliation
        </CardTitle>
        <CardDescription>
          Upload mine departure slip and port arrival receipt for automatic compliance checking.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-muted-foreground text-sm font-medium uppercase tracking-wider">Mine Departure Slip</Label>
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => setMineFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={reconcileMutation.isPending}
                />
                <div className={`p-4 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center transition-colors ${mineFile ? 'border-primary bg-primary/5' : 'border-border bg-muted/50 hover:bg-muted'}`}>
                  {mineFile ? (
                    <>
                      <FileText className="h-8 w-8 text-primary mb-2" />
                      <p className="text-sm font-medium text-foreground truncate w-full max-w-[200px]">{mineFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(mineFile.size / 1024).toFixed(1)} KB</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">Click or drag file here</p>
                      <p className="text-xs text-muted-foreground">PDF or Image</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-muted-foreground text-sm font-medium uppercase tracking-wider">Port Arrival Receipt</Label>
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => setPortFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={reconcileMutation.isPending}
                />
                <div className={`p-4 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center transition-colors ${portFile ? 'border-primary bg-primary/5' : 'border-border bg-muted/50 hover:bg-muted'}`}>
                  {portFile ? (
                    <>
                      <FileText className="h-8 w-8 text-primary mb-2" />
                      <p className="text-sm font-medium text-foreground truncate w-full max-w-[200px]">{portFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(portFile.size / 1024).toFixed(1)} KB</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">Click or drag file here</p>
                      <p className="text-xs text-muted-foreground">PDF or Image</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold"
            disabled={!mineFile || !portFile || reconcileMutation.isPending}
          >
            {reconcileMutation.isPending ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                Processing via AI (approx. 5s)...
              </span>
            ) : (
              "Process Documents"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
