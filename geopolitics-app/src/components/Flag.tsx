import { cn } from "@/lib/utils";
import { flagCode } from "@/lib/flags";

// Round flag picture (works offline: the images come with the flag-icons package, so no Windows emoji problem).
export default function Flag({ code, size = 28, className }: { code: string; size?: number; className?: string }) {
  const a2 = flagCode(code);
  return (
    <span
      role="img"
      aria-label={`Flag of ${code}`}
      className={cn("fi fis inline-block shrink-0 rounded-full border border-border bg-muted", a2 && `fi-${a2}`, className)}
      style={{ fontSize: size }}
    />
  );
}
