import { describe, it, expect } from "vitest";
import { bestOfSeven, compareHands } from "./evaluator";
import { cardFromString } from "./deck";
import type { Card } from "./types";

const c = (s: string): Card => cardFromString(s);
const hand = (...s: string[]): Card[] => s.map(c);

describe("evaluator: hand categories", () => {
  it("identifies straight flush", () => {
    const r = bestOfSeven(hand("9h", "Th", "Jh", "Qh", "Kh", "2c", "3d"));
    expect(r.category).toBe(8);
    expect(r.tiebreak[0]).toBe(13); // K-high straight flush
  });

  it("identifies four of a kind", () => {
    const r = bestOfSeven(hand("Ah", "Ad", "Ac", "As", "5h", "2c", "3d"));
    expect(r.category).toBe(7);
    expect(r.tiebreak).toEqual([14, 5]);
  });

  it("identifies full house", () => {
    const r = bestOfSeven(hand("Kh", "Kd", "Kc", "5s", "5h", "2c", "3d"));
    expect(r.category).toBe(6);
    expect(r.tiebreak).toEqual([13, 5]);
  });

  it("identifies flush over straight", () => {
    const r = bestOfSeven(hand("2h", "5h", "8h", "Jh", "Kh", "3c", "4d"));
    expect(r.category).toBe(5);
  });

  it("identifies wheel straight (A-2-3-4-5)", () => {
    const r = bestOfSeven(hand("Ah", "2d", "3c", "4s", "5h", "Jc", "Kd"));
    expect(r.category).toBe(4);
    expect(r.tiebreak[0]).toBe(5);
  });

  it("identifies broadway straight", () => {
    const r = bestOfSeven(hand("Th", "Jd", "Qc", "Ks", "Ah", "2c", "3d"));
    expect(r.category).toBe(4);
    expect(r.tiebreak[0]).toBe(14);
  });

  it("identifies three of a kind", () => {
    const r = bestOfSeven(hand("Qh", "Qd", "Qc", "5s", "8h", "2c", "3d"));
    expect(r.category).toBe(3);
    expect(r.tiebreak).toEqual([12, 8, 5]);
  });

  it("identifies two pair", () => {
    const r = bestOfSeven(hand("Ah", "Ad", "5c", "5s", "Kh", "2c", "3d"));
    expect(r.category).toBe(2);
    expect(r.tiebreak).toEqual([14, 5, 13]);
  });

  it("identifies one pair", () => {
    const r = bestOfSeven(hand("Ah", "Ad", "Tc", "5s", "Kh", "2c", "3d"));
    expect(r.category).toBe(1);
    expect(r.tiebreak).toEqual([14, 13, 10, 5]);
  });

  it("identifies high card", () => {
    const r = bestOfSeven(hand("Ah", "Kd", "Tc", "5s", "8h", "2c", "3d"));
    expect(r.category).toBe(0);
    expect(r.tiebreak).toEqual([14, 13, 10, 8, 5]);
  });
});

describe("evaluator: comparisons", () => {
  it("flush beats straight", () => {
    const flush = bestOfSeven(hand("2h", "5h", "8h", "Jh", "Kh", "3c", "4d"));
    const straight = bestOfSeven(hand("Th", "Jd", "Qc", "Ks", "Ah", "2c", "3d"));
    expect(compareHands(flush, straight)).toBeGreaterThan(0);
  });

  it("higher quads beat lower quads", () => {
    const aces = bestOfSeven(hand("Ah", "Ad", "Ac", "As", "5h", "2c", "3d"));
    const kings = bestOfSeven(hand("Kh", "Kd", "Kc", "Ks", "5h", "2c", "3d"));
    expect(compareHands(aces, kings)).toBeGreaterThan(0);
  });

  it("kicker resolves tied pair", () => {
    const aceKings = bestOfSeven(hand("Ah", "Ad", "Kc", "5s", "8h", "2c", "3d"));
    const aceQueens = bestOfSeven(hand("Ah", "Ad", "Qc", "5s", "8h", "2c", "3d"));
    expect(compareHands(aceKings, aceQueens)).toBeGreaterThan(0);
  });

  it("split: identical board hands tie", () => {
    // Both players have same best 5 cards
    const a = bestOfSeven(hand("2h", "3d", "Ah", "Kh", "Qh", "Jh", "Th"));
    const b = bestOfSeven(hand("4c", "5d", "Ah", "Kh", "Qh", "Jh", "Th"));
    expect(compareHands(a, b)).toBe(0);
  });
});
