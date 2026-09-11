import { useQuery } from "@tanstack/react-query";
import { Bell, Clock, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ENABLE_SCREEN_BREAK_REMINDERS } from "./screen-break.config";
import { screenBreakSettingsQueryOptions, useUpdateScreenBreakSettings } from "./screen-break.service";

export function ScreenBreakSettingsCard({ userId }: { userId: string }) {
  const settings = useQuery(screenBreakSettingsQueryOptions(userId));
  const update = useUpdateScreenBreakSettings(userId);

  if (!ENABLE_SCREEN_BREAK_REMINDERS) return null;
  const value = settings.data;
  if (!value) return null;

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Smartphone className="h-5 w-5 text-accent" /> Screen Break Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div><p className="font-medium">Enable screen breaks</p><p className="text-sm text-muted-foreground">Remind yourself to look away after active phone use.</p></div>
          <Switch checked={value.enabled} onCheckedChange={(enabled) => update.mutate({ enabled })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Break after</Label><Input className="mt-1" type="number" min={10} max={120} value={value.intervalMinutes} onChange={(e) => update.mutate({ intervalMinutes: Number(e.target.value) })} /></div>
          <div><Label>Break duration</Label><Input className="mt-1" type="number" min={10} max={300} value={value.breakDurationSeconds} onChange={(e) => update.mutate({ breakDurationSeconds: Number(e.target.value) })} /></div>
        </div>
        <div>
          <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Active hours</Label>
          <div className="mt-2 flex gap-2"><Input type="time" value={value.activeStartTime} onChange={(e) => update.mutate({ activeStartTime: e.target.value })} /><Input type="time" value={value.activeEndTime} onChange={(e) => update.mutate({ activeEndTime: e.target.value })} /></div>
        </div>
        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">System-wide tracking</span><Button variant="outline" className="rounded-xl" disabled><Bell className="mr-2 h-4 w-4" /> Permission status</Button></div>
      </CardContent>
    </Card>
  );
}
