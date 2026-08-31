import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";

import "../../css/Charts.css";

function ComparisonChart({ timeframe = "Monthly", transactions = [] }) {
  const [chartType, setChartType] = useState("PIE");
  const [typeFilter, setTypeFilter] = useState("All");

  const getAmount = (item) => Number(item.total || item.amount || 0);

  const getTransactionDate = (item) => {
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

  /*=========================
       TIMEFRAME FILTER
   =========================*/

  const filteredTransactions = useMemo(() => {
    if (timeframe === "All") {
      return transactions;
    }

    if (timeframe === "Yearly") {
      return transactions.filter((item) => {
        const date = getTransactionDate(item);

        if (!date) return false;

        return date.getFullYear() === today.getFullYear();
      });
    }

    if (timeframe === "Monthly") {
      return transactions.filter((item) => {
        const date = getTransactionDate(item);

        if (!date) return false;

        return (
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
        const date = getTransactionDate(item);

        if (!date) return false;

        return date >= weekStart && date <= weekEnd;
      });
    }

    return transactions;
  }, [transactions, timeframe, today]);

  /* =========================
         MONTHLY DATA
     =========================*/

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const monthData = months.map((month, index) => {
    const list = filteredTransactions.filter((item) => {
      const date = getTransactionDate(item);

      if (!date) return false;

      return date.getMonth() === index;
    });

    const income = list
      .filter((item) => item.type === "Income")
      .reduce((sum, item) => sum + getAmount(item), 0);

    const expense = list
      .filter((item) => item.type === "Expense")
      .reduce((sum, item) => sum + getAmount(item), 0);

    return {
      month,
      income,
      expense,
      savings: income - expense,
    };
  });

  /*
   * =========================
   * YEARLY DATA
   * =========================
   */

  const yearMap = {};

  filteredTransactions.forEach((item) => {
    const date = getTransactionDate(item);

    if (!date) return;

    const year = String(date.getFullYear());

    if (!yearMap[year]) {
      yearMap[year] = {
        year,
        income: 0,
        expense: 0,
      };
    }

    if (item.type === "Income") {
      yearMap[year].income += getAmount(item);
    }

    if (item.type === "Expense") {
      yearMap[year].expense += getAmount(item);
    }
  });

  const yearData = Object.values(yearMap)
    .map((item) => ({
      ...item,
      savings: item.income - item.expense,
    }))
    .sort((a, b) => a.year.localeCompare(b.year));

  /*
   * =========================
   * WEEKLY DATA
   * =========================
   */

  const weeklyIncome = filteredTransactions
    .filter((item) => item.type === "Income")
    .reduce((sum, item) => sum + getAmount(item), 0);

  const weeklyExpense = filteredTransactions
    .filter((item) => item.type === "Expense")
    .reduce((sum, item) => sum + getAmount(item), 0);

  const weeklyData = [
    {
      period: "This Week",
      income: weeklyIncome,
      expense: weeklyExpense,
      savings: weeklyIncome - weeklyExpense,
    },
  ];

  /*
   * =========================
   * ALL TIME DATA
   * =========================
   */

  const allIncome = filteredTransactions
    .filter((item) => item.type === "Income")
    .reduce((sum, item) => sum + getAmount(item), 0);

  const allExpense = filteredTransactions
    .filter((item) => item.type === "Expense")
    .reduce((sum, item) => sum + getAmount(item), 0);

  const allData = [
    {
      period: "All Time",
      income: allIncome,
      expense: allExpense,
      savings: allIncome - allExpense,
    },
  ];

  /*
   * =========================
   * SELECT CHART DATA
   * =========================
   */

  let data = monthData;
  let xKey = "month";

  if (timeframe === "Yearly") {
    data = yearData;
    xKey = "year";
  }

  if (timeframe === "Weekly") {
    data = weeklyData;
    xKey = "period";
  }

  if (timeframe === "All") {
    data = allData;
    xKey = "period";
  }

  const showIncome = typeFilter !== "Expense";
  const showExpense = typeFilter !== "Income";
  const showSavings = typeFilter === "All";

  const title =
    timeframe === "Monthly"
      ? "Income, Expense & Saving/Loss Comparison"
      : `Income, Expense & Saving/Loss - ${timeframe}`;

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <h3>{title}</h3>

          <p>Monthly income, expense and savings comparison</p>
        </div>

        <div className="chart-toggle-group">
          <button
            className={chartType === "PIE" ? "active" : ""}
            onClick={() => setChartType("PIE")}
          >
            BAR
          </button>

          <button
            className={chartType === "BAR" ? "active" : ""}
            onClick={() => setChartType("BAR")}
          >
            LINE
          </button>
        </div>
      </div>

      <div className="chart-controls chart-controls-row">
        <div className="chart-toggle-group">
          <button
            className={typeFilter === "All" ? "active" : ""}
            onClick={() => setTypeFilter("All")}
          >
            All
          </button>

          <button
            className={typeFilter === "Income" ? "active" : ""}
            onClick={() => setTypeFilter("Income")}
          >
            Income Only
          </button>

          <button
            className={typeFilter === "Expense" ? "active" : ""}
            onClick={() => setTypeFilter("Expense")}
          >
            Expense Only
          </button>
        </div>
      </div>

      <div className="chart-area">
        <ResponsiveContainer width="100%" height={300}>
          {chartType === "PIE" ? (
            <BarChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />

              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `₹${value}`}
              />

              <Tooltip
                formatter={(value) =>
                  `₹${Number(value).toLocaleString("en-IN")}`
                }
              />

              <Legend />

              {showIncome && (
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#16A34A"
                  radius={[5, 5, 0, 0]}
                  barSize={12}
                />
              )}

              {showExpense && (
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="#DC2626"
                  radius={[5, 5, 0, 0]}
                  barSize={12}
                />
              )}

              {showSavings && (
                <Bar
                  dataKey="savings"
                  name="Saving/Loss"
                  radius={[5, 5, 0, 0]}
                  barSize={12}
                >
                  {data.map((item, index) => (
                    <Cell
                      key={`saving-${index}`}
                      fill={item.savings >= 0 ? "#6366F1" : "#F59E0B"}
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          ) : (
            <LineChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />

              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `₹${value}`}
              />

              <Tooltip
                formatter={(value) =>
                  `₹${Number(value).toLocaleString("en-IN")}`
                }
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#16A34A"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />

              <Line
                type="monotone"
                dataKey="expense"
                name="Expense"
                stroke="#DC2626"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />

              <Line
                type="monotone"
                dataKey="savings"
                name="Saving/Loss"
                stroke="#6366F1"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ComparisonChart;
