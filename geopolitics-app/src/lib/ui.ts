// Colours for the 10 players. Full class names are written out so Tailwind can find them.
export interface PlayerStyle {
  border: string;
  bg: string;
  text: string;
  dot: string;
}

export const PLAYER_STYLES: PlayerStyle[] = [
  { border: "border-red-400", bg: "bg-red-950/60", text: "text-red-300", dot: "bg-red-400" },
  { border: "border-orange-400", bg: "bg-orange-950/60", text: "text-orange-300", dot: "bg-orange-400" },
  { border: "border-yellow-400", bg: "bg-yellow-950/60", text: "text-yellow-300", dot: "bg-yellow-400" },
  { border: "border-lime-400", bg: "bg-lime-950/60", text: "text-lime-300", dot: "bg-lime-400" },
  { border: "border-emerald-400", bg: "bg-emerald-950/60", text: "text-emerald-300", dot: "bg-emerald-400" },
  { border: "border-cyan-400", bg: "bg-cyan-950/60", text: "text-cyan-300", dot: "bg-cyan-400" },
  { border: "border-sky-400", bg: "bg-sky-950/60", text: "text-sky-300", dot: "bg-sky-400" },
  { border: "border-violet-400", bg: "bg-violet-950/60", text: "text-violet-300", dot: "bg-violet-400" },
  { border: "border-fuchsia-400", bg: "bg-fuchsia-950/60", text: "text-fuchsia-300", dot: "bg-fuchsia-400" },
  { border: "border-pink-400", bg: "bg-pink-950/60", text: "text-pink-300", dot: "bg-pink-400" },
];

export function styleFor(index: number): PlayerStyle {
  const n = PLAYER_STYLES.length;
  return PLAYER_STYLES[((index % n) + n) % n];
}