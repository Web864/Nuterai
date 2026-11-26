import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage, featureHead } from "@/components/site/FeaturePage";
import { featureBySlug } from "@/content/marketing";

const feature = featureBySlug("ai-nutrition-coach");

export const Route = createFileRoute("/features/ai-nutrition-coach")({
  head: () => featureHead(feature),
  component: () => <FeaturePage feature={feature} />,
});
