import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  loadTransactionsFromBackend,
  loadCategoriesFromBackend,
  loadContactsFromBackend,
  deleteTransactionFromBackend,
  payInstallmentOnBackend,
} from "../utils/backendData";
import "../css/List.css";

function List() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);

  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);

  const [filters, setFilters] = useState({
    type: "",
    timeframe: "All",
    billType: "All",
    category: "All",
    paymentMethod: "All",
    paymentStatus: "All",
    user: "All",
    department: "All",
    staff: "All",
    messageType: "All",
    search: "",
  });

  // Custom date range
  const [customRange, setCustomRange] = useState({
    from: "",
    to: "",
  });

  // PAGINATION — 25 rows per page

  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 25;

  // Installment popup
  const [installmentItem, setInstallmentItem] = useState(null);

  const [showAddInstallment, setShowAddInstallment] = useState(false);

  const [newInstallment, setNewInstallment] = useState({
    amount: "",
    dueDate: "",
    remark: "",
  });

  // MARK COMPLETE
  const [payingId, setPayingId] = useState(null);
  const [payMethod, setPayMethod] = useState("Cash");
  const [payTxnId, setPayTxnId] = useState("");

  // =========================
  // LOAD DATA (BACKEND)
  // =========================

  const loadData = async () => {
    try {
      const [backendTransactions, backendCategories, backendContacts] =
        await Promise.all([
          loadTransactionsFromBackend(),
          loadCategoriesFromBackend(),
          loadContactsFromBackend(),
        ]);

      setTransactions(backendTransactions);
      setCategories(backendCategories);
      setUsers(backendContacts);
    } catch (error) {
      setTransactions([]);
    }
  };

  useEffect(() => {
    loadData();

    const handleStorage = () => loadData();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleStorage);
    window.addEventListener("transactionUpdated", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleStorage);
      window.removeEventListener("transactionUpdated", handleStorage);
    };
  }, []);

  // =========================
  // FILTER CHANGE
  // =========================

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));

    // FILTER बदललं की पहिल्या page वर परत

    setCurrentPage(1);
  };

  // =========================
  // DATE HELPERS
  // =========================

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getTransactionDate = (transaction) => {
    if (!transaction.date) return null;

    const date = new Date(transaction.date);
    date.setHours(0, 0, 0, 0);

    return date;
  };

  // =========================
  // FILTER TRANSACTIONS
  // =========================

  const filteredTransactions = transactions.filter((transaction) => {
    if (
      filters.type &&
      filters.type !== "All" &&
      transaction.type !== filters.type
    ) {
      return false;
    }

    if (
      filters.category !== "All" &&
      transaction.category !== filters.category
    ) {
      return false;
    }

    if (filters.user !== "All" && transaction.user !== filters.user) {
      return false;
    }

    if (
      filters.paymentMethod !== "All" &&
      transaction.paymentMethod !== filters.paymentMethod
    ) {
      return false;
    }

    if (
      filters.paymentStatus !== "All" &&
      transaction.paymentStatus !== filters.paymentStatus
    ) {
      return false;
    }

    if (
      filters.billType !== "All" &&
      transaction.billType !== filters.billType
    ) {
      return false;
    }

    // =========================
    // TIMEFRAME
    // =========================

    if (filters.timeframe !== "All") {
      const transactionDate = getTransactionDate(transaction);

      if (!transactionDate) return false;

      if (filters.timeframe === "Today") {
        if (transactionDate.getTime() !== today.getTime()) {
          return false;
        }
      }

      if (filters.timeframe === "This Week") {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());

        if (transactionDate < weekStart) {
          return false;
        }
      }

      if (filters.timeframe === "This Month") {
        if (
          transactionDate.getMonth() !== today.getMonth() ||
          transactionDate.getFullYear() !== today.getFullYear()
        ) {
          return false;
        }
      }

      if (filters.timeframe === "Year") {
        if (transactionDate.getFullYear() !== today.getFullYear()) {
          return false;
        }
      }

      if (filters.timeframe === "Custom") {
        if (customRange.from) {
          const fromDate = new Date(customRange.from);
          fromDate.setHours(0, 0, 0, 0);

          if (transactionDate < fromDate) {
            return false;
          }
        }

        if (customRange.to) {
          const toDate = new Date(customRange.to);
          toDate.setHours(0, 0, 0, 0);

          if (transactionDate > toDate) {
            return false;
          }
        }
      }
    }

    // =========================
    // GLOBAL SEARCH
    // =========================

    if (filters.search.trim()) {
      const search = filters.search.toLowerCase().trim();

      const searchableText = [
        transaction.user,
        transaction.category,
        transaction.particular,
        transaction.type,
        transaction.billType,
        transaction.paymentMethod,
        transaction.paymentStatus,
        transaction.transactionId,
        transaction.bankAccount,
        transaction.date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(search)) {
        return false;
      }
    }

    return true;
  });

  // =========================
  // AMOUNT HELPERS
  // =========================

  const getAmount = (item) => Number(item.total || item.amount || 0);

  // FIX: Payment Status "Complete" असेल तर पूर्ण amount paid आहे
  // (आधी Complete transaction साठीही Paid ₹0 दिसत होता)

  const getPaid = (item) => {
    if (item.paymentStatus === "Complete") {
      return getAmount(item);
    }

    return Number(item.paid || 0);
  };

  const getPending = (item) => {
    // Payment Status Complete असेल तर Pending = 0
    if (item.paymentStatus === "Complete") {
      return 0;
    }

    // Complete नसेल तर Total - Paid
    const total = getAmount(item);
    const paid = getPaid(item);

    return Math.max(total - paid, 0);
  };

  // =========================
  // FUTURE PENDING
  // =========================

  const getFuturePending = (item) => {
    const transactionDate = getTransactionDate(item);

    if (!transactionDate) return 0;

    if (transactionDate > today) {
      return getPending(item);
    }

    return Number(item.futurePending || 0);
  };

  // =========================
  // PAGINATION — 25 rows per page
  // =========================

  const totalRows = filteredTransactions.length;

  const totalPages = Math.max(Math.ceil(totalRows / rowsPerPage), 1);

  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * rowsPerPage;

  const pageTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  // =========================
  // SUMMARY
  // =========================

  const totalGST = filteredTransactions.reduce(
    (sum, item) => sum + Number(item.gstAmount || 0),
    0,
  );

  const totalTDS = filteredTransactions.reduce(
    (sum, item) => sum + Number(item.tdsAmount || 0),
    0,
  );

  const paid = filteredTransactions.reduce(
    (sum, item) => sum + getPaid(item),
    0,
  );

  const pending = filteredTransactions.reduce(
    (sum, item) => sum + getPending(item),
    0,
  );

  const futurePending = filteredTransactions.reduce(
    (sum, item) => sum + getFuturePending(item),
    0,
  );

  const expenseRefund = filteredTransactions.reduce(
    (sum, item) => sum + Number(item.expenseRefund || 0),
    0,
  );

  const totalIncome = filteredTransactions
    .filter((item) => item.type === "Income")
    .reduce((sum, item) => sum + getAmount(item), 0);

  // =========================
  // DOWNLOAD PDF (संपूर्ण list)
  // =========================

  const downloadPDF = () => {
    if (filteredTransactions.length === 0) {
      alert("No transactions available.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text("Income / Expense List", 14, 12);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 18);

    const headers = [
      "Index",
      "Date",
      "Type",
      "User",
      "Category",
      "Particular",
      "Amount",
      "GST Amount",
      "TDS Amount",
      "Total",
      "Paid",
      "Pending",
      "Future Pending",
      "Due Date",
      "Bill Type",
      "Payment Status",
      "Payment Method",
      "Transaction ID",
    ];

    const rows = filteredTransactions.map((item, index) => [
      index + 1,
      item.date || "",
      item.type || "",
      item.user || "",
      item.category || "",
      item.particular || "",
      Number(item.amount || 0).toLocaleString("en-IN"),
      Number(item.gstAmount || 0).toLocaleString("en-IN"),
      Number(item.tdsAmount || 0).toLocaleString("en-IN"),
      getAmount(item).toLocaleString("en-IN"),
      getPaid(item).toLocaleString("en-IN"),
      getPending(item).toLocaleString("en-IN"),
      getFuturePending(item).toLocaleString("en-IN"),
      item.dueDate || "",
      item.billType || "",
      item.paymentStatus || "",
      item.paymentMethod || "",
      item.transactionId || "",
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 24,
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [25, 118, 210], textColor: 255 },
      alternateRowStyles: { fillColor: [244, 247, 251] },
    });

    doc.save("income-expense-list.pdf");
  };

  // =========================
  // DOWNLOAD INVOICE / RECEIPT (PDF)
  // =========================

  const downloadDocument = (item) => {
    const documentTitle = item.billType === "Invoice" ? "INVOICE" : "RECEIPT";

    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 118, 210);
    doc.text(documentTitle, 105, 20, { align: "center" });

    doc.setDrawColor(200);
    doc.line(20, 26, 190, 26);

    // FIX: jsPDF default fonts "₹" support करत नाहीत (garbage print होत),
    // म्हणून PDF मध्ये "Rs." वापरला आहे

    const fields = [
      ["Date", item.date || "-"],
      ["Transaction ID", item.transactionId || "-"],
      ["Type", item.type || "-"],
      ["User", item.user || "-"],
      ["Category", item.category || "-"],
      ["Particular", item.particular || "-"],
      ["Amount", `Rs. ${Number(item.amount || 0).toLocaleString("en-IN")}`],
      ["GST", `Rs. ${Number(item.gstAmount || 0).toLocaleString("en-IN")}`],
      ["TDS", `Rs. ${Number(item.tdsAmount || 0).toLocaleString("en-IN")}`],
      ["Total", `Rs. ${getAmount(item).toLocaleString("en-IN")}`],
      ["Paid", `Rs. ${getPaid(item).toLocaleString("en-IN")}`],
      ["Pending", `Rs. ${getPending(item).toLocaleString("en-IN")}`],
      [
        "Future Pending",
        `Rs. ${getFuturePending(item).toLocaleString("en-IN")}`,
      ],
      ["Bill Type", item.billType || "-"],
      ["Payment Status", item.paymentStatus || "-"],
      ["Payment Method", item.paymentMethod || "-"],
      ["Bank Account", item.bankAccount || "-"],
      ["Notes", item.notes || "-"],
    ];

    let y = 38;

    fields.forEach(([label, value]) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(90);
      doc.text(`${label}:`, 20, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(40);
      doc.text(String(value), 75, y);

      y += 8;
    });

    doc.setDrawColor(200);
    doc.line(20, y + 2, 190, y + 2);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 118, 210);
    doc.text(`Current Status: ${item.paymentStatus || "Pending"}`, 20, y + 14);

    doc.save(`${documentTitle.toLowerCase()}-${item.id}.pdf`);
  };

  // =========================
  // DELETE
  // =========================

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this transaction?",
    );

    if (!confirmDelete) return;

    try {
      // BACKEND DELETE

      await deleteTransactionFromBackend(id);

      setTransactions(transactions.filter((item) => item.id !== id));

      // FIX: Dashboard / Recent Transactions लगेच sync व्हावेत म्हणून

      window.dispatchEvent(new Event("transactionUpdated"));
    } catch (error) {
      alert(error.message || "Could not delete. Is the backend running?");
    }
  };

  // =========================
  // EDIT (user name वर double click ने पण)
  // =========================

  const handleEdit = (item) => {
    localStorage.setItem("editTransaction", JSON.stringify(item));

    // TopNavigation मधल्या route प्रमाणे - कोणत्याही router ला चालतो
    navigate("/income/add");
  };

  // =========================
  // INSTALLMENT POPUP
  // =========================

  const openInstallment = (item) => {
    setInstallmentItem(item);

    setShowAddInstallment(false);

    setNewInstallment({
      amount: "",
      dueDate: "",
      remark: "",
    });

    setPayingId(null);
    setPayMethod("Cash");
    setPayTxnId("");
  };

  const closeInstallment = () => {
    setInstallmentItem(null);
  };

  // =========================
  // DATE FORMAT (dd-mm-yyyy)
  // =========================

  const fmtDate = (d) => {
    if (!d) return "-";
    const p = String(d).split("-");
    if (p.length !== 3) return d;
    return `${p[2]}-${p[1]}-${p[0]}`;
  };

  // =========================
  // ADD INSTALLMENT
  // =========================

  const handleAddInstallment = (e) => {
    e.preventDefault();

    /* BACKEND MODE: installments transaction तयार
       करतानाच schedule मध्ये set होतात (backend ला
       add-installment endpoint नाही). नवीन
       installment हवा असेल तर transaction edit
       करा. */

    alert(
      "Installments are set when the transaction is created (2 auto installments). To change them, edit the transaction.",
    );

    setShowAddInstallment(false);
  };

  // =========================
  // MARK INSTALLMENT COMPLETE
  // =========================

  const handleOpenPayment = (instId) => {
    setPayingId(instId);
    setPayMethod("Cash");
    setPayTxnId("");
  };

  // =========================
  // CONFIRM PAYMENT
  // =========================

  const handleConfirmPayment = async (instId) => {
    if (!installmentItem) return;

    if (payMethod === "Bank Transfer" && !payTxnId.trim()) {
      alert("Please enter transaction ID.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const installments = installmentItem.installments || [];

    const targetInst = installments.find((i) => i.id === instId);

    if (!targetInst) return;

    if (targetInst.status === "Completed") return;

    try {
      /* BACKEND PAYMENT — installment वर amount
         जातो, backend status update करतो */

      await payInstallmentOnBackend(
        instId,
        targetInst.amount,
        todayStr,
        payTxnId.trim(),
      );

      /* Backend वरून पुन्हा सगळं load (paid/pending
         + status backend compute करतो) */

      const refreshed = await loadTransactionsFromBackend();

      setTransactions(refreshed);

      window.dispatchEvent(new Event("transactionUpdated"));

      const refreshedItem = refreshed.find((i) => i.id === installmentItem.id);

      setInstallmentItem(refreshedItem || null);

      setPayingId(null);
      setPayMethod("Cash");
      setPayTxnId("");

      if (refreshedItem && refreshedItem.pending <= 0) {
        alert(
          "All installments completed! 🎉 Receipt/Invoice is ready — check the Document column.",
        );
      }
    } catch (error) {
      alert(error.message || "Payment failed. Is the backend running?");
    }
  };

  return (
    <div className="list-page">
      {/* =========================
          SEARCH
      ========================= */}

      <div className="list-search-section">
        <input
          type="text"
          value={filters.search}
          placeholder="Search User, Category, Particular, Bill Type, Payment Method..."
          onChange={(e) => handleFilterChange("search", e.target.value)}
        />

        {filters.search && (
          <button onClick={() => handleFilterChange("search", "")}>
            Clear
          </button>
        )}
      </div>

      {/* =========================
          FILTER SECTION
      ========================= */}

      <div className="filter-section">
        <select
          value={filters.type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
        >
          <option value="" disabled hidden>
            Type
          </option>
          <option value="All">All</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>

        <select
          value={filters.timeframe}
          onChange={(e) => handleFilterChange("timeframe", e.target.value)}
        >
          <option value="All">Timeframe</option>
          <option value="Today">Today</option>
          <option value="This Week">This Week</option>
          <option value="This Month">This Month</option>
          <option value="Year">Year</option>
          <option value="Custom">Custom</option>
        </select>

        <select
          value={filters.billType}
          onChange={(e) => handleFilterChange("billType", e.target.value)}
        >
          <option value="All">Bill Type</option>
          <option value="Receipt">Receipt</option>
          <option value="Invoice">Invoice</option>
        </select>

        <select
          value={filters.category}
          onChange={(e) => handleFilterChange("category", e.target.value)}
        >
          <option value="All">Category</option>

          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={filters.paymentMethod}
          onChange={(e) => handleFilterChange("paymentMethod", e.target.value)}
        >
          <option value="All">Payment Method</option>
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Bank">Bank</option>
          <option value="Card">Card</option>
          <option value="Cheque">Cheque</option>
        </select>

        <select
          value={filters.paymentStatus}
          onChange={(e) => handleFilterChange("paymentStatus", e.target.value)}
        >
          <option value="All">Payment Status</option>
          <option value="Complete">Complete</option>
          <option value="Installment">Installment</option>
          <option value="Income Refund">Income Refund</option>
        </select>

        <select
          value={filters.user}
          onChange={(e) => handleFilterChange("user", e.target.value)}
        >
          <option value="All">User</option>

          {users.map((user) => (
            <option key={user.id} value={user.username}>
              {user.username}
            </option>
          ))}
        </select>

        <select
          value={filters.department}
          onChange={(e) => handleFilterChange("department", e.target.value)}
        >
          <option value="All">Department</option>
          <option value="Admin">Admin</option>
          <option value="Accounts">Accounts</option>
        </select>

        <select
          value={filters.staff}
          onChange={(e) => handleFilterChange("staff", e.target.value)}
        >
          <option value="All">Staff</option>
          <option value="Staff 1">Staff 1</option>
          <option value="Staff 2">Staff 2</option>
        </select>

        <select
          value={filters.messageType}
          onChange={(e) => handleFilterChange("messageType", e.target.value)}
        >
          <option value="All">Message Type</option>
          <option value="SMS">SMS</option>
          <option value="Email">Email</option>
        </select>
      </div>

      {/* =========================
          CUSTOM DATE RANGE
      ========================= */}

      {filters.timeframe === "Custom" && (
        <div className="custom-range">
          <label>
            From
            <input
              type="date"
              value={customRange.from}
              onChange={(e) =>
                setCustomRange((prev) => ({ ...prev, from: e.target.value }))
              }
            />
          </label>

          <label>
            To
            <input
              type="date"
              value={customRange.to}
              onChange={(e) =>
                setCustomRange((prev) => ({ ...prev, to: e.target.value }))
              }
            />
          </label>
        </div>
      )}

      {/* =========================
          SUMMARY
      ========================= */}

      {/* =========================
          LIST BUTTONS + सगळे COLORED TOTALS (एकच line)
      ========================= */}

      <div className="list-buttons">
        <button className="download-btn" onClick={downloadPDF}>
          ⬇ DOWNLOAD PDF
        </button>

        <button className="check-btn">Check Mark Transactions</button>

        <button className="summary blue">
          Total GST: ₹{totalGST.toLocaleString("en-IN")}
        </button>

        <button className="summary purple">
          Total TDS: ₹{totalTDS.toLocaleString("en-IN")}
        </button>

        <button className="summary green">
          Paid: ₹{paid.toLocaleString("en-IN")}
        </button>

        <button className="summary orange">
          Pending: ₹{pending.toLocaleString("en-IN")}
        </button>

        <button className="summary future">
          Future Pending: ₹{futurePending.toLocaleString("en-IN")}
        </button>

        <button className="summary pink">
          Expense Refund: ₹{expenseRefund.toLocaleString("en-IN")}
        </button>

        <button className="summary income">
          Total Income: ₹{totalIncome.toLocaleString("en-IN")}
        </button>
      </div>

      {/* =========================
          TABLE
      ========================= */}

      <div className="list-table-wrapper">
        <div className="list-table">
          <div className="list-table-header">
            <span>Index</span>
            <span>Date</span>
            <span>User</span>
            <span>Category</span>
            <span>Particular</span>
            <span>Amount</span>
            <span>GST Amt</span>
            <span>TDS Amt</span>
            <span>Total</span>
            <span>Paid</span>
            <span>Pending</span>
            <span>Future Pending</span>
            <span>Due Date</span>
            <span>Bill Type</span>
            <span>Status</span>
            <span>Payment Mode</span>
            <span>Document</span>
            <span>Actions</span>
            <span>Created By</span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="empty-list">No transactions found</div>
          ) : (
            pageTransactions.map((item, index) => (
              <div className="list-table-row" key={item.id}>
                <span>{startIndex + index + 1}</span>

                <span>{item.date || "-"}</span>

                {/* USER - double click ने edit */}

                <span
                  className="user-link"
                  onDoubleClick={() => handleEdit(item)}
                  title="Double click to edit"
                >
                  {item.user || "-"}
                </span>

                <span>{item.category || "-"}</span>

                <span>{item.particular || "-"}</span>

                <span>₹{Number(item.amount || 0).toLocaleString("en-IN")}</span>

                <span>
                  ₹{Number(item.gstAmount || 0).toLocaleString("en-IN")}
                </span>

                <span>
                  ₹{Number(item.tdsAmount || 0).toLocaleString("en-IN")}
                </span>

                <span>₹{getAmount(item).toLocaleString("en-IN")}</span>

                <span>₹{getPaid(item).toLocaleString("en-IN")}</span>

                <span className="pending-value">
                  ₹{getPending(item).toLocaleString("en-IN")}
                </span>

                <span className="future-pending-value">
                  ₹{getFuturePending(item).toLocaleString("en-IN")}
                </span>

                {/* DUE DATE */}

                <span>{fmtDate(item.dueDate)}</span>

                <span>{item.billType || "-"}</span>

                <span>
                  {item.paymentStatus === "Installment" ? (
                    <button
                      type="button"
                      className="status-installment"
                      onClick={() => openInstallment(item)}
                      title="Click to view installment details"
                      style={{
                        cursor: "pointer",
                        border: "none",
                        display: "inline-block",
                      }}
                    >
                      Installment
                    </button>
                  ) : (
                    <b
                      className={
                        item.paymentStatus === "Complete"
                          ? "status-complete"
                          : "status-refund"
                      }
                    >
                      {item.paymentStatus || "Pending"}
                    </b>
                  )}
                </span>

                <span>{item.paymentMethod || "-"}</span>

                {/* DOCUMENT - PDF download */}

                <span className="document-actions">
                  {item.billType === "Invoice" ? (
                    <button
                      className="document-btn invoice-btn"
                      onClick={() => downloadDocument(item)}
                      title="Download Invoice PDF"
                    >
                      ↓ Invoice
                    </button>
                  ) : item.billType === "Receipt" ? (
                    <button
                      className="document-btn receipt-btn"
                      onClick={() => downloadDocument(item)}
                      title="Download Receipt PDF"
                    >
                      ↓ Receipt
                    </button>
                  ) : (
                    <span>-</span>
                  )}
                </span>

                {/* ACTIONS - फक्त Delete  */}

                <span className="row-actions">
                  <button
                    className="delete-action"
                    title="Delete Transaction"
                    onClick={() => handleDelete(item.id)}
                  >
                    🗑️
                  </button>
                </span>

                {/* CREATED BY -  */}

                <span>
                  <b className="created-by">Pune Branch</b>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =========================
          PAGINATION — 25 rows per page
      ========================= */}

      {totalRows > rowsPerPage && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={safePage === 1}
          >
            ◀ Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 2,
            )
            .map((n, idx, arr) => (
              <span key={n} className="page-btn-wrap">
                {idx > 0 && n - arr[idx - 1] > 1 && (
                  <span className="page-dots">…</span>
                )}

                <button
                  className={
                    n === safePage ? "page-btn active-page" : "page-btn"
                  }
                  onClick={() => setCurrentPage(n)}
                >
                  {n}
                </button>
              </span>
            ))}

          <button
            className="page-btn"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={safePage === totalPages}
          >
            Next ▶
          </button>

          <span className="page-info">
            Page {safePage} / {totalPages} &nbsp;|&nbsp; {totalRows} records
          </span>
        </div>
      )}

      {/* =========================
          INSTALLMENT POPUP
      ========================= */}

      {installmentItem && (
        <div
          onClick={closeInstallment}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "700px",
              maxWidth: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "10px",
              padding: "20px 22px",
              boxSizing: "border-box",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {/* HEADER */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#222",
                }}
              >
                Installment Details
              </h3>

              <button
                type="button"
                onClick={closeInstallment}
                title="Close"
                style={{
                  width: 32,
                  height: 32,
                  border: "none",
                  borderRadius: "50%",
                  background: "#f3f4f6",
                  color: "#555",
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* ============ TRANSACTION INFO  ============ */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginBottom: 14,
              }}
            >
              {[
                ["User", installmentItem.user || "-"],
                ["Category", installmentItem.category || "-"],
                ["Particular", installmentItem.particular || "-"],
                ["Date", fmtDate(installmentItem.date)],
                ["Due Date", fmtDate(installmentItem.dueDate)],
                ["Payment Method", installmentItem.paymentMethod || "-"],
              ].map(([label, value], i) => (
                <div
                  key={i}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #eef2f7",
                    borderRadius: 8,
                    padding: "9px 12px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      color: "#94a3b8",
                      marginBottom: 3,
                    }}
                  >
                    {label}
                  </span>
                  <b
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: label === "Due Date" ? "#d97706" : "#334155",
                    }}
                  >
                    {value}
                  </b>
                </div>
              ))}
            </div>

            {/* ============ SUMMARY LINE ============ */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "28px",
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 14, color: "#666", fontWeight: 500 }}>
                Total:{" "}
                <b style={{ color: "#1976d2", fontSize: 15 }}>
                  ₹{getAmount(installmentItem).toLocaleString("en-IN")}
                </b>
              </span>

              <span style={{ fontSize: 14, color: "#666", fontWeight: 500 }}>
                Paid:{" "}
                <b style={{ color: "#16a34a", fontSize: 15 }}>
                  ₹{getPaid(installmentItem).toLocaleString("en-IN")}
                </b>
              </span>

              <span style={{ fontSize: 14, color: "#666", fontWeight: 500 }}>
                Pending:{" "}
                <b style={{ color: "#d97706", fontSize: 15 }}>
                  ₹
                  {Math.max(
                    getAmount(installmentItem) - getPaid(installmentItem),
                    0,
                  ).toLocaleString("en-IN")}
                </b>
              </span>
            </div>

            {/* ============ INSTALLMENTS TABLE ============ */}

            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.3fr 0.9fr 1fr 1fr 1.4fr",
                  alignItems: "center",
                  textAlign: "center",
                  background: "#6495ed",
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  padding: "11px 12px",
                }}
              >
                <span>Invoice No</span>
                <span>Amount</span>
                <span>Due Date</span>
                <span>Pay Date</span>
                <span>Status</span>
              </div>

              {(installmentItem.installments || []).length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    fontSize: 12,
                    color: "#999",
                  }}
                >
                  No installments added yet
                </div>
              ) : (
                (installmentItem.installments || []).map((inst, idx) => {
                  const isPaying = payingId === inst.id;

                  return (
                    <div key={inst.id}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.3fr 0.9fr 1fr 1fr 1.4fr",
                          alignItems: "center",
                          textAlign: "center",
                          padding: "10px 12px",
                          fontSize: 12,
                          color: "#333",
                          borderBottom: "1px solid #f1f5f9",
                          background: idx % 2 === 0 ? "#ffffff" : "#fafbfd",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "#1976d2" }}>
                          {inst.invoiceNo}
                        </span>

                        <span style={{ fontWeight: 600 }}>
                          ₹{Number(inst.amount || 0).toLocaleString("en-IN")}
                        </span>

                        <span>{fmtDate(inst.dueDate)}</span>

                        <span>{fmtDate(inst.paymentDate)}</span>

                        <span>
                          {inst.status === "Completed" ? (
                            <b
                              style={{
                                color: "#20b33b",
                                fontWeight: 600,
                                fontSize: 11,
                              }}
                            >
                              Completed
                            </b>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(inst.id)}
                              style={{
                                border: "none",
                                borderRadius: 5,
                                background: "#ff8500",
                                color: "#ffffff",
                                fontFamily: "Poppins, sans-serif",
                                fontSize: 9,
                                fontWeight: 600,
                                padding: "6px 10px",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              MARK COMPLETE
                            </button>
                          )}
                        </span>
                      </div>

                      {/* PAYMENT PANEL - method + txn id */}

                      {isPaying && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                            padding: "10px 12px",
                            background: "#f0f6ff",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#555",
                            }}
                          >
                            Payment Method:
                          </span>

                          <select
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value)}
                            style={{
                              height: 32,
                              padding: "0 8px",
                              border: "1px solid #cbd5e1",
                              borderRadius: 5,
                              fontFamily: "Poppins, sans-serif",
                              fontSize: 12,
                              color: "#333",
                              background: "#ffffff",
                              outline: "none",
                              cursor: "pointer",
                            }}
                          >
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                            <option value="UPI">UPI</option>
                          </select>

                          {payMethod === "Bank Transfer" && (
                            <input
                              type="text"
                              value={payTxnId}
                              onChange={(e) => setPayTxnId(e.target.value)}
                              placeholder="Txn ID"
                              style={{
                                height: 32,
                                width: 150,
                                padding: "0 8px",
                                border: "1px solid #cbd5e1",
                                borderRadius: 5,
                                fontFamily: "Poppins, sans-serif",
                                fontSize: 12,
                                color: "#333",
                                background: "#ffffff",
                                outline: "none",
                                boxSizing: "border-box",
                              }}
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => handleConfirmPayment(inst.id)}
                            style={{
                              height: 32,
                              padding: "0 16px",
                              border: "none",
                              borderRadius: 5,
                              background: "#16a34a",
                              color: "#ffffff",
                              fontFamily: "Poppins, sans-serif",
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Confirm Payment
                          </button>

                          <button
                            type="button"
                            onClick={() => setPayingId(null)}
                            style={{
                              height: 32,
                              padding: "0 12px",
                              border: "none",
                              borderRadius: 5,
                              background: "#e2e8f0",
                              color: "#555",
                              fontFamily: "Poppins, sans-serif",
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ============ पूर्ण झालं तर - Download Receipt/Invoice ============ */}

            {installmentItem.paymentStatus === "Complete" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => downloadDocument(installmentItem)}
                  style={{
                    border: "none",
                    borderRadius: 5,
                    background: "#16a34a",
                    color: "#ffffff",
                    fontFamily: "Poppins, sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "9px 18px",
                    cursor: "pointer",
                  }}
                >
                  ⬇ Download{" "}
                  {installmentItem.billType === "Invoice"
                    ? "Invoice"
                    : "Receipt"}
                </button>
              </div>
            )}

            {/* ============ खाली - ADD INSTALLMENT BUTTON ============ */}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: showAddInstallment ? "10px" : "0px",
              }}
            >
              <button
                type="button"
                onClick={() => setShowAddInstallment(!showAddInstallment)}
                style={{
                  border: "none",
                  borderRadius: 5,
                  background: "#1976d2",
                  color: "#ffffff",
                  fontFamily: "Poppins, sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  padding: "9px 18px",
                  cursor: "pointer",
                }}
              >
                {showAddInstallment ? "✕ CANCEL" : "ADD INSTALLMENT"}
              </button>
            </div>

            {/* ============ खाली - ADD INSTALLMENT FORM ============ */}

            {showAddInstallment && (
              <form
                onSubmit={handleAddInstallment}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1.2fr auto",
                  gap: 12,
                  alignItems: "end",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 14,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#555",
                  }}
                >
                  Amount
                  <input
                    type="number"
                    value={newInstallment.amount}
                    onChange={(e) =>
                      setNewInstallment((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    placeholder="Enter amount"
                    min="1"
                    style={{
                      height: 38,
                      padding: "0 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 12,
                      color: "#333",
                      outline: "none",
                      boxSizing: "border-box",
                      width: "100%",
                      background: "#ffffff",
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#555",
                  }}
                >
                  Due Date
                  <input
                    type="date"
                    value={newInstallment.dueDate}
                    onChange={(e) =>
                      setNewInstallment((prev) => ({
                        ...prev,
                        dueDate: e.target.value,
                      }))
                    }
                    style={{
                      height: 38,
                      padding: "0 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 12,
                      color: "#333",
                      outline: "none",
                      boxSizing: "border-box",
                      width: "100%",
                      background: "#ffffff",
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#555",
                  }}
                >
                  Remark
                  <input
                    type="text"
                    value={newInstallment.remark}
                    onChange={(e) =>
                      setNewInstallment((prev) => ({
                        ...prev,
                        remark: e.target.value,
                      }))
                    }
                    placeholder="e.g. 3rd installment"
                    style={{
                      height: 38,
                      padding: "0 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 12,
                      color: "#333",
                      outline: "none",
                      boxSizing: "border-box",
                      width: "100%",
                      background: "#ffffff",
                    }}
                  />
                </label>

                <button
                  type="submit"
                  style={{
                    height: 38,
                    padding: "0 22px",
                    border: "none",
                    borderRadius: 6,
                    background: "#16a34a",
                    color: "#ffffff",
                    fontFamily: "Poppins, sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  SAVE
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default List;
