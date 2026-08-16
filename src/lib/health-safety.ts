/**
 * Defense-in-depth health-safety layer for AI endpoints. This is one layer
 * among several (auth -> rate limit -> input validation -> this -> AI
 * request -> output validation), not a diagnosis system, and it does not
 * rely exclusively on keyword matching being perfect — the crisis-tier path
 * is deliberately a deterministic short-circuit that never depends on model
 * behavior, precisely because keyword matching alone is not trustworthy
 * enough to be the *only* control for the highest-risk category.
 */

export type HealthRiskCategory = "crisis_input" | "medical_input" | "unsafe_output" | null;

// Self-harm, suicidal ideation, overdose, and eating-disorder crisis
// language. Matches short-circuit the AI call entirely and return a fixed
// safe response — see CRISIS_SAFE_RESPONSE below.
const CRISIS_PATTERNS: RegExp[] = [
  /\b(kill|hurt|harm)\s+myself\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend(ing)?\s+my\s+life\b/i,
  /\bself[\s-]?harm\b/i,
  /\bwant to die\b/i,
  /\bdon'?t want to (live|be alive)\b/i,
  /\boverdose\b/i,
  /\bhow (many|much) (pills?|tablets?)\b.*\b(take|need)\b/i,
  /\bpurg(e|ing)\b.*\b(after|every)\s*(meal|eating)\b/i,
  /\bstarv(e|ing) myself\b/i,
  /\bcrushing chest pain\b/i,
  /\bcan'?t breathe\b/i,
  /\bsevere allergic reaction\b/i,
];

// Requests for diagnosis or medication changes — allowed to proceed to the
// model, but with a targeted reinforcement of the existing system-prompt
// instruction for that turn, and the reply is scanned afterward.
const MEDICAL_PATTERNS: RegExp[] = [
  /\bdo i have\b.*\b(disease|condition|disorder|cancer|diabetes)\b/i,
  /\bam i (diabetic|anemic|pregnant)\b/i,
  /\bdiagnos(e|is|ed)\b/i,
  /\bstop taking\b.*\b(medication|meds|insulin|medicine)\b/i,
  /\bchange my (dose|dosage)\b/i,
  /\bhow much (insulin|medication|medicine)\b/i,
  /\bprescri(be|ption)\b/i,
];

export function classifyHealthRisk(text: string): { crisis: boolean; medical: boolean } {
  return {
    crisis: CRISIS_PATTERNS.some((re) => re.test(text)),
    medical: MEDICAL_PATTERNS.some((re) => re.test(text)),
  };
}

export const CRISIS_SAFE_RESPONSE =
  "I'm really glad you reached out, but this isn't something I'm able to help with safely. " +
  "If you're in immediate danger, please contact your local emergency services right now. " +
  "If you're struggling, please reach out to a crisis helpline in your area or a trusted " +
  "person near you — you deserve real support, not an app. I'm here for nutrition and " +
  "fitness questions whenever you're ready.";

export const MEDICAL_INPUT_REINFORCEMENT =
  "The user's latest message concerns a diagnosis, medical condition, or medication change. " +
  "Do not diagnose any condition, do not state or imply certainty about what they have, and " +
  "do not recommend starting, stopping, or changing any medication or dosage. Clearly " +
  "recommend they consult a licensed healthcare professional for this specific question, " +
  "then, if relevant, offer general nutrition/fitness information only.";

export const UNSAFE_OUTPUT_FALLBACK =
  "I want to make sure you get accurate guidance here, so I'll hold off on giving specifics " +
  "on that — please check with a licensed healthcare professional. Happy to help with " +
  "nutrition or workout planning in the meantime.";

const UNSAFE_OUTPUT_PATTERNS: RegExp[] = [
  /\byou (have|likely have|probably have)\b.{0,40}\b(disease|condition|disorder|diabetes|cancer)\b/i,
  /\bi diagnose\b/i,
  /\byou are diagnosed with\b/i,
  /\bstop taking your\b/i,
  /\btake \d+\s?(mg|mcg|ml|units?)\b/i,
  /\bincrease your dose\b/i,
];

/** Output-side check: does the model's reply itself cross a safety boundary? */
export function scanReplyForUnsafePatterns(reply: string): boolean {
  return UNSAFE_OUTPUT_PATTERNS.some((re) => re.test(reply));
}
