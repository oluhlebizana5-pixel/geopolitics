// Shared style recipes (Tailwind class names) so every page looks consistent.
// Colours come from the theme variables in globals.css, so they follow light/dark mode.

// ---------- Colours for the 10 players (readable in light and dark mode) ----------
export interface PlayerStyle {
  border: string;
  bg: string;
  text: string;
  dot: string;
}

export const PLAYER_STYLES: PlayerStyle[] = [
  { border: "border-red-500 dark:border-red-400", bg: "bg-red-100 dark:bg-red-950/50", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  { border: "border-orange-500 dark:border-orange-400", bg: "bg-orange-100 dark:bg-orange-950/50", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  { border: "border-yellow-500 dark:border-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-950/50", text: "text-yellow-800 dark:text-yellow-300", dot: "bg-yellow-500" },
  { border: "border-lime-500 dark:border-lime-400", bg: "bg-lime-100 dark:bg-lime-950/50", text: "text-lime-800 dark:text-lime-300", dot: "bg-lime-500" },
  { border: "border-emerald-500 dark:border-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/50", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  { border: "border-cyan-500 dark:border-cyan-400", bg: "bg-cyan-100 dark:bg-cyan-950/50", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  { border: "border-sky-500 dark:border-sky-400", bg: "bg-sky-100 dark:bg-sky-950/50", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  { border: "border-violet-500 dark:border-violet-400", bg: "bg-violet-100 dark:bg-violet-950/50", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  { border: "border-fuchsia-500 dark:border-fuchsia-400", bg: "bg-fuchsia-100 dark:bg-fuchsia-950/50", text: "text-fuchsia-700 dark:text-fuchsia-300", dot: "bg-fuchsia-500" },
  { border: "border-pink-500 dark:border-pink-400", bg: "bg-pink-100 dark:bg-pink-950/50", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
];

export function styleFor(index: number): PlayerStyle {
  const n = PLAYER_STYLES.length;
  return PLAYER_STYLES[((index % n) + n) % n];
}

// ---------- Surfaces ----------
export const card = "rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm";
export const cardLink = "block rounded-lg border border-border bg-card p-3 text-card-foreground shadow-sm transition hover:border-ring";

// ---------- Form fields ----------
const inputBase =
  "rounded-lg border border-input bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
export const input = `w-full ${inputBase}`;
export const inputSmall = `w-20 ${inputBase}`;

// ---------- Buttons ----------
const btn = "rounded-lg px-3 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
// Dark text on the pink button in light mode: white on this pink is only 2.4:1.
export const btnPrimary = `${btn} bg-primary text-stone-900 dark:text-primary-foreground`;
export const btnSecondary = `${btn} border border-border bg-secondary text-secondary-foreground`;
export const btnAccent = `${btn} bg-accent text-accent-foreground`;
export const btnDanger = `${btn} bg-red-700 text-white dark:bg-destructive dark:text-stone-900`;

// ---------- Text ----------
export const muted = "text-muted-foreground";
export const link = "underline underline-offset-2 hover:text-accent-foreground";
export const heading = "text-accent-foreground";
export const tone = {
  good: "text-emerald-700 dark:text-emerald-300",
  gold: "text-amber-700 dark:text-amber-300",
  bad: "text-rose-700 dark:text-rose-300",
  info: "text-sky-700 dark:text-sky-300",
  error: "text-red-600 dark:text-red-400",
};

// ---------- Banners ----------
const bannerBase = "rounded-lg border p-3 text-sm";
export const banner = {
  info: `${bannerBase} border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100`,
  gold: `${bannerBase} border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200`,
  warn: `${bannerBase} border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100`,
  error: `${bannerBase} border-red-400 bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-100`,
  note: `${bannerBase} border-border bg-muted text-foreground`,
};