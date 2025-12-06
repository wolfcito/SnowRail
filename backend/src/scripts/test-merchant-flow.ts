/**
 * Quick test script for Merchant API flow
 * Run with: npx tsx src/scripts/test-merchant-flow.ts
 * Or compile and run: npm run build && node dist/scripts/test-merchant-flow.js
 */

import { PrismaClient } from "@prisma/client";
import { createPaymentIntent, confirmPayment } from "../services/paymentIntentService.js";

const prisma = new PrismaClient();
const API_BASE = "http://localhost:4000";

async function main() {
  console.log("🧪 Testing Merchant API Flow\n");

  try {
    // Step 1: Create test company
    console.log("📝 Creating test company...");
    const company = await prisma.company.create({
      data: {
        legalName: "Test Merchant Co",
        businessEmail: `test-${Date.now()}@example.com`,
        country: "US",
        kybLevel: 0,
        kybStatus: "none",
        railStatus: "none",
      },
    });
    console.log(`✅ Company: ${company.id}\n`);

    // Step 2: Create payment intent
    console.log("📦 Creating payment intent...");
    const payment = await createPaymentIntent(company.id, 25.0, "xUSDC", "test_001");
    console.log(`✅ PaymentIntentId: ${payment.paymentIntentId}\n`);

    // Step 3: Test API endpoint
    console.log("🌐 Testing POST /merchant/payments...");
    const apiRes = await fetch(`${API_BASE}/merchant/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 15.0,
        token: "xUSDC",
        companyId: company.id,
      }),
    });

    if (!apiRes.ok) {
      const error = await apiRes.text();
      throw new Error(`API failed: ${apiRes.status} - ${error}`);
    }

    const apiData = (await apiRes.json()) as { paymentIntentId: string; status: string };
    console.log(`✅ API Response:`);
    console.log(`   PaymentIntentId: ${apiData.paymentIntentId}`);
    console.log(`   Status: ${apiData.status}\n`);

    // Step 4: Simulate callback
    console.log("📞 Simulating payment callback...");
    const callbackRes = await fetch(`${API_BASE}/internal/x402/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId: apiData.paymentIntentId,
        token: "xUSDC",
        amount: 15.0,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      }),
    });

    const callbackData = (await callbackRes.json()) as { ok: boolean; message?: string };
    console.log(`✅ Callback Response:`, callbackData);

    // Step 5: Check balance
    const balance = await prisma.companyBalance.findUnique({
      where: {
        companyId_token: {
          companyId: company.id,
          token: "xUSDC",
        },
      },
    });

    console.log(`\n💵 Balance: ${balance?.balanceToken || 0} xUSDC ($${balance?.balanceUsd || 0})`);
    console.log(`\n✅ Test completed!`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

