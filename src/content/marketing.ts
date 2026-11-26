/**
 * Copy for NutriAI's public pages. Kept in one place so the visible text and
 * the JSON-LD (FAQPage, HowTo) are generated from the same source and can't
 * drift apart: search engines penalise schema that doesn't match the page.
 *
 * Copy rule: general wellness only. No medical claims, no promised results.
 */
import type { Faq } from "@/lib/seo";

export interface NavItem {
  label: string;
  to: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Features", to: "/features" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Pricing", to: "/pricing" },
  { label: "FAQ", to: "/faq" },
  { label: "About", to: "/about" },
];

export const WELLNESS_DISCLAIMER =
  "NutriAI offers general wellness guidance and estimates. It does not diagnose, treat or prevent any medical condition. Talk to a qualified professional before major diet or exercise changes, especially if you are pregnant, under 18 or managing a health condition.";

export const HOW_IT_WORKS_STEPS = [
  {
    name: "Tell NutriAI about you",
    text: "Answer a two-minute onboarding about your age, height, weight, activity level, goal, diet preference and allergies.",
  },
  {
    name: "Get your personal targets and plan",
    text: "NutriAI estimates daily calorie and macro targets with the Mifflin-St Jeor equation, then the AI meal planner suggests meals that fit your goal, budget and favourite foods.",
  },
  {
    name: "Log meals in seconds",
    text: "Snap a photo, scan a barcode or type what you ate in plain words. Review the calorie and macro estimate, edit it, then save.",
  },
  {
    name: "Train and check in",
    text: "Get a home or gym workout plan that matches your equipment, track water, sleep, weight and mood, and ask the AI coach when your day changes.",
  },
  {
    name: "Adjust as you go",
    text: "Your dashboard shows progress and streaks, and you can regenerate meals or workouts whenever your goals or schedule change.",
  },
];

export const GENERAL_FAQS: Faq[] = [
  {
    question: "What is NutriAI?",
    answer:
      "NutriAI is an AI nutrition and fitness app. It combines an AI meal planner, a photo and barcode calorie tracker, an AI coach you can chat with and an adaptive workout planner, so your food, training and daily habits live in one place.",
  },
  {
    question: "Is NutriAI free?",
    answer:
      "Yes. The Free plan includes personalized calorie and macro targets, daily meal and workout suggestions, water, sleep, weight and mood tracking, 10 AI coach messages a day and 5 food scans a day. A Pro plan with unlimited coaching and scanning is planned and is not on sale yet.",
  },
  {
    question: "How does the AI meal planner work?",
    answer:
      "You share your goal, activity level, diet preference, allergies and the foods you like. NutriAI calculates calorie and macro targets, then the AI suggests meals that fit those targets. You can swap or regenerate any meal.",
  },
  {
    question: "Can NutriAI count calories from a photo?",
    answer:
      "Yes. Take a photo of your meal and NutriAI estimates the foods, portion sizes, calories, protein, carbs and fat. Photo estimates are approximate, so you review and edit them before saving. You can also scan a barcode or type the meal in words.",
  },
  {
    question: "Does NutriAI support Pakistani and Indian food?",
    answer:
      "Yes. You can log everyday South Asian meals such as roti, paratha, daal chawal, biryani, chicken karahi, chana and raita in familiar portions, and the meal planner can build plans around them.",
  },
  {
    question: "Does NutriAI create workout plans?",
    answer:
      "Yes. The AI workout planner builds sessions for a full gym, home gym, basic equipment or no equipment at all, based on your goal, experience and how many days a week you can train.",
  },
  {
    question: "Is NutriAI a replacement for a doctor or dietitian?",
    answer:
      "No. NutriAI provides general wellness guidance and estimates, not medical advice. It does not diagnose or treat conditions. Speak to a qualified professional before major changes, especially if you are pregnant, under 18 or managing a health condition.",
  },
  {
    question: "Which devices does NutriAI work on?",
    answer:
      "NutriAI works in any modern web browser on phone, tablet or computer, and there is an Android app. Your data syncs across devices when you sign in.",
  },
  {
    question: "Is my health data private?",
    answer:
      "Your data is stored in a secured database with per-user access rules, and NutriAI does not sell personal data. You can permanently delete your account and its data at any time from settings. See the privacy policy for details.",
  },
];

