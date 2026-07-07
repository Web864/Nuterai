import { z } from "zod";

export const step1Schema = z.object({
  full_name: z.string().min(1, "Please enter your name").max(80),
  units: z.enum(["metric", "imperial"]),
  country: z.string().max(80).optional().or(z.literal("")),
});

export const step2Schema = z.object({
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  age: z.number().int().min(13, "Must be at least 13").max(100),
  height_cm: z.number().min(100).max(230),
  current_weight_kg: z.number().min(30).max(300),
  target_weight_kg: z.number().min(30).max(300),
});

export const step3Schema = z.object({
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
});

export const step4Schema = z.object({
  fitness_goal: z.enum([
    "lose_weight",
    "maintain",
    "gain_weight",
    "build_muscle",
    "improve_health",
    "boost_energy",
  ]),
  pace_kg_per_week: z.number().min(0.1).max(1),
  target_timeline_weeks: z.number().int().min(2).max(104).optional(),
});

export const step5Schema = z.object({
  diet_preference: z.enum([
    "omnivore",
    "vegetarian",
    "vegan",
    "pescatarian",
    "halal",
    "kosher",
    "keto",
    "mediterranean",
    "low_carb",
    "high_protein",
  ]),
  allergies: z.array(z.string()),
  medical_conditions: z.array(z.string()),
  cooking_skill: z.enum(["none", "beginner", "intermediate", "advanced"]),
});

export const step6Schema = z.object({
  wake_time: z.string().optional(),
  sleep_time: z.string().optional(),
  gym_access: z.enum(["full_gym", "home_gym", "basic_equipment", "no_equipment"]),
  workout_experience: z.enum(["none", "beginner", "intermediate", "advanced"]),
  stress_level: z.number().int().min(1).max(10),
  smoking: z.boolean(),
  alcohol: z.boolean(),
});

export type OnboardingData = z.infer<typeof step1Schema> &
  z.infer<typeof step2Schema> &
  z.infer<typeof step3Schema> &
  z.infer<typeof step4Schema> &
  z.infer<typeof step5Schema> &
  z.infer<typeof step6Schema>;
