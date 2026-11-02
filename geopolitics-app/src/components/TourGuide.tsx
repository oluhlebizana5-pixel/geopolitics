"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  { title: "Welcome to Geopolitics!", text: "Let's take a quick tour to help you get started. This will only take a minute!" },
  { title: "Start a game", text: "Log in, press Start a new game and pick your country. Nine other countries are chosen at random as your rivals." },
  { title: "Read the board", text: "Every country shows its flag, owner and soldier count. Your countries are pink. Soldiers at the start depend on population." },
  { title: "Fight with dice", text: "Choose where to attack from and who to attack. Dice are rolled for both sides, and the battle panel shows every roll." },
  { title: "Follow the NPCs", text: "Rivals play to win, and the game log gives the reason for each of their moves. Use Fast-forward to speed them up." },
  { title: "Share and compare", text: "Share your game link so anyone can watch live. Check the Stats page for your win rate and the leaderboard." },
];

export default function TourGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
        className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-md hover:bg-muted"
      >
        <Sparkles className="size-4" /> Tour Guide
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-md" role="presentation" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            className="w-full max-w-md rounded-[2rem] border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="tour-title" className="text-lg font-bold">{current.title}</h2>
                <p className="text-sm text-muted-foreground">
                  Step {step + 1} of {STEPS.length}
                </p>
              </div>
              <button type="button" aria-label="Close tour" onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>

            <p className="mt-5 text-sm leading-6">{current.text}</p>

            <div className="mt-6 flex items-center justify-between">
              {step === 0 ? (
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Skip Tour
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                  <ArrowLeft /> Back
                </Button>
              )}
              <Button size="sm" onClick={() => (last ? setOpen(false) : setStep(step + 1))}>
                {last ? "Finish" : "Next"} {!last && <ArrowRight />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
