import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage, featureHead } from "@/components/site/FeaturePage";
import { featureBySlug } from "@/content/marketing";

const feature = featureBySlug("desi-food-calorie-tracker");

export const Route = createFileRoute("/features/desi-food-calorie-tracker")({
  head: () => featureHead(feature),
  component: () => <FeaturePage feature={feature} />,
});
