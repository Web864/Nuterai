import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Leaf, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  profileQueryOptions,
  goalsQueryOptions,
  useUpdateProfile,
  useUpsertGoals,
} from "@/features/goals/queries";
import { calculateTargets } from "@/lib/nutrition";
import type { OnboardingData } from "./schemas";

import { StepBasics } from "./steps/StepBasics";
import { StepBiometrics } from "./steps/StepBiometrics";
import { StepActivity } from "./steps/StepActivity";
import { StepGoal } from "./steps/StepGoal";
import { StepDiet } from "./steps/StepDiet";
import { StepLifestyle } from "./steps/StepLifestyle";
import { StepReview } from "./steps/StepReview";

const DEFAULTS: Partial<OnboardingData> = {
  units: "metric",
  sex: "prefer_not_to_say",
  age: 30,
  height_cm: 170,
  current_weight_kg: 70,
  target_weight_kg: 68,
  activity_level: "moderate",
  fitness_goal: "improve_health",
  pace_kg_per_week: 0.5,
  diet_preference: "omnivore",
  allergies: [],
  medical_conditions: [],
  cooking_skill: "beginner",
  gym_access: "no_equipment",
  workout_experience: "beginner",
  stress_level: 5,
  smoking: false,
  alcohol: false,
};

const TITLES = [
  "The basics",
  "About your body",
  "How you move",
  "Your goal",
  "How you eat",
  "Your lifestyle",
  "Review your plan",
];

