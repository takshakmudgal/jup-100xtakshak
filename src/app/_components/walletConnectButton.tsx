"use client";

import { UnifiedWalletButton } from "@jup-ag/wallet-adapter";

export const WalletConnectButton = () => {
  return (
    <div className="flex items-center justify-end p-4">
      <UnifiedWalletButton />
    </div>
  );
};
