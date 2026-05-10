export type StakeTier = "low" | "mid" | "high" | "vip";
export type GameType = "holdem" | "omaha";
export type LimitType = "no-limit" | "pot-limit";
export type TableState = "open" | "invite-only" | "full";

export type TableSpec = {
  id: string;
  name: string;
  game: GameType;
  limit: LimitType;
  tier: StakeTier;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  seats: number;
  vipOnly?: boolean;
  // Display-only (lobby cosmetics; gameplay uses `seats`)
  displaySeatsTotal: number;
  displaySeatsFilled: number;
  state: TableState;
};

export const TABLES: TableSpec[] = [
  {
    id: "the-royal-suite",
    name: "The Royal Suite",
    game: "holdem",
    limit: "no-limit",
    tier: "high",
    smallBlind: 100,
    bigBlind: 200,
    minBuyIn: 10000,
    maxBuyIn: 50000,
    seats: 6,
    displaySeatsTotal: 9,
    displaySeatsFilled: 6,
    state: "open",
  },
  {
    id: "emerald-deck",
    name: "Emerald Deck",
    game: "omaha",
    limit: "pot-limit",
    tier: "mid",
    smallBlind: 10,
    bigBlind: 25,
    minBuyIn: 1000,
    maxBuyIn: 5000,
    seats: 6,
    displaySeatsTotal: 9,
    displaySeatsFilled: 8,
    state: "open",
  },
  {
    id: "diamond-club",
    name: "Diamond Club",
    game: "holdem",
    limit: "no-limit",
    tier: "vip",
    smallBlind: 500,
    bigBlind: 1000,
    minBuyIn: 50000,
    maxBuyIn: 250000,
    seats: 6,
    vipOnly: true,
    displaySeatsTotal: 9,
    displaySeatsFilled: 0,
    state: "invite-only",
  },
  {
    id: "shadow-hold",
    name: "Shadow Hold",
    game: "holdem",
    limit: "no-limit",
    tier: "low",
    smallBlind: 1,
    bigBlind: 2,
    minBuyIn: 200,
    maxBuyIn: 1000,
    seats: 6,
    displaySeatsTotal: 9,
    displaySeatsFilled: 2,
    state: "open",
  },
  {
    id: "midnight-plo",
    name: "Midnight PLO",
    game: "omaha",
    limit: "pot-limit",
    tier: "mid",
    smallBlind: 5,
    bigBlind: 10,
    minBuyIn: 1000,
    maxBuyIn: 5000,
    seats: 6,
    displaySeatsTotal: 9,
    displaySeatsFilled: 9,
    state: "full",
  },
  {
    id: "neon-flush",
    name: "Neon Flush",
    game: "holdem",
    limit: "no-limit",
    tier: "low",
    smallBlind: 2,
    bigBlind: 5,
    minBuyIn: 500,
    maxBuyIn: 2500,
    seats: 6,
    displaySeatsTotal: 9,
    displaySeatsFilled: 4,
    state: "open",
  },
];

export function getTable(id: string): TableSpec | undefined {
  return TABLES.find((t) => t.id === id);
}