export function OnboardingWizard({
  userId,
  onComplete,
}: {
  userId: string;
  onComplete: () => void;
}) {
  const qc = useQueryClient();
  const profileQ = useQuery(profileQueryOptions(userId));
  const goalsQ = useQuery(goalsQueryOptions(userId));

  const initial = useMemo<Partial<OnboardingData>>(() => {
    const p = profileQ.data;
    const g = goalsQ.data;
    return {
      ...DEFAULTS,
      full_name: p?.full_name || p?.display_name || DEFAULTS.full_name || "",
      units: (p?.units as "metric" | "imperial") ?? DEFAULTS.units!,
      country: p?.country ?? "",
      sex: (g?.sex as OnboardingData["sex"]) ?? DEFAULTS.sex!,
      age: g?.age ?? DEFAULTS.age!,
      height_cm: g?.height_cm ? Number(g.height_cm) : DEFAULTS.height_cm!,
      current_weight_kg: g?.current_weight_kg
        ? Number(g.current_weight_kg)
        : DEFAULTS.current_weight_kg!,
      target_weight_kg: g?.target_weight_kg
        ? Number(g.target_weight_kg)
        : DEFAULTS.target_weight_kg!,
      activity_level:
        (g?.activity_level as OnboardingData["activity_level"]) ?? DEFAULTS.activity_level!,
      fitness_goal: (g?.fitness_goal as OnboardingData["fitness_goal"]) ?? DEFAULTS.fitness_goal!,
      pace_kg_per_week: g?.pace_kg_per_week
        ? Number(g.pace_kg_per_week)
        : DEFAULTS.pace_kg_per_week!,
      target_timeline_weeks: g?.target_timeline_weeks ?? undefined,
      diet_preference:
        (g?.diet_preference as OnboardingData["diet_preference"]) ?? DEFAULTS.diet_preference!,
      allergies: g?.allergies ?? [],
      medical_conditions: g?.medical_conditions ?? [],
      cooking_skill:
        (g?.cooking_skill as OnboardingData["cooking_skill"]) ?? DEFAULTS.cooking_skill!,
      wake_time: g?.wake_time ?? "07:00",
      sleep_time: g?.sleep_time ?? "23:00",
      gym_access: (g?.gym_access as OnboardingData["gym_access"]) ?? DEFAULTS.gym_access!,
      workout_experience:
        (g?.workout_experience as OnboardingData["workout_experience"]) ??
        DEFAULTS.workout_experience!,
      stress_level: g?.stress_level ?? DEFAULTS.stress_level!,
      smoking: g?.smoking ?? false,
      alcohol: g?.alcohol ?? false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQ.data, goalsQ.data]);

  const [data, setData] = useState<Partial<OnboardingData>>(initial);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Merge server data once it arrives
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && (profileQ.data || goalsQ.data)) {
    setData(initial);
    setHydrated(true);
  }

  const updateProfile = useUpdateProfile(userId);
  const upsertGoals = useUpsertGoals(userId);

  const totalSteps = 7;
  const progress = ((step + 1) / totalSteps) * 100;

  function patch(p: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...p }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }
  function prev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const targets = useMemo(() => {
    if (
      data.sex &&
      data.age &&
      data.height_cm &&
      data.current_weight_kg &&
      data.activity_level &&
      data.fitness_goal
    ) {
      return calculateTargets({
        sex: data.sex,
        age: data.age,
        heightCm: data.height_cm,
        weightKg: data.current_weight_kg,
        activity: data.activity_level,
        goal: data.fitness_goal,
        paceKgPerWeek: data.pace_kg_per_week,
      });
    }
    return null;
  }, [data]);

  async function finish() {
    if (!targets) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        full_name: data.full_name,
        display_name: data.full_name?.split(" ")[0] ?? data.full_name,
        units: data.units,
        country: data.country || null,
        onboarding_completed: true,
      });
      await upsertGoals.mutateAsync({
        sex: data.sex,
        age: data.age,
        height_cm: data.height_cm,
        current_weight_kg: data.current_weight_kg,
        target_weight_kg: data.target_weight_kg,
        activity_level: data.activity_level,
        fitness_goal: data.fitness_goal,
        pace_kg_per_week: data.pace_kg_per_week,
        target_timeline_weeks: data.target_timeline_weeks ?? null,
        diet_preference: data.diet_preference,
        allergies: data.allergies ?? [],
        medical_conditions: data.medical_conditions ?? [],
        cooking_skill: data.cooking_skill,
        gym_access: data.gym_access,
        workout_experience: data.workout_experience,
        wake_time: data.wake_time || null,
        sleep_time: data.sleep_time || null,
        stress_level: data.stress_level,
        smoking: data.smoking ?? false,
        alcohol: data.alcohol ?? false,
        bmr_kcal: targets.bmr,
        tdee_kcal: targets.tdee,
        daily_calorie_target: targets.calories,
        protein_g: targets.proteinG,
        carbs_g: targets.carbsG,
        fat_g: targets.fatG,
        fiber_g: targets.fiberG,
        water_target_ml: targets.waterMl,
      });
      await qc.invalidateQueries({ queryKey: ["profile", userId] });
      await qc.invalidateQueries({ queryKey: ["goals", userId] });
      toast.success("Your plan is ready!");
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const isLast = step === totalSteps - 1;
  const canProceed = validateStep(step, data);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4 sm:px-6">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              Step {step + 1} of {totalSteps} · {TITLES[step]}
            </p>
            <Progress value={progress} className="mt-1.5 h-1.5" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <Card className="rounded-3xl border-border/60 shadow-soft">
          <CardContent className="p-6 sm:p-10">
            {step === 0 && <StepBasics data={data} onChange={patch} />}
            {step === 1 && <StepBiometrics data={data} onChange={patch} />}
            {step === 2 && <StepActivity data={data} onChange={patch} />}
            {step === 3 && <StepGoal data={data} onChange={patch} />}
            {step === 4 && <StepDiet data={data} onChange={patch} />}
            {step === 5 && <StepLifestyle data={data} onChange={patch} />}
            {step === 6 && <StepReview data={data} targets={targets} />}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={prev}
            disabled={step === 0 || saving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {isLast ? (
            <Button
              size="lg"
              className="rounded-full"
              onClick={finish}
              disabled={!targets || saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Start my plan
            </Button>
          ) : (
            <Button size="lg" className="rounded-full" onClick={next} disabled={!canProceed}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function validateStep(step: number, d: Partial<OnboardingData>): boolean {
  switch (step) {
    case 0:
      return !!d.full_name && d.full_name.trim().length > 0 && !!d.units;
    case 1:
      return !!d.sex && !!d.age && !!d.height_cm && !!d.current_weight_kg && !!d.target_weight_kg;
    case 2:
      return !!d.activity_level;
    case 3:
      return !!d.fitness_goal && !!d.pace_kg_per_week;
    case 4:
      return !!d.diet_preference && !!d.cooking_skill;
    case 5:
      return !!d.gym_access && !!d.workout_experience && typeof d.stress_level === "number";
    default:
      return true;
  }
}
