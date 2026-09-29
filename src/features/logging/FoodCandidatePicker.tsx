import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FoodResolutionCandidate } from "@/features/logging/food-resolution";

type FoodCandidatePickerProps = {
  open: boolean;
  candidates: FoodResolutionCandidate[];
  isResolving?: boolean;
  onSelect: (candidate: FoodResolutionCandidate) => void;
  onCancel: () => void;
};

export function FoodCandidatePicker({
  open,
  candidates,
  isResolving = false,
  onSelect,
  onCancel,
}: FoodCandidatePickerProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent aria-describedby="food-candidate-description">
        <DialogHeader>
          <DialogTitle>Which food did you mean?</DialogTitle>
          <DialogDescription id="food-candidate-description">
            Choose a food to calculate nutrition from its reference facts, or return to your current
            meal details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2" role="list" aria-label="Food candidates">
          {candidates.map((candidate) => (
            <Button
              key={candidate.foodId}
              type="button"
              variant="outline"
              className="h-auto w-full justify-start rounded-xl px-3 py-3 text-left"
              onClick={() => onSelect(candidate)}
              disabled={isResolving}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{candidate.canonicalName}</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {candidate.isCustom
                    ? "Your custom food"
                    : candidate.verificationStatus === "verified"
                      ? "Verified reference food"
                      : "Reference food"}
                </span>
              </span>
              <Check className="ml-3 h-4 w-4 shrink-0" aria-hidden="true" />
            </Button>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isResolving}>
            Keep current details
          </Button>
          {isResolving ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading nutrition...
            </span>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
