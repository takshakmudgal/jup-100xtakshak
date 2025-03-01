"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Token = {
  address: string;
  name: string;
  symbol: string;
  logoURI?: string;
  tags?: string[];
  amount?: string;
  price?: string;
};

export const ListTokensDropdown = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [displayedTokens, setDisplayedTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const TOKENS_PER_PAGE = 20;

  useEffect(() => {
    const fetchTokens = async () => {
      setInitialLoading(true);
      try {
        const response = await fetch(
          "https://tokens.jup.ag/tokens?tags=verified",
        );
        if (!response.ok) throw new Error("Failed to fetch token data");
        const data = await response.json();

        const enhancedData = data.map((token: Token) => ({
          ...token,
          amount:
            Math.random() < 0.5 ? (Math.random() * 100).toFixed(4) : undefined,
          price:
            Math.random() < 0.5
              ? `$${(Math.random() * 10).toFixed(2)}`
              : undefined,
        }));

        setTokens(enhancedData);
        setFilteredTokens(enhancedData);
        setDisplayedTokens(enhancedData.slice(0, TOKENS_PER_PAGE));

        if (enhancedData.length > 0) {
          setSelectedToken(
            enhancedData.find((t: any) => t.symbol === "SOL") ||
              enhancedData[0],
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchTokens();
  }, []);

  useEffect(() => {
    if (tokens.length > 0) {
      const filtered = tokens.filter(
        (token) =>
          token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.address.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredTokens(filtered);
      setPage(1);
      setDisplayedTokens(filtered.slice(0, TOKENS_PER_PAGE));
      setHasMore(filtered.length > TOKENS_PER_PAGE);
    }
  }, [searchQuery, tokens]);

  const loadMoreTokens = useCallback(() => {
    if (loading) return;

    setLoading(true);

    const nextPage = page + 1;
    const startIndex = (nextPage - 1) * TOKENS_PER_PAGE;
    const endIndex = nextPage * TOKENS_PER_PAGE;

    if (startIndex >= filteredTokens.length) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    const nextBatch = filteredTokens.slice(startIndex, endIndex);
    setDisplayedTokens((prev) => [...prev, ...nextBatch]);
    setPage(nextPage);

    setHasMore(endIndex < filteredTokens.length);
    setLoading(false);
  }, [loading, page, filteredTokens]);

  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          loadMoreTokens();
        }
      },
      { threshold: 0.1 },
    );

    observerRef.current = observer;

    const currentLoadingRef = loadingRef.current;
    if (currentLoadingRef) {
      observer.observe(currentLoadingRef);
    }

    return () => {
      observer.disconnect();
    };
  }, [isOpen, hasMore, loadMoreTokens]);

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

  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchQuery("");
      setPage(1);
      setDisplayedTokens(filteredTokens.slice(0, TOKENS_PER_PAGE));
      setHasMore(filteredTokens.length > TOKENS_PER_PAGE);
    }
  };

  if (initialLoading)
    return <div className="rounded-lg bg-gray-800 px-4 py-2">{"________"}</div>;
  if (error)
    return (
      <div className="rounded-lg bg-gray-800 px-4 py-2 text-red-400">
        Error: {error}
      </div>
    );
  if (tokens.length === 0)
    return (
      <div className="rounded-lg bg-gray-800 px-4 py-2">No tokens found</div>
    );

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div
        className="flex h-10 w-fit min-w-24 max-w-48 cursor-pointer items-center justify-between rounded-lg bg-gray-800 px-3 py-2"
        onClick={toggleDropdown}
      >
        <div className="flex items-center">
          {selectedToken?.logoURI && (
            <img
              src={selectedToken.logoURI}
              alt={selectedToken.symbol || "Token icon"}
              className="mr-2 h-5 w-5 rounded-full"
            />
          )}
          <span className="font-medium text-white">
            {selectedToken?.symbol}
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-2 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg bg-gray-800 shadow-lg">
          <div className="border-b border-gray-700 p-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by token or paste address"
                className="w-full rounded bg-gray-700 py-2 pl-8 pr-3 text-sm outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <div className="absolute left-2 top-2 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
              </div>
              {searchQuery && (
                <div
                  className="absolute right-2 top-2 cursor-pointer text-gray-400"
                  onClick={() => setSearchQuery("")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>
          <div>
            {displayedTokens.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No tokens found
              </div>
            ) : (
              <>
                {displayedTokens.map((token) => (
                  <div
                    key={token.address}
                    className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-gray-700"
                    onClick={() => handleTokenSelect(token)}
                  >
                    <div className="flex items-center">
                      {token.logoURI ? (
                        <img
                          src={token.logoURI}
                          alt={token.symbol}
                          className="mr-3 h-7 w-7 rounded-full"
                        />
                      ) : (
                        <div className="mr-3 h-7 w-7 rounded-full bg-gray-600"></div>
                      )}
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-xs text-gray-400">
                          {token.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {token.price && (
                        <div className="text-xs text-gray-400">
                          {token.address.slice(0, 4)}...
                          {token.address.slice(-4)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <div
                    ref={loadingRef}
                    className="p-2 text-center text-xs text-gray-400"
                  >
                    {loading
                      ? "Loading more tokens..."
                      : "Scroll for more tokens"}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
