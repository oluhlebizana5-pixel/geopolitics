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

// Dots must stay dark on the pink die in dark mode too, so each tone says which dot colour to use.
const PIP = {
  attacker: "bg-primary-foreground",
  defender: "bg-foreground",
  neutral: "bg-foreground",
};

const TONES = {
  attacker: "border-foreground/30 bg-primary",
  defender: "border-foreground/30 bg-card",
  neutral: "border-border bg-muted",
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
      className={`grid grid-cols-3 grid-rows-3 rounded-xl border-2 ${size} ${TONES[tone]} ${
        rolling ? "animate-tumble" : ""
      } ${winner ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""}`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={`m-auto rounded-full ${dotSize} ${dots.includes(i) ? PIP[tone] : "bg-transparent"}`} />
      ))}
    </div>
  );
}