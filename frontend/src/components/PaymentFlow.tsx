import { useState, useEffect } from "react";
import { executePayroll, getPaymentProofFromFacilitator, checkFacilitatorHealth } from "../lib/api";
import type { MeteringInfo } from "../App";
import "./PaymentFlow.css";

type PaymentFlowProps = {
  metering: MeteringInfo;
  meterId?: string;
  onSuccess: (payrollId: string) => void;
  onCancel: () => void;
};

type FlowStep = "review" | "getting-proof" | "validating" | "executing" | "success";

// Facilitator URL - integrated in backend server
// Uses relative path since Vite proxy handles it
const FACILITATOR_URL = import.meta.env.VITE_FACILITATOR_URL || "/facilitator";

function PaymentFlow({ metering, meterId = "payroll_execute", onSuccess, onCancel }: PaymentFlowProps) {
  const [step, setStep] = useState<FlowStep>("review");
  const [error, setError] = useState<string | null>(null);
  const [facilitatorStatus, setFacilitatorStatus] = useState<"checking" | "online" | "offline">("checking");

  // Check facilitator status on mount
  useEffect(() => {
    const checkFacilitator = async () => {
      const isHealthy = await checkFacilitatorHealth(FACILITATOR_URL);
      setFacilitatorStatus(isHealthy ? "online" : "offline");
    };
    checkFacilitator();
  }, []);

  const handleGetPaymentProof = async () => {
    setStep("getting-proof");
    setError(null);

    try {
      // Get payment proof from facilitator
      const proof = await getPaymentProofFromFacilitator(
        FACILITATOR_URL,
        metering,
        meterId
      );
      setStep("validating");
      
      // Small delay to show validation step
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Execute payroll with payment proof
      setStep("executing");
      const result = await executePayroll(proof);

      if (result.success) {
        setStep("success");
        // Small delay before redirecting
        setTimeout(() => {
          onSuccess(result.data.payrollId);
        }, 1000);
      } else {
        setError(result.error.message || "Payment validation failed");
        setStep("review");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process payment");
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

        {/* Facilitator Status */}
        {facilitatorStatus === "checking" && (
          <div className="status-message info">
            <span className="spinner"></span>
            Checking facilitator status...
          </div>
        )}
        {facilitatorStatus === "offline" && (
          <div className="status-message warning">
            <span>⚠️</span>
            Facilitator offline - using demo-token for testing
          </div>
        )}

        {/* Status Messages */}
        {step === "getting-proof" && (
          <div className="status-message">
            <span className="spinner"></span>
            Getting payment proof from facilitator...
          </div>
        )}

        {step === "validating" && (
          <div className="status-message">
            <span className="spinner"></span>
            Validating payment proof...
          </div>
        )}

        {step === "executing" && (
          <div className="status-message">
            <span className="spinner"></span>
            Executing payroll with validated payment...
          </div>
        )}

        {step === "success" && (
          <div className="status-message success">
            <span className="check">✓</span>
            Payment validated! Payroll executed successfully.
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
                disabled={facilitatorStatus === "checking"}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGetPaymentProof}
                disabled={facilitatorStatus === "checking"}
              >
                <span>💳</span>
                Get Payment Proof & Execute
              </button>
            </>
          )}
          {(step === "getting-proof" || step === "validating" || step === "executing") && (
            <button className="btn btn-secondary" disabled>
              <span className="spinner"></span>
              Processing...
            </button>
          )}
        </div>

        {/* Footer info */}
        <div className="payment-footer">
          <p>
            <strong>Agent Flow:</strong> This automatically gets a payment proof from the facilitator,
            validates it, and executes the payroll. In production, this would use real on-chain payments.
          </p>
          {facilitatorStatus === "online" && (
            <p className="facilitator-status">
              ✅ Facilitator connected: {FACILITATOR_URL}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentFlow;
