import { describe, expect, it } from "vitest";
import { classifyHealthRisk, scanReplyForUnsafePatterns } from "@/lib/health-safety";

describe("classifyHealthRisk", () => {
  it("flags crisis-tier content", () => {
    expect(classifyHealthRisk("I want to kill myself").crisis).toBe(true);
    expect(classifyHealthRisk("thinking about suicide lately").crisis).toBe(true);
    expect(classifyHealthRisk("how many pills would I need to take to overdose").crisis).toBe(true);
    expect(classifyHealthRisk("I've been purging after every meal this week").crisis).toBe(true);
  });

  it("flags medical-tier content without flagging it as crisis", () => {
    const r = classifyHealthRisk("do I have diabetes based on these symptoms?");
    expect(r.medical).toBe(true);
    expect(r.crisis).toBe(false);
  });

  it("does not flag ordinary nutrition/fitness questions", () => {
    const r = classifyHealthRisk("what's a good high-protein breakfast under 400 calories?");
    expect(r.crisis).toBe(false);
    expect(r.medical).toBe(false);
  });

  it("does not flag ordinary use of the word 'kill' outside a self-harm context", () => {
    // Guards against the most obvious false-positive shape for this pattern set.
    const r = classifyHealthRisk("this leg workout is going to kill me tomorrow lol");
    expect(r.crisis).toBe(false);
  });
});

describe("scanReplyForUnsafePatterns", () => {
  it("flags a reply that states diagnostic certainty", () => {
    expect(scanReplyForUnsafePatterns("Based on this, you have type 2 diabetes.")).toBe(true);
  });

  it("flags a reply instructing a medication dosage", () => {
    expect(scanReplyForUnsafePatterns("You should take 500 mg twice a day.")).toBe(true);
  });

  it("flags a reply telling the user to stop their medication", () => {
    expect(scanReplyForUnsafePatterns("You should stop taking your insulin.")).toBe(true);
  });

  it("does not flag ordinary coaching language", () => {
    expect(
      scanReplyForUnsafePatterns(
        "Great question! Based on your goals, I'd aim for 150g of protein today.",
      ),
    ).toBe(false);
  });
});
