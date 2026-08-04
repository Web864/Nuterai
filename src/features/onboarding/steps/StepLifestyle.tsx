import { StepHeader, OptionCard } from "./shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { OnboardingData } from "../schemas";
import { Building2, Dumbbell, Home, Zap } from "lucide-react";

const GYM = [
  {
    value: "no_equipment",
    title: "No equipment",
    description: "Bodyweight at home",
    icon: <Home className="h-5 w-5" />,
  },
  {
    value: "basic_equipment",
    title: "Basic equipment",
    description: "Bands, dumbbells",
    icon: <Zap className="h-5 w-5" />,
  },
  {
    value: "home_gym",
    title: "Home gym",
    description: "Rack, bench, weights",
    icon: <Dumbbell className="h-5 w-5" />,
  },
  {
    value: "full_gym",
    title: "Full gym",
    description: "Commercial gym access",
    icon: <Building2 className="h-5 w-5" />,
  },
] as const;

const EXP = [
  { value: "none", title: "None" },
  { value: "beginner", title: "Beginner" },
  { value: "intermediate", title: "Intermediate" },
  { value: "advanced", title: "Advanced" },
] as const;

export function StepLifestyle({
  data,
  onChange,
}: {
  data: Partial<OnboardingData>;
  onChange: (p: Partial<OnboardingData>) => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Lifestyle"
        title="A few finishing touches."
        description="These help NutriAI schedule workouts, meals, and reminders around your day."
      />

      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wake">Usual wake time</Label>
            <Input
              id="wake"
              type="time"
              className="h-12"
              value={data.wake_time ?? "07:00"}
              onChange={(e) => onChange({ wake_time: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sleep">Usual bedtime</Label>
            <Input
              id="sleep"
              type="time"
              className="h-12"
              value={data.sleep_time ?? "23:00"}
              onChange={(e) => onChange({ sleep_time: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Where do you work out?</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {GYM.map((g) => (
              <OptionCard
                key={g.value}
                selected={data.gym_access === g.value}
                onClick={() => onChange({ gym_access: g.value })}
                title={g.title}
                description={g.description}
                icon={g.icon}
              />
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Workout experience</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {EXP.map((e) => (
              <OptionCard
                key={e.value}
                selected={data.workout_experience === e.value}
                onClick={() => onChange({ workout_experience: e.value })}
                title={e.title}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-secondary/60 p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <Label className="text-sm">Typical stress level</Label>
            <span className="font-display text-lg text-foreground">
              {data.stress_level ?? 5}/10
            </span>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[data.stress_level ?? 5]}
            onValueChange={(v) => onChange({ stress_level: v[0] })}
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Calm</span>
            <span>High</span>
          </div>
        </div>

        <div className="space-y-3">
          <ToggleRow
            label="I smoke"
            value={data.smoking ?? false}
            onChange={(v) => onChange({ smoking: v })}
          />
          <ToggleRow
            label="I drink alcohol"
            value={data.alcohol ?? false}
            onChange={(v) => onChange({ alcohol: v })}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
