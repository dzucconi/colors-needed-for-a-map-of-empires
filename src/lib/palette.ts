const randomIndex = (size: number): number => Math.floor(Math.random() * size);

export type PaletteToolkit = {
  sampleColor: () => string;
  samplePalette: (amount: number) => string[];
  parseAmount: (params: URLSearchParams) => number;
  represent: (palette: string[]) => string;
  paletteUrl: (palette: string[]) => string;
  paletteFromLocation: () => string[] | null;
};

export const createPaletteToolkit = (
  allColors: string[],
  options?: { defaultAmount?: number; colorParam?: string }
): PaletteToolkit => {
  if (allColors.length === 0) {
    throw new Error("No colors available.");
  }

  const defaultAmount = options?.defaultAmount ?? 4;
  const colorParam = options?.colorParam ?? "c";
  const fallbackColor = allColors[0]!;
  const colorIndex = new Map(allColors.map((color, index) => [color, index]));

  const sampleColor = (): string => allColors[randomIndex(allColors.length)] ?? fallbackColor;
  const samplePalette = (amount: number): string[] =>
    Array.from({ length: amount }, sampleColor);

  const parseAmount = (params: URLSearchParams): number => {
    const raw = params.get("amount");
    const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(n) && n > 0 ? n : defaultAmount;
  };

  const represent = (palette: string[]): string => {
    const initials = palette.map((color) =>
      color
        .split(/\s+/u)
        .filter(Boolean)
        .map((word) => word[0] ?? "")
        .join("")
    );
    const totalChars = palette.reduce((sum, color) => sum + color.length, 0);
    return [totalChars, ...initials].join("-");
  };

  const encodePalette = (palette: string[]): string =>
    palette
      .map((color) => {
        const index = colorIndex.get(color);
        return typeof index === "number" ? index.toString(36) : "";
      })
      .join(".");

  const decodePalette = (encoded: string): string[] | null => {
    if (!encoded) {
      return null;
    }

    const decoded = encoded.split(".").map((part) => {
      const index = Number.parseInt(part, 36);
      return Number.isFinite(index) && index >= 0 ? allColors[index] : undefined;
    });

    return decoded.every(Boolean) ? (decoded as string[]) : null;
  };

  const paletteUrl = (palette: string[]): string =>
    `?${new URLSearchParams({ [colorParam]: encodePalette(palette) }).toString()}`;

  const paletteFromLocation = (): string[] | null => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get(colorParam) ?? "";
    const palette = decodePalette(encoded);
    return palette && palette.length > 0 ? palette : null;
  };

  return {
    sampleColor,
    samplePalette,
    parseAmount,
    represent,
    paletteUrl,
    paletteFromLocation,
  };
};
