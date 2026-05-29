import { useLocation } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center px-4">
        <div className="w-12 h-12 rounded bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted/50 transition-colors font-mono"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
