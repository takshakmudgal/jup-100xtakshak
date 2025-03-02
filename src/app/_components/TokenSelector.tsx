"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { TokenBalance } from "~/app/utils/tokens";
import { getUserTokenBalances } from "~/app/utils/tokens";
import { getConnection } from "~/app/utils/jupiter";
import Image from "next/image";

interface TokenSelectorProps {
  onSelect: (token: TokenBalance) => void;
  selectedToken?: TokenBalance;
}

export function TokenSelector({ onSelect, selectedToken }: TokenSelectorProps) {
  const { publicKey, connected } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchTokenBalances = useCallback(
    async (force = false) => {
      if (!publicKey || !connected) {
        setTokens([]);
        return;
      }

      const now = Date.now();
      if (!force && now - lastFetchTime < 30000) {
        return;
      }

      setLoading(true);
      try {
        const connection = getConnection();
        const balances = await getUserTokenBalances(connection, publicKey);
        setTokens(balances);
        setLastFetchTime(now);
      } catch (error) {
        console.error("Error fetching token balances:", error);
      } finally {
        setLoading(false);
      }
    },
    [publicKey, connected, lastFetchTime],
  );

  useEffect(() => {
    void fetchTokenBalances(true);
    const intervalId = setInterval(() => {
      void fetchTokenBalances();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [fetchTokenBalances]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredTokens = tokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-800 p-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedToken ? (
          <div className="flex items-center">
            {selectedToken.logoURI && (
              <Image
                src={selectedToken.logoURI}
                alt={selectedToken.symbol}
                className="mr-2 rounded-full"
                width={24}
                height={24}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/token-placeholder.png";
                }}
              />
            )}
            <div>
              <div className="font-medium">{selectedToken.symbol}</div>
              <div className="text-xs text-gray-400">
                Balance: {selectedToken.uiBalance}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400">Select a token</div>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-96 w-full overflow-auto rounded-lg bg-gray-800 shadow-lg">
          <div className="sticky top-0 bg-gray-800 p-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search tokens..."
                className="flex-1 rounded-md bg-gray-700 p-2 text-white placeholder-gray-400 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void fetchTokenBalances(true);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-700 hover:bg-gray-600"
                title="Refresh balances"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              {tokens.length === 0
                ? "No tokens found in your wallet"
                : "No tokens match your search"}
            </div>
          ) : (
            <div className="p-2">
              {filteredTokens.map((token) => (
                <div
                  key={token.address}
                  className="flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-gray-700"
                  onClick={() => {
                    onSelect(token);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center">
                    {token.logoURI ? (
                      <Image
                        src={token.logoURI}
                        alt={token.symbol}
                        className="mr-2 rounded-full"
                        width={24}
                        height={24}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = "/token-placeholder.png";
                        }}
                      />
                    ) : (
                      <div className="mr-2 h-6 w-6 rounded-full bg-gray-600"></div>
                    )}
                    <div>
                      <div className="font-medium">{token.symbol}</div>
                      <div className="text-xs text-gray-400">{token.name}</div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{token.uiBalance}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
