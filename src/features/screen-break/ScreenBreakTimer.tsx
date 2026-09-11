import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ENABLE_SCREEN_BREAK_REMINDERS } from "./screen-break.config";

export function ScreenBreakTimer({ durationSeconds = 20, onComplete, onCancel }: { durationSeconds?: number; onComplete?: () => void; onCancel?: () => void }) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const progress = useMemo(() => Math.max(0, Math.min(100, ((durationSeconds - remaining) / durationSeconds) * 100)), [durationSeconds, remaining]);

  useEffect(() => {
    if (!ENABLE_SCREEN_BREAK_REMINDERS) return;
    if (remaining <= 0) {
      onComplete?.();
      return;
    }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, onComplete]);

  if (!ENABLE_SCREEN_BREAK_REMINDERS) return null;

  return (
    <Card className="rounded-3xl border-border/60 bg-card/95 shadow-soft">
      <CardContent className="p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">Screen break</p>
        <p className="mt-3 font-display text-5xl text-foreground">{Math.max(0, remaining)}</p>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          Look away from the screen and focus on something in the distance.
        </p>
        <Progress value={progress} className="mt-5 h-2" />
        {remaining <= 0 ? (
          <p className="mt-4 text-sm font-medium text-foreground">Break complete. You can continue.</p>
        ) : (
          <Button variant="ghost" className="mt-4 rounded-xl" onClick={onCancel}>Close</Button>
        )}
      </CardContent>
    </Card>
  );
}
