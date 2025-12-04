# 🤖 Agent Interface Guide

Complete guide to using SnowRail's agent interface for monitoring, discovery, and interaction.

---

## Overview

SnowRail provides three ways to interact with the agent system:

1. **REST API** - For programmatic access
2. **Web Dashboard** - For human monitoring
3. **A2A Protocol** - For agent-to-agent communication

---

## Accessing Agent Data via API

### Get Agent Identity Card

Discover SnowRail's capabilities, protocols, and available resources.

```bash
curl http://localhost:4000/api/agent/identity
```

**Response:**
```json
{
  "erc8004Version": "1.0",
  "agent": {
    "id": "snowrail-treasury-v1",
    "name": "SnowRail Treasury Agent",
    "description": "Autonomous treasury orchestration",
    "version": "1.0.0",
    "capabilities": [
      "treasury_management",
      "cross_border_payments",
      "payroll_execution",
      "crypto_to_fiat_bridge",
      "x402_payments",
      "onchain_settlement",
      "permanent_receipts"
    ],
    "protocols": ["x402", "erc8004", "eip3009", "rail_api", "arweave"],
    "networks": ["avalanche", "avalanche-fuji"],
    "validation": {
      "type": "SMART_CONTRACT",
      "address": "0x...",
      "chainId": 43113
    }
  },
  "metering": {
    "resources": [
      {
        "id": "payroll_execute",
        "price": "1",
        "asset": "USDC",
        "chain": "avalanche",
        "description": "Execute international payroll"
      }
    ]
  }
}
```

### Get Recent Activity

View payroll execution history with Arweave receipts.

```bash
curl http://localhost:4000/api/agent/activity
```

**Response:**
```json
{
  "activity": [
    {
      "id": "pay_xxx",
      "status": "PAID",
      "totalAmount": "1000.00",
      "currency": "USD",
      "recipientCount": 10,
      "createdAt": "2025-12-04T00:00:00Z",
      "arweave": {
        "url": "https://arweave.net/txId",
        "txId": "arweave-transaction-id",
        "status": "Immutable • Verifiable • Compliance-Ready"
      },
      "payments": [...]
    }
  ],
  "stats": {
    "totalPayrolls": 5,
    "totalPaid": 5000.00,
    "totalRecipients": 50
  }
}
```

### Get Operational Statistics

Monitor real-time system metrics.

```bash
curl http://localhost:4000/api/agent/stats
```

**Response:**
```json
{
  "summary": {
    "totalPayrolls": 10,
    "totalPaidPayrolls": 8,
    "totalProcessingPayrolls": 1,
    "totalFailedPayrolls": 1
  },
  "amounts": {
    "totalPaid": 10000.00,
    "totalProcessing": 1000.00,
    "currency": "USD"
  },
  "recipients": {
    "total": 100
  },
  "system": {
    "uptime": "5h 30m 15s",
    "timestamp": "2025-12-04T00:00:00Z"
  }
}
```

---

## Using the Web Dashboard

### Accessing the Dashboard

1. Start the application:
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Click **"View Identity Card"** button on the main dashboard

### Dashboard Features

The Agent Identity dashboard has three tabs:

#### 1. Payroll History Tab

**Features:**
- Real-time list of executed payrolls
- Status indicators with color coding:
  - 🟢 **PAID** - Successfully completed
  - 🟡 **RAIL_PROCESSING** - In progress
  - 🔴 **FAILED** - Failed (with error details)
- Arweave receipt links for each payroll
- Expandable payment details
- Summary statistics cards:
  - Total payrolls
  - Total amount paid
  - Total recipients
  - Payrolls in last 24h

**Actions:**
- Click receipt URL to view permanent Arweave record
- Expand payment details to see individual payments
- Refresh data automatically every 30 seconds

#### 2. Agent Identity Tab

**Features:**
- ERC-8004 compliant identity card
- Discovery endpoint with copy-to-clipboard button
- Sovereign Agent Stack layer indicators:
  - ✓ Payments (Complete)
  - ✓ Identity (Basic)
  - ✓ Memory (Complete)
- Full capabilities list
- Protocol support indicators
- Available resources with pricing

**Actions:**
- Copy discovery endpoint URL
- View all agent capabilities
- See available metered resources

#### 3. Statistics Tab

**Features:**
- Payroll statistics by status
- Financial overview (paid vs processing)
- Recipient count
- System information (uptime, status, timestamp)

**Data Updates:**
- Automatic refresh every 30 seconds
- Manual refresh button available
- Real-time status indicators

---

## Verifying Arweave Receipts

Every payroll execution creates a permanent, immutable receipt on Arweave.

### Receipt Structure

```json
{
  "payrollId": "pay_xxx",
  "status": "PAID",
  "totalAmount": "1000.00",
  "currency": "USD",
  "recipientCount": 10,
  "network": "avalanche-fuji",
  "treasuryContract": "0x...",
  "onchainTxHash": "0x...",
  "createdAt": "2025-12-04T00:00:00Z",
  "completedAt": "2025-12-04T00:01:00Z",
  "version": "1.0.0",
  "protocol": "x402",
  "agentId": "snowrail-treasury-v1",
  "x402MeterId": "payroll_execute"
}
```

### Accessing Receipts

**Via Browser:**
```
https://arweave.net/{txId}
```

**Via API:**
```bash
# Get transaction data
curl https://arweave.net/{txId}

# Get transaction metadata
curl https://arweave.net/tx/{txId}
```

### Receipt Tags

All receipts are tagged for discoverability:

| Tag | Value | Purpose |
|-----|-------|---------|
| `Content-Type` | `application/json` | Data format |
| `App-Name` | `SnowRail` | Application identifier |
| `Payroll-ID` | `pay_xxx` | Payroll reference |
| `Protocol` | `x402` | Protocol version |
| `Agent-ID` | `snowrail-treasury-v1` | Agent identifier |

