"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp, friendlyError } from "@/lib/firebaseService";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await signUp(email, password, name);
      router.push("/");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">Create account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input className="rounded bg-slate-800 p-2" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="rounded bg-slate-800 p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="rounded bg-slate-800 p-2" type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="rounded bg-emerald-600 p-2 font-semibold disabled:opacity-50">
          {busy ? "Creating..." : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account? <Link className="underline" href="/login">Log in</Link>
      </p>
    </main>
  );
}