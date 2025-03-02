import { WalletConnectButton } from "./_components/walletConnectButton";
import Link from "next/link";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[url(/bg.png)] text-white">
      <div className="absolute right-4 top-4">
        <WalletConnectButton />
      </div>

      <div className="flex flex-col items-center">
        <h1 className="mb-2 text-4xl font-bold">Jupiter Payment Gateway</h1>
        <p className="mb-8 text-xl text-gray-300">
          Seamless crypto payments with automatic token swaps
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            href="/payment/receive"
            className="flex flex-col items-center rounded-xl bg-black/30 p-8 text-center backdrop-blur-md transition-transform hover:scale-105"
          >
            <div className="mb-4 rounded-full bg-blue-600 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold">Receive Payment</h2>
            <p className="text-gray-300">
              Generate a QR code for your wallet address to receive payments in
              USDC
            </p>
          </Link>

          <Link
            href="/payment/make"
            className="flex flex-col items-center rounded-xl bg-black/30 p-8 text-center backdrop-blur-md transition-transform hover:scale-105"
          >
            <div className="mb-4 rounded-full bg-green-600 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold">Make Payment</h2>
            <p className="text-gray-300">
              Pay with any token in your wallet, automatically swapped to USDC
              for the recipient
            </p>
          </Link>
        </div>

        <div className="mt-12 rounded-lg bg-blue-900/20 p-4 text-center text-sm text-blue-200">
          <p>
            <strong>How it works:</strong> When you make a payment, your
            selected token is automatically swapped to USDC using Jupiter&apos;s
            powerful swap engine. Recipients always receive USDC, regardless of
            which token you pay with.
          </p>
        </div>
      </div>
    </main>
  );
}
