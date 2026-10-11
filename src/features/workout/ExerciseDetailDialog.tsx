import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlanExercise } from "@/features/workout/queries";
import { resolveExerciseDetails } from "@/features/workout/exercise-library";

export function ExerciseDetailDialog({
  exercise,
  open,
  onOpenChange,
}: {
  exercise: PlanExercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = exercise ? resolveExerciseDetails(exercise.name) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] gap-5 rounded-2xl p-5 sm:max-w-xl sm:rounded-2xl">
        {exercise && (
          <>
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="font-display text-2xl">{exercise.name}</DialogTitle>
              <DialogDescription>
                {exercise.sets} sets x {exercise.reps} reps
                {exercise.rest_seconds !== undefined ? ` · ${exercise.rest_seconds}s rest` : ""}
              </DialogDescription>
            </DialogHeader>

            {detail ? (
              <div className="space-y-5 text-sm">
                <p className="text-muted-foreground">{detail.description}</p>

                <DetailSection title="How to perform">
                  <ol className="space-y-2 pl-5 text-muted-foreground marker:font-medium marker:text-foreground">
                    {detail.instructions.map((instruction) => (
                      <li key={instruction}>{instruction}</li>
                    ))}
                  </ol>
                </DetailSection>

                <DetailSection title="Form and breathing">
                  <ul className="space-y-2 text-muted-foreground">
                    {detail.formTips.map((tip) => (
                      <li key={tip}>• {tip}</li>
                    ))}
                    <li>• Breathe steadily; avoid holding your breath.</li>
                  </ul>
                </DetailSection>

                <DetailSection title="Common mistakes">
                  <ul className="space-y-2 text-muted-foreground">
                    {detail.commonMistakes.map((mistake) => (
                      <li key={mistake}>• {mistake}</li>
                    ))}
                  </ul>
                </DetailSection>

                <DetailSection title="Beginner modification">
                  <p className="text-muted-foreground">{detail.beginnerModification}</p>
                </DetailSection>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailSection title="Equipment">
                    <p className="text-muted-foreground">{detail.equipment.join(", ")}</p>
                  </DetailSection>
                  <DetailSection title="Primary muscles">
                    <p className="text-muted-foreground">{detail.muscles.join(", ")}</p>
                  </DetailSection>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Detailed guidance is not available for this exercise yet. Follow the instructions in
                your workout plan and use a variation you can perform with controlled form.
              </p>
            )}

            {exercise.notes && (
              <DetailSection title="Plan notes">
                <p className="text-muted-foreground">{exercise.notes}</p>
              </DetailSection>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" className="rounded-full">
                  Done
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}
