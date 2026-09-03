import { useEffect, useState } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaMoneyBillWave,
  FaHistory,
  FaBan,
} from "react-icons/fa";

import {
  apiGetLiabilities,
  apiAddLiability,
  apiUpdateLiability,
  apiPayLiability,
  apiCancelLiability,
  apiDeleteLiability,
  apiGetContacts,
  apiGetBanks,
  apiGetCategories,
} from "../utils/api";

import "../css/Settings.css";
import "../css/Assets.css";
import "../css/Liabilities.css";

/* =========================================
   LIABILITIES PAGE — real backend (/api/liabilities)
   (Investment page च्या आत tab म्हणून render होतो)
   ========================================= */

const LIABILITY_TYPES = [
  { value: "PERSONAL_LOAN", label: "Personal Loan" },
  { value: "HOME_LOAN", label: "Home Loan" },
  { value: "CAR_LOAN", label: "Car Loan" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "BORROWED_MONEY", label: "Borrowed Money" },
  { value: "MORTGAGE", label: "Mortgage" },
  { value: "BUSINESS_LOAN", label: "Business Loan" },
  { value: "OTHER", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CREDIT_CARD", label: "Credit Card" },
];

const STATUS_LABELS = {
  ACTIVE: "Active",
  PAID_OFF: "Paid Off",
  CANCELLED: "Cancelled",
};

const typeLabel = (value) => {
  const found = LIABILITY_TYPES.find((item) => item.value === value);

  return found ? found.label : value || "-";
};

const paymentLabel = (value) => {
  const found = PAYMENT_METHODS.find((item) => item.value === value);

  return found ? found.label : value || "-";
};

const statusLabel = (value) => STATUS_LABELS[value] || value || "-";

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

// DATE FORMAT (dd-mm-yyyy)

const fmtDate = (d) => {
  if (!d) return "-";

  const p = String(d).split("-");

  if (p.length !== 3) return d;

  return `${p[2]}-${p[1]}-${p[0]}`;
};

function Liabilities() {
  const [liabilities, setLiabilities] = useState([]);

  const [contacts, setContacts] = useState([]);

  const [banks, setBanks] = useState([]);

  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");

  // formMode: ADD / EDIT / PAY / HISTORY

  const [showForm, setShowForm] = useState(false);

  const [formMode, setFormMode] = useState("ADD");

  const [editId, setEditId] = useState(null);

  const [selectedLiability, setSelectedLiability] = useState(null);

  const [formData, setFormData] = useState({});

  const [payData, setPayData] = useState({});

  const [error, setError] = useState("");

  /* =========================================
     LOAD DATA (BACKEND)
     ========================================= */

  const loadAll = async () => {
    try {
      const [liabilityList, contactList, bankList, categoryList] =
        await Promise.all([
          apiGetLiabilities(),
          apiGetContacts(),
          apiGetBanks(),
          apiGetCategories(),
        ]);

      setLiabilities(Array.isArray(liabilityList) ? liabilityList : []);

      setContacts(Array.isArray(contactList) ? contactList : []);

      setBanks(Array.isArray(bankList) ? bankList : []);

      setCategories(Array.isArray(categoryList) ? categoryList : []);
    } catch (error) {
      setLiabilities([]);
    }
  };

  useEffect(() => {
    loadAll();

    window.addEventListener("assetUpdated", loadAll);
    window.addEventListener("transactionUpdated", loadAll);
    window.addEventListener("storage", loadAll);
    window.addEventListener("focus", loadAll);

    return () => {
      window.removeEventListener("assetUpdated", loadAll);
      window.removeEventListener("transactionUpdated", loadAll);
      window.removeEventListener("storage", loadAll);
      window.removeEventListener("focus", loadAll);
    };
  }, []);

  /* =========================================
     FORM CHANGE
     ========================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePayChange = (e) => {
    const { name, value } = e.target;

    setPayData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================================
     OPEN FORMS
     ========================================= */

  const openAddForm = () => {
    setFormMode("ADD");

    setEditId(null);

    setError("");

    setFormData({
      name: "",
      type: "",
      lenderContactId: "",
      principalAmount: "",
      interestRate: "",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      depositBankId: "",
      depositAmount: "",
      description: "",
    });

    setShowForm(true);
  };

  const openEditForm = (liability) => {
    setFormMode("EDIT");

    setEditId(liability.id);

    setError("");

    setFormData({
      name: liability.name || "",
      type: liability.type || "",
      lenderContactId: liability.lenderContactId
        ? String(liability.lenderContactId)
        : "",
      principalAmount: liability.principalAmount || "",
      interestRate: liability.interestRate || "",
      startDate: liability.startDate || "",
      dueDate: liability.dueDate || "",
      depositBankId: "",
      depositAmount: "",
      description: liability.description || "",
    });

    setShowForm(true);
  };

  const openPayForm = (liability) => {
    setFormMode("PAY");

    setEditId(liability.id);

    setSelectedLiability(liability);

    setError("");

    setPayData({
      date: new Date().toISOString().split("T")[0],
      principalComponent: "",
      interestComponent: "",
      paymentMethod: "",
      bankId: "",
      interestCategoryId: "",
      remark: "",
    });

    setShowForm(true);
  };

  const openHistory = (liability) => {
    setFormMode("HISTORY");

    setSelectedLiability(liability);

    setError("");

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);

    setFormMode("ADD");

    setEditId(null);

    setSelectedLiability(null);

    setFormData({});

    setPayData({});

    setError("");
  };

  /* =========================================
     SAVE (ADD / EDIT)
     ========================================= */

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      setError("Please enter liability name.");
      return;
    }

    if (!formData.type) {
      setError("Please select liability type.");
      return;
    }

    if (!formData.principalAmount || Number(formData.principalAmount) <= 0) {
      setError("Principal amount must be greater than 0.");
      return;
    }

    if (!formData.startDate) {
      setError("Please select start date.");
      return;
    }

    if (
      formData.depositBankId &&
      formData.depositAmount &&
      Number(formData.depositAmount) > Number(formData.principalAmount)
    ) {
      setError("Deposit amount cannot exceed principal amount.");
      return;
    }

    setError("");

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        lenderContactId: formData.lenderContactId
          ? Number(formData.lenderContactId)
          : null,
        description: formData.description?.trim() || null,
        principalAmount: Number(formData.principalAmount),
        interestRate: formData.interestRate
          ? Number(formData.interestRate)
          : null,
        startDate: formData.startDate,
        dueDate: formData.dueDate || null,
        depositBankId: formData.depositBankId
          ? Number(formData.depositBankId)
          : null,
        depositAmount: formData.depositBankId
          ? formData.depositAmount
            ? Number(formData.depositAmount)
            : Number(formData.principalAmount)
          : null,
      };

      if (formMode === "EDIT" && editId) {
        await apiUpdateLiability(editId, payload);
      } else {
        await apiAddLiability(payload);
      }

      await loadAll();

      closeForm();

      /* Dashboard chart + bank balance refresh */

      window.dispatchEvent(new Event("assetUpdated"));

      window.dispatchEvent(new Event("transactionUpdated"));
    } catch (error) {
      setError(error.message || "Save failed. Is the backend running?");
    }
  };

  /* =========================================
     PAYMENT SAVE
     ========================================= */

  const handlePaySave = async () => {
    const principal = Number(payData.principalComponent || 0);
    const interest = Number(payData.interestComponent || 0);
    const outstanding = Number(selectedLiability?.outstandingAmount || 0);

    if (!payData.date) {
      setError("Please select payment date.");
      return;
    }

    if (principal < 0 || interest < 0) {
      setError("Payment components cannot be negative.");
      return;
    }

    if (principal === 0 && interest === 0) {
      setError("Enter principal or interest amount.");
      return;
    }

    if (principal > outstanding) {
      setError(
        `Principal (₹${principal.toLocaleString(
          "en-IN",
        )}) exceeds outstanding (₹${outstanding.toLocaleString("en-IN")}).`,
      );
      return;
    }

    if (!payData.paymentMethod) {
      setError("Please select payment method.");
      return;
    }

    if (payData.paymentMethod === "BANK_TRANSFER" && !payData.bankId) {
      setError("Bank account is required for Bank Transfer.");
      return;
    }

    if (interest > 0 && !payData.interestCategoryId) {
      setError("Interest category is required when interest > 0.");
      return;
    }

    if (interest > 0 && !selectedLiability?.lenderContactId) {
      setError(
        "This liability has no lender contact — interest expense साठी lender हवा. Edit करून lender निवडा.",
      );
      return;
    }

    setError("");

    try {
      await apiPayLiability(editId, {
        date: payData.date,
        principalComponent: principal,
        interestComponent: interest,
        paymentMethod: payData.paymentMethod,
        bankId:
          payData.paymentMethod === "BANK_TRANSFER" && payData.bankId
            ? Number(payData.bankId)
            : null,
        interestCategoryId:
          interest > 0 && payData.interestCategoryId
            ? Number(payData.interestCategoryId)
            : null,
        remark: payData.remark?.trim() || null,
      });

      await loadAll();

      closeForm();

      /* Dashboard chart + List (interest expense) refresh */

      window.dispatchEvent(new Event("assetUpdated"));

      window.dispatchEvent(new Event("transactionUpdated"));
    } catch (error) {
      setError(error.message || "Payment failed. Is the backend running?");
    }
  };

  /* =========================================
     CANCEL LIABILITY
     ========================================= */

  const handleCancel = async (id) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this liability?",
    );

    if (!confirmCancel) return;

    try {
      await apiCancelLiability(id);

      await loadAll();

      window.dispatchEvent(new Event("assetUpdated"));
    } catch (error) {
      alert(error.message || "Cancel failed. Is the backend running?");
    }
  };

  /* =========================================
     DELETE
     ========================================= */

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this liability?",
    );

    if (!confirmDelete) return;

    try {
      await apiDeleteLiability(id);

      await loadAll();

      window.dispatchEvent(new Event("assetUpdated"));

      window.dispatchEvent(new Event("transactionUpdated"));
    } catch (error) {
      alert(error.message || "Delete failed. Is the backend running?");
    }
  };

  /* =========================================
     FILTER + SUMMARY
     ========================================= */

  const filteredLiabilities = liabilities.filter(
    (item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      typeLabel(item.type).toLowerCase().includes(search.toLowerCase()) ||
      (item.lenderName || "").toLowerCase().includes(search.toLowerCase()),
  );

  const totalPrincipal = liabilities.reduce(
    (sum, item) => sum + Number(item.principalAmount || 0),
    0,
  );

  const totalOutstanding = liabilities.reduce(
    (sum, item) => sum + Number(item.outstandingAmount || 0),
    0,
  );

  const totalPaid = liabilities.reduce(
    (sum, item) =>
      sum +
      Number(item.totalPrincipalPaid || 0) +
      Number(item.totalInterestPaid || 0),
    0,
  );

  /* =========================================
     RETURN
     ========================================= */

  return (
    <div className="settings-section">
      <div className="search-total">
        <input
          type="text"
          placeholder="Search Liability"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="total-badge">
          Total Principal: {formatAmount(totalPrincipal)}
        </div>

        <div className="total-badge">
          Outstanding: {formatAmount(totalOutstanding)}
        </div>

        <div className="total-badge">Paid: {formatAmount(totalPaid)}</div>

        <button className="add-btn" onClick={openAddForm}>
          <FaPlus />
          ADD LIABILITY
        </button>
      </div>

      <div className="settings-table">
        <div className="table-head liability-grid">
          <span>ID</span>
          <span>Liability Name</span>
          <span>Type</span>
          <span>Lender</span>
          <span>Principal</span>
          <span>Outstanding</span>
          <span>Start Date</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {filteredLiabilities.length === 0 ? (
          <div className="empty-row">No liabilities found</div>
        ) : (
          filteredLiabilities.map((item) => (
            <div className="table-data liability-grid" key={item.id}>
              <span>{item.id}</span>

              <span
                onDoubleClick={() => openEditForm(item)}
                title="Double click to edit"
                style={{ cursor: "pointer" }}
              >
                {item.name}
              </span>

              <span>{typeLabel(item.type)}</span>

              <span>{item.lenderName || "-"}</span>

              <span>{formatAmount(item.principalAmount)}</span>

              <span className="liab-outstanding">
                {formatAmount(item.outstandingAmount)}
              </span>

              <span>{fmtDate(item.startDate)}</span>

              <span>
                <span
                  className={`liab-status liab-status-${(
                    item.status || ""
                  ).toLowerCase()}`}
                >
                  {statusLabel(item.status)}
                </span>
              </span>

              <span className="actions">
                {item.status === "ACTIVE" && (
                  <FaMoneyBillWave
                    className="edit-icon"
                    title="Record payment"
                    onClick={() => openPayForm(item)}
                  />
                )}

                <FaHistory
                  className="edit-icon"
                  title="Payment history"
                  onClick={() => openHistory(item)}
                />

                <FaEdit
                  className="edit-icon"
                  title="Edit liability"
                  onClick={() => openEditForm(item)}
                />

                {item.status === "ACTIVE" && (
                  <FaBan
                    className="delete-icon"
                    title="Cancel liability"
                    onClick={() => handleCancel(item.id)}
                  />
                )}

                <FaTrash
                  className="delete-icon"
                  title="Delete liability"
                  onClick={() => handleDelete(item.id)}
                />
              </span>
            </div>
          ))
        )}
      </div>

      {/* POPUP FORM */}

      {showForm && (
        <div className="settings-overlay">
          <div className="settings-modal">
            <div className="modal-header">
              <h2>
                {formMode === "ADD"
                  ? "Add Liability"
                  : formMode === "EDIT"
                    ? "Edit Liability"
                    : formMode === "PAY"
                      ? "Record Payment"
                      : "Payment History"}
              </h2>

              <button className="close-btn" onClick={closeForm}>
                <FaTimes />
              </button>
            </div>

            {error && <div className="modal-error">{error}</div>}

            {/* HISTORY MODE */}

            {formMode === "HISTORY" ? (
              <div className="history-box">
                {!selectedLiability?.payments ||
                selectedLiability.payments.length === 0 ? (
                  <div className="empty-row">No payments recorded yet</div>
                ) : (
                  selectedLiability.payments.map((payment) => (
                    <div className="history-item" key={payment.id}>
                      <div className="history-row">
                        <span className="history-date">
                          {fmtDate(payment.paymentDate)}
                        </span>

                        <span className="history-total">
                          {formatAmount(payment.totalAmount)}
                        </span>
                      </div>

                      <div className="history-row history-sub">
                        <span>
                          Principal: {formatAmount(payment.principalComponent)}
                        </span>

                        <span>
                          Interest: {formatAmount(payment.interestComponent)}
                        </span>

                        <span>{paymentLabel(payment.paymentMethod)}</span>
                      </div>

                      {payment.remark && (
                        <div className="history-row history-remark">
                          {payment.remark}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : formMode === "PAY" ? (
              /* PAY MODE — EMI / settlement */

              <div className="modal-form">
                <div className="pay-hint">
                  Outstanding:{" "}
                  <b>{formatAmount(selectedLiability?.outstandingAmount)}</b> (
                  {selectedLiability?.name})
                </div>

                <label>Payment Date *</label>

                <input
                  type="date"
                  name="date"
                  value={payData.date || ""}
                  onChange={handlePayChange}
                />

                <label>Principal Component (₹) *</label>

                <input
                  type="number"
                  name="principalComponent"
                  value={payData.principalComponent || ""}
                  onChange={handlePayChange}
                  placeholder="जे भागाने loan कमी होईल"
                  min="0"
                />

                <label>Interest Component (₹) *</label>

                <input
                  type="number"
                  name="interestComponent"
                  value={payData.interestComponent || ""}
                  onChange={handlePayChange}
                  placeholder="व्याजाचा भाग (0 पण चालतं)"
                  min="0"
                />

                <div className="pay-total">
                  Total Payment:{" "}
                  <b>
                    {formatAmount(
                      Number(payData.principalComponent || 0) +
                        Number(payData.interestComponent || 0),
                    )}
                  </b>
                </div>

                <label>Payment Method *</label>

                <select
                  name="paymentMethod"
                  value={payData.paymentMethod || ""}
                  onChange={handlePayChange}
                >
                  <option value="">Select Payment Method</option>

                  {PAYMENT_METHODS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                {payData.paymentMethod === "BANK_TRANSFER" && (
                  <>
                    <label>Bank Account *</label>

                    <select
                      name="bankId"
                      value={payData.bankId || ""}
                      onChange={handlePayChange}
                    >
                      <option value="">Select Bank Account</option>

                      {banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.bankName || bank.accountName || "Bank"}

                          {bank.accountNumber ? ` - ${bank.accountNumber}` : ""}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {Number(payData.interestComponent || 0) > 0 && (
                  <>
                    <label>
                      Interest Category *{" "}
                      <small>
                        (interest चा Expense या category मध्ये जाईल)
                      </small>
                    </label>

                    <select
                      name="interestCategoryId"
                      value={payData.interestCategoryId || ""}
                      onChange={handlePayChange}
                    >
                      <option value="">Select Category</option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <label>Remark</label>

                <input
                  type="text"
                  name="remark"
                  value={payData.remark || ""}
                  onChange={handlePayChange}
                  placeholder="e.g. EMI 3 of 12"
                />
              </div>
            ) : (
              /* ADD / EDIT MODE */

              <div className="modal-form">
                <label>Liability Name *</label>

                <input
                  type="text"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  placeholder="e.g. Car Loan - HDFC / Friend पासून घेतलेले पैसे"
                />

                <label>Liability Type *</label>

                <select
                  name="type"
                  value={formData.type || ""}
                  onChange={handleChange}
                >
                  <option value="">Select Liability Type</option>

                  {LIABILITY_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <label>
                  Lender (Contact){" "}
                  <small>(interest payment साठी हवा — नाहीतर skip करा)</small>
                </label>

                <select
                  name="lenderContactId"
                  value={formData.lenderContactId || ""}
                  onChange={handleChange}
                >
                  <option value="">No Lender</option>

                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.username || contact.name}
                    </option>
                  ))}
                </select>

                <label>Principal Amount (₹) *</label>

                <input
                  type="number"
                  name="principalAmount"
                  value={formData.principalAmount || ""}
                  onChange={handleChange}
                  placeholder="Total loan amount"
                  min="1"
                />

                <label>Interest Rate (%)</label>

                <input
                  type="number"
                  name="interestRate"
                  value={formData.interestRate || ""}
                  onChange={handleChange}
                  placeholder="e.g. 8.5"
                  min="0"
                  step="0.01"
                />

                <label>Start Date *</label>

                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate || ""}
                  onChange={handleChange}
                />

                <label>Due Date</label>

                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate || ""}
                  onChange={handleChange}
                />

                <label>
                  Deposit To Bank{" "}
                  <small>
                    (loan चे पैसे bank मध्ये आले तर — balance वाढेल)
                  </small>
                </label>

                <select
                  name="depositBankId"
                  value={formData.depositBankId || ""}
                  onChange={handleChange}
                >
                  <option value="">No Bank Deposit</option>

                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankName || bank.accountName || "Bank"}

                      {bank.accountNumber ? ` - ${bank.accountNumber}` : ""}
                    </option>
                  ))}
                </select>

                {formData.depositBankId && (
                  <>
                    <label>Deposit Amount (₹)</label>

                    <input
                      type="number"
                      name="depositAmount"
                      value={formData.depositAmount || ""}
                      onChange={handleChange}
                      placeholder="Blank = full principal"
                      min="0"
                    />
                  </>
                )}

                <label>Description</label>

                <input
                  type="text"
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  placeholder="Enter description"
                />

                {formMode === "EDIT" && (
                  <div className="pay-hint">
                    Note: payments असलेल्या liability मध्ये principal / start
                    date बदलता येत नाही.
                  </div>
                )}
              </div>
            )}

            {formMode !== "HISTORY" && (
              <div className="modal-buttons">
                <button className="cancel-btn" onClick={closeForm}>
                  CANCEL
                </button>

                <button
                  className="save-btn"
                  onClick={formMode === "PAY" ? handlePaySave : handleSave}
                >
                  {formMode === "PAY"
                    ? "RECORD PAYMENT"
                    : formMode === "EDIT"
                      ? "UPDATE"
                      : "SAVE"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Liabilities;
