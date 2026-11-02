import { BarChart3, Bot, Dices, Eye, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Dices,
    title: "Real dice battles",
    text: "Attackers and defenders roll against each other. Ties kill nobody, conquests reward the winner, and every roll is on screen.",
  },
  {
    icon: Bot,
    title: "NPCs that explain themselves",
    text: "Nine rivals play to win. Each move comes with a short reason in the game log, such as the odds that made them attack.",
  },
  {
    icon: Sparkles,
    title: "AI battle commentary",
    text: "A language model comments on the dice rolls like a sports commentator, with a built-in backup line if the AI is unavailable.",
  },
  {
    icon: Eye,
    title: "Watch live, play securely",
    text: "Share a game link and anyone can follow it as it happens. Only the logged-in owner can make moves.",
  },
  {
    icon: BarChart3,
    title: "Stats and history",
    text: "See your win rate, fastest win and every game you have played, plus a leaderboard for the whole platform.",
  },
  {
    icon: ShieldCheck,
    title: "Rules enforced everywhere",
    text: "Moves are validated in the game engine and again by the database rules, so illegal moves are rejected.",
  },
];

export default function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to take over the map</h2>
        <p className="mt-3 text-lg text-foreground/80">A complete strategy game that runs in your browser, with nothing to install.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-[2rem] border border-border bg-card p-7 shadow-sm">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Icon className="size-6" />
            </div>
            <h3 className="mt-5 text-lg font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
