import { ChevronRight, Flame, Leaf, Utensils } from "lucide-react";

export type PhoneMockupScreen = "onboarding" | "plan" | "progress";

/** Decorative product illustration. All values are illustrative sample data. */
export function PhoneMockup({ screen }: { screen: PhoneMockupScreen }) {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-[178px] max-w-full rounded-[1.8rem] border-[5px] border-foreground/15 bg-card p-1.5 shadow-hero"
    >
      <div className="h-[282px] overflow-hidden rounded-[1.25rem] bg-foreground px-3 pb-3 text-background dark:bg-background dark:text-foreground">
        <div className="mx-auto mb-3 h-3 w-14 rounded-b-xl bg-background/15 dark:bg-foreground/15" />
        <div className="mb-4 flex items-center justify-between text-[9px] font-medium">
          <span className="flex items-center gap-1">
            <Leaf className="size-3" /> NutriAI
          </span>
          <span className="opacity-60">Example</span>
        </div>

        {screen === "onboarding" && (
          <>
            <p className="font-display text-lg leading-tight">Hi there!</p>
            <p className="mt-1 text-[11px] leading-4 opacity-75">Let&apos;s get to know you</p>
            <div className="mt-5 space-y-2">
              {["Your goals", "Dietary preferences", "Activity level"].map((label, i) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg border border-current/10 bg-background/10 px-2 py-3 text-[10px] dark:bg-card"
                >
                  <span className="opacity-50">0{i + 1}</span>
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="size-3 shrink-0 opacity-60" />
                </div>
              ))}
            </div>
          </>
        )}

        {screen === "plan" && (
          <>
            <p className="font-display text-lg">Your Plan</p>
            <div className="mt-2 flex gap-2 border-b border-current/15 pb-2 text-[9px]">
              <span className="font-semibold">Meals</span>
              <span className="opacity-60">Workouts</span>
              <span className="opacity-60">Habits</span>
            </div>
            <div className="mt-3 rounded-xl border border-current/10 bg-background/10 p-2.5 dark:bg-card">
              <div className="mb-2 flex h-12 items-center justify-center rounded-lg bg-primary/20">
                <Utensils className="size-6" />
              </div>
              <p className="text-[11px] font-semibold leading-4">Grilled Chicken Bowl</p>
              <p className="mt-1 text-[9px] leading-4 opacity-70">520 kcal · 32 g protein</p>
              <div className="mt-3 rounded-lg bg-primary py-2 text-center text-[10px] font-semibold text-primary-foreground">
                Add to plan
              </div>
            </div>
          </>
        )}

        {screen === "progress" && (
          <>
            <p className="font-display text-lg">Your Progress</p>
            <div className="mt-2 flex gap-3 text-[9px]">
              <span className="font-semibold">Week</span>
              <span className="opacity-60">Month</span>
              <span className="opacity-60">Year</span>
            </div>
            <div className="mt-4 flex h-20 items-end gap-1.5 border-b border-current/15 pb-2">
              {[35, 55, 45, 70, 60, 85, 75].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-primary"
                  style={{ height: `${height}%`, opacity: i === 6 ? 1 : 0.55 }}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-background/10 p-2 dark:bg-card">
                <p className="text-sm font-semibold">−2.5 kg</p>
                <p className="mt-1 text-[9px] opacity-65">Sample change</p>
              </div>
              <div className="rounded-lg bg-background/10 p-2 dark:bg-card">
                <p className="flex items-center gap-1 text-sm font-semibold">
                  <Flame className="size-3" /> 7 days
                </p>
                <p className="mt-1 text-[9px] opacity-65">Sample streak</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
