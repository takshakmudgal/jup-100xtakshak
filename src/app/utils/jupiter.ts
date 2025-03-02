import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  VersionedTransaction,
  clusterApiUrl,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

const isDev = process.env.NEXT_PUBLIC_USE_DEVNET === "true";

export const USDC_MINT = new PublicKey(
  isDev
    ? "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
    : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
);

export const SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112",
);

let cachedSolPrice: number | null = null;
let lastPriceFetchTime = 0;
const PRICE_CACHE_DURATION = 5 * 60 * 1000;

let cachedConnection: Connection | null = null;
let requestCount = 0; // eslint-disable-line @typescript-eslint/no-unused-vars
let lastRequestReset = Date.now();

export const getConnection = () => {
  const now = Date.now();
  if (now - lastRequestReset > 60000) {
    requestCount = 0;
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
    ? [
        "https://api.devnet.solana.com",
        "https://devnet.helius-rpc.com/?api-key=15319106-2ae4-4a6e-9d78-c41e7b5bad22",
        "https://devnet.genesysgo.net",
      ]
    : [
        "https://solana-mainnet.rpc.extrnode.com",
        "https://api.mainnet-beta.solana.com",
        "https://solana.getblock.io/mainnet/?api_key=221d90fb-345b-475b-9318-6097151b5152",
      ];

  cachedConnection = new Connection(rpcEndpoint, {
    commitment: "confirmed",
    fetch: (url, init) => {
      requestCount++;

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

export const checkIfTokenAccountExists = async (
  connection: Connection,
  receiverTokenAccountAddress: PublicKey,
): Promise<boolean> => {
  try {
    await getAccount(
      connection,
      receiverTokenAccountAddress,
      "confirmed",
      TOKEN_PROGRAM_ID,
    );
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "TokenAccountNotFoundError"
    ) {
      return false;
    }
    throw error;
  }
};

export const getCurrentSolPrice = async (): Promise<number> => {
  const now = Date.now();

  if (
    cachedSolPrice !== null &&
    now - lastPriceFetchTime < PRICE_CACHE_DURATION
  ) {
    return cachedSolPrice;
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch SOL price: ${response.status}`);
    }

    type CoinGeckoResponse = {
      solana: {
        usd: number;
      };
    };

    const data = (await response.json()) as CoinGeckoResponse;
    const price = data.solana.usd;

    cachedSolPrice = price;
    lastPriceFetchTime = now;

    return price;
  } catch (_err) {
    // console.error("Error fetching SOL price:", _err);
    return 178; // Default price if fetch fails
  }
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

      if (!response.ok) {
        throw new Error(`Failed to fetch Jupiter tokens: ${response.status}`);
      }

      const tokens = (await response.json()) as TokenListItem[];
      return tokens;
    } else {
      const response = await fetch(
        "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json",
        { cache: "no-store" },
      );

      if (response.ok) {
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

        const tokenList = (await response.json()) as TokenListResponse;

        return [
          {
            address: SOL_MINT.toBase58(),
            symbol: "SOL",
            name: "Solana",
            decimals: 9,
            logoURI:
              tokenList.tokens.find((t) => t.symbol === "SOL")?.logoURI ??
              "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
            tags: ["devnet"],
          },
          {
            address: USDC_MINT.toBase58(),
            symbol: "USDC",
            name: "USD Coin (Devnet)",
            decimals: 6,
            logoURI:
              tokenList.tokens.find((t) => t.symbol === "USDC")?.logoURI ??
              "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
            tags: ["devnet", "stablecoin"],
          },
        ];
      } else {
        console.error("Failed to fetch token list, using fallback");
        return [
          {
            address: SOL_MINT.toBase58(),
            symbol: "SOL",
            name: "Solana",
            decimals: 9,
            logoURI:
              "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
            tags: ["devnet"],
          },
          {
            address: USDC_MINT.toBase58(),
            symbol: "USDC",
            name: "USD Coin (Devnet)",
            decimals: 6,
            logoURI:
              "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
            tags: ["devnet", "stablecoin"],
          },
        ];
      }
    }
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

export const buildDevnetTransaction = async ({
  inputMint,
  outputMint: _outputMint,
  amount,
  userPublicKey,
  destinationAddress,
}: {
  inputMint: string;
  outputMint: string;
  amount: string;
  userPublicKey: string;
  destinationAddress: string;
}): Promise<{
  serializedTransaction: string;
  error: string | null;
}> => {
  try {
    const connection = getConnection();
    const sender = new PublicKey(userPublicKey);
    const recipient = new PublicKey(destinationAddress);
    const isSOL = inputMint === SOL_MINT.toBase58();
    const inputToken = new PublicKey(inputMint);

    if (isSOL) {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: recipient,
          lamports: BigInt(amount),
        }),
      );

      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = sender;

      return {
        serializedTransaction: Buffer.from(
          transaction.serialize({
            verifySignatures: false,
            requireAllSignatures: false,
          }),
        ).toString("base64"),
        error: null,
      };
    } else {
      const senderTokenAccount = await getAssociatedTokenAddress(
        inputToken,
        sender,
      );

      const recipientTokenAccount = await getAssociatedTokenAddress(
        inputToken,
        recipient,
      );

      let createTokenAccountIx;
      try {
        await getAccount(
          connection,
          recipientTokenAccount,
          "confirmed",
          TOKEN_PROGRAM_ID,
        );
      } catch (_err) {
        createTokenAccountIx = createAssociatedTokenAccountInstruction(
          sender,
          recipientTokenAccount,
          recipient,
          inputToken,
        );
      }

      const transferIx = createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        sender,
        BigInt(amount),
      );

      const transaction = new Transaction();
      if (createTokenAccountIx) {
        transaction.add(createTokenAccountIx);
      }
      transaction.add(transferIx);

      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = sender;

      return {
        serializedTransaction: Buffer.from(
          transaction.serialize({
            verifySignatures: false,
            requireAllSignatures: false,
          }),
        ).toString("base64"),
        error: null,
      };
    }
  } catch (error: unknown) {
    console.error("Error building devnet transaction:", error);
    return {
      serializedTransaction: "",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error building devnet transaction",
    };
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

    // Extract values from the quote response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _inputMint = quoteResponse.inputMint;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _outputMint = quoteResponse.outputMint;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _inAmount = quoteResponse.inAmount;

    // Compute a default amount threshold (0.5% slippage)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _threshold =
      quoteResponse.outAmount !== undefined
        ? Math.floor(Number(quoteResponse.outAmount) * 0.995).toString()
        : "0";

    const body = {
      quoteResponse,
      userPublicKey,
      destinationTokenAccount,
      prioritizationFeeLamports: 5000, // Prioritization fee to help ensure transaction completion
      computeUnitPriceMicroLamports: 5000, // Compute unit price
      slippageBps: 50, // 0.5% max slippage allowed
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
