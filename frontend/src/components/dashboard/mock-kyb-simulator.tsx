/**
 * Mock KYB Simulator Component
 * Allows users to simulate KYB approval for testing
 */

import { useState } from "react";
import { Shield, CheckCircle2 } from "lucide-react";
import { getToken } from "../../hooks/use-session.js";
import { getApiBase } from "../../utils/api-config.js";

const API_BASE = getApiBase();

type MockKybSimulatorProps = {
  currentKybLevel: number;
  onKybUpdated: () => void;
};

export function MockKybSimulator({
  currentKybLevel,
  onKybUpdated,
}: MockKybSimulatorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApproveKyb = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const tokenValue = getToken();
      if (!tokenValue) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/api/mock/kyb/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenValue}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to approve KYB");
      }

      setSuccess("KYB approval simulated successfully!");
      onKybUpdated();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to simulate KYB approval");
    } finally {
      setIsProcessing(false);
    }
  };

  if (currentKybLevel >= 1) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-teal-900">KYB Status</h3>
        </div>
        <p className="text-sm text-teal-600">
          Your company is already verified (Level {currentKybLevel})
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-yellow-100 rounded-lg" style={{ color: "#ca8a04" }}>
          <Shield size={20} />
        </div>
        <h3 className="text-lg font-semibold text-teal-900">Simulate KYB Approval</h3>
      </div>

      <p className="text-sm text-teal-600 mb-4">
        Test the KYB verification flow by simulating an approval (sets Level 0 → Level 1)
      </p>

      <div className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
            {success}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleApproveKyb}
          disabled={isProcessing}
          className="btn btn-secondary w-full"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-teal-600/30 border-t-teal-600 rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              Simulate KYB Approval
            </>
          )}
        </button>
      </div>
    </div>
  );
}
