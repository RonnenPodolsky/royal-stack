# Royal Stack

Play-money Texas Hold'em vs. AI bots. Single-player, no real currency, no rake.

## Stack
- Next.js 16.2.6 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 (Oxide engine)
- Vitest for unit + integration tests
- File-based JSON persistence (no database)

## Run

```bash
npm install
npm run dev          # Turbopack — fastest hot reload
npm run dev:lite     # webpack + 1 GB Node heap cap — safer on low-RAM machines
npm test             # 40 unit + integration tests
npm run lint         # ESLint
```

The dev server runs on http://localhost:3010.

## Routes
| Path | Purpose |
|---|---|
| `/` | Redirects to `/lobby` |
| `/lobby` | Table browser with live filters and quick-join |
| `/table/[id]` | The poker table — your hand vs. bots |
| `/cashier` | Vault & Rewards: bankroll, daily claim, chip bundle shop |
| `/profile` | Player stats: rank, win/loss chart, hand history |
| `/api/me` | Current user record |
| `/api/cashier/claim` | Claim daily $5,000 (24h cooldown) |
| `/api/table/[id]` | Public state of a table (filtered for caller) |
| `/api/table/[id]/act` | Submit an action: fold/check/call/bet/raise/allin |

## Architecture

### Auth
Anonymous cookie identity (`rs_uid`) set by `proxy.ts` on first request. No passwords, no login form. The cookie is the user. Sessions persist forever (1-year max age).

### Game state
Lives in two in-memory `Map`s in `lib/server/`:
- `users.ts` — `Map<userId, UserRecord>` (bankroll, stats, daily claim cooldown)
- `tables.ts` — `Map<tableId, Runtime>` (active game state)

### Persistence
`lib/server/persistence.ts` provides debounced, atomic JSON file writes to `.data/`. Used by `users.ts` to survive server restarts. Live game runtimes (`tables.ts`) are intentionally ephemeral — restart loses any in-progress hand, but the user's bankroll and stats persist, and active buy-ins are restored without double-debiting.

### Poker engine
Pure functions in `lib/poker/`:
- `deck.ts` — Fisher-Yates shuffle seeded by `crypto.randomBytes`
- `evaluator.ts` — 5-of-7 hand ranker (no precomputed tables)
- `engine.ts` — `(state, action) -> nextState` reducer with full Texas Hold'em rules: blinds, betting rounds, side pots, all-in, fold-around, showdown
- `bot.ts` — Simple rule-based AI: hand-strength + position

26 unit tests cover the engine and evaluator. 10 integration tests cover the runtime + auth boundary (action-out-of-turn rejection, hole-card leakage, restart-safe buy-ins).

## Intentional limitations
- **One human per table.** Multi-human play (multiplayer) is not implemented in Phase 1.
- **Hand-in-progress is lost on server restart.** Bankroll and active buy-in survive; the in-flight hand restarts.
- **Tournaments and Leaderboard** are visible in the nav but disabled — not implemented.
- **Live Chat** panel on the game table is visual only; not wired to a backend.
- **Stats shown on Profile and Cashier** (12,482 active players, GOLD IV rank, transaction history rows) are static design data, not real session data.

## Files

```
app/              Next.js App Router pages and API routes
components/
  layout/         TopBar, SideNav, BottomNav
  poker/          Card, Seat, ActionBar
  ui/             Icon
lib/
  poker/          Pure game engine
  server/         In-memory user + table runtime; persistence helper
  tables.ts       Static table catalog (stakes, names, display fill counts)
  format.ts       Currency formatter
proxy.ts          Cookie-setting middleware (Next 16 calls this "proxy")
.data/            Persisted JSON (auto-created; gitignored)
```
