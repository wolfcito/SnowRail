import { useState, useEffect } from "react";
import { getPayroll, PayrollDetailResponse } from "../lib/api";
import "./PayrollDetail.css";

type PayrollDetailProps = {
  payrollId: string;
  onBack: () => void;
};

function PayrollDetail({ payrollId, onBack }: PayrollDetailProps) {
  const [payroll, setPayroll] = useState<PayrollDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch payroll data
  useEffect(() => {
    const fetchPayroll = async () => {
      const result = await getPayroll(payrollId);
      if (result.success) {
        setPayroll(result.data);
        setLoading(false);
      } else {
        setError(result.error.message || "Failed to load payroll");
        setLoading(false);
      }
    };

    fetchPayroll();

    // Polling for status updates (every 3 seconds while not PAID/FAILED)
    const interval = setInterval(async () => {
      const result = await getPayroll(payrollId);
      if (result.success) {
        setPayroll(result.data);
        // Stop polling if final state
        if (result.data.status === "PAID" || result.data.status === "FAILED") {
          clearInterval(interval);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [payrollId]);

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount / 100);
  };

  // Get status class
  const getStatusClass = (status: string) => {
    switch (status) {
      case "PENDING":
        return "status-pending";
      case "ONCHAIN_PAID":
      case "RAIL_PROCESSING":
        return "status-processing";
      case "PAID":
        return "status-paid";
      case "FAILED":
        return "status-failed";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="payroll-detail loading">
        <div className="spinner-large"></div>
        <p>Loading payroll details...</p>
      </div>
    );
  }

  if (error || !payroll) {
    return (
      <div className="payroll-detail error">
        <div className="error-icon">❌</div>
        <h2>Error</h2>
        <p>{error || "Payroll not found"}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="payroll-detail">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h1>Payroll Details</h1>
      </div>

      {/* Summary Card */}
      <div className="card summary-card">
        <div className="summary-header">
          <div>
            <span className="label">Payroll ID</span>
            <span className="payroll-id mono">{payroll.id}</span>
          </div>
          <span className={`status ${getStatusClass(payroll.status)}`}>
            {payroll.status === "RAIL_PROCESSING" ? "PROCESSING" : payroll.status}
          </span>
        </div>

        <div className="summary-stats">
          <div className="stat">
            <span className="stat-value">
              {formatCurrency(payroll.total, payroll.currency)}
            </span>
            <span className="stat-label">Total Amount</span>
          </div>
          <div className="stat">
            <span className="stat-value">{payroll.payments.length}</span>
            <span className="stat-label">Payments</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {payroll.payments.filter((p) => p.status === "PAID").length}
            </span>
            <span className="stat-label">Completed</span>
          </div>
        </div>

        <div className="summary-meta">
          <span>Created: {new Date(payroll.createdAt).toLocaleString()}</span>
          <span>Updated: {new Date(payroll.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card payments-card">
        <h2>Payments</h2>
        <div className="payments-table">
          <div className="table-header">
            <span>Recipient</span>
            <span>Amount</span>
            <span>Status</span>
          </div>
          <div className="table-body">
            {payroll.payments.map((payment) => (
              <div key={payment.id} className="table-row">
                <span className="recipient mono">
                  {payment.recipient || "Unknown"}
                </span>
                <span className="amount">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
                <span className={`status ${getStatusClass(payment.status)}`}>
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {payroll.status === "PAID" && (
        <div className="success-banner">
          <span className="success-icon">✅</span>
          <div>
            <h3>Payroll Complete!</h3>
            <p>All payments have been successfully processed.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PayrollDetail;

