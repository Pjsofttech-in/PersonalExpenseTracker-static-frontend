import { useEffect, useState } from "react";
import {
  FaFolder,
  FaUser,
  FaUniversity,
  FaEdit,
  FaTrash,
  FaPlus,
  FaTimes,
} from "react-icons/fa";

import {
  loadCategoriesFromBackend,
  loadContactsFromBackend,
  loadBanksFromBackend,
} from "../utils/backendData";
import {
  apiAddCategory,
  apiDeleteCategory,
  apiAddContact,
  apiUpdateContact,
  apiDeleteContact,
  apiAddBank,
  apiDeleteBank,
} from "../utils/api";

import "../css/Settings.css";

function Settings() {
  const [activeTab, setActiveTab] = useState("categories");

  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  const [searchCategory, setSearchCategory] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchBank, setSearchBank] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({});

  // ==============================
  // LOAD DATA (BACKEND)
  // ==============================

  const loadAll = async () => {
    try {
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

  useEffect(() => {
    loadAll();
  }, []);

  // ==============================
  // FORM CHANGE
  // ==============================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==============================
  // OPEN ADD FORM
  // ==============================

  const openAddForm = () => {
    setEditId(null);

    if (activeTab === "categories") {
      setFormData({
        name: "",
      });
    }

    if (activeTab === "users") {
      setFormData({
        username: "",
        phone: "",
        email: "",
      });
    }

    if (activeTab === "bankAccounts") {
      setFormData({
        bankName: "",
        accountName: "",
        accountNumber: "",
        accountType: "",
        ifscCode: "",
        branch: "",
      });
    }

    setShowForm(true);
  };

  // ==============================
  // OPEN EDIT FORM
  // ==============================

  const openEditForm = (item) => {
    setEditId(item.id);
    setFormData(item);
    setShowForm(true);
  };

  // ==============================
  // SAVE (BACKEND)
  // ==============================

  const handleSave = async () => {
    // CATEGORY — validation

    if (activeTab === "categories") {
      if (!formData.name?.trim()) {
        alert("Please enter category name");
        return;
      }
    }

    // USER — validation

    if (activeTab === "users") {
      if (!formData.username?.trim()) {
        alert("Please enter username");
        return;
      }

      if (!formData.phone?.trim()) {
        alert("Please enter phone number");
        return;
      }

      if (!formData.email?.trim()) {
        alert("Please enter email");
        return;
      }
    }

    // BANK ACCOUNT — validation

    if (activeTab === "bankAccounts") {
      if (!formData.bankName?.trim()) {
        alert("Please enter bank name");
        return;
      }

      if (!formData.accountName?.trim()) {
        alert("Please enter account holder name");
        return;
      }

      if (!formData.accountNumber?.trim()) {
        alert("Please enter account number");
        return;
      }

      if (!formData.accountType) {
        alert("Please select account type");
        return;
      }

      if (!formData.ifscCode?.trim()) {
        alert("Please enter IFSC code");
        return;
      }
    }

    /* BACKEND API CALLS */

    try {
      // CATEGORY (backend मध्ये PUT नाही — edit =
      // delete + पुन्हा add)

      if (activeTab === "categories") {
        if (editId) {
          await apiDeleteCategory(editId);
        }

        await apiAddCategory(formData.name.trim());
      }

      // USER / CONTACT (PUT आहे)

      if (activeTab === "users") {
        const payload = {
          name: formData.username.trim(),
          phoneNumber: formData.phone.trim(),
          email: formData.email.trim(),
        };

        if (editId) {
          await apiUpdateContact(editId, payload);
        } else {
          await apiAddContact(payload);
        }
      }

      // BANK ACCOUNT (backend मध्ये PUT नाही — edit =
      // delete + पुन्हा add; accountType → enum)

      if (activeTab === "bankAccounts") {
        const payload = {
          name: formData.bankName.trim(),
          branch: formData.branch?.trim() || "",
          accountNumber: formData.accountNumber.trim(),
          ifsc: formData.ifscCode.trim(),
          accountType:
            formData.accountType === "Current" ? "CURRENT" : "SAVINGS",
        };

        if (editId) {
          await apiDeleteBank(editId);
        }

        await apiAddBank(payload);
      }

      // BACKEND वरून पुन्हा load

      await loadAll();

      setShowForm(false);
      setEditId(null);
      setFormData({});
    } catch (error) {
      alert(error.message || "Save failed. Is the backend running?");
    }
  };

  // ==============================
  // DELETE (BACKEND)
  // ==============================

  const deleteItem = async (id, type) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this item?",
    );

    if (!confirmDelete) return;

    try {
      if (type === "category") {
        await apiDeleteCategory(id);
      }

      if (type === "user") {
        await apiDeleteContact(id);
      }

      if (type === "bank") {
        await apiDeleteBank(id);
      }

      // BACKEND वरून पुन्हा load

      await loadAll();
    } catch (error) {
      alert(
        error.message ||
          "Delete failed. (Category/Bank transaction मध्ये वापरलेली असेल तर delete होत नाही)",
      );
    }
  };

  // ==============================
  // FILTER
  // ==============================

  const filteredCategories = categories.filter((item) =>
    item.name?.toLowerCase().includes(searchCategory.toLowerCase()),
  );

  const filteredUsers = users.filter((item) =>
    item.username?.toLowerCase().includes(searchUser.toLowerCase()),
  );

  const filteredBanks = bankAccounts.filter(
    (item) =>
      item.bankName?.toLowerCase().includes(searchBank.toLowerCase()) ||
      item.accountName?.toLowerCase().includes(searchBank.toLowerCase()),
  );

  // ==============================
  // FORM TITLE
  // ==============================

  const getFormTitle = () => {
    if (activeTab === "categories") {
      return editId ? "Edit Category" : "Add Category";
    }

    if (activeTab === "users") {
      return editId ? "Edit User" : "Add User";
    }

    return editId ? "Edit Bank Account" : "Add Bank Account";
  };

  return (
    <div className="settings-page">
      <div className="settings-content">
        {/* LEFT SETTINGS MENU */}

        <div className="settings-menu">
          <button
            className={activeTab === "categories" ? "menu-active" : ""}
            onClick={() => setActiveTab("categories")}
          >
            <FaFolder />
            <span>Category</span>
          </button>

          <button
            className={activeTab === "users" ? "menu-active" : ""}
            onClick={() => setActiveTab("users")}
          >
            <FaUser />
            <span>User</span>
          </button>

          <button
            className={activeTab === "bankAccounts" ? "menu-active" : ""}
            onClick={() => setActiveTab("bankAccounts")}
          >
            <FaUniversity />
            <span>Bank Account</span>
          </button>
        </div>

        {/* MAIN CONTENT */}

        <div className="settings-main">
          {/* CATEGORY */}

          {activeTab === "categories" && (
            <div className="settings-section">
              <div className="section-top">
                <div>
                  <h2>Categories</h2>
                  <p>Manage your income and expense categories</p>
                </div>
              </div>

              <div className="search-total">
                <input
                  type="text"
                  placeholder="Search Category"
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                />

                <div className="total-badge">
                  Total Categories: {categories.length}
                </div>

                <button className="add-btn" onClick={openAddForm}>
                  <FaPlus />
                  ADD CATEGORY
                </button>
              </div>

              <div className="settings-table">
                <div className="table-head category-grid">
                  <span>ID</span>
                  <span>Category Name</span>
                  <span>Actions</span>
                </div>

                {filteredCategories.length === 0 ? (
                  <div className="empty-row">No categories found</div>
                ) : (
                  filteredCategories.map((item) => (
                    <div className="table-data category-grid" key={item.id}>
                      <span>{item.id}</span>

                      <span
                        onDoubleClick={() => openEditForm(item)}
                        title="Double click to edit"
                        style={{ cursor: "pointer" }}
                      >
                        {item.name}
                      </span>

                      <span className="actions">
                        <FaEdit
                          className="edit-icon"
                          title="Edit category"
                          onClick={() => openEditForm(item)}
                        />

                        <FaTrash
                          className="delete-icon"
                          title="Delete category"
                          onClick={() => deleteItem(item.id, "category")}
                        />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* USERS */}

          {activeTab === "users" && (
            <div className="settings-section">
              <div className="section-top">
                <div>
                  <h2>Users</h2>
                  <p>Manage users for your transactions</p>
                </div>
              </div>

              <div className="search-total">
                <input
                  type="text"
                  placeholder="Search User"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                />

                <div className="total-badge">Total Users: {users.length}</div>

                <button className="add-btn" onClick={openAddForm}>
                  <FaPlus />
                  ADD USER
                </button>
              </div>

              <div className="settings-table">
                <div className="table-head user-grid">
                  <span>ID</span>
                  <span>Username</span>
                  <span>Phone Number</span>
                  <span>Email</span>
                  <span>Actions</span>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="empty-row">No users found</div>
                ) : (
                  filteredUsers.map((item) => (
                    <div className="table-data user-grid" key={item.id}>
                      <span>{item.id}</span>

                      <span
                        onDoubleClick={() => openEditForm(item)}
                        title="Double click to edit"
                        style={{ cursor: "pointer" }}
                      >
                        {item.username}
                      </span>

                      <span>{item.phone}</span>
                      <span>{item.email}</span>

                      <span className="actions">
                        <FaEdit
                          className="edit-icon"
                          title="Edit user"
                          onClick={() => openEditForm(item)}
                        />

                        <FaTrash
                          className="delete-icon"
                          title="Delete user"
                          onClick={() => deleteItem(item.id, "user")}
                        />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* BANK ACCOUNTS */}

          {activeTab === "bankAccounts" && (
            <div className="settings-section">
              <div className="section-top">
                <div>
                  <h2>Bank Accounts</h2>
                  <p>Manage your bank accounts for payments</p>
                </div>
              </div>

              <div className="search-total">
                <input
                  type="text"
                  placeholder="Search Bank Account"
                  value={searchBank}
                  onChange={(e) => setSearchBank(e.target.value)}
                />

                <div className="total-badge">
                  Total Accounts: {bankAccounts.length}
                </div>

                <button className="add-btn" onClick={openAddForm}>
                  <FaPlus />
                  ADD BANK ACCOUNT
                </button>
              </div>

              <div className="settings-table">
                <div className="table-head bank-grid">
                  <span>ID</span>
                  <span>Bank Name</span>
                  <span>Account Holder</span>
                  <span>Account Number</span>
                  <span>Account Type</span>
                  <span>IFSC</span>
                  <span>Actions</span>
                </div>

                {filteredBanks.length === 0 ? (
                  <div className="empty-row">No bank accounts found</div>
                ) : (
                  filteredBanks.map((item) => (
                    <div className="table-data bank-grid" key={item.id}>
                      <span>{item.id}</span>

                      <span
                        onDoubleClick={() => openEditForm(item)}
                        title="Double click to edit"
                        style={{ cursor: "pointer" }}
                      >
                        {item.bankName}
                      </span>

                      <span>{item.accountName}</span>

                      <span>
                        ****
                        {item.accountNumber?.slice(-4)}
                      </span>

                      <span>{item.accountType}</span>

                      <span>{item.ifscCode}</span>

                      <span className="actions">
                        <FaEdit
                          className="edit-icon"
                          title="Edit bank account"
                          onClick={() => openEditForm(item)}
                        />

                        <FaTrash
                          className="delete-icon"
                          title="Delete bank account"
                          onClick={() => deleteItem(item.id, "bank")}
                        />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* POPUP FORM */}

      {showForm && (
        <div className="settings-overlay">
          <div className="settings-modal">
            <div className="modal-header">
              <h2>{getFormTitle()}</h2>

              <button
                className="close-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setFormData({});
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* CATEGORY FORM */}

            {activeTab === "categories" && (
              <div className="modal-form">
                <label>Category Name *</label>

                <input
                  type="text"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  placeholder="Enter category name"
                />
              </div>
            )}

            {/* USER FORM */}

            {activeTab === "users" && (
              <div className="modal-form">
                <label>Username *</label>

                <input
                  type="text"
                  name="username"
                  value={formData.username || ""}
                  onChange={handleChange}
                  placeholder="Enter username"
                />

                <label>Phone Number *</label>

                <input
                  type="text"
                  name="phone"
                  value={formData.phone || ""}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />

                <label>Email *</label>

                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  placeholder="Enter email address"
                />
              </div>
            )}

            {/* BANK FORM */}

            {activeTab === "bankAccounts" && (
              <div className="modal-form bank-form">
                <label>Bank Name *</label>

                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName || ""}
                  onChange={handleChange}
                  placeholder="Enter bank name"
                />

                <label>Account Holder Name *</label>

                <input
                  type="text"
                  name="accountName"
                  value={formData.accountName || ""}
                  onChange={handleChange}
                  placeholder="Enter account holder name"
                />

                <label>Account Number *</label>

                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber || ""}
                  onChange={handleChange}
                  placeholder="Enter account number"
                />

                <label>Account Type *</label>

                <select
                  name="accountType"
                  value={formData.accountType || ""}
                  onChange={handleChange}
                >
                  <option value="">Select Account Type</option>

                  <option value="Savings">Savings</option>

                  <option value="Current">Current</option>

                  <option value="Salary">Salary</option>

                  <option value="Other">Other</option>
                </select>

                <label>IFSC Code *</label>

                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode || ""}
                  onChange={handleChange}
                  placeholder="Enter IFSC code"
                />

                <label>Branch</label>

                <input
                  type="text"
                  name="branch"
                  value={formData.branch || ""}
                  onChange={handleChange}
                  placeholder="Enter branch name"
                />
              </div>
            )}

            <div className="modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setFormData({});
                }}
              >
                CANCEL
              </button>

              <button className="save-btn" onClick={handleSave}>
                {editId ? "UPDATE" : "SAVE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
