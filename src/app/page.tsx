import { ListTokensDropdown } from "./_components/listTokens";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-[url(/bg.png)] text-white">
        <div>
          <ListTokensDropdown />
        </div>
      </main>
    </HydrateClient>
  );
}
