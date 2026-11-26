import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage, featureHead } from "@/components/site/FeaturePage";
import { featureBySlug } from "@/content/marketing";

const feature = featureBySlug("ai-meal-planner");

export const Route = createFileRoute("/features/ai-meal-planner")({
  head: () => featureHead(feature),
  component: () => <FeaturePage feature={feature} />,
});
