import { StepHeader, OptionCard } from "./shared";
import type { OnboardingData } from "../schemas";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Battery, Dumbbell, HeartPulse, Scale, TrendingDown, TrendingUp } from "lucide-react";

const GOALS = [
  { value: "lose_weight", title: "Lose weight", description: "Sustainable fat loss", icon: <TrendingDown className="h-5 w-5" /> },
  { value: "maintain", title: "Maintain", description: "Stay at my current weight", icon: <Scale className="h-5 w-5" /> },
  { value: "gain_weight", title: "Gain weight", description: "Healthy weight gain", icon: <TrendingUp className="h-5 w-5" /> },
  { value: "build_muscle", title: "Build muscle", description: "Grow strength & size", icon: <Dumbbell className="h-5 w-5" /> },
  { value: "improve_health", title: "Improve health", description: "Feel better overall", icon: <HeartPulse className="h-5 w-5" /> },
  { value: "boost_energy", title: "Boost energy", description: "Beat afternoon slumps", icon: <Battery className="h-5 w-5" /> },
] as const;

export function StepGoal({
  data,
  onChange,
}: {
  data: Partial<OnboardingData>;
  onChange: (p: Partial<OnboardingData>) => void;
}) {
  const showPace = data.fitness_goal === "lose_weight" || data.fitness_goal === "gain_weight" || data.fitness_goal === "build_muscle";
  return (
    <div>
      <StepHeader
        eyebrow="Your goal"
        title="What matters most to you?"
        description="You can adjust or switch this any time."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {GOALS.map((g) => (
          <OptionCard
            key={g.value}
            selected={data.fitness_goal === g.value}
            onClick={() => onChange({ fitness_goal: g.value })}
            title={g.title}
            description={g.description}
            icon={g.icon}
          />
        ))}
      </div>

      {showPace && (
        <div className="mt-8 rounded-2xl bg-secondary/60 p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <Label className="text-sm">Weekly pace</Label>
            <span className="font-display text-lg text-foreground">
              {(data.pace_kg_per_week ?? 0.5).toFixed(2)} kg/week
            </span>
          </div>
          <Slider
            min={0.1}
            max={1}
            step={0.05}
            value={[data.pace_kg_per_week ?? 0.5]}
            onValueChange={(v) => onChange({ pace_kg_per_week: v[0] })}
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Gentle</span>
            <span>Recommended</span>
            <span>Aggressive</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            A sustainable pace is 0.25–0.75 kg per week. Faster loss can affect energy and muscle mass.
          </p>
        </div>
      )}
    </div>
  );
}
