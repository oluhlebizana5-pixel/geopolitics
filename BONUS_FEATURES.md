# Bonus feature: statistics and analytics

**Where:** the **Stats** page (`/stats`), plus the summary cards on the home page.
**Code:** `src/lib/stats.ts` (all calculations), `src/app/stats/page.tsx`, `src/components/HomeCards.tsx`.

## What it does

**Your results** (when signed in)

| Measure | Meaning |
|---|---|
| Games played, won, lost, in progress | Counted from your saved games |
| Win rate | Wins out of games that have finished (or where you were eliminated) |
| Fastest win | The lowest round number in which you conquered the world |
| Average rounds per win | How long your victories take |
| Most countries held | Your best position in any game |

**Platform statistics** (visible to everyone, including visitors who are not signed in)

* Number of games and players in the recent sample
* Overall human win rate and average game length in rounds
* A **leaderboard** of the players with the most wins (ties are broken by fewest games played, then by name)

## How it works

* Nothing extra is stored. Every figure is calculated from the saved game documents, so the
  statistics can never disagree with the games themselves.
* `recordFromData` turns a Firestore game document into a small record (who owned it, whether it
  finished, who won, whether the human was eliminated, how many countries they held).
  `computeStats`, `leaderboard` and `computePlatformStats` then work on those records.
* The calculations are plain functions with no Firebase code in them, so they are covered by
  automated tests (`tests/database.test.ts`).
* Public statistics work for visitors because the security rules allow anyone to read games.

## Why it is worth having

It gives players a reason to come back (beat your fastest win, climb the leaderboard), shows the
platform being used by more than one person, and demonstrates working with the NoSQL data beyond
simply loading one game.
