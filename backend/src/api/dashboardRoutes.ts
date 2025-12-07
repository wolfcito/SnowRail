/**
 * Dashboard API Routes
 * Provides company dashboard data including balances, payments, and stats
 */

import type { Express, Response } from "express";
import { prisma } from "../dbClient.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { logger } from "../utils/logger.js";

/**
 * Register dashboard routes
 */
export function registerDashboardRoutes(app: Express) {
  /**
   * GET /api/dashboard
   * Get dashboard data for authenticated company
   * Protected endpoint - requires JWT authentication
   */
  app.get("/api/dashboard", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Company ID not found in token",
        });
      }

      // Get company info
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          legalName: true,
          tradeName: true,
          country: true,
          kybLevel: true,
          kybStatus: true,
          railStatus: true,
          railAccountId: true,
        },
      });

      if (!company) {
        return res.status(404).json({
          error: "COMPANY_NOT_FOUND",
          message: "Company not found",
        });
      }

      // Get balances by token
      const balances = await prisma.companyBalance.findMany({
        where: { companyId },
        orderBy: { balanceUsd: "desc" },
      });

      // Calculate total USD
      type CompanyBalance = {
        balanceUsd: unknown;
      };
      const totalUsd = balances.reduce((sum: number, balance: CompanyBalance) => {
        return sum + Number(balance.balanceUsd);
      }, 0);

      // Get recent payments (last 10)
      const recentPayments = await prisma.payment.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          paymentIntentId: true,
          token: true,
          amountToken: true,
          amountUsd: true,
          status: true,
          txHash: true,
          createdAt: true,
          externalRef: true,
        },
      });

      // Get stats
      const allPayments = await prisma.payment.findMany({
        where: { companyId, status: "CONFIRMED_ONCHAIN" },
        select: {
          amountUsd: true,
        },
      });

      type PaymentAmount = {
        amountUsd: unknown;
      };
      const totalPayments = allPayments.length;
      const totalReceived = allPayments.reduce((sum: number, payment: PaymentAmount) => {
        return sum + Number(payment.amountUsd);
      }, 0);

      // Format balances for response
      type BalanceForResponse = {
        token: string;
        balanceToken: unknown;
        balanceUsd: unknown;
      };
      const balancesByToken = balances.map((balance: BalanceForResponse) => ({
        token: balance.token,
        balanceToken: Number(balance.balanceToken),
        balanceUsd: Number(balance.balanceUsd),
      }));

      // Format payments for response
      type PaymentForResponse = {
        id: string;
        paymentIntentId: string;
        token: string;
        amountToken: unknown;
        amountUsd: unknown;
        status: string;
        txHash: string | null;
        createdAt: Date;
        externalRef: string | null;
      };
      const formattedPayments = recentPayments.map((payment: PaymentForResponse) => ({
        id: payment.id,
        paymentIntentId: payment.paymentIntentId,
        token: payment.token,
        amountToken: Number(payment.amountToken),
        amountUsd: Number(payment.amountUsd),
        status: payment.status,
        txHash: payment.txHash,
        createdAt: payment.createdAt.toISOString(),
        externalRef: payment.externalRef,
      }));

      logger.info(`Dashboard data fetched for company ${companyId}`, {
        totalUsd,
        balancesCount: balances.length,
        paymentsCount: recentPayments.length,
      });

      // Return dashboard data
      return res.json({
        company: {
          id: company.id,
          legalName: company.legalName,
          tradeName: company.tradeName,
          country: company.country,
          kybLevel: company.kybLevel,
          kybStatus: company.kybStatus,
          railStatus: company.railStatus,
          railAccountId: company.railAccountId,
        },
        balances: {
          totalUsd,
          byToken: balancesByToken,
        },
        recentPayments: formattedPayments,
        stats: {
          totalPayments,
          totalReceived,
        },
      });
    } catch (error) {
      logger.error("Error fetching dashboard data:", error);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Failed to fetch dashboard data",
      });
    }
  });
}

