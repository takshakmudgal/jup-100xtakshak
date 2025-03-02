"use client";

import { useMemo } from "react";
import type { Adapter } from "@jup-ag/wallet-adapter";
import { UnifiedWalletProvider } from "@jup-ag/wallet-adapter";
import { useWrappedReownAdapter } from "@jup-ag/jup-mobile-adapter";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import type { Cluster } from "@solana/web3.js";

const APP_NAME = "100xtakshak";
const APP_DESCRIPTION = "Your go-to-crypto payment gateway for merchants!";
const APP_ICON = "https://assets.reown.com/reown-profile-pic.png";
const getOriginUrl = () =>
  typeof window !== "undefined" ? window.location.origin : "";

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ??
    "devnet") as Cluster;

  const { reownAdapter, jupiterAdapter } = useWrappedReownAdapter({
    appKitOptions: {
      metadata: {
        name: APP_NAME,
        description: APP_DESCRIPTION,
        url: getOriginUrl(),
        icons: [APP_ICON],
      },
      projectId: "630bc11948116a1383a7b13151bcdb30",
      features: {
        analytics: false,
        socials: ["google", "x", "apple"],
        email: false,
      },
      enableWallets: false,
    },
  });

  const wallets = useMemo(() => {
    const adapters = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
      reownAdapter,
      jupiterAdapter,
    ];
    return adapters.filter(
      (adapter) => adapter && adapter.name && adapter.icon,
    ) as Adapter[];
  }, [reownAdapter, jupiterAdapter]);

  return (
    <UnifiedWalletProvider
      wallets={wallets}
      config={{
        autoConnect: true,
        env: network,
        metadata: {
          name: APP_NAME,
          description: APP_DESCRIPTION,
          url: getOriginUrl(),
          iconUrls: [APP_ICON],
        },
        walletlistExplanation: {
          href: "https://station.jup.ag/docs/additional-topics/wallet-list",
        },
        theme: "dark",
        lang: "en",
      }}
    >
      {children}
    </UnifiedWalletProvider>
  );
};
