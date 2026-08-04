import { StepHeader } from "./shared";
import type { OnboardingData } from "../schemas";
import type { CalculatedTargets } from "@/lib/nutrition";
import { Apple, Droplets, Flame, Utensils, Wheat } from "lucide-react";

export function StepReview({
  data,
  targets,
}: {
  data: Partial<OnboardingData>;
  targets: CalculatedTargets | null;
}) {
  if (!targets) {
    return (
      <div>
        <StepHeader
          title="Almost there"
          description="Please complete the previous steps to see your plan."
        />
      </div>
    );
  }

  const goalLabel = {
    lose_weight: "lose weight",
    maintain: "maintain your weight",
    gain_weight: "gain weight",
    build_muscle: "build muscle",
    improve_health: "improve your health",
    boost_energy: "boost your energy",
  }[data.fitness_goal ?? "improve_health"];

  return (
    <div>
      <StepHeader
        eyebrow="Your plan"
        title="Here's your personalized target."
        description={`Based on your body and lifestyle, this is what NutriAI recommends to help you ${goalLabel}.`}
      />

      <div className="rounded-3xl bg-gradient-hero p-8 text-primary-foreground shadow-hero">
        <p className="text-xs uppercase tracking-wider opacity-70">Daily calorie target</p>
        <p className="mt-2 font-display text-6xl">{targets.calories.toLocaleString()}</p>
        <p className="mt-1 text-sm opacity-80">
          kcal · maintenance {targets.tdee.toLocaleString()} kcal
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MacroTile
          icon={<Apple className="h-4 w-4" />}
          label="Protein"
          value={targets.proteinG}
          unit="g"
        />
        <MacroTile
          icon={<Utensils className="h-4 w-4" />}
          label="Carbs"
          value={targets.carbsG}
          unit="g"
        />
        <MacroTile icon={<Flame className="h-4 w-4" />} label="Fat" value={targets.fatG} unit="g" />
        <MacroTile
          icon={<Wheat className="h-4 w-4" />}
          label="Fiber"
          value={targets.fiberG}
          unit="g"
        />
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-secondary/50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
            <Droplets className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Daily water goal</p>
            <p className="font-display text-xl">{targets.waterMl.toLocaleString()} ml</p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        These targets are estimates using Mifflin–St Jeor. NutriAI will refine them based on your
        progress. Nothing here is medical advice.
      </p>
    </div>
  );
}

function MacroTile({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-2xl">
        {value}
        <span className="ml-1 text-sm font-sans font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}
