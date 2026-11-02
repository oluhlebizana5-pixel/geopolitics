// Shared style recipes (Tailwind class names) so every page looks consistent.
// Only two colours are used: the pastel pink (bg-primary and tints of it) and white/neutral greys.
// Everything reads its colours from the theme variables in globals.css, so light and dark mode both work.

// ---------- Surfaces ----------
export const card = "rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm";
export const cardLink =
  "block rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm transition hover:border-foreground/40 hover:bg-accent";

// ---------- Form fields ----------
const inputBase =
  "rounded-xl border border-input bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
export const input = `w-full ${inputBase}`;
export const inputSmall = `w-20 ${inputBase}`;

// ---------- Buttons (pills) ----------
const btn =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
export const btnPrimary = `${btn} border border-foreground/10 bg-primary text-primary-foreground shadow-sm`;
export const btnSecondary = `${btn} border border-border bg-card text-card-foreground shadow-sm hover:bg-muted`;
export const btnAccent = `${btn} border border-border bg-accent text-accent-foreground`;
export const btnDanger = `${btn} bg-destructive text-destructive-foreground`;

// ---------- Text ----------
export const muted = "text-muted-foreground";
export const link = "underline underline-offset-2 hover:text-muted-foreground";
export const heading = "text-foreground";
export const tone = {
  good: "text-foreground",
  gold: "text-foreground font-medium",
  bad: "text-muted-foreground",
  info: "text-foreground",
  error: "text-foreground font-semibold",
};

// ---------- Banners ----------
const bannerBase = "rounded-2xl border p-3 text-sm";
export const banner = {
  info: `${bannerBase} border-border bg-card`,
  gold: `${bannerBase} border-foreground/20 bg-primary text-primary-foreground`,
  warn: `${bannerBase} border-foreground/30 bg-accent text-accent-foreground`,
  error: `${bannerBase} border-2 border-foreground bg-card font-medium`,
  note: `${bannerBase} border-border bg-muted`,
};
