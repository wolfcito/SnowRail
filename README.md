# SnowRail

SnowRail is a treasury orchestrator that connects onchain payments (Avalanche C-Chain) with fiat bank payouts using a Rail-like API, protected by the **x402** protocol for API monetization.

- **Onchain**: Users pay in USDC into an EVM treasury (Avalanche C-Chain).
- **SnowRail Backend**: Validates access via x402, runs payroll logic, and triggers Rail payouts.
- **Rail (mock in this MVP)**: Executes fiat payouts (ACH/wire) to bank accounts.
- **Webhooks (future)**: Rail notifies status changes that SnowRail syncs back into the app.

---

## High-Level Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Frontend   │────▶│  SnowRail API    │────▶│    Rail     │
│  (React)    │     │  (Express + x402)│     │  (Fiat API) │
└─────────────┘     └────────┬─────────┘     └─────────────┘
                             │
                    ┌────────▼──────────┐
                    │ Avalanche C-Chain │
                    │ (SnowRailTreasury)│
                    └───────────────────┘
```

- **Frontend**: React app that consumes the SnowRail API and drives the demo UX.
- **Backend**: REST API with x402/8004, payroll orchestration, and Rail integration (mock).
- **Smart Contracts**: `SnowRailTreasury` deployed on Avalanche C-Chain.
- **Database**: SQLite in dev (easily swappable to PostgreSQL via Prisma).

---

## Tech Stack

| Area       | Tech                                                    |
|-------------|----------------------------------------------------------|
| Backend     | Node.js, TypeScript, Express                             |
| Database    | Prisma ORM, SQLite (dev) / PostgreSQL-ready (prod)       |
| Onchain     | Ethers.js, Avalanche C-Chain                             |
| Protocols   | x402 (HTTP 402), 8004 (metering config)                  |
| Fiat        | Rail API (mocked client in this MVP)                     |
| Frontend    | React, Vite, TypeScript                                  |
| Contracts   | Solidity ^0.8.20, Hardhat                                |

---

## Project Structure

```
/contracts                  # Solidity smart contracts
  └── src/
      ├── SnowRailTreasury.sol
      └── interfaces/
          ├── IERC20.sol
          └── IJoeRouter2.sol

/backend                    # Node.js backend (Express + x402)
  ├── prisma/
  │   └── schema.prisma
  └── src/
      ├── index.ts          # Server entrypoint
      ├── app.ts            # Express app factory
      ├── config/           # env, network, contract config
      ├── db/               # Prisma client
      ├── x402/             # x402 middleware + 8004 metering
      ├── api/              # Routes + controllers
      ├── services/         # Treasury, Rail (mock), Payroll, Payments
      ├── domain/           # Domain types (payroll, payment)
      └── utils/            # Logger, error helpers

/frontend                   # React demo frontend
  └── src/
      ├── App.tsx          # View orchestration
      ├── components/      # Dashboard, PaymentFlow, PayrollDetail
      └── lib/             # API client (executePayroll, getPayroll)
```

---

## Environment Configuration

```bash
# Server
PORT=4000

# Database
DATABASE_URL="file:./dev.db"

# Network (avalanche | polygon)
NETWORK="avalanche"
RPC_URL_AVALANCHE="https://api.avax.network/ext/bc/C/rpc"
RPC_URL_POLYGON="https://polygon-rpc.com"

# Smart Contract
TREASURY_CONTRACT_ADDRESS="0xYourTreasuryAddressHere"
PRIVATE_KEY="0x..."  # EVM private key for treasury signer

# x402 Facilitator (future real integration)
X402_FACILITATOR_URL="https://facilitator.mock"

