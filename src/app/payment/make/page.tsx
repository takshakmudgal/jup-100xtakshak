"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { toast, Toaster } from "react-hot-toast";
import { WalletConnectButton } from "~/app/_components/walletConnectButton";
import { TokenSelector } from "~/app/_components/TokenSelector";
import { QRScanner } from "~/app/_components/QRScanner";
import type { TokenBalance } from "~/app/utils/tokens";
import {
  USDC_MINT,
  getConnection,
  getSwapQuote,
  buildSwapTransaction,
  deserializeTransaction,
  parseTokenAmount,
  formatTokenAmount,
} from "~/app/utils/jupiter";
import { formatUSD } from "~/app/utils/tokens";
import Link from "next/link";

export default function MakePaymentPage() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [tokenAmount, setTokenAmount] = useState("");
  const [usdcAmount, setUsdcAmount] = useState("");
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const [lastUpdatedField, setLastUpdatedField] = useState<
    "token" | "usdc" | null
  >(null);

  const isDevnet = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet";

  useEffect(() => {
    if (!recipientAddress) {
      setIsValidAddress(false);
      return;
    }

    try {
      new PublicKey(recipientAddress);
      setIsValidAddress(true);
    } catch (_err) {
      setIsValidAddress(false);
    }
  }, [recipientAddress]);

  useEffect(() => {
    const getQuote = async () => {
      if (
        !selectedToken ||
        (!tokenAmount && !usdcAmount) ||
        !connected ||
        !publicKey
      )
        return;

      setIsLoadingQuote(true);
      try {
        const isExactIn = lastUpdatedField === "token" || !lastUpdatedField;
        const amount = isExactIn
          ? parseTokenAmount(tokenAmount, selectedToken.decimals)
          : parseTokenAmount(usdcAmount, 6);

        const inputMint = isExactIn
          ? selectedToken.address
          : USDC_MINT.toBase58();
        const outputMint = isExactIn
          ? USDC_MINT.toBase58()
          : selectedToken.address;
        const swapMode = isExactIn ? "ExactIn" : "ExactOut";

        const quote = await getSwapQuote(
          inputMint,
          outputMint,
          amount,
          swapMode,
        );

        if (isExactIn) {
          const outAmountFormatted = formatTokenAmount(quote.outAmount, 6);
          setUsdcAmount(outAmountFormatted);

          if (Number(tokenAmount) > 0) {
            const rate = Number(outAmountFormatted) / Number(tokenAmount);
            setConversionRate(rate);
          }
        } else {
          const inAmountFormatted = formatTokenAmount(
            quote.inAmount,
            selectedToken.decimals,
          );
          setTokenAmount(inAmountFormatted);

          if (Number(usdcAmount) > 0) {
            const rate = Number(usdcAmount) / Number(inAmountFormatted);
            setConversionRate(rate);
          }
        }
      } catch (_err) {
        toast.error("Failed to get price quote");
      } finally {
        setIsLoadingQuote(false);
      }
    };

    // Creating a non-async wrapper function
    const triggerGetQuote = () => {
      void getQuote();
    };

    const timeoutId = setTimeout(triggerGetQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [
    selectedToken,
    tokenAmount,
    usdcAmount,
    lastUpdatedField,
    connected,
    publicKey,
  ]);

  const handleTokenAmountChange = (value: string) => {
    if (!/^(\d*\.?\d*)$/.test(value) && value !== "") return;
    setTokenAmount(value);
    setLastUpdatedField("token");
  };

  const handleUsdcAmountChange = (value: string) => {
    if (!/^(\d*\.?\d*)$/.test(value) && value !== "") return;
    setUsdcAmount(value);
    setLastUpdatedField("usdc");
  };

  const handleScanQR = (address: string) => {
    setRecipientAddress(address);
    setShowScanner(false);
    toast.success("Address scanned successfully!");
  };

  const handleMakePayment = async () => {
    if (
      !connected ||
      !publicKey ||
      !selectedToken ||
      !isValidAddress ||
      !tokenAmount ||
      !usdcAmount ||
      isLoadingQuote
    ) {
      toast.error("Please fill in all fields correctly");
      return;
    }

    setIsProcessingPayment(true);
    try {
      const inputAmount = parseTokenAmount(tokenAmount, selectedToken.decimals);
      const quote = await getSwapQuote(
        selectedToken.address,
        USDC_MINT.toBase58(),
        inputAmount,
        "ExactIn",
      );

      const { swapTransaction, error } = await buildSwapTransaction({
        quoteResponse: quote,
        userPublicKey: publicKey.toBase58(),
        destinationTokenAccount: recipientAddress,
      });

      if (error !== null || !swapTransaction) {
        throw new Error(error ?? "Failed to build swap transaction");
      }
      const transaction = deserializeTransaction(swapTransaction);

      const signature = await sendTransaction(transaction, getConnection());

      toast.success(
        <div>
          <p>{isDevnet ? "DEVNET" : "MAINNET"}: Transaction successful!</p>
          <p className="text-sm">
            {formatTokenAmount(inputAmount, selectedToken.decimals)}{" "}
            {selectedToken.symbol} → {formatTokenAmount(quote.outAmount, 6)}{" "}
            USDC
          </p>
          <a
            href={`https://${isDevnet ? "explorer.solana.com/tx/" : "solscan.io/tx/"}${signature}?cluster=${isDevnet ? "devnet" : "mainnet"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            View on Explorer
          </a>
        </div>,
        { duration: 10000 },
      );

      setTokenAmount("");
      setUsdcAmount("");
      setRecipientAddress("");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(`Payment failed: ${(error as Error).message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[url(/bg.png)] text-white">
      <Toaster position="top-right" />

      <div className="absolute right-4 top-4">
        <WalletConnectButton />
      </div>

      <div className="w-full max-w-md rounded-xl bg-black/30 p-8 backdrop-blur-md">
        <h1 className="mb-8 text-3xl font-bold">Make Payment</h1>

        {isDevnet && (
          <div className="mb-6 rounded-lg bg-yellow-600/20 p-3 text-yellow-300">
            <p className="text-sm font-medium">DEVNET MODE</p>
            <p className="text-xs">
              This application is running on Solana Devnet. Real transactions
              will be performed but no real value is transferred as these are
              test tokens.
            </p>
          </div>
        )}

        {!connected ? (
          <div className="flex flex-col items-center justify-center p-8">
            <p className="mb-4 text-center text-lg">
              Connect your wallet to make payments
            </p>
            <WalletConnectButton />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">
                Select Token
              </label>
              <TokenSelector
                onSelect={setSelectedToken}
                selectedToken={selectedToken ?? undefined}
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">
                Recipient Address
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="Enter Solana address"
                  className={`flex-1 rounded-l-lg bg-gray-800 p-3 text-white placeholder-gray-400 focus:outline-none ${
                    recipientAddress && !isValidAddress
                      ? "border border-red-500"
                      : ""
                  }`}
                />
                <button
                  onClick={() => setShowScanner(true)}
                  className="rounded-r-lg bg-blue-600 px-4 hover:bg-blue-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
              {recipientAddress && !isValidAddress && (
                <p className="mt-1 text-xs text-red-400">
                  Please enter a valid Solana address
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">
                {selectedToken ? selectedToken.symbol : "Token"} Amount
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={tokenAmount}
                  onChange={(e) => handleTokenAmountChange(e.target.value)}
                  placeholder="0.00"
                  disabled={!selectedToken}
                  className="w-full rounded-lg bg-gray-800 p-3 text-white placeholder-gray-400 focus:outline-none"
                />
                {isLoadingQuote && lastUpdatedField === "token" && (
                  <div className="absolute right-3 top-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6 flex items-center justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">
                USDC Amount (Recipient Receives)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usdcAmount}
                  onChange={(e) => handleUsdcAmountChange(e.target.value)}
                  placeholder="0.00"
                  disabled={!selectedToken}
                  className="w-full rounded-lg bg-gray-800 p-3 text-white placeholder-gray-400 focus:outline-none"
                />
                {isLoadingQuote && lastUpdatedField === "usdc" && (
                  <div className="absolute right-3 top-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                )}
              </div>
            </div>

            {conversionRate !== null && selectedToken && (
              <div className="mb-6 rounded-lg bg-gray-800/50 p-3 text-sm text-gray-300">
                <p>
                  1 {selectedToken.symbol} ≈ {formatUSD(conversionRate)}
                </p>
              </div>
            )}

            <button
              onClick={() => void handleMakePayment()}
              disabled={
                !isValidAddress ||
                !selectedToken ||
                !tokenAmount ||
                isProcessingPayment
              }
              className="w-full rounded-lg bg-blue-600 p-3 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessingPayment ? (
                <div className="flex items-center justify-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processing...
                </div>
              ) : (
                "Make Payment"
              )}
            </button>
          </>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
          >
            Back to Home
          </Link>
        </div>
      </div>

      {showScanner && (
        <QRScanner
          onScan={handleScanQR}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
