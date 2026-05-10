export type Suit = "c" | "d" | "h" | "s";

export type Card = {
  r: number;
  s: Suit;
};

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown" | "ended";

export type SeatStatus = "active" | "folded" | "allin" | "sittingout";

export type Seat = {
  id: string;
  displayName: string;
  isBot: boolean;
  stack: number;
  hole: [Card, Card] | null;
  status: SeatStatus;
  contributed: number;
  betThisStreet: number;
  hasActedThisStreet: boolean;
};

export type Action =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "bet"; amount: number }
  | { type: "raise"; amount: number }
  | { type: "allin" };

export type ActionType = Action["type"];

export type LogEntry = {
  handNumber: number;
  street: Street;
  message: string;
  ts: number;
};

export type ShowdownResult = {
  winners: Array<{ seatIdx: number; amount: number; bestHand?: HandRank }>;
};

export type GameState = {
  tableId: string;
  smallBlind: number;
  bigBlind: number;
  seats: Seat[];
  dealerIdx: number;
  street: Street;
  deck: Card[];
  board: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  toActIdx: number;
  lastAggressorIdx: number | null;
  handNumber: number;
  log: LogEntry[];
  lastShowdown: ShowdownResult | null;
  // When set, a betting round just ended and the next street's cards are
  // waiting to be dealt. revealPendingStreet() flips the cards and resets
  // toActIdx. Splitting this from the closing action lets the UI render
  // the action first, then the cards a tick later.
  pendingDeal?: Street | null;
};

export type HandCategory =
  | 0 // high card
  | 1 // pair
  | 2 // two pair
  | 3 // three of a kind
  | 4 // straight
  | 5 // flush
  | 6 // full house
  | 7 // four of a kind
  | 8; // straight flush

export type HandRank = {
  category: HandCategory;
  tiebreak: number[]; // ranks ordered for lex comparison
  cards: Card[]; // the best 5 cards
};
