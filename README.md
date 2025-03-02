# Jupiter Payment Gateway

A crypto payment gateway built on Solana that uses Jupiter to automatically swap tokens to USDC for merchants. This project allows merchants to receive payments in USDC regardless of which token the payer uses.

> **Note:** This project is currently configured to use Solana's devnet for testing and development purposes. The token swaps are simulated in devnet mode.

## Features

- **Receive Payments**: Generate a QR code for your wallet address to receive payments
- **Make Payments**: Pay with any token in your wallet, automatically swapped to USDC for the recipient
- **Token Selection**: Choose from any token in your wallet to make payments
- **Real-time Conversion**: See the exact amount of USDC the recipient will receive
- **QR Code Scanning**: Scan recipient wallet addresses using your device camera

## Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Blockchain**: Solana (Devnet), Jupiter Swap API
- **Wallet Integration**: Solana Wallet Adapter

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- A Solana wallet (Phantom, Solflare, etc.) configured for devnet

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/jupiter-payment-gateway.git
   cd jupiter-payment-gateway
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a `.env` file based on `.env.example` and add your RPC endpoint:

   ```
   NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing on Devnet

1. Configure your Solana wallet to use devnet
2. Request SOL tokens from the [Solana Faucet](https://faucet.solana.com/)
3. Test the application with devnet tokens

## How It Works

### Making Payments

1. Connect your Solana wallet
2. Select the token you want to pay with
3. Enter the recipient's Solana address
4. Enter the amount to send
5. The app automatically converts your token to USDC using Jupiter Swap
6. The recipient receives USDC equivalent to the amount you sent

### Real vs. Simulation Mode

This application supports two modes:

1. **Mainnet Mode (Production)** - Uses Jupiter's API to perform real swaps on Solana mainnet. Requires a Jupiter API key.
2. **Devnet Mode (Testing)** - Simulates the swap and payment process using mock data on Solana devnet.

### Configuration

To switch between modes, update your `.env.local` file:

```
# For Mainnet (real transactions)
NEXT_PUBLIC_USE_DEVNET=false
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta

# For Devnet (simulated transactions)
NEXT_PUBLIC_USE_DEVNET=true
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

### Obtaining a Jupiter API Key

For production use, you need a Jupiter API key:

1. Go to [jup.ag](https://jup.ag)
2. Create an account
3. Navigate to the API section and generate an API key
4. Add your API key to the `.env.local` file:

```
NEXT_PUBLIC_JUPITER_API_KEY=your_api_key_here
```

## Development vs Production

- **Devnet Configuration**: Current setup uses Solana devnet with simulated swaps
- **Mainnet Deployment**: To deploy to production, update environment variables to use mainnet RPC endpoints and implement proper Jupiter API integration with API keys

## Architecture

The application is built to work with Jupiter's Swap API for token swaps. When a payment is made:

1. The payer selects a token and amount
2. In mainnet mode, the application would get a quote from Jupiter for the swap
3. In devnet mode, the swap is simulated for development purposes

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Jupiter](https://jup.ag/) for their powerful swap engine
- [Solana](https://solana.com/) for the blockchain infrastructure
- [Next.js](https://nextjs.org/) for the frontend framework
