import { StepHeader, OptionCard } from "./shared";
import { Label } from "@/components/ui/label";
import type { OnboardingData } from "../schemas";
import { cn } from "@/lib/utils";
import { ChefHat } from "lucide-react";

const DIETS: ReadonlyArray<{ value: OnboardingData["diet_preference"]; title: string; description?: string }> = [
  { value: "omnivore", title: "Omnivore", description: "I eat everything" },
  { value: "vegetarian", title: "Vegetarian" },
  { value: "vegan", title: "Vegan" },
  { value: "pescatarian", title: "Pescatarian" },
  { value: "halal", title: "Halal" },
  { value: "kosher", title: "Kosher" },
  { value: "mediterranean", title: "Mediterranean" },
  { value: "keto", title: "Keto" },
  { value: "low_carb", title: "Low carb" },
  { value: "high_protein", title: "High protein" },
];

const COMMON_ALLERGIES = ["Peanuts", "Tree nuts", "Dairy", "Eggs", "Gluten", "Shellfish", "Soy", "Fish"];
const CONDITIONS = ["Diabetes", "PCOS", "Hypertension", "High cholesterol", "IBS", "Thyroid"];

const COOKING = [
  { value: "none", title: "I don't cook" },
  { value: "beginner", title: "Beginner" },
  { value: "intermediate", title: "Intermediate" },
  { value: "advanced", title: "Advanced" },
] as const;

export function StepDiet({
  data,
  onChange,
}: {
  data: Partial<OnboardingData>;
  onChange: (p: Partial<OnboardingData>) => void;
}) {
  function toggle(list: string[] | undefined, value: string): string[] {
    const arr = list ?? [];
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  return (
    <div>
      <StepHeader
        eyebrow="Food"
        title="How do you like to eat?"
        description="We'll only recommend foods that fit your preferences."
      />

      <div className="space-y-8">
        <div>
          <Label className="mb-2 block">Diet preference</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {DIETS.map((d) => (
              <OptionCard
                key={d.value}
                selected={data.diet_preference === d.value}
                onClick={() => onChange({ diet_preference: d.value })}
                title={d.title}
                description={d.description}
              />
            ))}
          </div>
        </div>

        <ChipGroup
          label="Allergies"
          options={COMMON_ALLERGIES}
          selected={data.allergies ?? []}
          onToggle={(v) => onChange({ allergies: toggle(data.allergies, v) })}
        />

        <ChipGroup
          label="Medical conditions to consider"
          options={CONDITIONS}
          selected={data.medical_conditions ?? []}
          onToggle={(v) => onChange({ medical_conditions: toggle(data.medical_conditions, v) })}
        />

        <div>
          <Label className="mb-2 block flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-muted-foreground" />
            Cooking skill
          </Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COOKING.map((c) => (
              <OptionCard
                key={c.value}
                selected={data.cooking_skill === c.value}
                onClick={() => onChange({ cooking_skill: c.value })}
                title={c.title}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const isOn = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-organic",
                isOn
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
