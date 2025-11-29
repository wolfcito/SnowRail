import { useState } from "react";
import Dashboard from "./components/Dashboard";
import PaymentFlow from "./components/PaymentFlow";
import PayrollDetail from "./components/PayrollDetail";
import "./App.css";

// App view states
type ViewState = 
  | { view: "dashboard" }
  | { view: "payment-flow"; metering: MeteringInfo }
  | { view: "payroll-detail"; payrollId: string };

// Metering info from 402 response
export type MeteringInfo = {
  price: string;
  asset: string;
  chain: string;
  resource: string;
  description?: string;
};

// Payroll data type
export type PayrollData = {
  payrollId: string;
  status: string;
  total: number;
  currency: string;
  payments: PaymentData[];
};

export type PaymentData = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  recipient: string | null;
};

function App() {
  const [state, setState] = useState<ViewState>({ view: "dashboard" });

  // Handle 402 response - show payment flow
  const handlePaymentRequired = (metering: MeteringInfo) => {
    setState({ view: "payment-flow", metering });
  };

  // Handle successful payroll execution
  const handlePayrollSuccess = (payrollId: string) => {
    setState({ view: "payroll-detail", payrollId });
  };

  // Go back to dashboard
  const handleBack = () => {
    setState({ view: "dashboard" });
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <div className="logo" onClick={handleBack}>
            <span className="logo-icon">❄️</span>
            <span className="logo-text">SnowRail</span>
          </div>
          <div className="header-meta">
            <span className="chain-badge">
              <span className="chain-dot"></span>
              Avalanche C-Chain
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {state.view === "dashboard" && (
            <Dashboard onPaymentRequired={handlePaymentRequired} />
          )}
          {state.view === "payment-flow" && (
            <PaymentFlow
              metering={state.metering}
              onSuccess={handlePayrollSuccess}
              onCancel={handleBack}
            />
          )}
          {state.view === "payroll-detail" && (
            <PayrollDetail
              payrollId={state.payrollId}
              onBack={handleBack}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>Powered by x402 Protocol • Built on Avalanche</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

