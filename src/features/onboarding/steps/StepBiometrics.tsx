import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepHeader, OptionCard } from "./shared";
import type { OnboardingData } from "../schemas";

const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export function StepBiometrics({
  data,
  onChange,
}: {
  data: Partial<OnboardingData>;
  onChange: (p: Partial<OnboardingData>) => void;
}) {
  const isImperial = data.units === "imperial";

  const heightDisplay =
    isImperial && data.height_cm ? Math.round(data.height_cm / 2.54) : (data.height_cm ?? "");
  const weightDisplay =
    isImperial && data.current_weight_kg
      ? Math.round(data.current_weight_kg * 2.20462)
      : (data.current_weight_kg ?? "");
  const targetDisplay =
    isImperial && data.target_weight_kg
      ? Math.round(data.target_weight_kg * 2.20462)
      : (data.target_weight_kg ?? "");

  return (
    <div>
      <StepHeader
        eyebrow="Your body"
        title="Some numbers about you."
        description="These help us calculate your metabolism and calorie needs accurately."
      />

      <div className="space-y-6">
        <div>
          <Label className="mb-2 block">Sex assigned at birth</Label>
          <div className="grid grid-cols-2 gap-3">
            {SEX_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={data.sex === o.value}
                onClick={() => onChange({ sex: o.value })}
                title={o.label}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              inputMode="numeric"
              min={13}
              max={100}
              className="h-12"
              value={data.age ?? ""}
              onChange={(e) => onChange({ age: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height">Height ({isImperial ? "in" : "cm"})</Label>
            <Input
              id="height"
              type="number"
              inputMode="numeric"
              className="h-12"
              value={heightDisplay}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({ height_cm: isImperial ? Math.round(v * 2.54 * 10) / 10 : v });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight">Weight ({isImperial ? "lb" : "kg"})</Label>
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              className="h-12"
              value={weightDisplay}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({
                  current_weight_kg: isImperial ? Math.round((v / 2.20462) * 10) / 10 : v,
                });
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="target">Target weight ({isImperial ? "lb" : "kg"})</Label>
          <Input
            id="target"
            type="number"
            inputMode="decimal"
            step="0.1"
            className="h-12"
            value={targetDisplay}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({ target_weight_kg: isImperial ? Math.round((v / 2.20462) * 10) / 10 : v });
            }}
          />
          <p className="text-xs text-muted-foreground">
            Not sure? Set it to the same as your current weight — you can change this anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
