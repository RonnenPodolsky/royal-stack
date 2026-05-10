import { redirect } from "next/navigation";
import { getOrCreateSessionUser } from "@/lib/server/session";
import { getMySeatIdx, getPublicState, joinTable } from "@/lib/server/tables";
import { getTable } from "@/lib/tables";
import { TableClient } from "./TableClient";

type Params = Promise<{ id: string }>;

export default async function TablePage({ params }: { params: Params }) {
  const { id } = await params;
  const spec = getTable(id);
  if (!spec) redirect("/lobby");

  const user = await getOrCreateSessionUser();
  const result = await joinTable({ tableId: id, userId: user.id });
  if ("error" in result) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-headline-md font-display text-error">Cannot join table</h1>
        <p className="text-on-surface-variant">{result.error}</p>
        <a href="/lobby" className="text-primary underline">
          Back to lobby
        </a>
      </main>
    );
  }
  const state = getPublicState({ tableId: id, userId: user.id });
  const seatIdx = getMySeatIdx({ tableId: id, userId: user.id });
  if (!state || seatIdx === null) redirect("/lobby");
  return (
    <TableClient
      tableId={id}
      initialState={state}
      initialMySeatIdx={seatIdx}
      initialBankroll={user.bankroll}
      username={user.displayName}
    />
  );
}
