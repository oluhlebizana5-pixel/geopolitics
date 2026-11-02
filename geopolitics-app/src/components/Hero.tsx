import Link from "next/link";
import { ArrowRight, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center px-4 pt-16 pb-12 text-center md:pt-24">
      <Link
        href="/new"
        className="group inline-flex items-center gap-3 rounded-full border border-border bg-card py-1.5 pr-1.5 pl-5 text-sm shadow-sm hover:bg-muted"
      >
        Start your conquest today
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5">
          <ArrowRight className="size-4" />
        </span>
      </Link>

      <h1 className="mt-10 text-5xl leading-[1.05] font-normal tracking-tight text-balance sm:text-7xl">
        Geopolitics
        <br />
        Conquest Game
      </h1>

      <p className="mt-8 max-w-2xl text-lg leading-8 text-foreground/80">
        Pick your country, take on nine AI rivals and roll the dice to conquer the map. Experience smart NPC strategy
        with live, AI-written battle commentary.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
        <Button asChild size="lg" className="h-14 px-8 text-lg">
          <Link href="/new">
            <Swords className="size-5" /> Start a new game
          </Link>
        </Button>
        <Link href="/games" className="text-base hover:text-muted-foreground">
          Watch live games
        </Link>
      </div>
    </section>
  );
}
