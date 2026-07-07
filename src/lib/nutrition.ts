/**
 * Nutrition math: BMR (Mifflin-St Jeor), TDEE, calorie targets, macros, water.
 * Pure functions — safe to import from client or server.
 */

export type Sex = "male" | "female" | "other" | "prefer_not_to_say";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal =
  | "lose_weight"
  | "maintain"
  | "gain_weight"
  | "build_muscle"
  | "improve_health"
  | "boost_energy";

const ACTIVITY_MULTIPLIER: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateAge(birthDateISO?: string | null): number | null {
  if (!birthDateISO) return null;
  const d = new Date(birthDateISO);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function bmrMifflinStJeor(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const { weightKg, heightCm, age, sex } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  // "other" / "prefer_not_to_say" -> average of male/female offsets
  if (sex === "male") return Math.round(base + 5);
  if (sex === "female") return Math.round(base - 161);
  return Math.round(base - 78);
}

export function tdee(bmr: number, activity: Activity): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIER[activity]);
}

export function calorieTargetForGoal(tdeeKcal: number, goal: Goal, paceKgPerWeek = 0.5): number {
  // 1 kg ≈ 7700 kcal → per-day deficit/surplus
  const dailyDelta = Math.round((paceKgPerWeek * 7700) / 7);
  switch (goal) {
    case "lose_weight":
      return Math.max(1200, tdeeKcal - dailyDelta);
    case "gain_weight":
    case "build_muscle":
      return tdeeKcal + Math.max(200, Math.round(dailyDelta * 0.7));
    default:
      return tdeeKcal;
  }
}

export function macroSplit(calories: number, goal: Goal, weightKg: number) {
  // Protein target: 1.6–2.2 g/kg based on goal
  const proteinPerKg = goal === "build_muscle" ? 2.2 : goal === "lose_weight" ? 2.0 : 1.6;
  const proteinG = Math.round(proteinPerKg * weightKg);
  const proteinKcal = proteinG * 4;

  // Fat: 25% of calories
  const fatKcal = Math.round(calories * 0.25);
  const fatG = Math.round(fatKcal / 9);

  // Carbs: the rest
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);

  const fiberG = Math.max(25, Math.round(calories / 1000) * 14);

  return { proteinG, carbsG, fatG, fiberG };
}

export function waterTargetMl(weightKg: number, activity: Activity): number {
  // 35 ml/kg baseline + 350 ml per activity tier above sedentary
  const tierBonus =
    { sedentary: 0, light: 350, moderate: 500, active: 700, very_active: 900 }[activity] ?? 0;
  return Math.round(35 * weightKg + tierBonus);
}

export interface CalculatedTargets {
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
}

export function calculateTargets(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activity: Activity;
  goal: Goal;
  paceKgPerWeek?: number;
}): CalculatedTargets {
  const bmr = bmrMifflinStJeor(input);
  const t = tdee(bmr, input.activity);
  const calories = calorieTargetForGoal(t, input.goal, input.paceKgPerWeek);
  const macros = macroSplit(calories, input.goal, input.weightKg);
  const waterMl = waterTargetMl(input.weightKg, input.activity);
  return { bmr, tdee: t, calories, ...macros, waterMl };
}
