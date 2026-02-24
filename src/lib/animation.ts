export const createTextFader = (durationMs: number): ((element: HTMLElement, nextText: string, animate: boolean) => void) => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  return (element: HTMLElement, nextText: string, animate: boolean): void => {
    if (element.textContent === nextText) {
      return;
    }

    if (!animate || prefersReducedMotion.matches) {
      element.textContent = nextText;
      return;
    }

    element.getAnimations().forEach((animation) => animation.cancel());

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
