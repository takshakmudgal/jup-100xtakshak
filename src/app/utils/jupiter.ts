import {
  Connection,
  PublicKey,
  VersionedTransaction,
  clusterApiUrl,
} from "@solana/web3.js";

const isDev = process.env.NEXT_PUBLIC_USE_DEVNET === "true";

export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
);

export const SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112",
);

let cachedConnection: Connection | null = null;
let lastRequestReset = Date.now();

export const getConnection = () => {
  const now = Date.now();
  if (now - lastRequestReset > 60000) {
    lastRequestReset = now;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  const cluster = isDev ? "devnet" : "mainnet-beta";
  const rpcEndpoint =
    typeof process.env.NEXT_PUBLIC_RPC_ENDPOINT === "string"
      ? process.env.NEXT_PUBLIC_RPC_ENDPOINT
      : clusterApiUrl(cluster);

  const backupEndpoints = isDev
    ? ["https://api.devnet.solana.com"]
    : [
        "https://solana-mainnet.rpc.extrnode.com",
        "https://api.mainnet-beta.solana.com",
      ];

  cachedConnection = new Connection(rpcEndpoint, {
    commitment: "confirmed",
    fetch: (url, init) => {
      const headers = new Headers(init?.headers);
      headers.set("x-jupiter-payment-app", "payment-gateway");

      const newInit = {
        ...init,
        headers,
      };

      return fetch(url, newInit).then(async (response) => {
        if (response.status === 429) {
          console.warn(
            "Rate limited by RPC endpoint, retrying with backoff...",
          );

          if (backupEndpoints.length > 0) {
            cachedConnection = null;

            await new Promise((resolve) => setTimeout(resolve, 500));

            const randomIndex = Math.floor(
              Math.random() * backupEndpoints.length,
            );
            const backupEndpoint: string =
              backupEndpoints[randomIndex] ??
              backupEndpoints[0] ??
              "https://api.devnet.solana.com";

            cachedConnection = new Connection(backupEndpoint, {
              commitment: "confirmed",
            });

            return fetch(url, newInit);
          }

          await new Promise((resolve) =>
            setTimeout(resolve, 1000 + Math.random() * 2000),
          );
          return fetch(url, newInit);
        }
        return response;
      });
    },
  });

  return cachedConnection;
};

export interface TokenListItem {
  symbol: string;
  logoURI?: string;
  address: string;
  name: string;
  decimals: number;
  tags?: string[];
}

export const getSupportedTokens = async (): Promise<TokenListItem[]> => {
  interface TokenListResponse {
    tokens: Array<{
      symbol: string;
      logoURI?: string;
      address: string;
      name: string;
      decimals: number;
      tags?: string[];
      [key: string]: unknown;
    }>;
  }

  type Token = TokenListResponse["tokens"][number];

  try {
    if (!isDev) {
      const apiKey = process.env.NEXT_PUBLIC_JUPITER_API_KEY ?? "";
      const headers: HeadersInit = apiKey
        ? { Authorization: `Bearer ${apiKey}` }
        : {};
      const response = await fetch("https://quote-api.jup.ag/v6/tokens", {
        headers,
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(`Failed to fetch Jupiter tokens: ${response.status}`);
      return (await response.json()) as TokenListItem[];
    }

    const devResponse = await fetch(
      "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json",
      { cache: "no-store" },
    );
    const tokenList: TokenListResponse = devResponse.ok
      ? ((await devResponse.json()) as TokenListResponse)
      : { tokens: [] };

    const fallbackSOL =
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";
    const fallbackUSDC =
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png";

    const tokens = tokenList.tokens || [];
    const solLogo =
      tokens.find((t: Token) => t.symbol === "SOL")?.logoURI ?? fallbackSOL;
    const usdcLogo =
      tokens.find((t: Token) => t.symbol === "USDC")?.logoURI ?? fallbackUSDC;

    return [
      {
        address: SOL_MINT.toBase58(),
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        logoURI: solLogo,
        tags: ["devnet"],
      },
      {
        address: USDC_MINT.toBase58(),
        symbol: "USDC",
        name: "USD Coin (Devnet)",
        decimals: 6,
        logoURI: usdcLogo,
        tags: ["devnet", "stablecoin"],
      },
    ];
  } catch (error) {
    console.error("Error fetching supported tokens:", error);
    return [];
  }
};

export interface SwapQuote {
  inAmount: string;
  outAmount: string;
  inputMint: string;
  outputMint: string;
  swapTransaction?: string;
  [key: string]: unknown;
}

export const getSwapQuote = async (
  inputMint: string,
  outputMint: string = USDC_MINT.toBase58(),
  amount: string,
  swapMode: "ExactIn" | "ExactOut" = "ExactIn",
): Promise<SwapQuote> => {
  try {
    if (isDev) {
      const mockQuoteResult: SwapQuote = {
        inAmount: amount,
        outAmount:
          swapMode === "ExactIn"
            ? (Number(amount) * 1.5).toString()
            : (Number(amount) / 1.5).toString(),
        inputMint: inputMint,
        outputMint: outputMint,
      };

      return mockQuoteResult;
    }

    const apiKey = process.env.NEXT_PUBLIC_JUPITER_API_KEY ?? "";
    const headers: HeadersInit = apiKey
      ? { Authorization: `Bearer ${apiKey}` }
      : {};

    const params = new URLSearchParams();
    params.append("inputMint", inputMint);
    params.append("outputMint", outputMint);
    params.append("amount", amount);
    params.append("slippageBps", "50");
    params.append("swapMode", swapMode);

    const response = await fetch(
      `https://quote-api.jup.ag/v6/quote?${params.toString()}`,
      {
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get quote: ${response.status}`);
    }

    const quoteResponse = (await response.json()) as SwapQuote;
    return quoteResponse;
  } catch (error) {
    console.error("Error getting swap quote:", error);
    throw error;
  }
};

interface BuildSwapTransactionParams {
  quoteResponse: SwapQuote;
  userPublicKey: string;
  destinationTokenAccount: string;
}

interface BuildSwapTransactionResult {
  swapTransaction: string | null;
  error: string | null;
}

export const buildSwapTransaction = async ({
  quoteResponse,
  userPublicKey,
  destinationTokenAccount,
}: BuildSwapTransactionParams): Promise<BuildSwapTransactionResult> => {
  try {
    if (isDev) {
      console.log("Devnet mode: Using mock swap transaction");
      return {
        swapTransaction: "MockTransactionForDevEnvironment",
        error: null,
      };
    }

    const apiKey = process.env.NEXT_PUBLIC_JUPITER_API_KEY ?? "";
    const headers: HeadersInit = apiKey
      ? { Authorization: `Bearer ${apiKey}` }
      : {};

    const body = {
      quoteResponse,
      userPublicKey,
      destinationTokenAccount,
      prioritizationFeeLamports: 5000,
      computeUnitPriceMicroLamports: 5000,
      slippageBps: 50,
      dynamicComputeUnitLimit: true,
      minimumOnlyParams: {
        slippageBps: 50,
        asLegacyTransaction: false,
      },
    };

    const response = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      return {
        swapTransaction: null,
        error: `Jupiter API swap error: ${response.status} - ${errorMessage}`,
      };
    }

    interface SwapResponse {
      swapTransaction: string;
    }

    const swapResponse = (await response.json()) as SwapResponse;

    if (!swapResponse.swapTransaction) {
      return {
        swapTransaction: null,
        error: "No swap transaction returned from Jupiter API",
      };
    }

    return {
      swapTransaction: swapResponse.swapTransaction,
      error: null,
    };
  } catch (error) {
    console.error("Error building swap transaction:", error);
    return {
      swapTransaction: null,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const deserializeTransaction = (
  transactionBase64: string,
): VersionedTransaction => {
  const buffer = Buffer.from(transactionBase64, "base64");
  return VersionedTransaction.deserialize(buffer);
};

export const formatTokenAmount = (amount: string, decimals: number): string => {
  const amountBigInt = BigInt(amount);
  const divisor = BigInt(10) ** BigInt(decimals);
  const wholePart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;

  let fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  fractionalStr = fractionalStr.replace(/0+$/, "");

  if (fractionalStr === "") {
    return wholePart.toString();
  }

  return `${wholePart.toString()}.${fractionalStr}`;
};

export const parseTokenAmount = (amount: string, decimals: number): string => {
  if (!amount || isNaN(Number(amount))) return "0";

  const [wholePart, fractionalPart = ""] = amount.split(".");
  const paddedFractionalPart = fractionalPart
    .padEnd(decimals, "0")
    .slice(0, decimals);

  const rawAmount = `${wholePart}${paddedFractionalPart}`;
  return rawAmount.replace(/^0+/, "") || "0";
};
