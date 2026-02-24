import "./styles.css";
import rawColors from "../colors.txt?raw";

type State = {
  amount: number;
  colors: string[];
};

const DEFAULT_AMOUNT = 4;

const app = document.getElementById("app");

if (!(app instanceof HTMLDivElement)) {
  throw new Error("Expected #app to be a div element.");
}

const ALL_COLORS = rawColors
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

const COLOR_INDEX = new Map<string, number>();
ALL_COLORS.forEach((color, index) => {
  if (!COLOR_INDEX.has(color)) {
    COLOR_INDEX.set(color, index);
  }
});

if (ALL_COLORS.length === 0) {
  throw new Error("No colors available.");
}

const state: State = {
  amount: DEFAULT_AMOUNT,
  colors: Array.from({ length: DEFAULT_AMOUNT }, () => "wait"),
};

const randomColor = (): string => {
  const index = Math.floor(Math.random() * ALL_COLORS.length);
  return ALL_COLORS[index] ?? "wait";
};

const fetchRandomColors = (amount: number): string[] =>
  Array.from({ length: amount }, () => randomColor());

const parseAmount = (params: URLSearchParams): number => {
  const raw = params.get("amount");

  if (!raw) {
    return DEFAULT_AMOUNT;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AMOUNT;
};

const parseColorsFromQuery = (params: URLSearchParams): string[] => {
  const indexedColors = new Map<number, string>();

  for (const [key, value] of params.entries()) {
    const match = /^colors\[(\d+)\]$/u.exec(key);

    if (!match || value.length === 0) {
      continue;
    }

    const indexPart = match[1];
    if (!indexPart) {
      continue;
    }

    const index = Number.parseInt(indexPart, 10);

    if (Number.isFinite(index)) {
      indexedColors.set(index, value);
    }
  }

  return [...indexedColors.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, color]) => color);
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

const encodeCompactColors = (colors: string[]): string => {
  return colors
    .map((color) => {
      const index = COLOR_INDEX.get(color);
      return typeof index === "number" ? index.toString(36) : "";
    })
    .join(".");
};

const decodeCompactColors = (encoded: string): string[] | null => {
  if (encoded.length === 0) {
    return null;
  }

  const parts = encoded.split(".");
  if (parts.length === 0) {
    return null;
  }

  const decoded: string[] = [];
  for (const part of parts) {
    if (part.length === 0) {
      return null;
    }
    const index = Number.parseInt(part, 36);
    if (!Number.isFinite(index) || index < 0) {
      return null;
    }
    const color = ALL_COLORS[index];
    if (!color) {
      return null;
    }
    decoded.push(color);
  }

  return decoded;
};

const makePermalink = (colors: string[]): string => {
  const params = new URLSearchParams();
  params.set("c", encodeCompactColors(colors));
  return `?${params.toString()}`;
};

const syncUrlWithState = (): void => {
  window.history.replaceState(null, "", makePermalink(state.colors));
};

const createColorLink = (color: string, index: number): HTMLAnchorElement => {
  const link = document.createElement("a");
  link.className = "color";
  link.href = "#";
  link.textContent = color;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    state.colors[index] = randomColor();
    render();
  });
  return link;
};

const render = (): void => {
  syncUrlWithState();
  app.replaceChildren();

  const permalink = document.createElement("a");
  permalink.className = "permalink";
  permalink.target = "_blank";
  permalink.href = makePermalink(state.colors);
  permalink.textContent = represent(state.colors);

  app.append(permalink);
  app.append(document.createElement("hr"));

  state.colors.forEach((color, index) => {
    app.append(createColorLink(color, index));
  });

  app.append(document.createElement("hr"));

  const reset = document.createElement("a");
  reset.className = "reset";
  reset.href = "?";
  reset.addEventListener("click", (event) => {
    event.preventDefault();
    state.colors = fetchRandomColors(state.amount);
    render();
  });

  app.append(reset);
};

const init = (): void => {
  const params = new URLSearchParams(window.location.search);
  const compactColors = decodeCompactColors(params.get("c") ?? "");

  if (compactColors && compactColors.length > 0) {
    state.amount = compactColors.length;
    state.colors = compactColors;
    render();
    return;
  }

  const queryColors = parseColorsFromQuery(params);

  if (queryColors.length > 0) {
    state.amount = queryColors.length;
    state.colors = queryColors;
    render();
    return;
  }

  state.amount = parseAmount(params);
  state.colors = fetchRandomColors(state.amount);
  render();
};

init();
