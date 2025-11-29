/**
 * Rail Client Service
 * Real integration with Rail API for fiat payouts
 */

import { config } from "../config/env.js";

// Types based on Rail OpenAPI spec
export type RailPaymentInput = {
  payrollId: string;
  amount: number;
  currency: string;
  recipient?: string;
  sourceAccountId?: string;
  counterpartyId?: string;
};

export type RailPaymentResult = {
  id: string;
  status: "PROCESSING" | "PAID" | "FAILED" | "PENDING";
  createdAt: string;
  failureReason?: string;
};

// Rail API types (simplified from OpenAPI spec)
type RailWithdrawal = {
  amount: number;
  created_timestamp: string;
  destination_counterparty_id: string;
  purpose: "PAYROLL";
  source_account_id: string;
  withdrawal_rail: "ACH" | "FEDWIRE" | "SEPA_CT" | "SWIFT";
  description?: string;
};

type RailWithdrawalResponse = {
  id: string;
  status: string;
  created_timestamp: string;
  updated_timestamp?: string;
  amount: number;
  source_account_id: string;
  destination_counterparty_id: string;
  withdrawal_rail: string;
  purpose: string;
};

type RailError = {
  errors: Array<{
    code: string;
    description: string;
  }>;
};

/**
 * Create a Rail withdrawal (fiat payout)
 * @param input - Payment input data
 * @returns Promise<RailPaymentResult>
 */
export async function createRailPayment(
  input: RailPaymentInput,
): Promise<RailPaymentResult> {
  const baseUrl = config.railApiBaseUrl;
  const apiKey = config.railApiKey;

  if (!baseUrl || baseUrl === "https://rail.mock" || !apiKey || apiKey === "rail-mock-key") {
    // Fallback to mock if not configured
    console.warn("Rail API not configured, using mock");
    return createMockRailPayment(input);
  }

  try {
    // For MVP: assume we have source_account_id and counterparty_id
    // In production, these should be configured per customer/recipient
    const sourceAccountId = input.sourceAccountId || process.env.RAIL_SOURCE_ACCOUNT_ID;
    const counterpartyId = input.counterpartyId || process.env.RAIL_COUNTERPARTY_ID;

    if (!sourceAccountId || !counterpartyId) {
      throw new Error(
        "RAIL_SOURCE_ACCOUNT_ID and RAIL_COUNTERPARTY_ID must be configured in .env"
      );
    }

    // Create withdrawal request
    const withdrawal: RailWithdrawal = {
      amount: input.amount / 100, // Convert from cents to dollars
      created_timestamp: new Date().toISOString(),
      destination_counterparty_id: counterpartyId,
      purpose: "PAYROLL",
      source_account_id: sourceAccountId,
      withdrawal_rail: "ACH", // Default to ACH, can be configured
      description: `Payroll payment for ${input.payrollId}`,
    };

    const response = await fetch(`${baseUrl}/v1/withdrawals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-l2f-request-id": `snowrail-${Date.now()}`,
        "x-l2f-idempotency-id": `payroll-${input.payrollId}`,
      },
      body: JSON.stringify(withdrawal),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as RailError;
      const errorMsg =
        errorData.errors?.[0]?.description || `Rail API error: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    const data = (await response.json()) as RailWithdrawalResponse;

    // Accept the withdrawal immediately (for MVP)
    // In production, you might want to review before accepting
    try {
      await acceptRailWithdrawal(data.id);
    } catch (acceptError) {
      console.warn(`Failed to auto-accept withdrawal ${data.id}:`, acceptError);
      // Return as PENDING if acceptance fails
      return {
        id: data.id,
        status: "PENDING",
        createdAt: data.created_timestamp,
      };
    }

    // Map Rail status to our status
    const statusMap: Record<string, RailPaymentResult["status"]> = {
      PENDING: "PENDING",
      ACCEPTED: "PROCESSING",
      PROCESSING: "PROCESSING",
      COMPLETED: "PAID",
      FAILED: "FAILED",
      CANCELLED: "FAILED",
    };

    return {
      id: data.id,
      status: statusMap[data.status] || "PROCESSING",
      createdAt: data.created_timestamp,
    };
  } catch (error) {
    console.error("Rail API error:", error);
    return {
      id: `rail_error_${Date.now()}`,
      status: "FAILED",
      createdAt: new Date().toISOString(),
      failureReason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Accept a Rail withdrawal
 * @param withdrawalId - Withdrawal ID from Rail
 */
async function acceptRailWithdrawal(withdrawalId: string): Promise<void> {
  const baseUrl = config.railApiBaseUrl;
  const apiKey = config.railApiKey;

  const response = await fetch(`${baseUrl}/v1/withdrawals/${withdrawalId}/accept`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "x-l2f-request-id": `snowrail-accept-${Date.now()}`,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json()) as RailError;
    throw new Error(
      errorData.errors?.[0]?.description || `Failed to accept withdrawal: ${response.statusText}`
    );
  }
}

/**
 * Mock implementation (fallback)
 */
async function createMockRailPayment(
  input: RailPaymentInput,
): Promise<RailPaymentResult> {
  const delay = 1000 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const id = `rail_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const success = Math.random() > 0.1;

  if (!success) {
    return {
      id,
      status: "FAILED",
      createdAt: new Date().toISOString(),
      failureReason: "MOCK_RANDOM_FAILURE",
    };
  }

  return {
    id,
    status: "PAID",
    createdAt: new Date().toISOString(),
  };
}
