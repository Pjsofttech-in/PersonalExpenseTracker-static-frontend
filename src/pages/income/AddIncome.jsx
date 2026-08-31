import { useEffect, useState } from "react";
import {
  loadCategoriesFromBackend,
  loadContactsFromBackend,
  loadBanksFromBackend,
  saveTransactionToBackend,
  ensureDefaultsOnBackend,
} from "../../utils/backendData";

import "../../css/AddIncome.css";

function AddIncome() {
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  const [userSearch, setUserSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showCategorySearch, setShowCategorySearch] = useState(false);

  const [formData, setFormData] = useState({
    type: "Expense",
    user: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: "",
    category: "",
    particular: "",
    amount: "",

    gstEnabled: false,
    gstPercent: "",
    gstNumber: "",

    tdsEnabled: false,
    tdsPercent: "",

    paymentStatus: "",
    billType: "",
    paymentMethod: "",
    bankAccount: "",
    transactionId: "",

    notes: "",
  });

  const [error, setError] = useState("");

  // Edit mode - List मधून double click/Edit ने आल्यावर
  const [editId, setEditId] = useState(null);

  /* =====================================================
     LOAD USERS / CATEGORIES / BANK ACCOUNTS
     ===================================================== */

  useEffect(() => {
    // BACKEND वरून categories / contacts / banks load

    const loadSettingsData = async () => {
      try {
        /* पहिल्यांदा defaults बनवा (रिकाम्या
           backend वर dropdown select करता येईल) */

        await ensureDefaultsOnBackend();

        const [backendCategories, backendContacts, backendBanks] =
          await Promise.all([
            loadCategoriesFromBackend(),
            loadContactsFromBackend(),
            loadBanksFromBackend(),
          ]);

        setCategories(backendCategories);
        setUsers(backendContacts);
        setBankAccounts(backendBanks);
      } catch (error) {
        setCategories([]);
        setUsers([]);
        setBankAccounts([]);
      }
    };

    loadSettingsData();

    window.addEventListener("storage", loadSettingsData);
    window.addEventListener("focus", loadSettingsData);

    return () => {
      window.removeEventListener("storage", loadSettingsData);
      window.removeEventListener("focus", loadSettingsData);
    };
  }, []);

  /* =====================================================
     EDIT MODE 
     ===================================================== */

  useEffect(() => {
    const editTransaction = JSON.parse(localStorage.getItem("editTransaction"));

    if (!editTransaction) return;

    setEditId(editTransaction.id || null);

    setFormData((prev) => ({
      ...prev,
      type: editTransaction.type || prev.type,
      user: editTransaction.user || "",
      date: editTransaction.date || prev.date,
      dueDate: editTransaction.dueDate || "",
      category: editTransaction.category || "",
      particular: editTransaction.particular || "",
      amount: editTransaction.amount ? String(editTransaction.amount) : "",
      gstEnabled: Boolean(
        editTransaction.gstPercent || editTransaction.gstNumber,
      ),
      gstPercent: editTransaction.gstPercent
        ? String(editTransaction.gstPercent)
        : "",
      gstNumber: editTransaction.gstNumber || "",
      tdsEnabled: Boolean(editTransaction.tdsPercent),
      tdsPercent: editTransaction.tdsPercent
        ? String(editTransaction.tdsPercent)
        : "",
      paymentStatus: editTransaction.paymentStatus || "",
      billType: editTransaction.billType || "",
      paymentMethod: editTransaction.paymentMethod || "",
      bankAccount: editTransaction.bankAccount || "",
      transactionId: editTransaction.transactionId || "",
      notes: editTransaction.notes || "",
    }));
  }, []);

  /* =====================================================
     HANDLE CHANGE
     ===================================================== */

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => {
      const updatedData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (
        name === "paymentStatus" &&
        (value === "Installment" || value === "Income Refund")
      ) {
        updatedData.transactionId = "";
        updatedData.billType = "";
        updatedData.paymentMethod = "";
        updatedData.bankAccount = "";
      }

      return updatedData;
    });
  };

  /* =====================================================
     USER SEARCH
     ===================================================== */

  const filteredUsers = users.filter((user) =>
    (user.username || "").toLowerCase().includes(userSearch.toLowerCase()),
  );

  /* =====================================================
     CATEGORY SEARCH
     ===================================================== */

  const filteredCategories = categories.filter((category) =>
    (category.name || "").toLowerCase().includes(categorySearch.toLowerCase()),
  );

  /* =====================================================
     SELECT USER
     ===================================================== */

  const handleSelectUser = (username) => {
    setFormData((prev) => ({
      ...prev,
      user: username,
    }));

    setUserSearch("");
    setShowUserSearch(false);
  };

  /* =====================================================
     SELECT CATEGORY
     ===================================================== */

  const handleSelectCategory = (categoryName) => {
    setFormData((prev) => ({
      ...prev,
      category: categoryName,
    }));

    setCategorySearch("");
    setShowCategorySearch(false);
  };

  /* =====================================================
     CALCULATION
     ===================================================== */

  const amount = Number(formData.amount) || 0;

  const gstPercent = formData.gstEnabled ? Number(formData.gstPercent) || 0 : 0;

  const tdsPercent = formData.tdsEnabled ? Number(formData.tdsPercent) || 0 : 0;

  const gstAmount = (amount * gstPercent) / 100;

  const tdsAmount = (amount * tdsPercent) / 100;

  const total = amount + gstAmount - tdsAmount;

  /* =====================================================
     TRANSACTION ID VISIBILITY
     ===================================================== */

  const showTransactionId = formData.paymentStatus === "Complete";

  /* =====================================================
     SAVE
     ===================================================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.user) {
      setError("Please select user.");
      return;
    }

    if (!formData.category) {
      setError("Please select category.");
      return;
    }

    if (!formData.particular.trim()) {
      setError("Please enter particular.");
      return;
    }

    if (!formData.amount || amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    if (formData.gstEnabled && !formData.gstPercent) {
      setError("Please enter GST percentage.");
      return;
    }

    if (formData.tdsEnabled && !formData.tdsPercent) {
      setError("Please enter TDS percentage.");
      return;
    }

    if (!formData.paymentStatus) {
      setError("Please select payment status.");
      return;
    }

    // Bill Type + Payment Method फक्त Complete साठी required
    if (formData.paymentStatus === "Complete") {
      if (!formData.billType) {
        setError("Please select bill type.");
        return;
      }

      if (!formData.paymentMethod) {
        setError("Please select payment method.");
        return;
      }
    }

    // Transaction ID फक्त Complete साठी required
    if (
      formData.paymentStatus === "Complete" &&
      !formData.transactionId.trim()
    ) {
      setError("Please enter transaction ID.");
      return;
    }

    setError("");

    /* BACKEND SAVE (add किंवा update) */

    try {
      await saveTransactionToBackend(
        {
          ...formData,

          transactionId: showTransactionId ? formData.transactionId.trim() : "",

          amount,
          gstAmount,
          tdsAmount,
          total,
        },
        editId,
      );

      // edit session संपवा

      localStorage.removeItem("editTransaction");
      setEditId(null);

      // Dashboard/List लगेच update व्हावेत म्हणून

      window.dispatchEvent(new Event("transactionUpdated"));

      alert(
        editId
          ? "Transaction updated successfully!"
          : "Transaction added successfully!",
      );

      handleReset();
    } catch (error) {
      alert(error.message || "Could not save. Is the backend running?");
    }
  };

  /* =====================================================
     RESET
     ===================================================== */

  const handleReset = () => {
    setFormData({
      type: "Expense",
      user: "",
      date: new Date().toISOString().split("T")[0],
      dueDate: "",
      category: "",
      particular: "",
      amount: "",

      gstEnabled: false,
      gstPercent: "",
      gstNumber: "",

      tdsEnabled: false,
      tdsPercent: "",

      paymentStatus: "",
      billType: "",
      paymentMethod: "",
      bankAccount: "",
      transactionId: "",

      notes: "",
    });

    setUserSearch("");
    setCategorySearch("");

    setShowUserSearch(false);
    setShowCategorySearch(false);

    setError("");

    // edit session साफ
    localStorage.removeItem("editTransaction");
    setEditId(null);
  };

  return (
    <div className="add-income-page">
      {/* PAGE TITLE */}

      <div className="add-income-title">
        <h2>{editId ? "Edit Income / Expense" : "Add Income / Expense"}</h2>
        <p>
          {editId
            ? "Update your income or expense details"
            : "Record your income or expense details"}
        </p>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* FORM */}

      <form className="income-expense-form" onSubmit={handleSubmit}>
        {/* TYPE */}

        <div className="floating-field">
          <label>Type</label>

          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="Expense">Expense</option>

            <option value="Income">Income</option>
          </select>
        </div>

        {/* USER */}

        <div className="floating-field search-field">
          <label>User</label>

          <div
            className="select-search-box"
            onClick={() => {
              setShowUserSearch((prev) => !prev);
              setShowCategorySearch(false);
            }}
          >
            <span
              className={formData.user ? "selected-value" : "placeholder-value"}
            >
              {formData.user || "Select User"}
            </span>

            <span className="select-arrow">▼</span>
          </div>

          {showUserSearch && (
            <div
              className="search-dropdown"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                className="dropdown-search-input"
                placeholder="Search User..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                autoFocus
              />

              <div
                className="dropdown-item select-option"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    user: "",
                  }));

                  setUserSearch("");
                  setShowUserSearch(false);
                }}
              >
                Select User
              </div>

              {filteredUsers.length === 0 ? (
                <div className="dropdown-empty">No users found</div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="dropdown-item"
                    onClick={() => handleSelectUser(user.username)}
                  >
                    {user.username}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* DATE */}

        <div className="floating-field">
          <label>Date</label>

          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
          />
        </div>

        {/* CATEGORY */}

        <div className="floating-field search-field">
          <label>Category</label>

          <div
            className="select-search-box"
            onClick={() => {
              setShowCategorySearch((prev) => !prev);
              setShowUserSearch(false);
            }}
          >
            <span
              className={
                formData.category ? "selected-value" : "placeholder-value"
              }
            >
              {formData.category || "Select Category"}
            </span>

            <span className="select-arrow">▼</span>
          </div>

          {showCategorySearch && (
            <div
              className="search-dropdown"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                className="dropdown-search-input"
                placeholder="Search Category..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                autoFocus
              />

              <div
                className="dropdown-item select-option"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    category: "",
                  }));

                  setCategorySearch("");
                  setShowCategorySearch(false);
                }}
              >
                Select Category
              </div>

              {filteredCategories.length === 0 ? (
                <div className="dropdown-empty">No categories found</div>
              ) : (
                filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="dropdown-item"
                    onClick={() => handleSelectCategory(category.name)}
                  >
                    {category.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* PARTICULAR */}

        <div className="floating-field">
          <label>Particular</label>

          <input
            type="text"
            name="particular"
            value={formData.particular}
            onChange={handleChange}
            placeholder="Enter particular"
          />
        </div>

        {/* AMOUNT */}

        <div className="floating-field">
          <label>Amount</label>

          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0"
            min="0"
          />
        </div>

        {/* GST */}

        <div className="tax-section">
          <label className="check-label">
            <input
              type="checkbox"
              name="gstEnabled"
              checked={formData.gstEnabled}
              onChange={handleChange}
            />

            <span>GST</span>
          </label>

          {formData.gstEnabled && (
            <>
              <div className="small-field">
                <label>GST %</label>

                <input
                  type="number"
                  name="gstPercent"
                  value={formData.gstPercent}
                  onChange={handleChange}
                  placeholder="%"
                  min="0"
                />
              </div>

              <div className="small-field gst-number">
                <label>GST Number</label>

                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  placeholder="GST Number"
                />
              </div>
            </>
          )}
        </div>

        {/* TDS */}

        <div className="tax-section">
          <label className="check-label">
            <input
              type="checkbox"
              name="tdsEnabled"
              checked={formData.tdsEnabled}
              onChange={handleChange}
            />

            <span>TDS</span>
          </label>

          {formData.tdsEnabled && (
            <div className="small-field">
              <label>TDS %</label>

              <input
                type="number"
                name="tdsPercent"
                value={formData.tdsPercent}
                onChange={handleChange}
                placeholder="%"
                min="0"
              />
            </div>
          )}
        </div>

        {/* TOTAL */}

        <div className="floating-field">
          <label>Total</label>

          <input type="number" value={total.toFixed(2)} readOnly />
        </div>

        {/* PAYMENT STATUS */}

        <div className="floating-field">
          <label>Payment Status</label>

          <select
            name="paymentStatus"
            value={formData.paymentStatus}
            onChange={handleChange}
          >
            <option value="">Select Payment Status</option>

            <option value="Installment">Installment</option>

            <option value="Complete">Complete</option>

            <option value="Income Refund">Income Refund</option>
          </select>
        </div>

        {/* DUE DATE - फक्त Installment निवडल्यावर */}

        {formData.paymentStatus === "Installment" && (
          <div className="floating-field">
            <label>Due Date</label>

            <input
              type="date"
              name="dueDate"
              value={formData.dueDate || ""}
              onChange={handleChange}
            />
          </div>
        )}

        {/* AFTER PAYMENT STATUS - फक्त Complete ला Bill Type,
            Payment Method, Bank Account, Transaction ID दिसतात */}

        {formData.paymentStatus === "Complete" && (
          <>
            {/* BILL TYPE */}

            <div className="floating-field">
              <label>Bill Type</label>

              <select
                name="billType"
                value={formData.billType}
                onChange={handleChange}
              >
                <option value="">Select Bill Type</option>

                <option value="Invoice">Invoice</option>

                <option value="Receipt">Receipt</option>
              </select>
            </div>

            {/* PAYMENT METHOD */}

            <div className="floating-field">
              <label>Payment Method</label>

              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
              >
                <option value="">Select Payment Method</option>

                <option value="Cash">Cash</option>

                <option value="Bank">Bank</option>

                <option value="UPI">UPI</option>

                <option value="Card">Card</option>

                <option value="Cheque">Cheque</option>
              </select>
            </div>

            {/* BANK ACCOUNT - Bank/UPI/Card/Cheque ला दिसतो,
                Cash ला नाही */}

            {formData.paymentMethod && formData.paymentMethod !== "Cash" && (
              <div className="floating-field">
                <label>Bank Account</label>

                <select
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleChange}
                >
                  <option value="">Select Bank Account</option>

                  {bankAccounts.map((account) => (
                    <option
                      key={account.id}
                      value={
                        account.accountNumber ||
                        account.accountName ||
                        account.bankName
                      }
                    >
                      {account.bankName || account.accountName || "Bank"}

                      {account.accountNumber
                        ? ` - ${account.accountNumber}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* TRANSACTION ID */}

            {showTransactionId && (
              <div className="floating-field">
                <label>Transaction ID</label>

                <input
                  type="text"
                  name="transactionId"
                  value={formData.transactionId}
                  onChange={handleChange}
                  placeholder="Transaction ID"
                />
              </div>
            )}
          </>
        )}

        {/* NOTES */}

        <div className="floating-field notes-field">
          <label>Notes</label>

          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Enter notes"
          />
        </div>

        {/* BUTTONS */}

        <div className="income-buttons">
          <button type="button" className="cancel-btn" onClick={handleReset}>
            CANCEL
          </button>

          <button type="submit" className="save-btn">
            {editId ? "UPDATE" : "SAVE"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddIncome;
