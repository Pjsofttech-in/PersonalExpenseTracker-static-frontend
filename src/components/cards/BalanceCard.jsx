import { useEffect, useState } from "react";
import { FaArrowUp, FaArrowDown, FaPiggyBank, FaClock } from "react-icons/fa";
import { loadTransactionsFromBackend } from "../../utils/backendData";

import "../../css/Card.css";

function BalanceCard() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // BACKEND वरून transactions load

    const loadTransactions = async () => {
      try {
        const data = await loadTransactionsFromBackend();

        setTransactions(data);
      } catch (error) {
        setTransactions([]);
      }
    };

    loadTransactions();

    window.addEventListener("transactionUpdated", loadTransactions);
    window.addEventListener("storage", loadTransactions);
    window.addEventListener("focus", loadTransactions);

    return () => {
      window.removeEventListener("transactionUpdated", loadTransactions);
      window.removeEventListener("storage", loadTransactions);
      window.removeEventListener("focus", loadTransactions);
    };
  }, []);

  // FORMAT AMOUNT

  const formatAmount = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  // CHECK DATE RANGE

  const isWithinDays = (dateValue, days) => {
    if (!dateValue) return false;

    const transactionDate = new Date(dateValue);
    const today = new Date();

    transactionDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    return transactionDate >= startDate && transactionDate <= today;
  };

  // CHECK TRANSACTION TYPE

  const isIncome = (item) => {
    return item.type === "Income" || item.transactionType === "Income";
  };

  const isExpense = (item) => {
    return item.type === "Expense" || item.transactionType === "Expense";
  };

  // GET AMOUNT

  const getAmount = (item) => {
    return Number(item.total || item.amount || 0);
  };

  // CHECK PENDING

  const isPending = (item) => {
    const status = item.paymentStatus || item.status || "";

    return status !== "Complete" && status !== "Completed";
  };

  // CALCULATE PERIOD DATA

  const calculatePeriod = (period) => {
    let periodTransactions = [];

    if (period === "Today") {
      periodTransactions = transactions.filter((item) =>
        isWithinDays(item.date, 1),
      );
    }

    if (period === "7 Days") {
      periodTransactions = transactions.filter((item) =>
        isWithinDays(item.date, 7),
      );
    }

    if (period === "30 Days") {
      periodTransactions = transactions.filter((item) =>
        isWithinDays(item.date, 30),
      );
    }

    if (period === "365 Days") {
      periodTransactions = transactions.filter((item) =>
        isWithinDays(item.date, 365),
      );
    }

    if (period === "Total") {
      periodTransactions = transactions;
    }

    const income = periodTransactions
      .filter(isIncome)
      .reduce((sum, item) => sum + getAmount(item), 0);

    const expense = periodTransactions
      .filter(isExpense)
      .reduce((sum, item) => sum + getAmount(item), 0);

    const pendingIncome = periodTransactions
      .filter((item) => isIncome(item) && isPending(item))
      .reduce((sum, item) => sum + getAmount(item), 0);

    const pendingExpense = periodTransactions
      .filter((item) => isExpense(item) && isPending(item))
      .reduce((sum, item) => sum + getAmount(item), 0);

    return {
      income,
      expense,
      savings: income - expense,
      pendingIncome,
      pendingExpense,
    };
  };

  // PERIOD DATA

  const todayData = calculatePeriod("Today");
  const sevenDaysData = calculatePeriod("7 Days");
  const thirtyDaysData = calculatePeriod("30 Days");
  const threeSixtyFiveDaysData = calculatePeriod("365 Days");
  const totalData = calculatePeriod("Total");

  // CARDS

  const cards = [
    {
      title: "INCOME",
      icon: <FaArrowUp />,
      color: "#3B82F6",
      values: [
        todayData.income,
        sevenDaysData.income,
        thirtyDaysData.income,
        threeSixtyFiveDaysData.income,
        totalData.income,
      ],
    },

    {
      title: "EXPENSE",
      icon: <FaArrowDown />,
      color: "#F97316",
      values: [
        todayData.expense,
        sevenDaysData.expense,
        thirtyDaysData.expense,
        threeSixtyFiveDaysData.expense,
        totalData.expense,
      ],
    },

    {
      title: "SAVINGS / LOSS",
      icon: <FaPiggyBank />,
      color: totalData.savings >= 0 ? "#22C55E" : "#EF4444",
      values: [
        todayData.savings,
        sevenDaysData.savings,
        thirtyDaysData.savings,
        threeSixtyFiveDaysData.savings,
        totalData.savings,
      ],
    },

    {
      title: "PENDING INCOME",
      icon: <FaClock />,
      color: "#A855F7",
      values: [
        todayData.pendingIncome,
        sevenDaysData.pendingIncome,
        thirtyDaysData.pendingIncome,
        threeSixtyFiveDaysData.pendingIncome,
        totalData.pendingIncome,
      ],
    },

    {
      title: "PENDING EXPENSE",
      icon: <FaClock />,
      color: "#14B8A6",
      values: [
        todayData.pendingExpense,
        sevenDaysData.pendingExpense,
        thirtyDaysData.pendingExpense,
        threeSixtyFiveDaysData.pendingExpense,
        totalData.pendingExpense,
      ],
    },
  ];

  // RETURN

  return (
    <div className="balance-section">
      <div className="card-grid">
        {cards.map((card, index) => (
          <div
            className="dashboard-card"
            key={index}
            style={{
              background: `${card.color}1A`,
            }}
          >
            <div className="card-top">
              <h4>{card.title}</h4>

              <div
                className="card-icon"
                style={{
                  background: card.color,
                }}
              >
                {card.icon}
              </div>
            </div>

            {/* CARD VALUES */}

            <div className="card-values">
              <div className="card-row">
                <span>Today's</span>
                <strong>{formatAmount(card.values[0])}</strong>
              </div>

              <div className="card-row">
                <span>7 Day's</span>
                <strong>{formatAmount(card.values[1])}</strong>
              </div>

              <div className="card-row">
                <span>30 Day's</span>
                <strong>{formatAmount(card.values[2])}</strong>
              </div>

              <div className="card-row">
                <span>365 Day's</span>
                <strong>{formatAmount(card.values[3])}</strong>
              </div>

              <div className="card-row total-row">
                <span>Total</span>
                <strong>{formatAmount(card.values[4])}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BalanceCard;
