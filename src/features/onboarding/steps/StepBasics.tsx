import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepHeader, OptionCard } from "./shared";
import type { OnboardingData } from "../schemas";
import { Ruler, Scale } from "lucide-react";

export function StepBasics({
  data,
  onChange,
}: {
  data: Partial<OnboardingData>;
  onChange: (p: Partial<OnboardingData>) => void;
}) {
  return (
    <div>
      <StepHeader
        eyebrow="Welcome"
        title="Let's start with the basics."
        description="Tell us a little about yourself so we can personalize your NutriAI experience."
      />
      <div className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={data.full_name ?? ""}
            onChange={(e) => onChange({ full_name: e.target.value })}
            placeholder="Jane Doe"
            className="h-12"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="country">
            Country <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="country"
            value={data.country ?? ""}
            onChange={(e) => onChange({ country: e.target.value })}
            placeholder="United States"
            className="h-12"
          />
        </div>

        <div>
          <Label className="mb-2 block">Preferred units</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              selected={data.units === "metric"}
              onClick={() => onChange({ units: "metric" })}
              title="Metric"
              description="Kilograms, centimeters"
              icon={<Ruler className="h-5 w-5" />}
            />
            <OptionCard
              selected={data.units === "imperial"}
              onClick={() => onChange({ units: "imperial" })}
              title="Imperial"
              description="Pounds, inches"
              icon={<Scale className="h-5 w-5" />}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            We store everything in metric internally so switching later works seamlessly.
          </p>
        </div>
      </div>
    </div>
  );
}
