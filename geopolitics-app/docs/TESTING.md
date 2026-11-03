# Testing

```bash
npm test            # 133 fast tests, no setup needed (about 2 seconds)
npm run test:watch  # re-runs the tests every time you save a file
npm run test:rules  # tests firestore.rules against the Firebase emulator (needs Java)
npm run test:all    # both of the above
```

## What is tested

| Area | File | What it proves |
|---|---|---|
| Dice calculations | `tests/dice.test.ts` | Number of dice, higher die wins, ties cost nobody a soldier, every face 1–6 can appear, losses never exceed dice pairs, impossible battles are refused |
| Population calculations | `tests/population.test.ts` | Every population band boundary maps to the right starting soldiers (1–9), conquest reward, reinforcements per round, a new game gives each country its soldiers |
| Soldier transfers | `tests/game-rules.test.ts` | Total soldiers are conserved, a country keeps at least 1, 0 / negative / fractional / NaN / Infinity amounts and enemy or unknown countries are refused |
| Invalid attacks | `tests/game-rules.test.ts` | Own country, someone else's country, unknown country, 1-soldier attacker, second attack in a turn, changing target mid-battle, attacking after the game ended; a refused attack changes nothing |
| Player elimination | `tests/game-rules.test.ts` | Losing the last country eliminates a player, eliminated players are skipped, a player with several countries survives, holding all 10 wins |
| Reinforcements | `tests/game-rules.test.ts` | None in round 1, 2 per country from round 2, cannot over-place, cannot place on enemies, cannot attack/transfer/end turn before placing them |
| NPC decisions | `tests/npc.test.ts` | Win-chance estimate behaves like a probability, each personality attacks, retreats and reinforces differently, personalities are stable and all four are used, a whole NPC turn always explains itself and ends legally, a turn can resume from a mid-battle save |
| Access permissions | `tests/security.test.ts` | Everyone can read; only the signed-in owner can write; strangers and visitors are refused; no one can take over a game |
| Forged writes | `tests/security.test.ts` | Free soldiers, stolen soldiers, stronger enemies, taking a country without a conquest, oversized conquest rewards, several conquests in one save, fake elimination, skipping reinforcements, jumping rounds, fake wins, bad counts (`-5`, `1.5`, `NaN`) are all refused |
| Legal games are never refused | `tests/security.test.ts` | Eight complete simulated games (about 300–400 saves each, with conquests, eliminations and a win) are accepted step by step |
| Database operations | `tests/database.test.ts` | Create / read / update / delete behave as the rules say, a forged write leaves the stored game untouched, games survive a JSON round trip at every step, statistics records and the leaderboard are computed correctly |
| The real rules file | `tests/rules/firestore.rules.test.ts` | The same scenarios (plus the game log rules) run against `firestore.rules` itself in the Firebase emulator |

## How the database tests work

`npm test` uses a small in-memory database (`FakeGamesDb` in `tests/helpers.ts`) that applies the
checks in `src/lib/gameWriteRules.ts`. That file is a line-for-line TypeScript twin of
`firestore.rules`, so the logic can be tested in milliseconds. `npm run test:rules` then proves the
real rules file agrees, using the Firebase emulator, which never touches your real project.

`simulateGame(seed)` in `tests/helpers.ts` plays a whole game the way the app does (a simple bot
plays the human, NPCs use their personalities) and returns the saved document after *every* step,
so the tests exercise the same sequence of saves the live app produces. The same seed always gives
the same game.

## Running `npm run test:rules`

1. Install Java if `java -version` fails: https://adoptium.net (version 17 or newer).
2. `npm run test:rules`. The first run downloads the emulator (about 60 MB) and installs one small
   helper inside `tests/rules/`; that folder has its own `package.json` so it can never affect the
   Vercel build.
