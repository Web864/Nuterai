import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Route as AuthedRoute } from "./route";
import { profileQueryOptions, goalsQueryOptions } from "@/features/goals/queries";
import {
  publicProfileByIdQueryOptions,
  useUpdatePublicProfile,
  isUsernameAvailable,
} from "@/features/community/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { BillingPanel } from "@/features/billing/BillingPanel";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Settings — NutriAI" }, { name: "robots", content: "noindex" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { userId } = AuthedRoute.useRouteContext();
  const profile = useQuery(profileQueryOptions(userId));
  const goals = useQuery(goalsQueryOptions(userId));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 rounded-full">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="font-display text-4xl">Your account</h1>
        <p className="mt-1 text-muted-foreground">Update your profile and health goals anytime.</p>

        <div className="mt-8 space-y-4">
          <Card className="rounded-3xl border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-xl">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Field
                label="Name"
                value={profile.data?.display_name ?? profile.data?.full_name ?? "—"}
              />
              <Field label="Email" value={profile.data?.email ?? "—"} />
              <Field
                label="Units"
                value={
                  (profile.data?.units ?? "metric") === "metric"
                    ? "Metric (kg, cm)"
                    : "Imperial (lb, in)"
                }
              />
              <Field label="Country" value={profile.data?.country ?? "—"} />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/60 shadow-soft">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-display text-xl">Appearance</CardTitle>
              <ThemeToggle />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Choose light, dark, or match your device's setting.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/60 shadow-soft">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-display text-xl">Health goals</CardTitle>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/onboarding">
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Current weight"
                value={goals.data?.current_weight_kg ? `${goals.data.current_weight_kg} kg` : "—"}
              />
              <Field
                label="Target weight"
                value={goals.data?.target_weight_kg ? `${goals.data.target_weight_kg} kg` : "—"}
              />
              <Field
                label="Height"
                value={goals.data?.height_cm ? `${goals.data.height_cm} cm` : "—"}
              />
              <Field label="Age" value={goals.data?.age?.toString() ?? "—"} />
              <Field
                label="Calories"
                value={
                  goals.data?.daily_calorie_target ? `${goals.data.daily_calorie_target} kcal` : "—"
                }
              />
              <Field
                label="Water"
                value={goals.data?.water_target_ml ? `${goals.data.water_target_ml} ml` : "—"}
              />
            </CardContent>
          </Card>

          <PublicProfileCard userId={userId} />

          <Card className="rounded-3xl border-border/60 shadow-soft">
            <CardContent className="pt-6">
              <BillingPanel userId={userId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PublicProfileCard({ userId }: { userId: string }) {
  const pub = useQuery(publicProfileByIdQueryOptions(userId));
  const update = useUpdatePublicProfile(userId);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (pub.data) {
      setUsername(pub.data.username ?? "");
      setBio(pub.data.bio ?? "");
    }
  }, [pub.data]);

  async function save() {
    const handle = username.trim().toLowerCase();
    if (handle && !/^[a-z0-9_]{3,24}$/.test(handle)) {
      toast.error("Handle must be 3–24 characters: letters, numbers or underscore.");
      return;
    }
    if (bio.length > 300) {
      toast.error("Bio must be under 300 characters.");
      return;
    }
    try {
      if (handle && handle !== (pub.data?.username ?? "")) {
        const free = await isUsernameAvailable(handle, userId);
        if (!free) {
          toast.error("That handle is already taken.");
          return;
        }
      }
      await update.mutateAsync({ username: handle || null, bio: bio.trim() || null });
      toast.success("Public profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save profile");
    }
  }

  function toggle(
    key: "is_public" | "show_stats" | "show_achievements" | "allow_friend_requests",
    value: boolean,
  ) {
    update.mutate(
      { [key]: value },
      { onError: () => toast.error("Couldn't update privacy setting") },
    );
  }

  const p = pub.data;

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="font-display text-xl">Public profile & privacy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="handle">Handle</Label>
          <Input
            id="handle"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="yourname"
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            Used for your profile link: /u/{username || "yourname"}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A line about your goals"
            className="rounded-xl"
            rows={3}
          />
        </div>
        <Button onClick={save} disabled={update.isPending} className="rounded-full">
          {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save profile
        </Button>

        <div className="space-y-3 border-t border-border/40 pt-4">
          <ToggleRow
            label="Public profile"
            description="Let other athletes discover you and see your profile."
            checked={p?.is_public ?? true}
            onChange={(v) => toggle("is_public", v)}
          />
          <ToggleRow
            label="Show stats"
            description="Display level, XP and streaks on your profile and leaderboards."
            checked={p?.show_stats ?? true}
            onChange={(v) => toggle("show_stats", v)}
          />
          <ToggleRow
            label="Show achievements"
            description="Display unlocked badges on your profile."
            checked={p?.show_achievements ?? true}
            onChange={(v) => toggle("show_achievements", v)}
          />
          <ToggleRow
            label="Allow friend requests"
            description="Others can send you friend requests."
            checked={p?.allow_friend_requests ?? true}
            onChange={(v) => toggle("allow_friend_requests", v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
