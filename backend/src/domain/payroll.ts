export const PayrollStatus = {
  PENDING: "PENDING",
  ONCHAIN_REQUESTED: "ONCHAIN_REQUESTED",
  ONCHAIN_PAID: "ONCHAIN_PAID",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  RAIL_PROCESSING: "RAIL_PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
} as const;

export type PayrollStatusType = (typeof PayrollStatus)[keyof typeof PayrollStatus];

// Payroll type (matches Prisma model)
export type Payroll = {
  id: string;
  total: number;
  currency: string;
  status: PayrollStatusType;
  createdAt: Date;
  updatedAt: Date;
};

// Payroll with payments
export type PayrollWithPayments = Payroll & {
  // NOTE: explicit .js extension for NodeNext resolution
  payments: import("./payment.js").Payment[];
};

// API response type
export type PayrollResponse = {
  id: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  payments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    recipient: string | null;
  }[];
};

