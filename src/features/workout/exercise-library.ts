export type ExerciseDetails = {
  id: string;
  name: string;
  aliases: readonly string[];
  description: string;
  instructions: readonly string[];
  formTips: readonly string[];
  commonMistakes: readonly string[];
  beginnerModification: string;
  equipment: readonly string[];
  muscles: readonly string[];
};

type ExerciseDefinition = Omit<ExerciseDetails, "aliases"> & { aliases?: readonly string[] };

function defineExercise(exercise: ExerciseDefinition): ExerciseDetails {
  return { aliases: [], ...exercise };
}

export const EXERCISE_LIBRARY: readonly ExerciseDetails[] = [
  defineExercise({
    id: "goblet-squat",
    name: "Goblet Squat",
    aliases: ["dumbbell goblet squat", "kettlebell goblet squat"],
    description: "A squat variation that uses a weight held close to the chest.",
    instructions: [
      "Stand with feet about shoulder-width apart and hold the weight close to your chest.",
      "Brace your midsection and keep your chest comfortably tall.",
      "Bend at the hips and knees to lower with control.",
      "Press through your whole foot to stand tall again.",
    ],
    formTips: [
      "Keep your back neutral.",
      "Let your knees track in the same direction as your toes.",
    ],
    commonMistakes: [
      "Letting the weight drift away from the chest.",
      "Letting the knees collapse inward.",
    ],
    beginnerModification:
      "Practice a bodyweight squat to a comfortable depth before adding weight.",
    equipment: ["Dumbbell or kettlebell"],
    muscles: ["Quads", "Glutes", "Core"],
  }),
  defineExercise({
    id: "bodyweight-squat",
    name: "Bodyweight Squat",
    aliases: ["air squat", "squat"],
    description: "A foundational lower-body movement using only your bodyweight.",
    instructions: [
      "Stand with feet about shoulder-width apart.",
      "Reach your hips back and bend your knees to lower under control.",
      "Keep your feet planted and chest comfortably upright.",
      "Push through your feet to return to standing.",
    ],
    formTips: [
      "Move only through a comfortable range.",
      "Keep your knees tracking with your toes.",
    ],
    commonMistakes: ["Lifting the heels.", "Rounding the back at the bottom."],
    beginnerModification: "Use a chair behind you as a target, pausing gently before standing.",
    equipment: ["None"],
    muscles: ["Quads", "Glutes"],
  }),
  defineExercise({
    id: "push-up",
    name: "Push-up",
    aliases: ["pushup", "press up", "floor push up"],
    description: "A bodyweight pressing exercise for the chest, shoulders, and arms.",
    instructions: [
      "Start with hands under or slightly wider than your shoulders.",
      "Make a straight line from your head through your hips.",
      "Lower your chest toward the floor with control.",
      "Press the floor away to return to the starting position.",
    ],
    formTips: [
      "Keep the ribs and hips moving together.",
      "Keep elbows angled slightly back rather than flared wide.",
    ],
    commonMistakes: ["Letting the hips sag or lift too high.", "Rushing the lowering phase."],
    beginnerModification: "Perform the movement with hands on a sturdy elevated surface.",
    equipment: ["None"],
    muscles: ["Chest", "Triceps", "Shoulders", "Core"],
  }),
  defineExercise({
    id: "glute-bridge",
    name: "Glute Bridge",
    aliases: ["hip bridge", "bodyweight glute bridge"],
    description: "A floor exercise that trains hip extension and glute control.",
    instructions: [
      "Lie on your back with knees bent and feet flat on the floor.",
      "Brace gently and press through your feet.",
      "Lift your hips until your body forms a comfortable line from shoulders to knees.",
      "Lower slowly and reset before the next repetition.",
    ],
    formTips: [
      "Keep your ribs from flaring upward.",
      "Pause briefly at the top without over-arching the lower back.",
    ],
    commonMistakes: [
      "Pushing mostly through the toes.",
      "Using lower-back arching instead of hip movement.",
    ],
    beginnerModification: "Use a smaller range of motion and pause between repetitions.",
    equipment: ["None"],
    muscles: ["Glutes", "Hamstrings", "Core"],
  }),
  defineExercise({
    id: "reverse-lunge",
    name: "Reverse Lunge",
    aliases: ["backward lunge", "rear lunge"],
    description: "A single-leg lower-body movement performed by stepping backward.",
    instructions: [
      "Stand tall with feet about hip-width apart.",
      "Step one foot back and lower both knees with control.",
      "Keep your front foot planted and torso steady.",
      "Press through the front foot to return to standing.",
    ],
    formTips: [
      "Use a step length that feels balanced.",
      "Keep the front knee tracking with the toes.",
    ],
    commonMistakes: [
      "Taking a very short step and losing balance.",
      "Letting the front knee collapse inward.",
    ],
    beginnerModification: "Hold a stable support lightly while practicing the movement.",
    equipment: ["None"],
    muscles: ["Quads", "Glutes", "Hamstrings"],
  }),
  defineExercise({
    id: "step-up",
    name: "Step-up",
    aliases: ["step up", "box step up"],
    description: "A controlled single-leg exercise using a stable step or platform.",
    instructions: [
      "Place one whole foot on a stable step.",
      "Press through that foot to stand on the step.",
      "Stand tall with control, then step down slowly.",
      "Complete the planned repetitions before switching sides when appropriate.",
    ],
    formTips: [
      "Choose a step height you can control.",
      "Keep the working knee aligned with the toes.",
    ],
    commonMistakes: ["Pushing excessively from the trailing foot.", "Using an unstable platform."],
    beginnerModification: "Use a low step and hold a rail or wall lightly for balance.",
    equipment: ["Stable step or box"],
    muscles: ["Quads", "Glutes", "Calves"],
  }),
  defineExercise({
    id: "dumbbell-row",
    name: "Dumbbell Row",
    aliases: ["one arm dumbbell row", "single arm dumbbell row", "bent over dumbbell row"],
    description: "A pulling movement that trains the upper back one side at a time.",
    instructions: [
      "Support yourself on a stable surface or hinge with a neutral back.",
      "Let the dumbbell hang under your shoulder.",
      "Pull your elbow toward your hip without twisting your torso.",
      "Lower the weight with control.",
    ],
    formTips: [
      "Keep your neck relaxed and back neutral.",
      "Move the elbow instead of shrugging the shoulder.",
    ],
    commonMistakes: [
      "Rotating the torso to lift the weight.",
      "Using momentum instead of a controlled pull.",
    ],
    beginnerModification:
      "Use a lighter dumbbell and support both hands on an incline bench when available.",
    equipment: ["Dumbbell", "Stable bench or chair optional"],
    muscles: ["Upper back", "Lats", "Biceps"],
  }),
  defineExercise({
    id: "plank",
    name: "Plank",
    aliases: ["forearm plank", "front plank"],
    description: "An isometric core exercise performed while holding a stable body position.",
    instructions: [
      "Place forearms on the floor with elbows below your shoulders.",
      "Step your feet back and create a straight line from head to heels.",
      "Brace your abdomen and breathe steadily.",
      "Hold for the planned time while maintaining control.",
    ],
    formTips: [
      "Keep your gaze down and neck long.",
      "Stop the hold when form changes significantly.",
    ],
    commonMistakes: ["Letting the hips sag.", "Holding the breath."],
    beginnerModification: "Perform the plank with knees on the floor.",
    equipment: ["None"],
    muscles: ["Core", "Shoulders"],
  }),
  defineExercise({
    id: "dead-bug",
    name: "Dead Bug",
    aliases: ["deadbug"],
    description: "A controlled core exercise that coordinates opposite arms and legs.",
    instructions: [
      "Lie on your back with arms toward the ceiling and knees bent above your hips.",
      "Gently brace your abdomen.",
      "Slowly extend the opposite arm and leg only as far as you can control.",
      "Return to start and alternate sides.",
    ],
    formTips: [
      "Move slowly and breathe normally.",
      "Keep the movement range comfortable and controlled.",
    ],
    commonMistakes: ["Moving too quickly.", "Letting the ribs flare as the limbs extend."],
    beginnerModification: "Move only one limb at a time.",
    equipment: ["None"],
    muscles: ["Core", "Hip flexors"],
  }),
  defineExercise({
    id: "bird-dog",
    name: "Bird Dog",
    aliases: ["bird dog exercise", "quadruped reach"],
    description: "A hands-and-knees core stability exercise using opposite arm and leg reaches.",
    instructions: [
      "Start on hands and knees with hands below shoulders and knees below hips.",
      "Brace gently without holding your breath.",
      "Reach one arm forward and the opposite leg back.",
      "Return with control and alternate sides.",
    ],
    formTips: [
      "Keep hips level as you reach.",
      "Move slowly instead of reaching as far as possible.",
    ],
    commonMistakes: ["Twisting the torso.", "Looking up and straining the neck."],
    beginnerModification: "Lift one arm or one leg at a time.",
    equipment: ["None"],
    muscles: ["Core", "Glutes", "Shoulders"],
  }),
  defineExercise({
    id: "romanian-deadlift",
    name: "Romanian Deadlift",
    aliases: ["rdl", "dumbbell romanian deadlift", "barbell romanian deadlift"],
    description: "A hip-hinge exercise that emphasizes the back of the legs.",
    instructions: [
      "Stand tall holding the weight close to your legs.",
      "Soften your knees and send your hips backward.",
      "Lower the weight while keeping it close and your back neutral.",
      "Drive your hips forward to stand tall.",
    ],
    formTips: [
      "Think hips back rather than squatting down.",
      "Keep the weight close to your body.",
    ],
    commonMistakes: ["Rounding the back.", "Turning the movement into a deep knee bend."],
    beginnerModification: "Practice the hip hinge without weight before adding a light dumbbell.",
    equipment: ["Dumbbells or barbell"],
    muscles: ["Hamstrings", "Glutes", "Back"],
  }),
  defineExercise({
    id: "dumbbell-bench-press",
    name: "Dumbbell Bench Press",
    aliases: ["dumbbell chest press", "bench press", "chest press"],
    description:
      "A horizontal pressing movement performed with dumbbells on a stable bench or floor.",
    instructions: [
      "Lie on a stable bench or floor with dumbbells above your chest.",
      "Lower the weights under control with elbows angled slightly down.",
      "Press the dumbbells back up without locking out forcefully.",
      "Reset your shoulder position before the next repetition.",
    ],
    formTips: [
      "Keep shoulders comfortably set against the bench or floor.",
      "Use a range you can control.",
    ],
    commonMistakes: [
      "Dropping the weights too quickly.",
      "Flaring elbows straight out to the sides.",
    ],
    beginnerModification: "Perform a floor press with light dumbbells.",
    equipment: ["Dumbbells", "Bench optional"],
    muscles: ["Chest", "Triceps", "Shoulders"],
  }),
  defineExercise({
    id: "overhead-press",
    name: "Overhead Press",
    aliases: ["shoulder press", "dumbbell shoulder press", "dumbbell overhead press"],
    description: "A vertical pressing movement for the shoulders and arms.",
    instructions: [
      "Stand or sit tall with weights at shoulder height.",
      "Brace gently and press the weights overhead along a controlled path.",
      "Finish with your head in a neutral position.",
      "Lower the weights back to shoulder height with control.",
    ],
    formTips: ["Keep the ribs from flaring as you press.", "Use smooth, controlled repetitions."],
    commonMistakes: [
      "Leaning backward to finish the press.",
      "Using weights that cannot be controlled.",
    ],
    beginnerModification: "Use a lighter pair of dumbbells while seated with back support.",
    equipment: ["Dumbbells or barbell"],
    muscles: ["Shoulders", "Triceps", "Upper chest"],
  }),
  defineExercise({
    id: "lateral-raise",
    name: "Lateral Raise",
    aliases: ["dumbbell lateral raise", "side raise"],
    description: "A shoulder isolation exercise that lifts the arms out to the sides.",
    instructions: [
      "Stand tall with light weights by your sides.",
      "Lift your arms out to the sides with a soft bend in the elbows.",
      "Stop around shoulder height or at a comfortable controlled range.",
      "Lower slowly to the start.",
    ],
    formTips: ["Use light weights and a slow tempo.", "Keep shoulders away from your ears."],
    commonMistakes: ["Swinging the weights.", "Shrugging the shoulders upward."],
    beginnerModification: "Perform one arm at a time with a very light weight or no weight.",
    equipment: ["Light dumbbells"],
    muscles: ["Side shoulders"],
  }),
  defineExercise({
    id: "biceps-curl",
    name: "Biceps Curl",
    aliases: ["dumbbell curl", "curl", "dumbbell bicep curl"],
    description: "An arm exercise that bends the elbow against resistance.",
    instructions: [
      "Stand tall with weights at your sides and palms facing forward.",
      "Keep your upper arms close to your body.",
      "Curl the weights toward your shoulders.",
      "Lower slowly until your elbows are comfortably straight.",
    ],
    formTips: ["Keep your torso still.", "Use a weight you can lower with control."],
    commonMistakes: ["Swinging the torso.", "Letting elbows drift far forward."],
    beginnerModification: "Use a resistance band or perform one arm at a time.",
    equipment: ["Dumbbells or resistance band"],
    muscles: ["Biceps", "Forearms"],
  }),
  defineExercise({
    id: "triceps-extension",
    name: "Triceps Extension",
    aliases: ["overhead triceps extension", "dumbbell tricep extension"],
    description: "An arm exercise that straightens the elbows against resistance.",
    instructions: [
      "Hold a light weight overhead with elbows pointing forward.",
      "Bend your elbows to lower the weight behind your head with control.",
      "Straighten your elbows to return to the start.",
      "Keep the movement slow and comfortable.",
    ],
    formTips: ["Keep upper arms mostly still.", "Brace gently to avoid leaning backward."],
    commonMistakes: ["Flaring elbows wide.", "Using momentum to lift the weight."],
    beginnerModification: "Use a resistance band press-down when available.",
    equipment: ["Dumbbell or resistance band"],
    muscles: ["Triceps"],
  }),
  defineExercise({
    id: "mountain-climber",
    name: "Mountain Climber",
    aliases: ["mountain climbers"],
    description: "A bodyweight conditioning movement performed from a high-plank position.",
    instructions: [
      "Start in a high plank with hands below shoulders.",
      "Bring one knee toward your torso without rounding your back.",
      "Return it to the plank and switch sides.",
      "Keep a pace you can control for the planned interval.",
    ],
    formTips: ["Keep shoulders stacked over hands.", "Prioritize a stable trunk over speed."],
    commonMistakes: ["Bouncing the hips high.", "Moving faster than you can control."],
    beginnerModification: "Step one foot in at a time instead of running the knees.",
    equipment: ["None"],
    muscles: ["Core", "Shoulders", "Hip flexors"],
  }),
  defineExercise({
    id: "jumping-jack",
    name: "Jumping Jack",
    aliases: ["jumping jacks"],
    description: "A simple full-body conditioning movement using coordinated arm and leg motion.",
    instructions: [
      "Stand tall with feet together and arms by your sides.",
      "Step or jump feet apart as your arms travel overhead.",
      "Return to the starting position with control.",
      "Repeat at a comfortable rhythm.",
    ],
    formTips: ["Land softly if jumping.", "Keep a steady breathing rhythm."],
    commonMistakes: ["Landing heavily.", "Letting form break down to move faster."],
    beginnerModification: "Step one foot out at a time instead of jumping.",
    equipment: ["None"],
    muscles: ["Legs", "Shoulders", "Cardiovascular system"],
  }),
  defineExercise({
    id: "kettlebell-swing",
    name: "Kettlebell Swing",
    aliases: ["kb swing", "two hand kettlebell swing"],
    description: "A hip-hinge movement that uses a kettlebell with controlled power.",
    instructions: [
      "Stand with feet slightly wider than hip-width and the kettlebell in front of you.",
      "Hinge at the hips to guide the bell back between your legs.",
      "Drive through your feet and hips to let the bell rise naturally.",
      "Guide the bell back down into the next controlled hinge.",
    ],
    formTips: [
      "The hips drive the movement; the arms guide the bell.",
      "Keep the back neutral throughout.",
    ],
    commonMistakes: [
      "Squatting the swing.",
      "Lifting the bell with the shoulders instead of the hips.",
    ],
    beginnerModification: "Practice a bodyweight hip hinge or a deadlift pattern before swings.",
    equipment: ["Kettlebell"],
    muscles: ["Glutes", "Hamstrings", "Core"],
  }),
];

function normalizedVariants(value: string): string[] {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return [];
  const singular =
    normalized.endsWith("s") && !normalized.endsWith("ss") ? normalized.slice(0, -1) : normalized;
  return singular === normalized ? [normalized] : [normalized, singular];
}

const EXERCISE_BY_VARIANT = new Map<string, ExerciseDetails>(
  EXERCISE_LIBRARY.flatMap((exercise) =>
    [exercise.name, ...exercise.aliases].flatMap((name) =>
      normalizedVariants(name).map((variant) => [variant, exercise] as const),
    ),
  ),
);

export function normalizeExerciseName(name: string): string {
  return normalizedVariants(name)[0] ?? "";
}

export function resolveExerciseDetails(name: string): ExerciseDetails | undefined {
  for (const variant of normalizedVariants(name)) {
    const exercise = EXERCISE_BY_VARIANT.get(variant);
    if (exercise) return exercise;
  }
  return undefined;
}
