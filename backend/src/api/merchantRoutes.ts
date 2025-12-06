/**
 * Merchant API Routes
 * Public endpoints for merchants to create payment intents
 */

import type { Express, Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { prisma } from "../dbClient.js";
import { createPaymentIntent } from "../services/paymentIntentService.js";
import { getCurrentNetworkConfig } from "../config/networkConfig.js";
import { config } from "../config/env.js";

// Request type for creating payment intent
type CreatePaymentIntentRequest = {
  amount: number;
  token: string;
  reference?: string;
  companyId: string;
};

/**
 * Generate x402 payment requirements for a payment intent
 * Includes paymentIntentId in metadata for callback routing
 */
function generatePaymentRequirements(
  paymentIntentId: string,
  amount: number,
  token: string,
): {
  scheme: string;
  network: string;
  asset: string;
  payTo: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  maxTimeoutSeconds: number;
  extra: {
    name: string;
    version: string;
    paymentIntentId: string;
  };
} {
  const networkConfig = getCurrentNetworkConfig();
  const payToAddress = process.env.PAY_TO_ADDRESS || "";

  if (!payToAddress) {
    throw new Error("PAY_TO_ADDRESS not configured");
  }

  // Get token address from network config
  const tokenUpper = token.toUpperCase();
  const assetAddress =
    tokenUpper === "USDC" || tokenUpper === "XUSDC"
      ? networkConfig.stablecoins.usdc
      : tokenUpper === "USDT" || tokenUpper === "XUSDT"
        ? networkConfig.stablecoins.usdt
        : networkConfig.stablecoins.usdc; // Default to USDC

  // Convert amount to atomic units (USDC has 6 decimals)
  const atomicAmount = BigInt(Math.floor(amount * 1_000_000)).toString();

  // Build callback URL with paymentIntentId
  const callbackUrl = `${config.x402FacilitatorUrl.replace("/facilitator", "")}/internal/x402/callback`;

  return {
    scheme: "exact",
    network: config.network === "avalanche-fuji" ? "fuji" : config.network,
    asset: assetAddress,
    payTo: payToAddress,
    maxAmountRequired: atomicAmount,
    resource: callbackUrl,
    description: `Payment for ${paymentIntentId}`,
    mimeType: "application/json",
    maxTimeoutSeconds: 3600,
    extra: {
      name: token,
      version: "2",
      paymentIntentId, // Critical: include paymentIntentId for callback routing
    },
  };
}

/**
 * Register merchant API routes
 */
export function registerMerchantRoutes(app: Express) {
  /**
   * POST /merchant/payments
   * Create a payment intent for a company
   * Public endpoint (no auth required for MVP, can add API key later)
   */
  app.post("/merchant/payments", async (req: Request, res: Response) => {
    try {
      const body: CreatePaymentIntentRequest = req.body;
      const { amount, token, reference, companyId } = body;

      // Validate required fields
      if (!amount || !token || !companyId) {
        return res.status(400).json({
          error: "INVALID_REQUEST",
          message: "amount, token, and companyId are required",
        });
      }

      // Validate amount
      if (amount <= 0) {
        return res.status(400).json({
          error: "INVALID_AMOUNT",
          message: "Amount must be greater than 0",
        });
      }

      // Validate token (case-insensitive, but preserve valid format)
      const validTokens = ["USDC", "xUSDC", "USDT", "xUSDT"];
      const tokenUpper = token.toUpperCase();
      
      // Normalize for comparison: xUSDC -> XUSDC, USDC -> USDC
      const normalizedInput = tokenUpper;
      const isValidToken = validTokens.some(validToken => {
        const validUpper = validToken.toUpperCase();
        return validUpper === normalizedInput;
      });
      
      if (!isValidToken) {
        return res.status(400).json({
          error: "INVALID_TOKEN",
          message: `Token must be one of: ${validTokens.join(", ")}`,
        });
      }
      
      // Normalize token format: use xUSDC format if it starts with x/X
      const normalizedToken = tokenUpper.startsWith("X") 
        ? "x" + tokenUpper.substring(1) 
        : tokenUpper;

      // Validate company exists
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return res.status(404).json({
          error: "COMPANY_NOT_FOUND",
          message: `Company ${companyId} not found`,
        });
      }

      // Create payment intent (use normalized token format)
      const payment = await createPaymentIntent(
        companyId,
        amount,
        normalizedToken,
        reference,
      );

      // Generate x402 payment requirements
      const paymentRequirements = generatePaymentRequirements(
        payment.paymentIntentId,
        amount,
        normalizedToken,
      );

      logger.info(`Payment intent created: ${payment.paymentIntentId}`, {
        companyId,
        amount,
        token: normalizedToken,
      });

      // Return response
      return res.status(201).json({
        paymentIntentId: payment.paymentIntentId,
        status: payment.status,
        companyId: payment.companyId,
        amount: Number(payment.amountToken),
        token: payment.token,
        amountUsd: Number(payment.amountUsd),
        x402: {
          paymentUrl: `https://${config.network === "avalanche-fuji" ? "fuji" : config.network}.x402.dev/pay?intent=${payment.paymentIntentId}`,
          requiredToken: normalizedToken,
          requiredAmount: amount.toString(),
          requirements: paymentRequirements,
        },
      });
    } catch (error) {
      logger.error("Error creating payment intent:", error);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create payment intent",
      });
    }
  });
}