# Rail API (mock base URL in this MVP)
RAIL_API_BASE_URL="https://rail.mock"
RAIL_API_KEY="rail-mock-key"
```

> **Switching networks**: set `NETWORK=polygon` or `NETWORK=avalanche` and point `TREASURY_CONTRACT_ADDRESS` to the correct deployment. No business logic changes required.

---

## Protocols

### x402 – HTTP 402 Payment Required

All monetized endpoints are protected by a dedicated middleware:

**POST /api/payroll/execute**

- **Without** `X-PAYMENT` header → HTTP 402 with metering payload:
  
  ```json
  {
    "error": "PAYMENT_REQUIRED",
    "meterId": "payroll_execute",
    "metering": {
      "price": "1",
      "asset": "USDC",
      "chain": "avalanche",
      "resource": "payroll_execution",
      "version": "8004-alpha"
    }
  }
  ```

- **With** `X-PAYMENT: demo-token` (MVP) → access is granted and payroll is executed.

**Implementation:**
- `backend/src/x402/metering.ts` – resource catalog.
- `backend/src/x402/validator.ts` – validates `X-PAYMENT` (accepts `demo-token`).
- `backend/src/x402/middleware.ts` – Express middleware that issues HTTP 402.

---

### 8004 – Metering Configuration

```ts
// backend/src/x402/metering.ts
export const meters = {
  payroll_execute: {
    price: "1",
    asset: "USDC",
    chain: "avalanche",
    resource: "payroll_execution",
    description: "Execute international payroll for up to 10 freelancers",
    version: "8004-alpha",
  },
};
```

This structure is intentionally ORM-like so additional resources can be added without changing the middleware.

---

## Backend API

| Method | Endpoint               | Protection | Description          |
|--------|------------------------|-------------|----------------------|
| GET    | `/api/health`          | None        | Service health check |
| POST   | `/api/payroll/execute` | x402        | Execute demo payroll |
| GET    | `/api/payroll/:id`     | None        | Get payroll by ID    |

### Status Lifecycle

```
PENDING → ONCHAIN_PAID → RAIL_PROCESSING → PAID
                                   └──────→ FAILED
```

All states are persisted in SQLite via Prisma and exposed to the frontend.

---

## Smart Contracts

### SnowRailTreasury (Solidity)

`contracts/src/SnowRailTreasury.sol` is the onchain treasury for SnowRail:

**State**
- `address public owner;`
- `IJoeRouter2 public router;`
- `mapping(address => mapping(address => uint256)) public swapAllowances;`

**Events**
- `PaymentRequested(payer, payee, amount, token)`
- `PaymentExecuted(payer, payee, amount, token)`
- `PaymentFailed(payer, payee, amount, token, reason)`
- `SwapAuthorized(owner, fromToken, toToken, maxAmount)`
- `SwapExecuted(swapper, fromToken, toToken, amount)`

**Core functions**
- `requestPayment(address payee, uint256 amount, address token)` – logs intent to pay.
- `executePayment(address payer, address payee, uint256 amount, address token)` – sends tokens from treasury to `payee`, emits success/failure events.
- `authorizeSwap(address fromToken, address toToken, uint256 maxAmount)` – admin-only swap limits.
- `executeSwap(address fromToken, address toToken, uint256 amountIn, uint256 amountOutMin, address[] calldata path)` – calls DEX router for swaps.

A thin **ethers.js wrapper** is provided by `backend/src/services/treasuryClient.ts`.

---

## Demo Payroll Flow (End-to-End)

1. **User** opens `http://localhost:3000` and clicks **“Execute Payroll”**.
2. **Frontend** calls `POST /api/payroll/execute` without `X-PAYMENT`.
3. **x402 middleware** returns `402 PAYMENT_REQUIRED` with the `payroll_execute` meter.
4. **Frontend** shows the 8004 metering info (1 USDC on Avalanche) and a **“Simulate Onchain Payment”** button.
5. User clicks the button; frontend calls `POST /api/payroll/execute` with `X-PAYMENT: demo-token`.
6. **x402** validates the token and lets the request through.
7. **Payroll service** (`executePayrollDemo`) creates a `Payroll` with 10 `Payment` rows and transitions states:
   - `PENDING → ONCHAIN_PAID → RAIL_PROCESSING → PAID` (via mock `railClient`).
8. Backend responds with `{ payrollId, status, total, payments[] }`.
9. Frontend navigates to **PayrollDetail** and polls `GET /api/payroll/:id` every few seconds.
10. UI updates until status is **PAID** or **FAILED**, showing a table of the 10 payments.

For a deeper explanation, see `docs/Dogs/project-flow.md` (if present).

---

## Quick Start

### 1. Compile Contracts (No Deployment)

```bash
cd contracts
npm install
npx hardhat compile
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

Backend will be available at `http://localhost:4000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:3000` with `/api` proxied to the backend.
