import { useState, useEffect } from "react";
import { getPayroll, PayrollDetailResponse } from "../lib/api";
import { ArrowLeft, CheckCircle, Clock, XCircle, DollarSign, Users, Calendar, ExternalLink } from "lucide-react";

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

  // Get status badge styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="px-3 py-1 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100 text-sm font-medium flex items-center gap-2"><Clock size={14} /> Pending</span>;
      case "ONCHAIN_PAID":
      case "RAIL_PROCESSING":
        return <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-sm font-medium flex items-center gap-2"><Clock size={14} className="animate-pulse" /> Processing</span>;
      case "PAID":
        return <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-100 text-sm font-medium flex items-center gap-2"><CheckCircle size={14} /> Completed</span>;
      case "FAILED":
        return <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 text-sm font-medium flex items-center gap-2"><XCircle size={14} /> Failed</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Loading payroll details...</p>
      </div>
    );
  }

  if (error || !payroll) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
          <XCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to load payroll</h2>
        <p className="text-slate-500 mb-8">{error || "Payroll not found"}</p>
        <button 
          className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
          onClick={onBack}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium" 
          onClick={onBack}
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Payroll Details</h1>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-slate-500 text-sm block mb-1">Payroll ID</span>
            <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-600 select-all">{payroll.id}</span>
          </div>
          {getStatusBadge(payroll.status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign size={24} />
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-900 block">
              {formatCurrency(payroll.total, payroll.currency)}
            </span>
              <span className="text-slate-500 text-sm">Total Amount</span>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-900 block">{payroll.payments.length}</span>
              <span className="text-slate-500 text-sm">Total Payments</span>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={24} />
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-900 block">
              {payroll.payments.filter((p) => p.status === "PAID").length}
            </span>
              <span className="text-slate-500 text-sm">Completed</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Calendar size={14} />
          <span>Created: {new Date(payroll.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} />
          <span>Updated: {new Date(payroll.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Payments Breakdown</h2>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                <th className="px-6 py-4 font-medium">Recipient</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium text-right">Status</th>
                <th className="px-6 py-4 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {payroll.payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-600">
                  {payment.recipient || "Unknown"}
                </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                  {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end">
                      {getStatusBadge(payment.status)}
              </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-blue-600 transition-colors">
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Message */}
      {payroll.status === "PAID" && (
        <div className="mt-6 bg-green-50 border border-green-100 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <div className="bg-green-100 p-1 rounded-full text-green-600 shrink-0">
            <CheckCircle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-green-800 mb-1">Payroll Complete!</h3>
            <p className="text-green-700 text-sm">All payments have been successfully processed and settled on-chain.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PayrollDetail;
