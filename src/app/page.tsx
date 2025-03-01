import { ListTokensDropdown } from "./_components/listTokens";
import { HydrateClient } from "~/trpc/server";
import { WalletConnectButton } from "./_components/walletConnectButton";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-[url(/bg.png)] text-white">
        <WalletConnectButton />
        <div className="mt-8">
          <ListTokensDropdown />
        </div>
      </main>
    </HydrateClient>
  );
}
