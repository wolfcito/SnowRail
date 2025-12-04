# 🤖 Sovereign Agent Stack Integration

SnowRail implements multiple layers of the **Sovereign Agent Stack** - the emerging standard for building autonomous AI agents on blockchain.

---

## ✅ Implemented Layers

### 1. Payments & Metering (COMPLETE)

- **x402 Protocol**: Full facilitator implementation with `/validate`, `/verify`, `/settle` endpoints
- **ERC-8004 Metering**: 5 resource meters configured (payroll, payments, swaps, testing)
- **EIP-3009**: `transferWithAuthorization` for gasless, signed payments
- **HTTP 402**: Native "Payment Required" middleware for API monetization

**Endpoints:**
```bash
POST /facilitator/validate  # Validate payment proof
POST /facilitator/verify    # Verify EIP-3009 signature
POST /facilitator/settle    # Settle payment on-chain
GET  /facilitator/health    # Check facilitator status
```

### 2. Identity & Reputation (BASIC)

- **ERC-8004 Agent Card**: Discoverable identity at `GET /api/agent/identity`
- **Capability Declaration**: AI agents can discover SnowRail's services programmatically
- **Validation**: Smart contract-based validation on Avalanche

**Example Identity Card:**
```json
{
  "erc8004Version": "1.0",
  "agent": {
    "id": "snowrail-treasury-v1",
    "name": "SnowRail Treasury Agent",
    "description": "Autonomous treasury orchestration",
    "capabilities": [
      "treasury_management",
      "cross_border_payments",
      "payroll_execution",
      "crypto_to_fiat_bridge",
      "permanent_receipts"
    ],
    "protocols": ["x402", "erc8004", "eip3009", "arweave"],
    "networks": ["avalanche", "avalanche-fuji"]
  }
}
```

### 3. Memory & State (COMPLETE)

- **Arweave Integration**: Every payroll receipt saved permanently and immutably
- **Audit Trail**: Payment proofs accessible forever at `https://arweave.net/{txId}`
- **Compliance-Ready**: Immutable records for regulatory requirements
- **Structured Receipts**: JSON receipts with payroll ID, amounts, recipients, timestamps
- **Discoverable**: Receipts tagged with agent ID, protocol version, and payroll metadata
- **Real-time Activity**: UI displays all payroll executions with their permanent Arweave links

**Receipt Structure:**
```json
{
  "payrollId": "pay_xxx",
  "status": "PAID",
  "totalAmount": "1000.00",
  "currency": "USD",
  "recipientCount": 10,
  "network": "avalanche-fuji",
  "treasuryContract": "0x...",
  "createdAt": "2025-12-04T00:00:00Z",
  "completedAt": "2025-12-04T00:01:00Z",
  "version": "1.0.0",
  "protocol": "x402",
  "agentId": "snowrail-treasury-v1",
  "x402MeterId": "payroll_execute"
}
```

---

## 🔄 Roadmap (Post-MVP)

| Feature | Description | Timeline |
|---------|-------------|----------|
| **Session Keys** | Time-limited agent keys with spending limits (ZeroDev) | Q1 2025 |
| **Superfluid Streaming** | Salary payments per-second instead of batch | Q1 2025 |
| **Multi-Agent Coordination** | Recall Network integration for agent memory sharing | Q2 2025 |
| **TEE Verification** | Confidential payroll computation (Phala Network) | Q2 2025 |

---

## 🎯 Why SnowRail for AI Agents

> **"While other projects focus on identity or memory, SnowRail solves the most critical problem: how AI agents pay and receive payments in both crypto and fiat simultaneously."**

### Agent Use Cases

- 🤖 **Autonomous Payroll**: AI agents execute cross-border payroll without human intervention
- 💰 **Treasury Management**: Agents manage company treasuries with programmatic spending limits
- 🌍 **Cross-Border Payments**: Bridge crypto (Avalanche) ↔ fiat (bank accounts) in one transaction
- 📊 **Verifiable Audit**: Every transaction permanently recorded on Arweave

### Integration for AI Developers

1. **Discover**: Query `GET /api/agent/identity` to learn SnowRail's capabilities
2. **Pay**: Create EIP-3009 signed authorization for payment
3. **Execute**: Call `POST /process` with payment proof in metadata
4. **Verify**: Check permanent receipt on Arweave

**Example A2A Request:**
```typescript
const response = await fetch('http://localhost:4000/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: {
      messageId: 'msg-123',
      role: 'user',
      parts: [{ kind: 'text', text: 'Process my payroll' }],
      metadata: {
        'x402.payment.payload': paymentProof,
        'x402.payment.status': 'payment-submitted',
        'agent.id': 'agent-abc-123'
      }
    }
  })
});
```

---

## 📊 Comparison with Stack Layers

| Layer | Status | Implementation |
|-------|--------|----------------|
| **Payments** | ✅ Complete | x402 + ERC-8004 metering |
| **Identity** | ✅ Basic | ERC-8004 agent card |
| **Memory** | ✅ Complete | Arweave permanent storage |
| **Wallets** | ⚠️ Planned | Session keys (ZeroDev) |
| **Coordination** | ⚠️ Planned | Recall Network |
| **Verifiable Compute** | ⚠️ Planned | TEE (Phala Network) |

---

[← Back to README](../README.md)

