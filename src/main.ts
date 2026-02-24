import "./styles.css";
import rawColors from "../colors.txt?raw";

type HistoryMode = "push" | "replace" | "none";

const DEFAULT_AMOUNT = 4;
const COLORS_PARAM = "c";
const IDLE_TIMEOUT_MS = 2000;
const TEXT_FADE_MS = 160;

const app = document.getElementById("app");

if (!(app instanceof HTMLDivElement)) {
  throw new Error("Expected #app to be a div element.");
}

const allColors = rawColors
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

if (allColors.length === 0) {
  throw new Error("No colors available.");
}

const colorIndex = new Map(allColors.map((color, index) => [color, index]));
let currentPalette: string[] = [];
let historyDepth = 0;
let urlHistory: string[] = [];
const fallbackColor = allColors[0]!;
let nextNavTarget: string[] = [];
const nextColorTargets: string[][] = [];
let permalinkEl: HTMLAnchorElement | null = null;
let colorEls: HTMLAnchorElement[] = [];

const randomIndex = (size: number): number => Math.floor(Math.random() * size);
const sampleColor = (): string => allColors[randomIndex(allColors.length)] ?? fallbackColor;
const samplePalette = (amount: number): string[] =>
  Array.from({ length: amount }, sampleColor);

const parseAmount = (params: URLSearchParams): number => {
  const raw = params.get("amount");
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AMOUNT;
};

const represent = (colors: string[]): string => {
  const initials = colors.map((color) =>
    color
      .split(/\s+/u)
      .filter((word) => word.length > 0)
      .map((word) => word[0] ?? "")
      .join("")
  );
  const totalChars = colors.reduce((count, color) => count + color.length, 0);
  return [totalChars, ...initials].join("-");
};

const encodePalette = (colors: string[]): string =>
  colors
    .map((color) => {
      const index = colorIndex.get(color);
      return typeof index === "number" ? index.toString(36) : "";
    })
    .join(".");

const decodePalette = (encoded: string): string[] | null => {
  if (encoded.length === 0) {
    return null;
  }

  const decoded = encoded.split(".").map((part) => {
    const index = Number.parseInt(part, 36);
    return Number.isFinite(index) && index >= 0 ? allColors[index] : undefined;
  });

  if (decoded.some((color) => !color)) {
    return null;
  }

  return decoded as string[];
};

const paletteUrl = (colors: string[]): string => {
  const params = new URLSearchParams();
  params.set(COLORS_PARAM, encodePalette(colors));
  return `?${params.toString()}`;
};

const paletteFromUrl = (): string[] | null => {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(COLORS_PARAM) ?? "";
  const palette = decodePalette(encoded);
  return palette && palette.length > 0 ? palette : null;
};

const syncHistory = (mode: Exclude<HistoryMode, "none">, colors: string[]): void => {
  const url = paletteUrl(colors);
  if (mode === "push") {
    urlHistory.push(url);
    historyDepth = Math.max(0, urlHistory.length - 1);
    window.history.pushState(null, "", url);
    return;
  }

  if (urlHistory.length === 0) {
    urlHistory.push(url);
  } else {
    urlHistory[urlHistory.length - 1] = url;
  }
  historyDepth = Math.max(0, urlHistory.length - 1);
  window.history.replaceState(null, "", url);
};

const isPlainLeftClick = (event: MouseEvent): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const updateTextWithFade = (
  element: HTMLElement,
  nextText: string,
  animate: boolean
): void => {
  if (element.textContent === nextText) {
    return;
  }

  if (!animate || prefersReducedMotion.matches) {
    element.textContent = nextText;
    return;
  }

  element.getAnimations().forEach((animation) => {
    animation.cancel();
  });

  const fadeOut = element.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: TEXT_FADE_MS / 2,
    easing: "ease",
    fill: "forwards",
  });
  fadeOut.onfinish = () => {
    element.textContent = nextText;
    element.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: TEXT_FADE_MS,
      easing: "ease-out",
      fill: "forwards",
    });
  };
};

const createColorLink = (index: number): HTMLAnchorElement => {
  const link = document.createElement("a");
  link.className = "color";
  link.href = "#";
  link.textContent = "";
  link.addEventListener("click", (event) => {
    if (!isPlainLeftClick(event)) {
      return;
    }
    event.preventDefault();
    const next = nextColorTargets[index];
    if (!next) {
      return;
    }
    setPalette(next, "push");
  });
  return link;
};

