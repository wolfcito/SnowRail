/**
 * API Client for SnowRail Backend
 */

const API_BASE = "/api";

// Types for API responses
export type MeteringInfo = {
  price: string;
  asset: string;
  chain: string;
  resource: string;
  description?: string;
  version: string;
};

export type PayrollResponse = {
  success: boolean;
  payrollId: string;
  status: string;
  total: number;
  currency: string;
  paymentsCount: number;
  payments: PaymentResponse[];
  createdAt: string;
};

export type PaymentResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  recipient: string | null;
};

export type PayrollDetailResponse = {
  id: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  payments: PaymentResponse[];
};

export type ApiError = {
  error: string;
  meterId?: string;
  metering?: MeteringInfo;
  message?: string;
};

/**
 * Execute payroll - may return 402 if payment required
 * @param paymentToken - Optional X-PAYMENT header value
 */
export async function executePayroll(paymentToken?: string): Promise<{
  success: true;
  data: PayrollResponse;
} | {
  success: false;
  status: number;
  error: ApiError;
}> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (paymentToken) {
    headers["X-PAYMENT"] = paymentToken;
  }

  const response = await fetch(`${API_BASE}/payroll/execute`, {
    method: "POST",
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: data as ApiError,
    };
  }

  return {
    success: true,
    data: data as PayrollResponse,
  };
}

/**
 * Get payroll details by ID
 * @param id - Payroll ID
 */
export async function getPayroll(id: string): Promise<{
  success: true;
  data: PayrollDetailResponse;
} | {
  success: false;
  error: ApiError;
}> {
  const response = await fetch(`${API_BASE}/payroll/${id}`);
  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data as ApiError,
    };
  }

  return {
    success: true,
    data: data as PayrollDetailResponse,
  };
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

