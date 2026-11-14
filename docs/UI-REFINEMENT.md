# NutriAI UI refinement

## Design decisions

NutriAI retains its emerald palette, food photography, Fraunces marketing headlines,
local-food content, existing routes, and wellness positioning. Inter handles product
UI, forms, navigation, and tabular numerical values. No dependencies were added.

The research informed these decisions without reproducing another product's interface:

| Primary reference                                                                                                                              | Applied direction                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Apple Health](https://support.apple.com/en-euro/guide/iphone/iphe3d379c32/ios) and [Apple Fitness](https://www.apple.com/apple-fitness-plus/) | Clear daily summaries, values with units, and progressive hierarchy.          |
| [MyFitnessPal](https://support.myfitnesspal.com/hc/en-us/articles/360032621991-How-to-view-and-customize-your-nutrients-in-MyFitnessPal)       | Keep nutrients identifiable and daily totals easy to scan.                    |
| [Cronometer](https://support.cronometer.com/hc/en-us/articles/360018298812-Charts)                                                             | Retain chart context and distinguish nutrients without changing calculations. |
| [Levels](https://support.levels.com/article/770-what-health-and-nutrition-data-levels-tracks)                                                  | Keep food-log metrics, time context, and units together.                      |
| [Oura](https://support.ouraring.com/hc/en-us/articles/360058599753-How-to-Use-the-Oura-App)                                                    | Organize existing information into readable cards and concise daily views.    |
| [Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)                                                                               | Reduce decorative noise and align headers, controls, and panels.              |
| [Material Design 3](https://m3.material.io/styles/typography/applying-type)                                                                    | Separate display, title, body, and label roles; use tabular numbers.          |
| [IBM Carbon](https://www.carbondesignsystem.com/building-blocks/foundations/typography/style-strategies)                                       | Distinguish editorial marketing typography from compact product typography.   |

## Implementation

- Consolidated the conflicting landing-page responsive rules into one composition.
- Marketing width: 80rem. Dashboard maximum width: 100rem.
- Shared gutters: clamp(1rem, 3vw, 2.5rem).
- Shared section spacing: clamp(3rem, 6vw, 5.5rem); responsible-guidance section is tighter.
- Fluid marketing headlines, shorter readable line lengths, and consistent feature cards.
- Existing Radix menu supplies mobile About, Pricing, and Sign in links, including its keyboard behavior.
- Added a skip link and visible keyboard focus; preserved existing form and dialog behavior.
- Hero numbers and phone illustrations are explicitly identified as examples.
- Preserved the food photograph, cultural-food grid, safety statements, and creator credit.
- Scoped Inter and tabular numerals to the authenticated workspace without changing its hooks or session gate.
- Standardized 16px inputs, semibold labels, button spacing, and touch-target styling.
- Normalized onboarding headings/targets and corrected foreground tokens on its gradient summary card.
- Added container-based preview adjustments and metric sizing, plus viewport fallbacks.
- Restored dashboard action icons hidden by a previous CSS rule.
- Nutrient accent tokens distinguish protein, carbohydrates, and fat alongside their existing labels.
- Input borders and card borders use separate tokens so the interface remains legible without neon card outlines.

## Verification and limitations

- Unit tests: 132 passed across 17 files.
- TypeScript: passed.
- Focused ESLint: zero errors; one existing Fast Refresh warning in button.tsx.
- Production build: passed, including the final input-border and skip-link adjustment.
- Render-independent dashboard, landing, and session-layout logic matches the pre-change source.
- Flat-token sRGB contrast calculation: light body 16.00:1; light secondary 6.32:1;
  dark body 17.22:1; dark secondary 6.16:1; input boundaries 3.84:1 in both themes.
  This calculation does not certify every translucent surface, interaction state, or full WCAG conformance.
- Intended responsive range: 320px through 2560px, with fluid typography, grid, and container queries.
- Actual browser viewport/zoom, authenticated interactions, keyboard navigation, uploads, and AI flows
  remain unverified: Computer Use could not reliably determine Chrome's current URL and stopped.
- No new screenshots were captured. No application data, credentials, calculations, or AI prompts were changed.
- Full-project ESLint remains at the baseline: 2,638 existing errors and 8 warnings.
- Deployment is pending a confirmed Vercel connection to the existing linked NutriAI project.
