"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { logOut } from "@/lib/firebaseService";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

export default function NavBar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/games", label: "Games" },
    { href: "/stats", label: "Stats" },
    ...(user ? [{ href: "/my-games", label: "My games" }] : []),
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const linkClass = (href: string) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-accent",
      isActive(href) ? "bg-accent font-medium" : "text-foreground"
    );

  const account = loading ? null : user ? (
    <>
      <span className="max-w-40 truncate px-2 text-sm text-muted-foreground">{user.displayName ?? user.email}</span>
      <Button asChild size="sm">
        <Link href="/new">New game</Link>
      </Button>
      <Button variant="outline" size="sm" onClick={() => logOut()}>
        Log out
      </Button>
    </>
  ) : (
    <>
      <Button asChild variant="outline" size="sm">
        <Link href="/login">Login</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/signup">Sign Up</Link>
      </Button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="mx-auto max-w-5xl rounded-3xl border border-border bg-card/90 shadow-sm backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold" aria-label="Geopolitics home">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Globe className="size-5" />
            </span>
            <span className="hidden sm:inline">Geopolitics</span>
          </Link>

          {/* Desktop */}
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)} aria-current={isActive(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {account}
            <ThemeToggle />
          </div>

          {/* Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button variant="outline" size="icon" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border px-4 pb-4 md:hidden">
            <nav aria-label="Mobile" className="flex flex-col gap-1 py-2">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={linkClass(l.href)}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3" onClick={() => setOpen(false)}>
              {account}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
