import type { Card, HandCategory, HandRank } from "./types";

function evaluate5(cards: Card[]): HandRank {
  if (cards.length !== 5) throw new Error("evaluate5 requires exactly 5 cards");

  const sorted = cards.slice().sort((a, b) => b.r - a.r);
  const ranks = sorted.map((c) => c.r);
  const suits = sorted.map((c) => c.s);

  const isFlush = suits.every((s) => s === suits[0]);

  // Detect straight. Ranks are sorted desc. Standard straight: r0..r0-4.
  // Wheel (A-2-3-4-5): ranks = [14,5,4,3,2], straight high card = 5.
  let isStraight = false;
  let straightHigh = 0;
  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
    isStraight = true;
    straightHigh = ranks[0];
  } else if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    isStraight = true;
    straightHigh = 5;
  }

  // Group by rank
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = Array.from(counts.entries()).sort(([rA, cA], [rB, cB]) => {
    if (cA !== cB) return cB - cA;
    return rB - rA;
  });
  const groupCounts = groups.map(([, c]) => c);
  const groupRanks = groups.map(([r]) => r);

  let category: HandCategory = 0;
  let tiebreak: number[] = [];

  if (isStraight && isFlush) {
    category = 8;
    tiebreak = [straightHigh];
  } else if (groupCounts[0] === 4) {
    category = 7;
    tiebreak = [groupRanks[0], groupRanks[1]];
  } else if (groupCounts[0] === 3 && groupCounts[1] === 2) {
    category = 6;
    tiebreak = [groupRanks[0], groupRanks[1]];
  } else if (isFlush) {
    category = 5;
    tiebreak = ranks.slice();
  } else if (isStraight) {
    category = 4;
    tiebreak = [straightHigh];
  } else if (groupCounts[0] === 3) {
    category = 3;
    tiebreak = [groupRanks[0], ...groupRanks.slice(1, 3)];
  } else if (groupCounts[0] === 2 && groupCounts[1] === 2) {
    const [hp, lp] = [groupRanks[0], groupRanks[1]].sort((a, b) => b - a);
    category = 2;
    tiebreak = [hp, lp, groupRanks[2]];
  } else if (groupCounts[0] === 2) {
    category = 1;
    tiebreak = [groupRanks[0], ...groupRanks.slice(1, 4)];
  } else {
    category = 0;
    tiebreak = ranks.slice();
  }

  return { category, tiebreak, cards: sorted };
}

export function compareHands(a: HandRank, b: HandRank): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const x = a.tiebreak[i] ?? 0;
    const y = b.tiebreak[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

const COMBINATIONS_5_OF_7: ReadonlyArray<readonly number[]> = (() => {
  const out: number[][] = [];
  for (let a = 0; a < 7; a++)
    for (let b = a + 1; b < 7; b++)
      for (let c = b + 1; c < 7; c++)
        for (let d = c + 1; d < 7; d++)
          for (let e = d + 1; e < 7; e++) out.push([a, b, c, d, e]);
  return out;
})();

export function bestOfSeven(seven: Card[]): HandRank {
  if (seven.length !== 7) throw new Error("bestOfSeven requires exactly 7 cards");
  let best: HandRank | null = null;
  for (const idx of COMBINATIONS_5_OF_7) {
    const five = idx.map((i) => seven[i]);
    const r = evaluate5(five);
    if (best === null || compareHands(r, best) > 0) best = r;
  }
  return best!;
}

export function categoryName(c: HandCategory): string {
  return [
    "High Card",
    "Pair",
    "Two Pair",
    "Three of a Kind",
    "Straight",
    "Flush",
    "Full House",
    "Four of a Kind",
    "Straight Flush",
  ][c];
}
