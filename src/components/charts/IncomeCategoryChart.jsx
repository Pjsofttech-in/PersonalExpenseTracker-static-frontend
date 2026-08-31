import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import "../../css/Charts.css";

function IncomeCategoryChart({ timeframe = "Monthly", transactions = [] }) {
  const [chartMode, setChartMode] = useState("PIE");

  const getAmount = (item) => Number(item.total || item.amount || 0);

  const getDate = (item) => {
    if (!item.date) return null;

    const date = new Date(item.date);

    if (Number.isNaN(date.getTime())) return null;

    date.setHours(0, 0, 0, 0);

    return date;
  };

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const filteredTransactions = useMemo(() => {
    if (timeframe === "All") {
      return transactions;
    }

    if (timeframe === "Yearly") {
      return transactions.filter((item) => {
        const date = getDate(item);

        return date && date.getFullYear() === today.getFullYear();
      });
    }

    if (timeframe === "Monthly") {
      return transactions.filter((item) => {
        const date = getDate(item);

        return (
          date &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
        );
      });
    }

    if (timeframe === "Weekly") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return transactions.filter((item) => {
        const date = getDate(item);

        return date && date >= weekStart && date <= weekEnd;
      });
    }

    return transactions;
  }, [transactions, timeframe, today]);

  const chartData = useMemo(() => {
    const categoryTotals = {};

    filteredTransactions
      .filter((item) => item.type === "Income")
      .forEach((item) => {
        const category = item.category || "Other";
        const amount = getAmount(item);

        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
      });

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredTransactions]);

  const formatAmount = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

  const colors = [
    "#16A34A",
    "#0EA5E9",
    "#8B5CF6",
    "#F59E0B",
    "#EC4899",
    "#14B8A6",
  ];

  return (
    <div className="expense-category-card">
      <div className="expense-category-header">
        <div>
          <h3>Income by Category</h3>
          <p>Category-wise income distribution</p>
        </div>

        <div className="chart-controls">
          <div className="chart-toggle-group">
            <button
              className={chartMode === "PIE" ? "active" : ""}
              onClick={() => setChartMode("PIE")}
            >
              PIE
            </button>

            <button
              className={chartMode === "BAR" ? "active" : ""}
              onClick={() => setChartMode("BAR")}
            >
              BAR
            </button>
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="expense-empty">
          <p>No income data available</p>
          <span>Add an income to see the category chart.</span>
        </div>
      ) : (
        <div className="expense-chart-wrapper">
          {chartMode === "PIE" ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  paddingAngle={3}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>

                <Tooltip formatter={(value) => formatAmount(value)} />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />

                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `₹${value}`}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11 }}
                />

                <Tooltip formatter={(value) => formatAmount(value)} />

                <Bar
                  dataKey="value"
                  name="Income"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}

export default IncomeCategoryChart;
