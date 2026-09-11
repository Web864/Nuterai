import { useEffect } from "react";

const TARGETS = [
  "main > header",
  "main > section",
  "main [data-slot='card']",
  "main form",
  "main [role='dialog']",
].join(",");

/**
 * Shared progressive scroll-reveal coordinator. It never hides content until
 * after the client mounts, and it opts out entirely for reduced motion.
 */
export function MotionProvider() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>(TARGETS)).filter(
      (element) => !element.closest("[data-motion-skip]") && element.dataset.motion !== "skip",
    );

    targets.forEach((element, index) => {
      element.dataset.motion = "reveal";
      element.style.setProperty("--motion-index", String(Math.min(index % 6, 5)));
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.motionVisible = "true";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );

    targets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return null;
}