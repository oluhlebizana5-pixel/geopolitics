"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { btnPrimary, input, link } from "@/lib/ui";
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
    <main className="mx-auto max-w-sm px-4 py-16">
      <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
      <h1 className="mb-5 text-2xl font-bold">Create account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input className={input} placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={input} type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm font-semibold">{error}</p>}
        <button disabled={busy} className={`${btnPrimary} h-11`}>
          {busy ? "Creating..." : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account? <Link className={link} href="/login">Log in</Link>
      </p>
    </div>
    </main>
  );
}