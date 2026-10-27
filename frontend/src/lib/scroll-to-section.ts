const SECTION_SCROLL_DURATION_MS = 700;
let activeFrame: number | null = null;

/** Scrolls to an in-page destination with one consistent, slightly slower glide. */
export function scrollToSection(target: HTMLElement) {
  if (activeFrame !== null) {
    window.cancelAnimationFrame(activeFrame);
    activeFrame = null;
  }

  const startY = window.scrollY;
  const topOffset = Number.parseFloat(
    window.getComputedStyle(document.documentElement).scrollPaddingTop,
  ) || 0;
  const endY = Math.max(0, target.getBoundingClientRect().top + startY - topOffset);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || Math.abs(endY - startY) < 1) {
    window.scrollTo({ top: endY, left: 0, behavior: "instant" });
    return;
  }

  let startedAt: number | null = null;
  const animate = (time: number) => {
    startedAt ??= time;
    const progress = Math.min((time - startedAt) / SECTION_SCROLL_DURATION_MS, 1);
    const easedProgress = progress < 0.5
      ? 4 * progress ** 3
      : 1 - (-2 * progress + 2) ** 3 / 2;
    window.scrollTo({
      top: startY + (endY - startY) * easedProgress,
      left: 0,
      behavior: "instant",
    });

    if (progress < 1) activeFrame = window.requestAnimationFrame(animate);
    else activeFrame = null;
  };

  activeFrame = window.requestAnimationFrame(animate);
}
