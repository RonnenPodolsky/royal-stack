import type { Card as CardType, Suit } from "@/lib/poker/types";

const RANK_CHARS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

const SUIT_GLYPH: Record<Suit, string> = {
  s: "♠",
  c: "♣",
  h: "♥",
  d: "♦",
};

function isRed(s: Suit): boolean {
  return s === "h" || s === "d";
}

type Props = {
  card?: CardType | null;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  className?: string;
};

export function PlayingCard({ card, size = "md", faceDown = false, className = "" }: Props) {
  const dims = {
    sm: "w-10 h-14 text-base",
    md: "w-14 h-20 text-xl",
    lg: "w-20 h-28 text-2xl",
  }[size];

  if (faceDown || !card) {
    return (
      <div
        className={`${dims} bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl card-inner-shadow overflow-hidden relative ${className}`}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(#d97706 0.5px, transparent 0.5px)",
            backgroundSize: "8px 8px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-secondary opacity-50 text-3xl">
          ★
        </div>
      </div>
    );
  }

  const red = isRed(card.s);
  const color = red ? "text-red-600" : "text-black";

  return (
    <div
      className={`${dims} bg-white rounded-lg shadow-xl flex flex-col p-1.5 relative card-inner-shadow ${className}`}
    >
      <div className={`flex flex-col items-start leading-none ${color}`}>
        <span className="font-bold">{RANK_CHARS[card.r]}</span>
        <span className="text-[60%]">{SUIT_GLYPH[card.s]}</span>
      </div>
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${color}`}
      >
        <span className="text-[200%] leading-none">{SUIT_GLYPH[card.s]}</span>
      </div>
    </div>
  );
}
