import { useEffect, useState } from "react";

import BalanceCard from "../components/cards/BalanceCard";
import ComparisonChart from "../components/charts/ComparisonChart";
import IncomeCategoryChart from "../components/charts/IncomeCategoryChart";
import ExpenseCategoryChart from "../components/charts/ExpenseCategoryChart";
import RecentTransactions from "../components/Tables/RecentTransactions";
import { loadTransactionsFromBackend } from "../utils/backendData";

import "../css/Dashboard.css";

function Dashboard() {
  const [timeframe, setTimeframe] = useState("Monthly");
  const [transactions, setTransactions] = useState([]);

  // BACKEND वरून transactions load

  const loadTransactions = async () => {
    try {
      const data = await loadTransactionsFromBackend();

      setTransactions(data);
    } catch (error) {
      setTransactions([]);
    }
  };

  useEffect(() => {
    loadTransactions();

    const handleUpdate = () => {
      loadTransactions();
    };

    window.addEventListener("transactionUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    return () => {
      window.removeEventListener("transactionUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <BalanceCard />

        {/* =========================
            INCOME / EXPENSE / SAVING
        ========================= */}

        <div className="chart-full-row">
          <ComparisonChart timeframe={timeframe} transactions={transactions} />
        </div>

        {/* =========================
            TIMEFRAME
        ========================= */}

        <div className="dashboard-timeframe-section">
          <div className="dashboard-timeframe-label">
            <span>Timeframe</span>
            <small>Filter income, expense and category charts</small>
          </div>

          <select
            className="dashboard-timeframe-select"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="Monthly">Monthly</option>
            <option value="Weekly">Weekly</option>
            <option value="Yearly">Yearly</option>
            <option value="All">All Time</option>
          </select>
        </div>

        {/* =========================
            CATEGORY CHARTS
        ========================= */}

        <div className="category-chart-row">
          <IncomeCategoryChart
            timeframe={timeframe}
            transactions={transactions}
          />

          <ExpenseCategoryChart
            timeframe={timeframe}
            transactions={transactions}
          />
        </div>

        <RecentTransactions />
      </div>
    </div>
  );
}

export default Dashboard;
