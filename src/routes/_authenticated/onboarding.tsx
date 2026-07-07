import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard";
import { Route as AuthedRoute } from "./route";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your plan — NutriAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { userId } = AuthedRoute.useRouteContext();
  const navigate = useNavigate();
  return (
    <OnboardingWizard
      userId={userId}
      onComplete={() => navigate({ to: "/dashboard", replace: true })}
    />
  );
}
