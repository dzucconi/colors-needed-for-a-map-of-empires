import "./styles.css";
import rawColors from "../colors.txt?raw";
import { createTextFader } from "./lib/animation";
import { initIdleTracker, initKeyboardNav, isPlainLeftClick } from "./lib/interaction";
import { createPaletteToolkit } from "./lib/palette";

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
  .filter(Boolean);

const {
  sampleColor,
  samplePalette,
  parseAmount,
  represent,
  paletteUrl,
  paletteFromLocation,
} = createPaletteToolkit(allColors, {
  defaultAmount: DEFAULT_AMOUNT,
  colorParam: COLORS_PARAM,
});

const fadeText = createTextFader(TEXT_FADE_MS);

const state = {
  palette: [] as string[],
  urls: [] as string[],
  nextTarget: [] as string[],
  colorTargets: [] as string[][],
  permalink: null as HTMLAnchorElement | null,
  colorLinks: [] as HTMLAnchorElement[],
};

const historyDepth = (): number => Math.max(0, state.urls.length - 1);

const nextNav = document.createElement("a");
nextNav.className = "page-nav page-nav-next";
nextNav.href = "?";
nextNav.setAttribute("aria-label", "Next palette");

const prevNav = document.createElement("a");
prevNav.className = "page-nav page-nav-prev";
prevNav.href = "#back";
prevNav.setAttribute("aria-label", "Previous palette");

document.body.append(nextNav, prevNav);

const syncHistory = (mode: Exclude<HistoryMode, "none">, palette: string[]): void => {
  const url = paletteUrl(palette);

  if (mode === "push") {
    state.urls.push(url);
    window.history.pushState(null, "", url);
    return;
  }

  if (state.urls.length === 0) {
    state.urls.push(url);
  } else {
    state.urls[state.urls.length - 1] = url;
  }
  window.history.replaceState(null, "", url);
};

const setPalette = (
  palette: string[],
  historyMode: HistoryMode,
  options?: { animate?: boolean }
): void => {
  const previousPalette = state.palette.length > 0 ? [...state.palette] : null;
  const animate = options?.animate ?? true;

  state.palette = palette;
  if (historyMode !== "none") {
    syncHistory(historyMode, palette);
  }

  render(previousPalette, animate);
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
    const next = state.colorTargets[index];
    if (next) {
      setPalette(next, "push");
    }
  });
  return link;
};

const ensureLayout = (): void => {
  if (state.permalink && state.colorLinks.length === state.palette.length) {
    return;
  }

  app.replaceChildren();
  const fragment = document.createDocumentFragment();

  state.permalink = document.createElement("a");
  state.permalink.className = "permalink";
  state.permalink.target = "_blank";

  fragment.append(state.permalink, document.createElement("hr"));

  state.colorLinks = Array.from({ length: state.palette.length }, (_, index) =>
    createColorLink(index)
  );
  state.colorLinks.forEach((link) => fragment.append(link));

  fragment.append(document.createElement("hr"));
  app.append(fragment);
};

const render = (previousPalette: string[] | null, animate: boolean): void => {
  ensureLayout();
  const canAnimate = animate && !!previousPalette;

  if (state.permalink) {
    state.permalink.href = paletteUrl(state.palette);
    fadeText(state.permalink, represent(state.palette), canAnimate);
  }

  state.colorLinks.forEach((link, index) => {
    const color = state.palette[index];
    if (!color) {
      return;
    }

    const target = state.palette.map((value, i) => (i === index ? sampleColor() : value));
    state.colorTargets[index] = target;
    link.href = paletteUrl(target);

    const changed = previousPalette ? previousPalette[index] !== color : false;
    fadeText(link, color, canAnimate && changed);
  });

  state.nextTarget = samplePalette(state.palette.length);
  nextNav.href = paletteUrl(state.nextTarget);
  prevNav.href = state.urls[state.urls.length - 2] ?? "#back";
  prevNav.hidden = historyDepth() === 0;
};

nextNav.addEventListener("click", (event) => {
  if (!isPlainLeftClick(event)) {
    return;
  }
  event.preventDefault();
  setPalette(state.nextTarget, "push");
});

prevNav.addEventListener("click", (event) => {
  if (!isPlainLeftClick(event)) {
    return;
  }
  event.preventDefault();
  window.history.back();
});

const init = (): void => {
  initIdleTracker({
    nextNav,
    prevNav,
    idleTimeoutMs: IDLE_TIMEOUT_MS,
  });
  document.body.dataset["overLink"] = "false";

  initKeyboardNav({
    canGoBack: () => historyDepth() > 0,
    goBack: () => window.history.back(),
    goNext: () => setPalette(state.nextTarget, "push"),
  });

  window.addEventListener("popstate", () => {
    if (state.urls.length > 1) {
      state.urls.pop();
    }
    const palette = paletteFromLocation();
    if (palette) {
      setPalette(palette, "none");
    }
  });

  const initial =
    paletteFromLocation() ??
    samplePalette(parseAmount(new URLSearchParams(window.location.search)));

  state.urls = [paletteUrl(initial)];
  setPalette(initial, "replace", { animate: false });
};

init();
