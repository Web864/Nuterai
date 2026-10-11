import { describe, expect, it } from "vitest";

import { normalizeExerciseName, resolveExerciseDetails } from "@/features/workout/exercise-library";

describe("exercise detail library", () => {
  it("resolves a known exercise to its canonical detail record", () => {
    const exercise = resolveExerciseDetails("Goblet Squat");

    expect(exercise).toMatchObject({
      id: "goblet-squat",
      name: "Goblet Squat",
      equipment: ["Dumbbell or kettlebell"],
      muscles: ["Quads", "Glutes", "Core"],
    });
  });

  it("normalizes case, whitespace, punctuation, and plural variations", () => {
    expect(normalizeExerciseName("  GOBLET-SQUATS  ")).toBe("goblet squats");
    expect(resolveExerciseDetails("  GOBLET-SQUATS  ")?.id).toBe("goblet-squat");
    expect(resolveExerciseDetails("push ups")?.id).toBe("push-up");
  });

  it("does not map an unknown exercise to a different exercise", () => {
    expect(resolveExerciseDetails("Moonwalk balance drill")).toBeUndefined();
  });

  it("provides the complete instructional fields for known exercises", () => {
    const exercise = resolveExerciseDetails("Glute Bridge");

    expect(exercise?.description).toBeTruthy();
    expect(exercise?.instructions.length).toBeGreaterThan(0);
    expect(exercise?.formTips.length).toBeGreaterThan(0);
    expect(exercise?.commonMistakes.length).toBeGreaterThan(0);
    expect(exercise?.beginnerModification).toBeTruthy();
    expect(exercise?.equipment.length).toBeGreaterThan(0);
    expect(exercise?.muscles.length).toBeGreaterThan(0);
  });

  it("leaves the workout plan's sets and reps data untouched", () => {
    const planExercise = Object.freeze({ name: "Goblet Squat", sets: 3, reps: "10" });
    const detail = resolveExerciseDetails(planExercise.name);

    expect(detail?.name).toBe("Goblet Squat");
    expect(planExercise).toEqual({ name: "Goblet Squat", sets: 3, reps: "10" });
  });
});
