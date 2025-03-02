import { PublicKey } from "@solana/web3.js";
import type { Connection } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  USDC_MINT,
  SOL_MINT,
  formatTokenAmount,
  getSupportedTokens,
} from "./jupiter";

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

export interface TokenBalance extends TokenInfo {
  balance: string;
  uiBalance: string;
}

let tokenMetadataCache: TokenInfo[] = [];
let lastMetadataFetchTime = 0;
const METADATA_CACHE_DURATION = 10 * 60 * 1000;

const balanceCache = new Map<string, { balance: string; timestamp: number }>();
const BALANCE_CACHE_DURATION = 30 * 1000;

export const getTokensMetadata = async (): Promise<TokenInfo[]> => {
  const now = Date.now();

  if (
    tokenMetadataCache &&
    now - lastMetadataFetchTime < METADATA_CACHE_DURATION
  ) {
    return tokenMetadataCache;
  }

  try {
    const tokens = await getSupportedTokens();

    tokenMetadataCache = tokens.filter(
      (token: TokenInfo) => token.decimals !== undefined,
    );
    lastMetadataFetchTime = now;

    return tokenMetadataCache;
  } catch (error) {
    console.error("Error fetching token metadata:", error);

    if (tokenMetadataCache.length > 0) {
      console.log("Using expired token metadata cache due to fetch error");
      return tokenMetadataCache;
    }

    return [];
  }
};

export const getTokenMetadata = async (
  mintAddress: string,
): Promise<TokenInfo | null> => {
  try {
    if (mintAddress === SOL_MINT.toBase58()) {
      return {
        address: SOL_MINT.toBase58(),
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        logoURI:
          "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      };
    }

    if (mintAddress === USDC_MINT.toBase58()) {
      return {
        address: USDC_MINT.toBase58(),
        symbol: "USDC",
        name: "USD Coin (Devnet)",
        decimals: 6,
        logoURI:
          "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
      };
    }

    const cachedTokens =
      tokenMetadataCache.length > 0
        ? tokenMetadataCache
        : await getTokensMetadata();
    const cachedToken = cachedTokens.find(
      (token) => token.address === mintAddress,
    );
    if (cachedToken) {
      return cachedToken;
    }

    try {
      // const cacheKey = `token-list-${new Date().toISOString().split("T")[0]}`;
      const cacheOptions = { cache: "force-cache" as RequestCache };

      const response = await fetch(
        "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json",
        cacheOptions,
      );

      if (response.ok) {
        interface TokenListResponse {
          tokens: Array<{
            address: string;
            symbol: string;
            name: string;
            decimals: number;
            logoURI?: string;
            tags?: string[];
            [key: string]: unknown;
          }>;
        }

        const tokenList = (await response.json()) as TokenListResponse;
        const token = tokenList.tokens.find((t) => t.address === mintAddress);
        if (token) {
          return {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logoURI: token.logoURI,
          };
        }
      }
    } catch (innerError) {
      console.error("Error fetching from token list:", innerError);
    }

    return {
      address: mintAddress,
      symbol: "Unknown",
      name: "Unknown Token",
      decimals: 9,
      logoURI: "/token-placeholder.png",
    };
  } catch (error) {
    console.error(`Error fetching metadata for token ${mintAddress}:`, error);
    return null;
  }
};

export const getTokenBalance = async (
  connection: Connection,
  walletPublicKey: PublicKey,
  mintAddress: string,
): Promise<string> => {
  try {
    const cacheKey = `${walletPublicKey.toString()}-${mintAddress}`;
    const now = Date.now();
    const cachedValue = balanceCache.get(cacheKey);

    if (cachedValue && now - cachedValue.timestamp < BALANCE_CACHE_DURATION) {
      return cachedValue.balance;
    }
    if (mintAddress === SOL_MINT.toBase58()) {
      const solBalance = await connection.getBalance(walletPublicKey);
      balanceCache.set(cacheKey, {
        balance: solBalance.toString(),
        timestamp: now,
      });
      return solBalance.toString();
    }

    const tokenAccountAddress = await getTokenAccountAddress(
      new PublicKey(mintAddress),
      walletPublicKey,
    );

    try {
      const tokenAccount = await getAccount(
        connection,
        tokenAccountAddress,
        "confirmed",
        TOKEN_PROGRAM_ID,
      );

      balanceCache.set(cacheKey, {
        balance: tokenAccount.amount.toString(),
        timestamp: now,
      });

      return tokenAccount.amount.toString();
    } catch (_err) {
      balanceCache.set(cacheKey, {
        balance: "0",
        timestamp: now,
      });
      return "0";
    }
  } catch (_err) {
    console.error(`Error getting balance for token ${mintAddress}:`);
    return "0";
  }
};

export const getUserTokenBalances = async (
  connection: Connection,
  walletPublicKey: PublicKey,
): Promise<TokenBalance[]> => {
  if (!walletPublicKey) {
    return [];
  }

  try {
    await getTokensMetadata();
    const solBalance = await getTokenBalance(
      connection,
      walletPublicKey,
      SOL_MINT.toBase58(),
    );

    const solMetadata = await getTokenMetadata(SOL_MINT.toBase58());
    const tokenBalances: TokenBalance[] = [];

    if (solMetadata && parseFloat(solBalance) > 0) {
      tokenBalances.push({
        ...solMetadata,
        balance: solBalance,
        uiBalance: formatTokenAmount(solBalance, solMetadata.decimals),
      });
    }

    const usdcBalance = await getTokenBalance(
      connection,
      walletPublicKey,
      USDC_MINT.toBase58(),
    );

    const usdcMetadata = await getTokenMetadata(USDC_MINT.toBase58());
    if (usdcMetadata && parseFloat(usdcBalance) > 0) {
      tokenBalances.push({
        ...usdcMetadata,
        balance: usdcBalance,
        uiBalance: formatTokenAmount(usdcBalance, usdcMetadata.decimals),
      });
    }

    return tokenBalances;
  } catch (error) {
    console.error("Error fetching user token balances:", error);
    return [];
  }
};

export const getTokenAccountAddress = async (
  mint: PublicKey,
  owner: PublicKey,
): Promise<PublicKey> => {
  return await getAssociatedTokenAddress(mint, owner, true);
};

export const hasTokenAccount = async (
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
): Promise<boolean> => {
  try {
    const tokenAccount = await getTokenAccountAddress(mint, owner);
    await getAccount(connection, tokenAccount);
    return true;
  } catch (_err) {
    return false;
  }
};

export const formatNumber = (num: number | string): string => {
  const parsedNum = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat("en-US").format(parsedNum);
};

export const formatUSD = (amount: number | string): string => {
  const parsedAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsedAmount);
};
