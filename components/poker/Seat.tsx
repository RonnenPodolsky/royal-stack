import type { Seat as SeatType, Card as CardType } from "@/lib/poker/types";
import { PlayingCard } from "./Card";
import { formatChips } from "@/lib/format";

type Props = {
  seat: SeatType;
  isMe: boolean;
  isToAct: boolean;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
};

export function Seat({ seat, isMe, isToAct, isDealer, isSB, isBB }: Props) {
  const folded = seat.status === "folded";
  const allin = seat.status === "allin";

  const stackText = allin ? "ALL-IN" : formatChips(seat.stack);
  const accent = isToAct
    ? "border-error shadow-[0_0_15px_rgba(255,180,171,0.4)] ring-2 ring-error/20"
    : "border-surface-container-high ring-2 ring-white/5";

  const badge = isDealer ? "D" : isSB ? "SB" : isBB ? "BB" : null;

  return (
    <div className={`flex flex-col items-center gap-2 ${folded ? "opacity-40" : ""}`}>
      <div className="flex gap-1 -mb-1">
        {!isMe && (seat.hole === null ? null : <CardBacks count={2} />)}
      </div>
      <div className={`w-16 h-16 rounded-full border-4 ${accent} overflow-hidden shadow-xl bg-surface-container-high flex items-center justify-center text-on-surface font-bold text-xl`}>
        {seat.displayName.slice(0, 1).toUpperCase()}
      </div>
      <div className="bg-surface-container-high px-3 py-0.5 rounded-full border border-white/10 relative whitespace-nowrap">
        <p className="font-label text-[10px] text-on-surface tracking-[0.1em] uppercase">
          {seat.displayName}
        </p>
        <p className={`font-stat text-sm text-center ${allin ? "text-error" : "text-secondary"}`}>
          {stackText}
        </p>
        {badge && (
          <div className="absolute -right-3 -top-2 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-[10px] shadow-lg border-2 border-[#2d2016]">
            {badge}
          </div>
        )}
      </div>
      {isMe && seat.hole && (
        <div className="flex gap-1 mt-2">
          <PlayingCard card={seat.hole[0]} size="md" />
          <PlayingCard card={seat.hole[1]} size="md" />
        </div>
      )}
      {!isMe && seat.hole !== null && (
        <div className="flex gap-1 mt-1">
          <PlayingCard card={seat.hole[0]} size="sm" />
          <PlayingCard card={seat.hole[1]} size="sm" />
        </div>
      )}
    </div>
  );
}

function CardBacks({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <PlayingCard key={i} faceDown size="sm" />
      ))}
    </>
  );
}

export function pileLayout(total: number): Array<{ left: string; top: string }> {
  if (total === 2) {
    return [
      { left: "50%", top: "85%" },
      { left: "50%", top: "10%" },
    ];
  }
  if (total === 3) {
    return [
      { left: "50%", top: "85%" },
      { left: "85%", top: "20%" },
      { left: "15%", top: "20%" },
    ];
  }
  if (total === 4) {
    return [
      { left: "50%", top: "85%" },
      { left: "92%", top: "45%" },
      { left: "50%", top: "10%" },
      { left: "8%", top: "45%" },
    ];
  }
  if (total === 5) {
    return [
      { left: "50%", top: "85%" },
      { left: "90%", top: "50%" },
      { left: "75%", top: "12%" },
      { left: "25%", top: "12%" },
      { left: "10%", top: "50%" },
    ];
  }
  if (total === 6) {
    return [
      { left: "50%", top: "85%" },
      { left: "90%", top: "55%" },
      { left: "85%", top: "12%" },
      { left: "50%", top: "5%" },
      { left: "15%", top: "12%" },
      { left: "10%", top: "55%" },
    ];
  }
  return Array.from({ length: total }, (_, i) => {
    const angle = (2 * Math.PI * i) / total - Math.PI / 2;
    return {
      left: `${50 + 40 * Math.cos(angle)}%`,
      top: `${50 + 40 * Math.sin(angle)}%`,
    };
  });
}
