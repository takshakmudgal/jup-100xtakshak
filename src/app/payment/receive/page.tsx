"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { QRCodeSVG } from "qrcode.react";
import { toast, Toaster } from "react-hot-toast";
import { WalletConnectButton } from "~/app/_components/walletConnectButton";
import Link from "next/link";

export default function ReceivePaymentPage() {
  const { publicKey, connected } = useWallet();
  const [copied, setCopied] = useState(false);
  const walletAddress = publicKey?.toBase58() ?? "";

  const isDevnet = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet";

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const copyToClipboard = async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy address:", err);
      toast.error("Failed to copy address");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[url(/bg.png)] text-white">
      <Toaster position="top-right" />

      <div className="absolute right-4 top-4">
        <WalletConnectButton />
      </div>

      <div className="flex w-full max-w-md flex-col items-center rounded-xl bg-black/30 p-8 backdrop-blur-md">
        <h1 className="mb-8 text-3xl font-bold">Receive Payment</h1>

        {isDevnet && (
          <div className="mb-6 w-full rounded-lg bg-yellow-600/20 p-3 text-yellow-300">
            <p className="text-sm font-medium">DEVNET MODE</p>
            <p className="text-xs">
              This application is running on Solana Devnet. Actual token
              transfers must be done manually for testing.
            </p>
          </div>
        )}

        {!connected ? (
          <div className="flex flex-col items-center justify-center p-8">
            <p className="mb-4 text-center text-lg">
              Connect your wallet to receive payments
            </p>
            <WalletConnectButton />
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-lg bg-white p-4">
              <QRCodeSVG
                value={walletAddress}
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"L"}
                includeMargin={false}
              />
            </div>

            <div className="mb-4 w-full">
              <p className="mb-2 text-sm text-gray-300">Your Wallet Address:</p>
              <div className="flex items-center justify-between rounded-lg bg-gray-800 p-3">
                <p className="mr-2 overflow-hidden text-ellipsis text-sm">
                  {walletAddress}
                </p>
                <button
                  onClick={copyToClipboard}
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-blue-600/20 p-4 text-sm text-blue-300">
              <p>
                <strong>Note:</strong> When someone sends you a payment, it will
                automatically be converted to USDC in your wallet.
              </p>
              {isDevnet && (
                <p className="mt-2 text-xs">
                  In devnet mode, you&apos;ll need to manually request tokens
                  from the{" "}
                  <a
                    href="https://faucet.solana.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Solana Faucet
                  </a>{" "}
                  for testing.
                </p>
              )}
            </div>
          </>
        )}

        <div className="mt-8">
          <Link
            href="/"
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
