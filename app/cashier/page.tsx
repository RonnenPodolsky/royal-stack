import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { SideNav } from "@/components/layout/SideNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { getOrCreateSessionUser, isAuthenticated } from "@/lib/server/session";
import { CashierClient } from "./CashierClient";

export default async function CashierPage() {
  if (!(await isAuthenticated())) {
    redirect("/login?callbackUrl=%2Fcashier");
  }
  const user = await getOrCreateSessionUser();
  return (
    <>
      <TopBar
        bankroll={user.bankroll}
        username={user.displayName}
        email={user.email}
        avatarUrl={user.avatarUrl}
        active="cashier"
        balanceTone="secondary"
      />
      <SideNav active="cashier" />
      <BottomNav active="shop" />
      <main className="lg:pl-64 pt-24 pb-32 px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto">
        <CashierClient
          initialBankroll={user.bankroll}
          initialLastClaimAt={user.lastClaimAt}
        />
      </main>
    </>
  );
}
