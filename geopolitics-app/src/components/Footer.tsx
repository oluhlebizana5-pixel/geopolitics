import Link from "next/link";

export default function Footer() {
  const col = "space-y-3 text-sm";
  const linkClass = "block text-foreground hover:text-muted-foreground";
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Geopolitics</h2>
          <p className="text-sm text-muted-foreground">
            A single-player conquer-the-world strategy game with AI rivals and live commentary.
          </p>
        </div>
        <div className={col}>
          <h3 className="font-bold">Quick Links</h3>
          <Link href="/new" className={linkClass}>Start a game</Link>
          <Link href="/games" className={linkClass}>Games</Link>
          <Link href="/stats" className={linkClass}>Stats</Link>
        </div>
        <div className={col}>
          <h3 className="font-bold">Account</h3>
          <Link href="/my-games" className={linkClass}>My games</Link>
          <Link href="/login" className={linkClass}>Login</Link>
          <Link href="/signup" className={linkClass}>Sign Up</Link>
        </div>
        <div className={col}>
          <h3 className="font-bold">Project</h3>
          <a href="https://github.com/oluhlebizana5-pixel/geopolitics" target="_blank" rel="noreferrer" className={linkClass}>
            Source code on GitHub
          </a>
          <p className="text-muted-foreground">UCT Honours INF4001N</p>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 border-t border-border px-6 py-5 text-sm text-muted-foreground">
        <span>© 2026 Geopolitics. All rights reserved.</span>
        <span>Built with Next.js, Firebase &amp; Gemini</span>
      </div>
    </footer>
  );
}
