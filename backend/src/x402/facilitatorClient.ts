import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { getMeter, MeterConfig } from "./metering.js";

/**
 * Ultravioleta Facilitator Client
 * Handles communication with the Ultravioleta x402 facilitator
 */

export type FacilitatorValidationRequest = {
  proof: string;
  meterId: string;
  price: string;
  asset: string;
  chain: string;
};

export type FacilitatorValidationResponse = {
  valid: boolean;
  payer?: string;
  amount?: string;
  error?: string;
  message?: string;
};

/**
 * Validate payment proof with Ultravioleta facilitator
 * @param proof - Payment proof from X-PAYMENT header
 * @param meterId - Meter ID for the resource
 * @param meter - Meter configuration
 * @returns Validation result from facilitator
 */
export async function validateWithFacilitator(
  proof: string,
  meterId: string,
  meter: MeterConfig
): Promise<FacilitatorValidationResponse> {
  const facilitatorUrl = config.x402FacilitatorUrl;

  // Skip if using mock facilitator
  if (facilitatorUrl.includes("mock")) {
    logger.debug("Using mock facilitator, skipping validation");
    return {
      valid: false,
      error: "MOCK_FACILITATOR",
      message: "Mock facilitator does not validate payments",
    };
  }

  try {
    const requestBody: FacilitatorValidationRequest = {
      proof,
      meterId,
      price: meter.price,
      asset: meter.asset,
      chain: meter.chain,
    };

    logger.debug(`Validating payment with Ultravioleta facilitator: ${facilitatorUrl}`, {
      meterId,
      asset: meter.asset,
      price: meter.price,
    });

    const response = await fetch(`${facilitatorUrl}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(
        `Facilitator validation failed: ${response.status} ${response.statusText}`,
        { error: errorText }
      );

      return {
        valid: false,
        error: `HTTP_${response.status}`,
        message: errorText || response.statusText,
      };
    }

    const result = await response.json() as FacilitatorValidationResponse;

    if (result.valid) {
      logger.info(`Payment validated successfully by Ultravioleta facilitator`, {
        meterId,
        payer: result.payer,
        amount: result.amount,
      });
    } else {
      logger.warn(`Payment validation failed by Ultravioleta facilitator`, {
        meterId,
        error: result.error,
        message: result.message,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error communicating with Ultravioleta facilitator", error);
    return {
      valid: false,
      error: "FACILITATOR_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get facilitator health status
 * @returns Health status of the facilitator
 */
export async function checkFacilitatorHealth(): Promise<{
  healthy: boolean;
  url: string;
  error?: string;
}> {
  const facilitatorUrl = config.x402FacilitatorUrl;

  if (facilitatorUrl.includes("mock")) {
    return {
      healthy: true,
      url: facilitatorUrl,
    };
  }

  try {
    const response = await fetch(`${facilitatorUrl}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    return {
      healthy: response.ok,
      url: facilitatorUrl,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      healthy: false,
      url: facilitatorUrl,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