const nextNav = document.createElement("a");
nextNav.className = "page-nav page-nav-next";
nextNav.href = "?";
nextNav.setAttribute("aria-label", "Next palette");
nextNav.addEventListener("click", (event) => {
  const next = nextNavTarget;
  if (!isPlainLeftClick(event)) {
    return;
  }
  event.preventDefault();
  setPalette(next, "push");
});

const prevNav = document.createElement("a");
prevNav.className = "page-nav page-nav-prev";
prevNav.href = "#back";
prevNav.setAttribute("aria-label", "Previous palette");
prevNav.addEventListener("click", (event) => {
  if (!isPlainLeftClick(event)) {
    return;
  }
  event.preventDefault();
  window.history.back();
});

document.body.append(nextNav, prevNav);

const ensureLayout = (): void => {
  if (permalinkEl && colorEls.length === currentPalette.length) {
    return;
  }

  app.replaceChildren();
  const fragment = document.createDocumentFragment();

  permalinkEl = document.createElement("a");
  permalinkEl.className = "permalink";
  permalinkEl.target = "_blank";

  fragment.append(permalinkEl);
  fragment.append(document.createElement("hr"));

  colorEls = Array.from({ length: currentPalette.length }, (_, index) =>
    createColorLink(index)
  );
  colorEls.forEach((link) => {
    fragment.append(link);
  });

  fragment.append(document.createElement("hr"));
  app.append(fragment);
};

const render = (previousPalette: string[] | null, animate: boolean): void => {
  ensureLayout();

  const fullAnimate = animate && !!previousPalette;
  const permalinkText = represent(currentPalette);

  if (permalinkEl) {
    permalinkEl.href = paletteUrl(currentPalette);
    updateTextWithFade(permalinkEl, permalinkText, fullAnimate);
  }

  colorEls.forEach((link, index) => {
    const color = currentPalette[index];
    if (!color) {
      return;
    }

    const next = currentPalette.map((value, i) => (i === index ? sampleColor() : value));
    nextColorTargets[index] = next;
    link.href = paletteUrl(next);

    const changed = previousPalette ? previousPalette[index] !== color : false;
    updateTextWithFade(link, color, fullAnimate && changed);
  });

  nextNavTarget = samplePalette(currentPalette.length);
  nextNav.href = paletteUrl(nextNavTarget);
  prevNav.href = urlHistory[urlHistory.length - 2] ?? "#back";
  prevNav.hidden = historyDepth === 0;
};

const setPalette = (
  colors: string[],
  history: HistoryMode,
  options?: { animate?: boolean }
): void => {
  const animate = options?.animate ?? true;
  const previousPalette = currentPalette.length > 0 ? [...currentPalette] : null;

  currentPalette = colors;
  if (history !== "none") {
    syncHistory(history, colors);
  }

  render(previousPalette, animate);
};

const initIdleTracker = (): void => {
  let idleTimer: number | null = null;

  const wake = (): void => {
    document.body.classList.remove("is-idle");
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer);
    }
    idleTimer = window.setTimeout(() => {
      document.body.classList.add("is-idle");
    }, IDLE_TIMEOUT_MS);
  };

  const updateSide = (x: number): void => {
    const half = window.innerWidth / 2;
    document.body.dataset["side"] = x < half ? "left" : "right";
  };

  window.addEventListener("mousemove", (event) => {
    wake();
    updateSide(event.clientX);
    nextNav.style.pointerEvents = "none";
    prevNav.style.pointerEvents = "none";
    const beneath = document.elementFromPoint(event.clientX, event.clientY);
    document.body.dataset["overLink"] = beneath?.closest(".app a") ? "true" : "false";
    nextNav.style.pointerEvents = "";
    prevNav.style.pointerEvents = "";
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

const init = (): void => {
  initIdleTracker();
  document.body.dataset["overLink"] = "false";

  window.addEventListener("popstate", () => {
    if (urlHistory.length > 1) {
      urlHistory.pop();
    }
    historyDepth = Math.max(0, urlHistory.length - 1);
    const palette = paletteFromUrl();
    if (!palette || palette.length === 0) {
      return;
    }
    setPalette(palette, "none");
  });

  const palette = paletteFromUrl();
  if (palette && palette.length > 0) {
    urlHistory = [paletteUrl(palette)];
    setPalette(palette, "replace", { animate: false });
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const initial = samplePalette(parseAmount(params));
  urlHistory = [paletteUrl(initial)];
  setPalette(initial, "replace", { animate: false });
};

init();
