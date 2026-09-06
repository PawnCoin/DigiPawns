# DigiPawns - AI-Powered Digital Asset Pawn Shop

DigiPawns is a modern, feature-rich web application that demonstrates a revolutionary digital pawn shop specializing in NFT-backed loans. It leverages the power of Google's Gemini AI for instant, data-driven appraisals and provides a complete, simulated end-to-end user experience for obtaining and managing crypto loans.

## Key Features

This application showcases a full suite of features expected from a production-grade decentralized application (dApp):

### 1. Real Web3 Wallet Integration
- **Live Wallet Connection:** Securely connect and disconnect real cryptocurrency wallets (e.g., MetaMask) using `ethers.js`.
- **Persistent Sessions:** The application remembers a user's connection status via `localStorage`, providing a seamless "remember me" experience for returning users.
- **Dynamic State Syncing:** Automatically detects and responds to wallet events, such as the user switching accounts or disconnecting from the wallet extension.

### 2. AI-Powered NFT Appraisal Engine
- **Instant Valuation:** Users can submit an NFT's contract address and token ID to receive an immediate, AI-powered appraisal.
- **Detailed Analysis:** The Gemini API provides a comprehensive valuation, including estimated market value (USD), a confidence score, key value drivers, and a suggested loan offer.

### 3. Comprehensive User Dashboard
- **Multi-Page SPA Architecture:** Built with client-side routing for distinct, bookmarkable URLs for the homepage (`/`) and the user dashboard (`/dashboard`).
- **Dynamic NFT Portfolio:** After connecting a wallet, the dashboard uses an AI-powered service to simulate and display a realistic portfolio of NFTs held by that address.
- **Multi-Wallet Management:** Users can link additional read-only wallets and view a "last active" timestamp that updates on interaction.
- **"Quick Appraise" Functionality:** Users can initiate a loan appraisal for any NFT directly from their portfolio viewer with a single click.

### 4. End-to-End Loan Lifecycle Management
- **Loan Initiation:** A guided, multi-step modal simulates the blockchain transaction for accepting a loan offer and securing collateral.
- **Loan Repayment:** Active loans can be repaid through a dedicated modal, which allows users to select a repayment currency and simulates the transaction to reclaim their NFT.
- **Loan Forfeiture & Liquidation:** A transparent flow for defaulted loans allows users to acknowledge the default and simulate the final, irreversible liquidation of their collateral.

### 5. Modern Tech Stack & Architecture
- **React & TypeScript:** A robust and type-safe front-end foundation.
- **Centralized State Management:** Utilizes React Context for clean, scalable management of global state (connection status, wallet address, loan data).
- **Gemini API Integration:** Powers the core AI features, including NFT appraisal and dynamic content generation for the portfolio and featured collections.
- **Tailwind CSS:** For a responsive, modern, and utility-first design.

## How to Run
This is a self-contained application running in a specialized environment. All necessary dependencies are managed via an `importmap` in `index.html`, and no manual installation is required. The application state is managed within the browser.

## Escrow status

The production address is a UUPS/ERC-1967 proxy on Base Mainnet. The V2 ABI remains in `contracts/contracts/DigiPawnsEscrow.sol`; the migration-safe V3 upgrade candidate, tests, and read-only proposal tooling live in the same `contracts` package.

V3 is not automatically deployed by this repository. Before a Base Mainnet upgrade, verify the exact live implementation storage layout, inventory every active legacy loan and NFT held by the proxy, run the upgrade against a Base fork, verify the candidate implementation on BaseScan, and obtain independent Solidity review. The website must continue using the existing proxy address.
