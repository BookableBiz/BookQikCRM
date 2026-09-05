// Fixed-order categorical palette (validated for CVD-safe adjacent pairs).
// Assign by stable key (e.g. category_id), never by rank/position, so a
// category keeps its color across sorts and filters.
export const CATEGORY_PALETTE = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
]

export function colorForCategory(id: number | null | undefined): string {
  if (id === null || id === undefined) return '#898781'
  return CATEGORY_PALETTE[id % CATEGORY_PALETTE.length]
}

// Sequential single-hue ramp (blue), light -> dark, for magnitude encoding.
export const SEQUENTIAL_BLUE = {
  100: '#cde2fb',
  200: '#9ec5f4',
  300: '#6da7ec',
  400: '#3987e5',
  500: '#256abf',
  600: '#184f95',
}

// Fixed status roles - never reused for categorical series.
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
}
