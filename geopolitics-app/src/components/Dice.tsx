"use client";

// Which of the 9 grid cells show a dot for each die value
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const TONES = {
  attacker: "border-rose-400 bg-rose-100 dark:border-rose-500 dark:bg-rose-200",
  defender: "border-sky-400 bg-sky-100 dark:border-sky-500 dark:bg-sky-200",
  neutral: "border-stone-400 bg-stone-100 dark:border-stone-500 dark:bg-stone-200",
};

interface DieFaceProps {
  value: number;
  tone?: keyof typeof TONES;
  rolling?: boolean;
  small?: boolean;
  winner?: boolean;
}

export function DieFace({ value, tone = "neutral", rolling = false, small = false, winner = false }: DieFaceProps) {
  const dots = PIPS[value] ?? [];
  const size = small ? "h-10 w-10 p-1.5 gap-0.5" : "h-14 w-14 p-2 gap-1";
  const dotSize = small ? "h-1.5 w-1.5" : "h-2.5 w-2.5";
  return (
    <div
      aria-label={`Die showing ${value}`}
      className={`grid grid-cols-3 grid-rows-3 rounded-lg border-2 ${size} ${TONES[tone]} ${
        rolling ? "animate-tumble" : ""
      } ${winner ? "ring-4 ring-emerald-500 dark:ring-emerald-400" : ""}`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={`m-auto rounded-full ${dotSize} ${dots.includes(i) ? "bg-stone-900" : "bg-transparent"}`} />
      ))}
    </div>
  );
}