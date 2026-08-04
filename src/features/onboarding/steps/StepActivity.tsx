import { StepHeader, OptionCard } from "./shared";
import type { OnboardingData } from "../schemas";
import { Armchair, Bike, Dumbbell, Footprints, Zap } from "lucide-react";

const OPTIONS = [
  {
    value: "sedentary",
    title: "Sedentary",
    description: "Little or no exercise; desk job",
    icon: <Armchair className="h-5 w-5" />,
  },
  {
    value: "light",
    title: "Lightly active",
    description: "Light exercise 1–3 days/week",
    icon: <Footprints className="h-5 w-5" />,
  },
  {
    value: "moderate",
    title: "Moderately active",
    description: "Moderate exercise 3–5 days/week",
    icon: <Bike className="h-5 w-5" />,
  },
  {
    value: "active",
    title: "Active",
    description: "Hard exercise 6–7 days/week",
    icon: <Dumbbell className="h-5 w-5" />,
  },
  {
    value: "very_active",
    title: "Very active",
    description: "Intense training or physical job",
    icon: <Zap className="h-5 w-5" />,
  },
] as const;

export function StepActivity({
  data,
  onChange,
}: {
  data: Partial<OnboardingData>;
  onChange: (p: Partial<OnboardingData>) => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Movement"
        title="How active are you day to day?"
        description="Include your everyday activity — not just planned workouts."
      />
      <div className="grid gap-3">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            selected={data.activity_level === o.value}
            onClick={() => onChange({ activity_level: o.value })}
            title={o.title}
            description={o.description}
            icon={o.icon}
          />
        ))}
      </div>
    </div>
  );
}
