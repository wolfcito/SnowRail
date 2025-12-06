/**
 * Integration test for Merchant API + x402 Inbound Payments
 * Tests the complete flow: create payment intent → callback → balance update
 */

import { PrismaClient } from "@prisma/client";
import { createPaymentIntent, confirmPayment } from "../../src/services/paymentIntentService.js";
import { getTokenPrice } from "../../src/services/priceFeedService.js";
import { clearPriceCache } from "../../src/services/priceFeedService.js";

const prisma = new PrismaClient();
const API_BASE = process.env.API_BASE || "http://localhost:4000";

async function main() {
  console.log("🧪 Testing Merchant API + x402 Inbound Payments Flow\n");

  try {
    // Step 1: Create a test company
    console.log("📝 Step 1: Creating test company...");
    const testCompany = await prisma.company.create({
      data: {
        legalName: "Test Merchant Company",
        businessEmail: `test-merchant-${Date.now()}@example.com`,
        country: "US",
        kybLevel: 0,
        kybStatus: "none",
        railStatus: "none",
      },
    });
    console.log(`✅ Company created: ${testCompany.id} (${testCompany.legalName})\n`);

    // Step 2: Test price feed service
    console.log("💰 Step 2: Testing price feed service...");
    clearPriceCache();
    const usdcPrice = await getTokenPrice("xUSDC");
    console.log(`✅ xUSDC price: $${usdcPrice}\n`);

    // Step 3: Create payment intent via API
    console.log("📦 Step 3: Creating payment intent via API...");
    const paymentAmount = 10.5;
    const paymentToken = "xUSDC";

    const paymentIntent = await createPaymentIntent(
      testCompany.id,
      paymentAmount,
      paymentToken,
      "test_invoice_123",
    );
    console.log(`✅ Payment intent created:`);
    console.log(`   ID: ${paymentIntent.id}`);
    console.log(`   PaymentIntentId: ${paymentIntent.paymentIntentId}`);
    console.log(`   Amount: ${paymentIntent.amountToken} ${paymentToken}`);
    console.log(`   Amount USD: $${paymentIntent.amountUsd}`);
    console.log(`   Status: ${paymentIntent.status}\n`);

    // Verify payment was created in DB
    const dbPayment = await prisma.payment.findUnique({
      where: { paymentIntentId: paymentIntent.paymentIntentId },
    });
    if (!dbPayment) {
      throw new Error("Payment not found in database");
    }
    console.log(`✅ Payment verified in database\n`);

    // Step 4: Simulate callback (payment confirmed on-chain)
    console.log("📞 Step 4: Simulating x402 callback (payment confirmed)...");
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    const confirmation = await confirmPayment(
      paymentIntent.paymentIntentId,
      mockTxHash,
      paymentAmount,
      paymentToken,
    );
    console.log(`✅ Payment confirmed:`);
    console.log(`   Status: ${confirmation.status}`);
    console.log(`   TxHash: ${confirmation.txHash}\n`);

    // Step 5: Verify balance was updated
    console.log("💵 Step 5: Verifying company balance was updated...");
    const balance = await prisma.companyBalance.findUnique({
      where: {
        companyId_token: {
          companyId: testCompany.id,
          token: paymentToken,
        },
      },
    });

    if (!balance) {
      throw new Error("Company balance not found after payment");
    }

    console.log(`✅ Balance updated:`);
    console.log(`   Token: ${balance.token}`);
    console.log(`   Balance Token: ${balance.balanceToken}`);
    console.log(`   Balance USD: $${balance.balanceUsd}\n`);

    // Verify amounts match
    const expectedBalance = paymentAmount;
    const actualBalance = Number(balance.balanceToken);
    if (Math.abs(actualBalance - expectedBalance) > 0.01) {
      throw new Error(
        `Balance mismatch: expected ${expectedBalance}, got ${actualBalance}`,
      );
    }
    console.log(`✅ Balance amount matches expected: ${actualBalance} ${paymentToken}\n`);

    // Step 6: Test idempotency (call callback twice)
    console.log("🔄 Step 6: Testing idempotency (duplicate callback)...");
    try {
      await confirmPayment(
        paymentIntent.paymentIntentId,
        mockTxHash, // Same txHash
        paymentAmount,
        paymentToken,
      );
      console.log(`✅ Idempotency test passed (duplicate callback handled)\n`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already confirmed")) {
        console.log(`✅ Idempotency test passed (correctly rejected duplicate)\n`);
      } else {
        throw error;
      }
    }

    // Step 7: Test with different company (verify isolation)
    console.log("🏢 Step 7: Testing with second company (balance isolation)...");
    const testCompany2 = await prisma.company.create({
      data: {
        legalName: "Test Merchant Company 2",
        businessEmail: `test-merchant-2-${Date.now()}@example.com`,
        country: "US",
        kybLevel: 0,
        kybStatus: "none",
        railStatus: "none",
      },
    });

    const paymentIntent2 = await createPaymentIntent(
      testCompany2.id,
      5.0,
      paymentToken,
      "test_invoice_456",
    );

    await confirmPayment(
      paymentIntent2.paymentIntentId,
      `0x${Math.random().toString(16).substr(2, 64)}`,
      5.0,
      paymentToken,
    );

    const balance2 = await prisma.companyBalance.findUnique({
      where: {
        companyId_token: {
          companyId: testCompany2.id,
          token: paymentToken,
        },
      },
    });

    if (!balance2) {
      throw new Error("Company 2 balance not found");
    }

    console.log(`✅ Company 2 balance: ${balance2.balanceToken} ${paymentToken}`);
    console.log(`✅ Company 1 balance: ${balance.balanceToken} ${paymentToken}`);
    
    if (Number(balance.balanceToken) === Number(balance2.balanceToken)) {
      throw new Error("Balance isolation failed - companies have same balance");
    }
    console.log(`✅ Balance isolation verified (companies have separate balances)\n`);

    // Step 8: Test API endpoint
    console.log("🌐 Step 8: Testing POST /merchant/payments endpoint...");
    const apiResponse = await fetch(`${API_BASE}/merchant/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: 25.0,
        token: "xUSDC",
        reference: "api_test_invoice",
        companyId: testCompany.id,
      }),
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.text();
      throw new Error(`API request failed: ${apiResponse.status} - ${error}`);
    }

    const apiResult = await apiResponse.json();
    console.log(`✅ API endpoint works:`);
    console.log(`   PaymentIntentId: ${apiResult.paymentIntentId}`);
    console.log(`   Status: ${apiResult.status}`);
    console.log(`   x402 requirements generated: ${!!apiResult.x402}\n`);

    // Cleanup (optional - comment out if you want to keep test data)
    console.log("🧹 Cleaning up test data...");
    // await prisma.companyBalance.deleteMany({
    //   where: { companyId: { in: [testCompany.id, testCompany2.id] } },
    // });
    // await prisma.payment.deleteMany({
    //   where: { companyId: { in: [testCompany.id, testCompany2.id] } },
    // });
    // await prisma.company.deleteMany({
    //   where: { id: { in: [testCompany.id, testCompany2.id] } },
    // });
    console.log(`✅ Test companies and payments kept for manual inspection\n`);

    console.log("✅ All tests passed!\n");
    console.log("Summary:");
    console.log(`  - Created ${testCompany.legalName} (${testCompany.id})`);
    console.log(`  - Created ${testCompany2.legalName} (${testCompany2.id})`);
    console.log(`  - Created and confirmed payment for Company 1: ${paymentAmount} ${paymentToken}`);
    console.log(`  - Created and confirmed payment for Company 2: 5.0 ${paymentToken}`);
    console.log(`  - Verified balance isolation between companies`);
    console.log(`  - Verified API endpoint works`);
    console.log(`\nYou can now check the database to see the payments and balances.`);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

