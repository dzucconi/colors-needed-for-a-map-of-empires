export const isPlainLeftClick = (event: MouseEvent): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

export const initIdleTracker = (options: {
  nextNav: HTMLAnchorElement;
  prevNav: HTMLAnchorElement;
  idleTimeoutMs: number;
}): void => {
  const { nextNav, prevNav, idleTimeoutMs } = options;
  let idleTimer: number | null = null;

  const setSide = (x: number): void => {
    document.body.dataset["side"] = x < window.innerWidth / 2 ? "left" : "right";
  };

  const wake = (): void => {
    document.body.classList.remove("is-idle");
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer);
    }
    idleTimer = window.setTimeout(() => document.body.classList.add("is-idle"), idleTimeoutMs);
  };

  const setHoverState = (x: number, y: number): void => {
    nextNav.style.pointerEvents = "none";
    prevNav.style.pointerEvents = "none";
    const underCursor = document.elementFromPoint(x, y);
    document.body.dataset["overLink"] = underCursor?.closest(".app a") ? "true" : "false";
    nextNav.style.pointerEvents = "";
    prevNav.style.pointerEvents = "";
  };

  window.addEventListener("mousemove", (event) => {
    wake();
    setSide(event.clientX);
    setHoverState(event.clientX, event.clientY);
    document.body.style.setProperty("--cursor-y", `${event.clientY}px`);
  });

  window.addEventListener("mousedown", wake);
  window.addEventListener("keydown", wake);
  window.addEventListener("touchstart", wake);

  window.addEventListener("mouseleave", () => {
    document.body.classList.add("is-idle");
    delete document.body.dataset["side"];
    delete document.body.dataset["overLink"];
  });

  wake();
};

export const initKeyboardNav = (options: {
  canGoBack: () => boolean;
  goBack: () => void;
  goNext: () => void;
}): void => {
  const { canGoBack, goBack, goNext } = options;

  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || isEditableTarget(event.target)) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (event.key === "ArrowLeft") {
      if (!canGoBack()) {
        return;
      }
      event.preventDefault();
      goBack();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  });
};

const isCoarsePointerDevice = (): boolean =>
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

const initPointerSurface = (options: {
  nextNav: HTMLAnchorElement;
  prevNav: HTMLAnchorElement;
  idleTimeoutMs: number;
}): void => {
  const { nextNav, prevNav, idleTimeoutMs } = options;
  let idleTimer: number | null = null;

  const setSide = (x: number): void => {
    document.body.dataset["side"] = x < window.innerWidth / 2 ? "left" : "right";
  };

  const wake = (): void => {
    document.body.classList.remove("is-idle");
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer);
    }
    idleTimer = window.setTimeout(() => document.body.classList.add("is-idle"), idleTimeoutMs);
  };

  const setHoverState = (x: number, y: number): void => {
    nextNav.style.pointerEvents = "none";
    prevNav.style.pointerEvents = "none";
    const underCursor = document.elementFromPoint(x, y);
    document.body.dataset["overLink"] = underCursor?.closest(".app a") ? "true" : "false";
    nextNav.style.pointerEvents = "";
    prevNav.style.pointerEvents = "";
  };

  window.addEventListener("mousemove", (event) => {
    wake();
    setSide(event.clientX);
    setHoverState(event.clientX, event.clientY);
    document.body.style.setProperty("--cursor-y", `${event.clientY}px`);
  });

  window.addEventListener("mousedown", wake);
  window.addEventListener("keydown", wake);
  window.addEventListener("mouseleave", () => {
    document.body.classList.add("is-idle");
    delete document.body.dataset["side"];
    delete document.body.dataset["overLink"];
  });

  document.body.dataset["overLink"] = "false";
  wake();
};

const initTouchSurface = (options: {
  canGoBack: () => boolean;
  goBack: () => void;
  goNext: () => void;
}): void => {
  const { canGoBack, goBack, goNext } = options;
  const activateThreshold = 10;
  const triggerThreshold = 70;
  const maxPullPx = 80;
  const releaseMs = 180;

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let active = false;
  let side: "left" | "right" | null = null;

  document.body.classList.add("is-touch-device");

  const reset = (): void => {
    active = false;
    side = null;
    document.body.classList.remove("is-touching");
  };

  const clearTouchVisual = (): void => {
    document.body.classList.add("is-touch-releasing");
    window.setTimeout(() => {
      document.body.classList.remove("is-touch-releasing");
      delete document.body.dataset["touchSide"];
    }, releaseMs);
  };

  window.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) {
        reset();
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        reset();
        return;
      }

      document.body.classList.add("is-touching");
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = startX;
      lastY = startY;
      active = false;
      side = startX < window.innerWidth / 2 && canGoBack() ? "left" : "right";
      document.body.dataset["touchSide"] = side;
      document.body.style.setProperty("--touch-y", `${startY}px`);
      document.body.style.setProperty("--touch-pull", "0");
      document.body.classList.remove("is-touch-releasing");
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 1) {
        return;
      }
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      lastX = touch.clientX;
      lastY = touch.clientY;
      const dx = lastX - startX;
      const dy = lastY - startY;

      if (!active) {
        if (Math.abs(dx) < activateThreshold && Math.abs(dy) < activateThreshold) {
          return;
        }
        if (Math.abs(dx) <= Math.abs(dy)) {
          reset();
          return;
        }
        active = true;
      }

      if (!active) {
        return;
      }

      side = dx < 0 ? "right" : "left";
      if (side === "left" && !canGoBack()) {
        document.body.dataset["touchSide"] = "right";
        document.body.style.setProperty("--touch-pull", "0");
        return;
      }

      document.body.dataset["touchSide"] = side;
      document.body.style.setProperty("--touch-y", `${lastY}px`);
      document.body.style.setProperty(
        "--touch-pull",
        `${Math.min(1, Math.abs(dx) / maxPullPx)}`
      );
      event.preventDefault();
    },
    { passive: false }
  );

  const onTouchEnd = (): void => {
    if (!active || !side) {
      reset();
      return;
    }

    const dx = lastX - startX;
    const dy = lastY - startY;
    const horizontalEnough = Math.abs(dx) >= triggerThreshold && Math.abs(dx) > Math.abs(dy);

    if (horizontalEnough) {
      if (dx < 0) {
        goNext();
      } else if (canGoBack()) {
        goBack();
      }
    }

    clearTouchVisual();
    reset();
  };

  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });
};

export const initNavSurface = (options: {
  nextNav: HTMLAnchorElement;
  prevNav: HTMLAnchorElement;
  idleTimeoutMs: number;
  canGoBack: () => boolean;
  goBack: () => void;
  goNext: () => void;
}): void => {
  if (isCoarsePointerDevice()) {
    initTouchSurface(options);
    return;
  }

  initPointerSurface(options);
};
