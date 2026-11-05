# Geopolitics

A single-player, Risk-style strategy game. You and nine computer-controlled countries fight for
the world with dice, reinforcements and conquests. Every NPC decision is shown with its
reasoning, battles get live AI commentary, and anybody can watch a game, but only its owner can
play it.

**Live site:** https://geopolitics-u3jz.vercel.app/
**Source code:** https://github.com/oluhlebizana5-pixel/geopolitics

> Built for the UCT Honours INF4001N entrance task.

## Demo account

| | |
|---|---|
| E-mail | **linashasha@gmail.com** |
| Password | **linashasha** |

Anybody can also create their own account on the Sign Up page. Visitors who are not signed in can
still browse every game, watch it live, and see the statistics.

## Contents

1. [Features](#features)
2. [How the game works](#how-the-game-works)
3. [Tech stack](#tech-stack)
4. [Running it locally](#running-it-locally)
5. [Environment variables](#environment-variables)
6. [Database design (NoSQL)](#database-design-nosql)
7. [Security and validation](#security-and-validation)
8. [NPC intelligence](#npc-intelligence)
9. [AI battle commentary](#ai-battle-commentary)
10. [Bonus feature](#bonus-feature)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Project structure](#project-structure)
14. [Assumptions](#assumptions)
15. [Limitations](#limitations)
16. [Marker access](#marker-access)

## Features

| Requirement | Where to find it |
|---|---|
| 10 countries, each with a population, flag and soldiers | New game page, game board |
| Starting soldiers from population | `src/lib/classes/rules.ts` |
| Turn-based play with dice battles | Game page, `BattleEngine.ts`, dice animation |
| Reinforcements, conquests and transfers | Game page controls, `Game.ts` |
| Player elimination and a winner | `Game.ts` (`attack`, `checkWin`) |
| NPC opponents with **visible reasoning** | Game log: every NPC action has a plain-English explanation |
| Distinct NPC personalities | "Meet the NPC leaders" panel on the game page |
| Fast-forward | Speed button during NPC turns |
| AI battle commentary | Game log, with a built-in fallback if the AI is unavailable |
| Public viewing, owner-only play | Anyone can open a game link; controls are disabled for non-owners and enforced by Firestore rules |
| NoSQL database | Cloud Firestore, see [Database design](#database-design-nosql) |
| Accounts | Firebase Authentication (e-mail and password) |
| Game history, games list and statistics | Games, My games and Stats pages |
| Light and dark mode | Toggle in the navigation bar |
| Tour guide | "Tour Guide" button, bottom corner of every page |
| Automated tests | `npm test` (133 tests) |

## How the game works

* **Setup.** You pick your country; nine NPC countries are added. Each country starts with
  1 to 9 soldiers depending on its population:

  | Population | Starting soldiers |
  |---|---|
  | up to 5 million | 1 |
  | up to 10 million | 2 |
  | up to 25 million | 3 |
  | up to 50 million | 4 |
  | up to 75 million | 5 |
  | up to 100 million | 6 |
  | up to 125 million | 7 |
  | up to 150 million | 8 |
  | over 150 million | 9 |

* **Turn order** is shuffled once at the start. Eliminated players are skipped.
* **Reinforcements.** There are none in round 1. From round 2 a player receives **2 soldiers per
  country held** at the start of their turn and must place them all before attacking, moving
  soldiers or ending the turn.
* **Attack.** One attack per turn, from a country with at least 2 soldiers against a country you
  do not own. A battle is a series of dice rounds that you can continue or stop.
  Each round uses `min(attacker soldiers - 1, defender soldiers)` dice per side. The highest dice
  are paired; the higher die wins a pair and the loser loses one soldier. Ties cost nobody a soldier.
* **Conquest.** When a defender reaches 0 soldiers the attacker takes the country and it receives
  half of the defender's soldiers from the start of the battle (minimum 2).
* **Transfer.** After placing reinforcements, move soldiers between your own countries. Each
  country must keep at least 1.
* **Elimination.** A player who loses their last country is out.
* **Winning.** Hold all 10 countries.

## Tech stack

| Part | Choice |
|---|---|
| Framework | Next.js 16 (App Router) with React 19 and TypeScript |
| Styling | Tailwind CSS v4, shadcn-style components, lucide icons, `flag-icons` |
| Database | Cloud Firestore (NoSQL) with live `onSnapshot` listeners |
| Accounts | Firebase Authentication |
| AI commentary | Google Gemini (default), or Anthropic / OpenAI, called from a server route |
| Tests | Vitest, plus the Firebase emulator for the security rules |
| Hosting | Vercel |

## Running it locally

You need Node.js 20.9 or newer.

```bash
git clone https://github.com/oluhlebizana5-pixel/geopolitics.git
cd geopolitics/geopolitics-app
npm install
```

Create a file called `.env.local` in `geopolitics-app` (see the next section), then:

```bash
npm run dev
```

and open http://localhost:3000. If styles do not load in development, use `npm run dev -- --webpack`.

### Setting up Firebase (about 5 minutes)

1. In the [Firebase console](https://console.firebase.google.com) create a project.
2. **Build → Authentication → Get started → Sign-in method →** enable **Email/Password**.
3. **Build → Firestore Database → Create database** (production mode).
4. **Project settings → Your apps → Add web app**, and copy the config values into `.env.local`.
5. **Firestore → Rules:** paste the contents of `firestore.rules` and press **Publish**.
6. **Authentication → Settings → Authorized domains:** add your deployed domain (localhost is already there).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | yes | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | yes | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | yes | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | yes | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | yes | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | yes | Firebase web config |
| `GEMINI_API_KEY` | for AI commentary | Secret. Read **only on the server**, never sent to the browser |
| `COMMENTARY_MODEL` | no | Model name, e.g. `gemini-flash-latest` |
| `COMMENTARY_PROVIDER` | no | Force `gemini`, `anthropic` or `openai` |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | no | Alternative AI providers |

The `NEXT_PUBLIC_` values are Firebase web identifiers, which are designed to be public; access is
controlled by the security rules. **Never commit `.env.local`.** If no AI key is set the game works
normally and uses built-in template commentary.

## Database design (NoSQL)

The full write-up, with every field, is in [`docs/DATABASE.md`](docs/DATABASE.md).

![Database design diagram](docs/database-diagram.png)

**Why a document database?** A game is one natural document: everything needed to draw the board
is read together, and viewers watch it through a single live listener. The log grows without limit,
so it is a subcollection and appending to it never rewrites the game.

```
games/{gameId}                 one document per game
 ├─ ownerUid, ownerName, humanPlayerId, status, round, currentPlayerId, turnOrder[],
 │  winnerId, pendingReinforcements, attackUsed, battle, updatedAt
 ├─ players[10]    { id, name, isNpc, eliminated }
 ├─ countries[10]  { code, name, population, ownerId, soldiers }
 └─ log/{entryId}  one document per event: { type, playerId, playerName, message, ..., commentary, commentarySource, createdAt }
```

Accounts live in Firebase Authentication. Statistics and the leaderboard are calculated from the
game documents, so they can never disagree with the games.

## Security and validation

* **Public viewing, owner-only play.** Firestore rules allow anyone to read a game and its log,
  but only the signed-in owner may change it, and nobody may delete a game.
* **Validated saves.** `firestore.rules` checks every save against the previous version of the
  document, so editing the database directly cannot change soldier counts or ownership. Soldiers
  only appear through reinforcements, enemy countries can never gain soldiers, a country only
  changes owner through a conquest with exactly the allowed reward, eliminated players cannot
  return, the turn only moves on correctly with the right reinforcements, a win requires all 10
  countries, and a finished game is frozen. Log entries cannot be edited or removed, apart from
  attaching AI commentary.
* **Engine validation.** The game engine rejects every illegal move with a clear message (invalid
  amounts, wrong owner, second attack, etc.) before anything is saved.
* **Secrets.** The AI key is only used by `/api/commentary`, which checks the caller's Firebase ID
  token and applies a per-user rate limit.
* **Tests.** The rules are tested in TypeScript (`src/lib/gameWriteRules.ts`) and against the
  Firebase emulator, including about 20 kinds of forged writes.

## NPC intelligence

Each NPC turn is: reinforce, choose an attack, fight (continuing or retreating after each round),
transfer, end turn. Every step is logged with a sentence explaining *why*.

* **Evaluation.** The NPC estimates its chance to conquer a target with a Monte Carlo simulation
  of the real dice rules, and scores targets by chance × reward, with bonuses for eliminating a
  rival or winning the game.
* **Personalities.** Each NPC is given one of four personalities, shown on the board and in the log:

  | Personality | Attacks at | Retreats below | Reinforces | Style |
  |---|---|---|---|---|
  | 🔥 Aggressive | 35% | 15% | strongest country | Takes risks, rarely retreats |
  | 🛡️ Cautious | 70% | 45% | weakest country | Only near-certain wins |
  | 🦅 Opportunist | 45% | 25% | strongest country | Hunts nearly eliminated rivals |
  | ⚖️ Balanced | 50% | 30% | strongest country | Fair fights |

  A personality is derived from the NPC's position in the sorted list of NPC ids, so it is the same
  after a reload without being stored.
* **Fast-forward** shortens the pause between steps; every event is still shown and saved.
* **Resumable.** Progress is saved after every step, so a refresh or closed tab continues from
  where the turn had got to.

## AI battle commentary

After each dice round the browser sends only plain facts (rolls, losses, outcome) to
`/api/commentary`, which asks the model for one or two sentences of sports-style commentary. To
stay within rate limits, ordinary rounds are throttled to about one AI call per 7 seconds, while
conquests, eliminations and the final victory always get AI commentary. If the AI is unavailable
(no key, rate limit, overload) a template sentence is used instead, so the game never waits on
it. Each log entry records whether its text came from the AI or the fallback.

## Bonus feature

**Statistics and analytics** (`/stats`, `BONUS_FEATURES.md`). Personal results (played, won, lost,
win rate, fastest win, most countries held) and platform-wide figures with a leaderboard, all
calculated from the stored games. Visitors can see the platform statistics without signing in.

## Testing

```bash
npm test            # 133 tests, about 2 seconds
npm run test:rules  # Firestore rules against the emulator (needs Java)
```

Covers dice, population bands, transfers, invalid attacks, elimination, reinforcements, NPC
decisions, access permissions, forged writes and database operations, including eight complete
simulated games checked save by save. See [`docs/TESTING.md`](docs/TESTING.md).

## Deployment

Hosted on Vercel from this repository. In Vercel set **Root Directory** to `geopolitics-app`, add
the environment variables above, and add the deployed domain to Firebase Authentication's
authorised domains. Pushing to `main` redeploys automatically; a failed build leaves the previous
version live.

## Project structure

```
geopolitics-app/
├─ firestore.rules            security rules
├─ docs/                      database design, testing notes
├─ tests/                     Vitest tests (+ tests/rules for the emulator)
└─ src/
   ├─ app/                    pages: home, games, my-games, new, game/[id], stats, login, signup, api/commentary
   ├─ components/             board, dice, battle panel, log, nav bar, hero, tour guide, shadcn-style ui/
   └─ lib/
      ├─ classes/             Game, Country, Player, BattleEngine, NpcStrategy, HumanActions, rules
      ├─ gameWriteRules.ts    the save-validation rules in TypeScript
      ├─ firebaseService.ts   all Firestore reads and writes
      ├─ useGameSession.ts    live game state, NPC loop, commentary
      └─ commentary*.ts       AI commentary (client, server, shared)
```

## Assumptions

* Countries and populations are approximate current figures and can be edited in `src/lib/countriesData.ts`.
* One human player per game; the nine opponents are always NPCs.
* A tie on a pair of dice costs nobody a soldier.
* The conquest reward is half of the defender's soldiers *at the start of the battle*, minimum 2.
* One attack per turn, but that attack may be continued for as many rounds as the attacker chooses.
* "Owner" means the account that created the game.

## Limitations

* **The dice are rolled in the browser.** The Firestore rules prove every save is a legal step, but
  cannot re-roll dice, so they cannot prove a particular dice result was fair. A fully
  authoritative version would roll dice and apply moves on a server (a Cloud Function or API route
  using the Firebase Admin SDK).
* The turn order cannot be fully re-derived by the rules, so a determined owner could repeat their
  own turn with a legal-looking save. They would still be unable to create soldiers or countries.
* AI commentary is best-effort and rate-limited; the free Gemini tier can respond with HTTP 429 or 503,
  in which case the template fallback is shown.
* The rate limit on the commentary route is kept per server instance and is best effort.
* Statistics are computed from a recent sample of games, which is fine at this scale but would
  need pre-aggregation for a very large number of games.

## Marker access

The Firebase project (Authentication and Firestore) has been shared with:

* ammarcanani@gmail.com
* mc.tanner@uct.ac.za
* ridewaan.hanslo@uct.ac.za

The submission zip excludes `node_modules`, `.next` and every `.env*` file.
