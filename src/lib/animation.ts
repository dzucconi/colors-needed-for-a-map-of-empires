export const createTextFader = (durationMs: number): ((element: HTMLElement, nextText: string, animate: boolean) => void) => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const lastUpdateAt = new WeakMap<HTMLElement, number>();
  const rapidThresholdMs = Math.max(40, Math.floor(durationMs * 0.75));

  return (element: HTMLElement, nextText: string, animate: boolean): void => {
    if (element.textContent === nextText) {
      return;
    }

    const now = performance.now();
    const previousUpdate = lastUpdateAt.get(element) ?? 0;
    const isRapidUpdate = now - previousUpdate < rapidThresholdMs;
    lastUpdateAt.set(element, now);

    const activeAnimations = element.getAnimations();

    if (!animate || prefersReducedMotion.matches || isRapidUpdate || activeAnimations.length > 0) {
      activeAnimations.forEach((animation) => animation.cancel());
      element.textContent = nextText;
      return;
    }

    const fadeOut = element.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: durationMs / 2,
      easing: "ease",
      fill: "forwards",
    });

    fadeOut.onfinish = () => {
      element.textContent = nextText;
      element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: durationMs,
        easing: "ease-out",
        fill: "forwards",
      });
    };
  };
};
