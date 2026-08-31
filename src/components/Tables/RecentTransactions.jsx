import { useEffect, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import {
  loadTransactionsFromBackend,
  deleteTransactionFromBackend,
} from "../../utils/backendData";
import "../../css/RecentTransactions.css";

function RecentTransactions() {
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

    window.addEventListener("storage", loadTransactions);
    window.addEventListener("focus", loadTransactions);
    window.addEventListener("transactionUpdated", loadTransactions);

    return () => {
      window.removeEventListener("storage", loadTransactions);
      window.removeEventListener("focus", loadTransactions);
      window.removeEventListener("transactionUpdated", loadTransactions);
    };
  }, []);

  // Latest 5 transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => {
      return Number(b.id) - Number(a.id);
    })
    .slice(0, 5);

  // =========================================
  // DELETE
  // =========================================

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this transaction?",
    );

    if (!confirmDelete) return;

    try {
      // BACKEND DELETE

      await deleteTransactionFromBackend(id);

      setTransactions(transactions.filter((item) => item.id !== id));

      window.dispatchEvent(new Event("transactionUpdated"));
    } catch (error) {
      alert(error.message || "Could not delete. Is the backend running?");
    }
  };

  // =========================================
  // EDIT
  // =========================================

  const handleEdit = (item) => {
    localStorage.setItem("editTransaction", JSON.stringify(item));

    window.location.href = "/income/add";
  };

  // =========================================
  // FORMAT AMOUNT
  // =========================================

  const formatAmount = (item) => {
    const amount = Number(item.total || item.amount || 0);

    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return (
    <div className="recent-transactions-card">
      {/* HEADER */}

      <div className="recent-header">
        <div>
          <h3>Recent Transactions</h3>

          <p>Latest income and expense transactions</p>
        </div>

        <button
          className="view-all-btn"
          onClick={() => {
            window.location.href = "/list";
          }}
        >
          View All
        </button>
      </div>

      {/* TABLE */}

      {recentTransactions.length === 0 ? (
        <div className="recent-empty">
          <p>No transactions found</p>

          <span>Add an income or expense to see it here.</span>
        </div>
      ) : (
        <div className="recent-table-wrapper">
          <table className="recent-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Category</th>
                <th>Particular</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {recentTransactions.map((item) => {
                const isIncome = item.type === "Income";

                const status = item.paymentStatus || item.status || "Pending";

                return (
                  <tr key={item.id}>
                    {/* DATE */}

                    <td>{item.date || "-"}</td>

                    {/* USER */}

                    <td>
                      <span className="recent-user">{item.user || "-"}</span>
                    </td>

                    {/* CATEGORY */}

                    <td>{item.category || "-"}</td>

                    {/* PARTICULAR */}

                    <td>{item.particular || item.title || "-"}</td>

                    {/* AMOUNT */}

                    <td
                      className={isIncome ? "income-amount" : "expense-amount"}
                    >
                      {isIncome ? "+" : "-"}
                      {formatAmount(item)}
                    </td>

                    {/* STATUS */}

                    <td>
                      <span
                        className={
                          status === "Complete" || status === "Completed"
                            ? "recent-status completed"
                            : "recent-status pending"
                        }
                      >
                        {status}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td>
                      <div className="recent-actions">
                        <button
                          className="recent-edit"
                          title="Edit"
                          onClick={() => handleEdit(item)}
                        >
                          <FaEdit />
                        </button>

                        <button
                          className="recent-delete"
                          title="Delete"
                          onClick={() => handleDelete(item.id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RecentTransactions;
