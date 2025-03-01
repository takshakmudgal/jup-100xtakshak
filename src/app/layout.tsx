import "~/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { WalletProvider } from "~/app/providers/wallet-providert";

export const metadata: Metadata = {
  title: "100xtakshak",
  description: "Your go-to-crypto payment gateway for merchants!",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <TRPCReactProvider>
          <WalletProvider>{children}</WalletProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
