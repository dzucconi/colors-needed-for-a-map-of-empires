export const createTextFader = (durationMs: number): ((element: HTMLElement, nextText: string, animate: boolean) => void) => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const lastUpdateAt = new WeakMap<HTMLElement, number>();
  const updateToken = new WeakMap<HTMLElement, number>();
  const rapidThresholdMs = Math.max(40, Math.floor(durationMs * 0.75));

  return (element: HTMLElement, nextText: string, animate: boolean): void => {
    if (element.textContent === nextText) {
      return;
    }

    const now = performance.now();
    const previousUpdate = lastUpdateAt.get(element) ?? 0;
    const isRapidUpdate = now - previousUpdate < rapidThresholdMs;
    lastUpdateAt.set(element, now);

    const token = (updateToken.get(element) ?? 0) + 1;
    updateToken.set(element, token);

    const activeAnimations = element.getAnimations();
    const hasRunningAnimation = activeAnimations.some(
      (animation) => animation.playState !== "finished" && animation.playState !== "idle"
    );

    if (!animate || prefersReducedMotion.matches || isRapidUpdate || hasRunningAnimation) {
      activeAnimations.forEach((animation) => animation.cancel());
      element.style.opacity = "";
      element.textContent = nextText;
      return;
    }

    // Clear completed animations so they don't accumulate and affect future checks.
    activeAnimations.forEach((animation) => animation.cancel());

    const fadeOut = element.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: durationMs / 2,
      easing: "ease",
    });

    fadeOut.onfinish = () => {
      if (updateToken.get(element) !== token) {
        return;
      }

      element.style.opacity = "0";
      element.textContent = nextText;
      const fadeIn = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: durationMs,
        easing: "ease-out",
      });

      const clearOpacity = (): void => {
        if (updateToken.get(element) !== token) {
          return;
        }
        element.style.opacity = "";
      };

      fadeIn.onfinish = clearOpacity;
      fadeIn.oncancel = clearOpacity;
    };
  };
};
