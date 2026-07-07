import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Route as AuthedRoute } from "./route";
import { profileQueryOptions, goalsQueryOptions } from "@/features/goals/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NutriAI" },
      { name: "robots", content: "noindex" },
    ],
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
        <p className="mt-1 text-muted-foreground">
          Update your profile and health goals anytime.
        </p>

        <div className="mt-8 space-y-4">
          <Card className="rounded-3xl border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-xl">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Field label="Name" value={profile.data?.display_name ?? profile.data?.full_name ?? "—"} />
              <Field label="Email" value={profile.data?.email ?? "—"} />
              <Field label="Units" value={(profile.data?.units ?? "metric") === "metric" ? "Metric (kg, cm)" : "Imperial (lb, in)"} />
              <Field label="Country" value={profile.data?.country ?? "—"} />
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
              <Field label="Current weight" value={goals.data?.current_weight_kg ? `${goals.data.current_weight_kg} kg` : "—"} />
              <Field label="Target weight" value={goals.data?.target_weight_kg ? `${goals.data.target_weight_kg} kg` : "—"} />
              <Field label="Height" value={goals.data?.height_cm ? `${goals.data.height_cm} cm` : "—"} />
              <Field label="Age" value={goals.data?.age?.toString() ?? "—"} />
              <Field label="Calories" value={goals.data?.daily_calorie_target ? `${goals.data.daily_calorie_target} kcal` : "—"} />
              <Field label="Water" value={goals.data?.water_target_ml ? `${goals.data.water_target_ml} ml` : "—"} />
            </CardContent>
          </Card>
        </div>
      </div>
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
