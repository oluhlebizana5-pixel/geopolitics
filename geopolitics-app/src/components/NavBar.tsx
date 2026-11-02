"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { logOut } from "@/lib/firebaseService";
import { btnPrimary, btnSecondary, link } from "@/lib/ui";
import ThemeToggle from "./ThemeToggle";

export default function NavBar() {
  const { user, loading } = useAuth();
  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-accent-foreground">
          🌍 Geopolitics
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/" className={link}>Home</Link>
          <Link href="/new" className={link}>New game</Link>
          {user && <Link href="/my-games" className={link}>My games</Link>}
          <Link href="/stats" className={link}>Stats</Link>
          {loading ? null : user ? (
            <>
              <span className="text-muted-foreground">{user.displayName ?? user.email}</span>
              <button onClick={() => logOut()} className={btnSecondary}>Log out</button>
            </>
          ) : (
            <>
              <Link href="/login" className={link}>Log in</Link>
              <Link href="/signup" className={btnPrimary}>Sign up</Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}