export interface FeatureSection {
  heading: string;
  body: string;
}

export interface FeatureContent {
  slug: string;
  path: string;
  navLabel: string;
  /** <title>: primary keyword first, under ~60 characters. */
  title: string;
  /** Meta description: 140 to 160 characters, keyword plus benefit. */
  description: string;
  eyebrow: string;
  h1: string;
  /** Short direct answer near the top: what answer engines quote. */
  summary: string;
  sections: FeatureSection[];
  bullets: string[];
  faqs: Faq[];
}

export const FEATURES: FeatureContent[] = [
  {
    slug: "ai-meal-planner",
    path: "/features/ai-meal-planner",
    navLabel: "AI meal planner",
    title: "AI Meal Planner: Personalized Meal Plans | NutriAI",
    description:
      "Free AI meal planner that builds daily meal plans around your calorie target, budget, allergies and the foods you love, including desi meals.",
    eyebrow: "AI meal planner",
    h1: "A free AI meal planner built around the food you actually eat",
    summary:
      "NutriAI's AI meal planner estimates your daily calorie and macro targets, then suggests breakfast, lunch, dinner and snacks that fit your goal, diet preference, allergies and budget. Every meal can be swapped or regenerated.",
    sections: [
      {
        heading: "How the AI meal planner personalizes your plan",
        body: "During onboarding you share your age, height, weight, activity level and goal. NutriAI estimates your energy needs with the Mifflin-St Jeor equation and sets protein, carb and fat targets for your goal. The AI then plans meals that land close to those numbers.",
      },
      {
        heading: "Meal plans for any diet preference",
        body: "Choose omnivore, vegetarian, vegan, pescatarian, halal, keto, low-carb, high-protein or another preference and mark allergies to avoid. The planner respects those choices in every suggestion.",
      },
      {
        heading: "Familiar foods, not a generic diet",
        body: "Plans can include everyday meals like roti, daal, rice, chicken karahi or a simple omelette, so you are not forced into foods you would never cook.",
      },
    ],
    bullets: [
      "Daily calorie and macro targets",
      "Breakfast, lunch, dinner and snack ideas",
      "Diet preference and allergy aware",
      "Swap or regenerate any meal",
      "Log a planned meal in one tap",
    ],
    faqs: [
      {
        question: "Is the NutriAI meal planner free?",
        answer:
          "Yes. The Free plan includes daily meal suggestions and personalized calorie and macro targets.",
      },
      {
        question: "Can the AI meal planner help with weight loss?",
        answer:
          "NutriAI can plan meals around a moderate calorie target for a weight loss goal. Results vary by person, and the plan is general wellness guidance rather than medical advice.",
      },
      {
        question: "Can I make a vegetarian or high-protein meal plan?",
        answer:
          "Yes. Pick your diet preference during onboarding or in settings and the planner uses it for every meal.",
      },
    ],
  },
  {
    slug: "ai-calorie-tracker",
    path: "/features/ai-calorie-tracker",
    navLabel: "AI calorie tracker",
    title: "AI Calorie Tracker: Snap a Photo to Log Food | NutriAI",
    description:
      "Log meals with a photo, a barcode scan or plain words. NutriAI's AI calorie tracker estimates calories and macros you can review and edit.",
    eyebrow: "AI calorie tracker",
    h1: "Count calories with a photo, a barcode or a sentence",
    summary:
      "NutriAI's AI calorie tracker lets you log a meal by taking a photo, scanning a packaged food's barcode or typing what you ate. It estimates calories, protein, carbs and fat, and you confirm or edit the result before it is saved.",
    sections: [
      {
        heading: "Photo calorie counter",
        body: "Point your camera at a plate and the AI identifies the foods and estimates portions and nutrition. Estimates are approximate, so the review step lets you fix the portion or swap an item.",
      },
      {
        heading: "Barcode scanner for packaged food",
        body: "Scan a barcode to pull the product's nutrition label, then set how much you ate.",
      },
      {
        heading: "Type it like you would say it",
        body: 'Write "2 roti with daal and a cup of chai" and NutriAI turns it into individual foods with calorie and macro estimates.',
      },
    ],
    bullets: [
      "Photo, barcode and text logging",
      "Calories, protein, carbs, fat and fiber",
      "Review and edit before saving",
      "Daily totals against your targets",
      "5 free scans a day on the Free plan",
    ],
    faqs: [
      {
        question: "How accurate is AI photo calorie counting?",
        answer:
          "Photo estimates are approximate because portion size is hard to judge from an image. NutriAI shows the estimate for review so you can correct it. Weighing food or using barcodes gives more precise numbers.",
      },
      {
        question: "Is the AI calorie tracker free?",
        answer: "Yes. The Free plan includes text logging and 5 photo or barcode scans per day.",
      },
      {
        question: "Can I track macros as well as calories?",
        answer:
          "Yes. Every logged food includes protein, carbs, fat and fiber, and your dashboard compares daily totals with your macro targets.",
      },
    ],
  },
  {
    slug: "ai-nutrition-coach",
    path: "/features/ai-nutrition-coach",
    navLabel: "AI nutrition coach",
    title: "AI Nutrition Coach & Diet Chat | NutriAI",
    description:
      "Chat with an AI nutrition coach that knows your goals, targets and today's log. Get practical meal swaps and habit tips, any time of day.",
    eyebrow: "AI nutrition coach",
    h1: "An AI nutrition coach that knows your goals and your day",
    summary:
      "NutriAI's AI coach is a chat assistant that uses your profile, targets and recent logs to answer everyday nutrition and fitness questions, suggest meal swaps and help you plan the rest of your day. It gives general wellness guidance, not medical advice.",
    sections: [
      {
        heading: "Answers based on your own data",
        body: "Ask what to eat for dinner to hit your protein target and the coach looks at what you have already logged today before suggesting options.",
      },
      {
        heading: "Built-in safety limits",
        body: "The coach avoids diagnosis and medication advice, flags questions that need a professional, and steers away from extreme diets.",
      },
      {
        heading: "Coaching for food, training and habits",
        body: "Get help with eating out, busy days, workout recovery, hydration and building steady habits.",
      },
    ],
    bullets: [
      "Personalized to your targets and logs",
      "Meal swap and snack ideas",
      "Workout and recovery tips",
      "Safety guardrails on every reply",
      "10 free messages a day",
    ],
    faqs: [
      {
        question: "Is the AI nutrition coach a real dietitian?",
        answer:
          "No. It is an AI assistant that gives general wellness guidance. For medical nutrition therapy or a health condition, speak to a registered dietitian or doctor.",
      },
      {
        question: "What can I ask the AI coach?",
        answer:
          "Everyday questions such as what to eat to reach your protein goal, healthier swaps for a favourite dish, how to plan meals on a busy day or how to recover after a workout.",
      },
    ],
  },
  {
    slug: "ai-workout-planner",
    path: "/features/ai-workout-planner",
    navLabel: "AI workout planner",
    title: "AI Workout Planner for Home & Gym | NutriAI",
    description:
      "Get a free AI workout plan for the gym, home or no equipment. NutriAI adapts sessions to your goal, experience and the days you can train.",
    eyebrow: "AI workout planner",
    h1: "An AI workout planner for home, gym or no equipment",
    summary:
      "NutriAI's AI workout planner creates a weekly training plan from your goal, experience level, available days and equipment, from a full gym down to bodyweight only. Sessions sit next to your meal plan so food and training work together.",
    sections: [
      {
        heading: "Plans that match your equipment",
        body: "Choose full gym, home gym, basic equipment or no equipment. The planner only uses exercises you can actually do with what you have.",
      },
      {
        heading: "Built for your goal and schedule",
        body: "Tell NutriAI how many days you can train and whether you want to build strength, lose fat or stay active, and it spreads sessions across your week.",
      },
      {
        heading: "Track sessions and stay consistent",
        body: "Mark workouts done, earn streaks and badges, and set reminders so training fits your routine.",
      },
    ],
    bullets: [
      "Home, gym and bodyweight plans",
      "Matches your goal and training days",
      "Exercise library with instructions",
      "Workout reminders and streaks",
      "Regenerate a plan any time",
    ],
    faqs: [
      {
        question: "Can I get a workout plan with no equipment?",
        answer:
          "Yes. Choose no equipment and NutriAI builds bodyweight sessions you can do at home.",
      },
      {
        question: "Is the AI workout planner suitable for beginners?",
        answer:
          "Yes. Set your experience to beginner and the plan starts with simpler movements and fewer sets. Check with a professional before starting if you have an injury or health condition.",
      },
    ],
  },
  {
    slug: "desi-food-calorie-tracker",
    path: "/features/desi-food-calorie-tracker",
    navLabel: "Desi food tracker",
    title: "Calorie Counter for Pakistani & Indian Food | NutriAI",
    description:
      "Track calories in roti, biryani, daal chawal, karahi and other desi food. NutriAI logs South Asian meals in familiar portions with AI estimates.",
    eyebrow: "Desi food calorie tracker",
    h1: "A calorie counter that understands Pakistani and Indian food",
    summary:
      "Most calorie apps are built around Western packaged food. NutriAI lets you log everyday South Asian meals such as roti, paratha, daal chawal, biryani, chicken karahi, chana and doodh patti in the portions you actually eat, and plans meals around them.",
    sections: [
      {
        heading: "Log desi meals the way you describe them",
        body: 'Type "1 plate chicken biryani and raita" or "2 roti with aloo gobi" and NutriAI breaks it into foods with calorie and macro estimates you can adjust.',
      },
      {
        heading: "Meal plans with familiar food",
        body: "Reach your goals without giving up home cooking. The meal planner can suggest balanced plates built on roti, rice, daal, sabzi and lean protein.",
      },
      {
        heading: "Honest estimates",
        body: "Home recipes vary in oil and portion size, so every estimate is editable. Use the numbers as a guide, not an exact measurement.",
      },
    ],
    bullets: [
      "Roti, paratha, naan and rice dishes",
      "Daal, sabzi, karahi and curries",
      "Chai, lassi and desi snacks",
      "Portions like plate, bowl and piece",
      "Meal plans around home cooking",
    ],
    faqs: [
      {
        question: "How many calories are in one roti?",
        answer:
          "A medium whole-wheat roti of about 40 grams is commonly estimated at around 100 to 120 calories without ghee. Size and ghee change this a lot, so log your own portion in NutriAI and adjust the estimate.",
      },
      {
        question: "How many calories are in a plate of chicken biryani?",
        answer:
          "A typical home plate of chicken biryani is often estimated at roughly 400 to 600 calories, depending on rice quantity, oil and meat. NutriAI lets you log your actual portion and edit the estimate.",
      },
      {
        question: "Can I lose weight eating desi food?",
        answer:
          "Many people reach their goals while eating familiar food by managing portions, oil and protein. NutriAI helps you plan and track that. It is general wellness guidance, not medical advice.",
      },
    ],
  },
];

export function featureBySlug(slug: string): FeatureContent {
  const feature = FEATURES.find((f) => f.slug === slug);
  if (!feature) throw new Error(`Unknown feature page: ${slug}`);
  return feature;
}