**Query receipts by tag:**
```bash
# Using arweave-js or GraphQL
query {
  transactions(
    tags: [
      { name: "App-Name", values: ["SnowRail"] },
      { name: "Protocol", values: ["x402"] }
    ]
  ) {
    edges {
      node {
        id
        tags {
          name
          value
        }
      }
    }
  }
}
```

---

## Agent-to-Agent (A2A) Communication

### Discovery Flow

1. **Agent discovers SnowRail:**
   ```bash
   GET /api/agent/identity
   ```

2. **Agent reads capabilities:**
   ```json
   {
     "capabilities": [
       "treasury_management",
       "payroll_execution",
       "cross_border_payments"
     ]
   }
   ```

3. **Agent selects resource:**
   ```json
   {
     "metering": {
       "resources": [
         {
           "id": "payroll_execute",
           "price": "1",
           "asset": "USDC"
         }
       ]
     }
   }
   ```

### Payment Flow

1. **Agent requests service:**
   ```typescript
   const response = await fetch('http://localhost:4000/process', {
     method: 'POST',
     body: JSON.stringify({
       message: {
         messageId: 'msg-123',
         role: 'user',
         parts: [{ kind: 'text', text: 'Process payroll' }]
       }
     })
   });
   ```

2. **SnowRail responds with payment requirement:**
   ```json
   {
     "error": "PAYMENT_REQUIRED",
     "meterId": "payroll_execute",
     "metering": {
       "price": "1",
       "asset": "USDC",
       "chain": "avalanche"
     }
   }
   ```

3. **Agent creates EIP-3009 authorization:**
   ```typescript
   const authorization = await signTransferAuthorization({
     from: agentWallet.address,
     to: treasuryAddress,
     value: parseUnits("1", 6), // 1 USDC
     validAfter: 0,
     validBefore: Math.floor(Date.now() / 1000) + 3600,
     nonce: generateNonce()
   });
   ```

4. **Agent resubmits with payment proof:**
   ```typescript
   const response = await fetch('http://localhost:4000/process', {
     method: 'POST',
     body: JSON.stringify({
       message: {
         messageId: 'msg-123',
         role: 'user',
         parts: [{ kind: 'text', text: 'Process payroll' }],
         metadata: {
           'x402.payment.payload': authorization,
           'x402.payment.status': 'payment-submitted',
           'agent.id': 'agent-abc-123'
         }
       }
     })
   });
   ```

5. **SnowRail validates and processes:**
   - Verifies signature
   - Settles payment on-chain
   - Executes payroll
   - Saves receipt to Arweave
   - Returns result

---

## Integration Examples

### TypeScript/JavaScript

```typescript
import { ethers } from 'ethers';

class SnowRailAgent {
  private endpoint: string;
  private wallet: ethers.Wallet;

  async discoverCapabilities() {
    const response = await fetch(`${this.endpoint}/api/agent/identity`);
    return await response.json();
  }

  async executePayroll() {
    // 1. Try without payment
    let response = await fetch(`${this.endpoint}/api/payroll/execute`, {
      method: 'POST'
    });

    if (response.status === 402) {
      // 2. Get payment requirements
      const { metering } = await response.json();
      
      // 3. Create payment authorization
      const authorization = await this.createPaymentAuth(metering);
      
      // 4. Retry with payment
      response = await fetch(`${this.endpoint}/api/payroll/execute`, {
        method: 'POST',
        headers: {
          'X-PAYMENT': JSON.stringify(authorization)
        }
      });
    }

    return await response.json();
  }

  private async createPaymentAuth(metering: any) {
    // Implement EIP-3009 signature
    // ...
  }
}
```

### Python

```python
import requests
from web3 import Web3

class SnowRailAgent:
    def __init__(self, endpoint: str, private_key: str):
        self.endpoint = endpoint
        self.w3 = Web3()
        self.account = self.w3.eth.account.from_key(private_key)
    
    def discover_capabilities(self):
        response = requests.get(f"{self.endpoint}/api/agent/identity")
        return response.json()
    
    def execute_payroll(self):
        # Try without payment
        response = requests.post(f"{self.endpoint}/api/payroll/execute")
        
        if response.status_code == 402:
            # Get payment requirements
            metering = response.json()["metering"]
            
            # Create payment authorization
            authorization = self.create_payment_auth(metering)
            
            # Retry with payment
            response = requests.post(
                f"{self.endpoint}/api/payroll/execute",
                headers={"X-PAYMENT": authorization}
            )
        
        return response.json()
```

---

## Best Practices

### For Agent Developers

1. **Always discover first**: Call `/api/agent/identity` to understand capabilities
2. **Handle 402 gracefully**: Expect payment requirements, don't treat as errors
3. **Verify receipts**: Check Arweave links to confirm execution
4. **Monitor stats**: Use `/api/agent/stats` for health monitoring
5. **Cache identity**: Agent identity rarely changes, cache for 1 hour

### For Security

1. **Never share private keys**: Use secure key management (KMS, vaults)
2. **Validate signatures**: Always verify EIP-3009 authorizations server-side
3. **Rate limiting**: Implement rate limits in production
4. **HTTPS only**: Never use HTTP in production
5. **Monitor suspicious activity**: Track failed payment attempts

### For Performance

1. **Batch operations**: Group multiple payments when possible
2. **Async processing**: Don't block on Arweave uploads
3. **Cache responses**: Cache agent identity and stats
4. **Connection pooling**: Reuse HTTP connections
5. **Monitor metrics**: Track response times and error rates

---

[← Back to README](../README.md)

