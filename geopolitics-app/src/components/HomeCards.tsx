import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameRecord, Outcome, PlatformStats, outcomeOf } from "@/lib/stats";
import { playerFlagCode } from "@/lib/flags";
import { cn } from "@/lib/utils";
import Flag from "./Flag";

const OUTCOME_TEXT: Record<Outcome, string> = { won: "Won", lost: "Lost", playing: "In progress" };

function SeeAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="outline" className="mt-auto w-full">
      <Link href={href}>
        {children} <ArrowRight />
      </Link>
    </Button>
  );
}

function CardShell({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[2.5rem] border border-border bg-card p-7 shadow-sm">
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mt-1 text-foreground/80">{text}</p>
      </div>
      {children}
    </section>
  );
}

export default function HomeCards({ records, platform, loaded }: { records: GameRecord[]; platform: PlatformStats | null; loaded: boolean }) {
  const live = records.slice(0, 4);
  const results = records.filter((r) => r.status === "finished").slice(0, 3);
  const leaders = platform?.leaderboard.slice(0, 5) ?? [];
  const empty = (msg: string) => <p className="py-6 text-center text-sm text-muted-foreground">{loaded ? msg : "Loading..."}</p>;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">The Ultimate Conquest Game</h2>
        <p className="mt-3 text-lg text-foreground/80">Watch games unfold live, climb the leaderboard and review results.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Live games */}
        <CardShell title="Live Games" text="Follow games as they happen. Anyone can watch.">
          <div className="flex flex-col gap-3">
            {live.length === 0
              ? empty("No games yet. Be the first!")
              : live.map((g) => (
                  <Link key={g.id} href={`/game/${g.id}`} className="flex items-center gap-3 rounded-2xl p-1 hover:bg-muted">
                    <Flag code={playerFlagCode(g.humanPlayerId)} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{g.ownerName}</span>
                      <span className="text-xs text-muted-foreground">
                        Round {g.round} · {g.countriesHeld} of 10 countries
                      </span>
                    </span>
                    <Badge variant={g.status === "finished" ? "default" : "secondary"}>
                      {g.status === "finished" ? "Finished" : "Live"}
                    </Badge>
                  </Link>
                ))}
          </div>
          <SeeAll href="/games">View all games</SeeAll>
        </CardShell>

        {/* Leaderboard */}
        <CardShell title="Top Players" text="See who has conquered the world the most.">
          <div className="flex flex-col gap-3">
            {leaders.length === 0
              ? empty("No wins yet. Be the first to conquer the world!")
              : leaders.map((row, i) => (
                  <div key={row.name + i} className="flex items-center gap-3 p-1">
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border border-border text-sm font-semibold",
                        i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      {i === 0 ? <Trophy className="size-4" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{row.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.games} game{row.games === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{row.wins} win{row.wins === 1 ? "" : "s"}</span>
                  </div>
                ))}
          </div>
          <SeeAll href="/stats">View full stats</SeeAll>
        </CardShell>

        {/* Recent results */}
        <CardShell title="Recent Results" text="Catch up on how the latest games ended.">
          <div className="flex flex-col gap-3">
            {results.length === 0
              ? empty("No finished games yet.")
              : results.map((g) => (
                  <Link key={g.id} href={`/game/${g.id}`} className="space-y-1 rounded-2xl p-1 hover:bg-muted">
                    <Badge variant="default">Round {g.round}</Badge>
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Flag code={playerFlagCode(g.humanPlayerId)} size={22} />
                        <span className="truncate">{g.ownerName}</span>
                      </span>
                      <span className="text-sm font-semibold">{OUTCOME_TEXT[outcomeOf(g)]}</span>
                    </span>
                  </Link>
                ))}
          </div>
          <SeeAll href="/games">View all results</SeeAll>
        </CardShell>
      </div>
    </section>
  );
}
