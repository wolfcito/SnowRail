import { Request, Response } from "express";
import { checkTreasuryBalance } from "../services/contractHook.js";
import { logger } from "../utils/logger.js";
import { formatErrorResponse } from "../utils/errors.js";

/**
 * Treasury Controller
 * Handles HTTP requests for treasury operations
 */

/**
 * GET /api/treasury/balance
 * Get treasury balance for a currency (default: USD)
 */
export async function getTreasuryBalance(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const currency = (req.query.currency as string) || "USD";
    logger.debug(`Fetching treasury balance for currency: ${currency}`);

    const balance = await checkTreasuryBalance(currency);

    res.status(200).json({
      currency,
      balance: balance.balance.toString(),
      formatted: balance.formatted,
      decimals: balance.decimals,
    });
  } catch (error) {
    logger.error("Failed to get treasury balance", error);
    const errorResponse = formatErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
}

