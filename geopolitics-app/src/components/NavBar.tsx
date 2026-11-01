"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { logOut } from "@/lib/firebaseService";

export default function NavBar() {
  const { user, loading } = useAuth();
  return (
    <nav className="border-b border-slate-700 bg-slate-950/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          🌍 Geopolitics
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/new" className="hover:underline">
            New game
          </Link>
          {loading ? null : user ? (
            <>
              <span className="text-slate-400">{user.displayName ?? user.email}</span>
              <button onClick={() => logOut()} className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
              <Link href="/signup" className="rounded bg-emerald-600 px-3 py-1 hover:bg-emerald-500">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}