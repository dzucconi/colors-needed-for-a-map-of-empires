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
