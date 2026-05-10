import { randomInt } from "node:crypto";
import type { Card, Suit } from "./types";

const SUITS: Suit[] = ["c", "d", "h", "s"];

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (let r = 2; r <= 14; r++) {
    for (const s of SUITS) deck.push({ r, s });
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffledDeck(): Card[] {
  return shuffle(freshDeck());
}

const RANK_CHARS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

export function cardToString(c: Card): string {
  return `${RANK_CHARS[c.r - 2]}${c.s}`;
}

export function cardFromString(str: string): Card {
  const r = RANK_CHARS.indexOf(str[0]) + 2;
  const s = str[1] as Suit;
  if (r < 2 || r > 14 || !["c", "d", "h", "s"].includes(s)) {
    throw new Error(`Invalid card: ${str}`);
  }
  return { r, s };
}
