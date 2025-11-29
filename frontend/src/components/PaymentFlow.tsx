import { useState } from "react";
import { executePayroll } from "../lib/api";
import type { MeteringInfo } from "../App";
import "./PaymentFlow.css";

type PaymentFlowProps = {
  metering: MeteringInfo;
  onSuccess: (payrollId: string) => void;
  onCancel: () => void;
};

type FlowStep = "review" | "simulating" | "confirming";

function PaymentFlow({ metering, onSuccess, onCancel }: PaymentFlowProps) {
  const [step, setStep] = useState<FlowStep>("review");
  const [error, setError] = useState<string | null>(null);

  const handleSimulatePayment = async () => {
    setStep("simulating");
    setError(null);

    // Simulate wallet interaction delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setStep("confirming");

    try {
      // Execute with demo payment token
      const result = await executePayroll("demo-token");

      if (result.success) {
        onSuccess(result.data.payrollId);
      } else {
        setError(result.error.message || "Payment failed");
        setStep("review");
      }
    } catch (err) {
      setError("Network error during payment");
      setStep("review");
    }
  };

  return (
    <div className="payment-flow">
      <div className="card payment-card">
        {/* Header */}
        <div className="payment-header">
          <div className="payment-icon">💳</div>
          <h2>Payment Required</h2>
          <p>This API endpoint requires payment via x402 protocol</p>
        </div>

        {/* Metering Info */}
        <div className="metering-info">
          <div className="metering-header">
            <span className="protocol-badge">8004</span>
            <span className="resource-name">{metering.resource}</span>
          </div>

          <div className="metering-details">
            <div className="metering-row">
              <span className="label">Price</span>
              <span className="value price">
                {metering.price} {metering.asset}
              </span>
            </div>
            <div className="metering-row">
              <span className="label">Network</span>
              <span className="value">{metering.chain}</span>
            </div>
            {metering.description && (
              <div className="metering-row">
                <span className="label">Description</span>
                <span className="value desc">{metering.description}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        {step === "simulating" && (
          <div className="status-message">
            <span className="spinner"></span>
            Simulating wallet transaction...
          </div>
        )}

        {step === "confirming" && (
          <div className="status-message success">
            <span className="check">✓</span>
            Payment confirmed. Executing payroll...
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {/* Actions */}
        <div className="payment-actions">
          {step === "review" && (
            <>
              <button
                className="btn btn-secondary"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSimulatePayment}
              >
                <span>⚡</span>
                Simulate Onchain Payment
              </button>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="payment-footer">
          <p>
            <strong>Demo Mode:</strong> Click "Simulate Onchain Payment" to
            proceed with a mock payment. In production, this would trigger
            your wallet to sign a transaction.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaymentFlow;

