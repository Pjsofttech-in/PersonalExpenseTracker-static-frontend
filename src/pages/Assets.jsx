import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaTimes, FaChartLine } from "react-icons/fa";

import {
  apiGetAssets,
  apiAddAsset,
  apiUpdateAsset,
  apiUpdateAssetValue,
  apiDeleteAsset,
  apiAddAssetCategory,
  apiGetContacts,
  apiGetBanks,
} from "../utils/api";

import Liabilities from "./Liabilities";

import "../css/Settings.css";
import "../css/Assets.css";

/* =========================================
   ASSETS PAGE — real backend (/api/assets)
   ========================================= */

const ASSET_TYPES = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_ACCOUNT", label: "Bank Account" },
  { value: "GOLD", label: "Gold" },
  { value: "SILVER", label: "Silver" },
  { value: "STOCK", label: "Stock / Shares" },
  { value: "MUTUAL_FUND", label: "Mutual Fund" },
  { value: "FIXED_DEPOSIT", label: "Fixed Deposit (FD)" },
  { value: "PROPERTY", label: "Property" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "ELECTRONICS", label: "Electronics" },
  { value: "BUSINESS", label: "Business" },
  { value: "OTHER", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CREDIT_CARD", label: "Credit Card" },
];

/* Asset categories — backend मध्ये GET endpoint नाही,
   म्हणून आपण तयार केलेल्या categories localStorage मध्ये cache करतो */

const ASSET_CATEGORY_KEY = "pet_asset_categories";

const typeLabel = (value) => {
  const found = ASSET_TYPES.find((item) => item.value === value);

  return found ? found.label : value || "-";
};

const paymentLabel = (value) => {
  const found = PAYMENT_METHODS.find((item) => item.value === value);

  return found ? found.label : value || "-";
};

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

// DATE FORMAT (dd-mm-yyyy)

const fmtDate = (d) => {
  if (!d) return "-";

  const p = String(d).split("-");

  if (p.length !== 3) return d;

  return `${p[2]}-${p[1]}-${p[0]}`;
};

function Assets() {
  const [assets, setAssets] = useState([]);

  const [contacts, setContacts] = useState([]);

  const [banks, setBanks] = useState([]);

  const [assetCategories, setAssetCategories] = useState([]);

  const [search, setSearch] = useState("");

  // formMode: ADD / EDIT / VALUE (valuation update)

  const [showForm, setShowForm] = useState(false);

  const [formMode, setFormMode] = useState("ADD");

  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({});

  const [newValue, setNewValue] = useState("");

  const [error, setError] = useState("");

  /* TAB — Assets | Liabilities (Investment page) */

  const [activeTab, setActiveTab] = useState("ASSETS");

  /* =========================================
     LOAD DATA (BACKEND)
     ========================================= */

  const loadCategoriesCache = () => {
    try {
      return JSON.parse(localStorage.getItem(ASSET_CATEGORY_KEY)) || [];
    } catch (e) {
      return [];
    }
  };

  const loadAll = async () => {
    try {
      const [assetList, contactList, bankList] = await Promise.all([
        apiGetAssets(),
        apiGetContacts(),
        apiGetBanks(),
      ]);

      setAssets(Array.isArray(assetList) ? assetList : []);

      setContacts(Array.isArray(contactList) ? contactList : []);

      setBanks(Array.isArray(bankList) ? bankList : []);

      setAssetCategories(loadCategoriesCache());
    } catch (error) {
      setAssets([]);
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
     CATEGORY HELPERS (cache + create)
     ========================================= */

  const saveCategoriesCache = (list) => {
    localStorage.setItem(ASSET_CATEGORY_KEY, JSON.stringify(list));

    setAssetCategories(list);
  };

  const getOrCreateCategoryId = async (name) => {
    const trimmed = name.trim();

    const cached = loadCategoriesCache().find(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (cached) {
      return cached.id;
    }

    /* नवीन category — backend वर create + cache */

    const created = await apiAddAssetCategory(trimmed);

    saveCategoriesCache([...loadCategoriesCache(), created]);

    return created.id;
  };

  const categoryName = (id) => {
    const found = assetCategories.find((item) => item.id === id);

    return found ? found.name : "-";
  };

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
      category: "",
      contactId: "",
      purchaseValue: "",
      currentValue: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      paymentMethod: "",
      bankId: "",
      description: "",
      remark: "",
    });

    setShowForm(true);
  };

  const openEditForm = (asset) => {
    setFormMode("EDIT");

    setEditId(asset.id);

    setError("");

    setFormData({
      name: asset.name || "",
      type: asset.type || "",
      category: categoryName(asset.assetCategoryId),
      contactId: asset.contactId ? String(asset.contactId) : "",
      purchaseValue: asset.purchaseValue || "",
      currentValue: asset.currentValue || "",
      purchaseDate: asset.purchaseDate || "",
      paymentMethod: asset.paymentMethod || "",
      bankId: asset.bankId ? String(asset.bankId) : "",
      description: asset.description || "",
      remark: "",
    });

    setShowForm(true);
  };

  const openValueForm = (asset) => {
    setFormMode("VALUE");

    setEditId(asset.id);

    setError("");

    setNewValue(asset.currentValue ? String(asset.currentValue) : "");

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);

    setEditId(null);

    setFormData({});

    setError("");
  };

  /* =========================================
     SAVE (ADD / EDIT)
     ========================================= */

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      setError("Please enter asset name.");
      return;
    }

    if (!formData.type) {
      setError("Please select asset type.");
      return;
    }

    if (!formData.category?.trim()) {
      setError("Please enter asset category.");
      return;
    }

    if (!formData.contactId) {
      setError("Please select user (contact).");
      return;
    }

    if (!formData.purchaseValue || Number(formData.purchaseValue) <= 0) {
      setError("Purchase value must be greater than 0.");
      return;
    }

    if (!formData.purchaseDate) {
      setError("Please select purchase date.");
      return;
    }

    if (!formData.paymentMethod) {
      setError("Please select payment method.");
      return;
    }

    setError("");

    try {
      /* Category — cache मध्ये असेल तर तीच, नाहीतर नवीन create */

      const categoryId = await getOrCreateCategoryId(formData.category);

      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        assetCategoryId: categoryId,
        contactId: Number(formData.contactId),
        description: formData.description?.trim() || null,
        purchaseValue: Number(formData.purchaseValue),
        currentValue: formData.currentValue
          ? Number(formData.currentValue)
          : null,
        purchaseDate: formData.purchaseDate,
        paymentMethod: formData.paymentMethod,
        bankId:
          formData.paymentMethod === "BANK_TRANSFER" && formData.bankId
            ? Number(formData.bankId)
            : null,
        remark: formData.remark?.trim() || null,
      };

      if (formMode === "EDIT" && editId) {
        await apiUpdateAsset(editId, payload);
      } else {
        await apiAddAsset(payload);
      }

      await loadAll();

      closeForm();

      /* Dashboard chart + List (auto purchase expense) refresh */

      window.dispatchEvent(new Event("assetUpdated"));

      window.dispatchEvent(new Event("transactionUpdated"));
    } catch (error) {
      setError(error.message || "Save failed. Is the backend running?");
    }
  };

  /* =========================================
     VALUATION UPDATE (current value)
     ========================================= */

  const handleValueSave = async () => {
    if (newValue === "" || Number(newValue) < 0) {
      setError("Please enter a valid current value.");
      return;
    }

    setError("");

    try {
      await apiUpdateAssetValue(editId, Number(newValue));

      await loadAll();

      closeForm();

      window.dispatchEvent(new Event("assetUpdated"));
    } catch (error) {
      setError(error.message || "Update failed. Is the backend running?");
    }
  };

  /* =========================================
     DELETE
     ========================================= */

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this asset?",
    );

    if (!confirmDelete) return;

    try {
      await apiDeleteAsset(id);

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

  const filteredAssets = assets.filter(
    (item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      typeLabel(item.type).toLowerCase().includes(search.toLowerCase()),
  );

  const totalPurchase = assets.reduce(
    (sum, item) => sum + Number(item.purchaseValue || 0),
    0,
  );

  const totalCurrent = assets.reduce(
    (sum, item) => sum + Number(item.currentValue || 0),
    0,
  );

  const gainLoss = totalCurrent - totalPurchase;

  /* =========================================
     RETURN
     ========================================= */

  return (
    <div className="settings-page">
      <div className="settings-content assets-only">
        {/* TABS — Assets | Liabilities */}

        <div className="invest-tabs">
          <button
            className={
              activeTab === "ASSETS" ? "invest-tab active" : "invest-tab"
            }
            onClick={() => setActiveTab("ASSETS")}
          >
            Assets
          </button>

          <button
            className={
              activeTab === "LIABILITIES" ? "invest-tab active" : "invest-tab"
            }
            onClick={() => setActiveTab("LIABILITIES")}
          >
            Liabilities
          </button>
        </div>

        {activeTab === "ASSETS" ? (
          <div className="settings-section">
            <div className="search-total">
              <input
                type="text"
                placeholder="Search Asset"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="total-badge">
                Total Purchase: {formatAmount(totalPurchase)}
              </div>

              <div className="total-badge">
                Total Current: {formatAmount(totalCurrent)}
              </div>

              <div className={gainLoss >= 0 ? "total-badge" : "total-badge"}>
                {gainLoss >= 0 ? "Gain" : "Loss"}:{" "}
                {formatAmount(Math.abs(gainLoss))}
              </div>

              <button className="add-btn" onClick={openAddForm}>
                <FaPlus />
                ADD ASSET
              </button>
            </div>

            <div className="settings-table">
              <div className="table-head asset-grid">
                <span>ID</span>
                <span>Asset Name</span>
                <span>Type</span>
                <span>Category</span>
                <span>Purchase Value</span>
                <span>Current Value</span>
                <span>Purchase Date</span>
                <span>Payment</span>
                <span>Actions</span>
              </div>

              {filteredAssets.length === 0 ? (
                <div className="empty-row">No assets found</div>
              ) : (
                filteredAssets.map((item) => (
                  <div className="table-data asset-grid" key={item.id}>
                    <span>{item.id}</span>

                    <span
                      onDoubleClick={() => openEditForm(item)}
                      title="Double click to edit"
                      style={{ cursor: "pointer" }}
                    >
                      {item.name}
                    </span>

                    <span>{typeLabel(item.type)}</span>

                    <span>{categoryName(item.assetCategoryId)}</span>

                    <span>{formatAmount(item.purchaseValue)}</span>

                    <span
                      className={
                        Number(item.currentValue || 0) >=
                        Number(item.purchaseValue || 0)
                          ? "asset-value-up"
                          : "asset-value-down"
                      }
                    >
                      {formatAmount(item.currentValue)}
                    </span>

                    <span>{fmtDate(item.purchaseDate)}</span>

                    <span>{paymentLabel(item.paymentMethod)}</span>

                    <span className="actions">
                      <FaChartLine
                        className="edit-icon"
                        title="Update current value"
                        onClick={() => openValueForm(item)}
                      />

                      <FaEdit
                        className="edit-icon"
                        title="Edit asset"
                        onClick={() => openEditForm(item)}
                      />

                      <FaTrash
                        className="delete-icon"
                        title="Delete asset"
                        onClick={() => handleDelete(item.id)}
                      />
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <Liabilities />
        )}
      </div>

      {/* POPUP FORM */}

      {showForm && (
        <div className="settings-overlay">
          <div className="settings-modal">
            <div className="modal-header">
              <h2>
                {formMode === "ADD"
                  ? "Add Asset"
                  : formMode === "EDIT"
                    ? "Edit Asset"
                    : "Update Current Value"}
              </h2>

              <button className="close-btn" onClick={closeForm}>
                <FaTimes />
              </button>
            </div>

            {error && <div className="modal-error">{error}</div>}

            {/* VALUE MODE — फक्त current value */}

            {formMode === "VALUE" ? (
              <div className="modal-form">
                <label>New Current Value *</label>

                <input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter current value"
                  min="0"
                />
              </div>
            ) : (
              <div className="modal-form">
                <label>Asset Name *</label>

                <input
                  type="text"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  placeholder="e.g. Gold Necklace / Office Laptop"
                />

                <label>Asset Type *</label>

                <select
                  name="type"
                  value={formData.type || ""}
                  onChange={handleChange}
                >
                  <option value="">Select Asset Type</option>

                  {ASSET_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <label>
                  Asset Category *{" "}
                  <small>(नवीन नाव लिहिले तर auto-create होईल)</small>
                </label>

                <input
                  type="text"
                  name="category"
                  value={formData.category || ""}
                  onChange={handleChange}
                  placeholder="e.g. Jewellery / Office Equipment"
                  list="asset-category-list"
                />

                <datalist id="asset-category-list">
                  {assetCategories.map((item) => (
                    <option key={item.id} value={item.name} />
                  ))}
                </datalist>

                <label>User (Contact) *</label>

                <select
                  name="contactId"
                  value={formData.contactId || ""}
                  onChange={handleChange}
                >
                  <option value="">Select User</option>

                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.username || contact.name}
                    </option>
                  ))}
                </select>

                <label>Purchase Value (₹) *</label>

                <input
                  type="number"
                  name="purchaseValue"
                  value={formData.purchaseValue || ""}
                  onChange={handleChange}
                  placeholder="Enter purchase value"
                  min="1"
                />

                <label>Current Value (₹)</label>

                <input
                  type="number"
                  name="currentValue"
                  value={formData.currentValue || ""}
                  onChange={handleChange}
                  placeholder="Blank = purchase value"
                  min="0"
                />

                <label>Purchase Date *</label>

                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate || ""}
                  onChange={handleChange}
                />

                <label>Payment Method *</label>

                <select
                  name="paymentMethod"
                  value={formData.paymentMethod || ""}
                  onChange={handleChange}
                >
                  <option value="">Select Payment Method</option>

                  {PAYMENT_METHODS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                {formData.paymentMethod === "BANK_TRANSFER" && (
                  <>
                    <label>Bank Account</label>

                    <select
                      name="bankId"
                      value={formData.bankId || ""}
                      onChange={handleChange}
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

                <label>Description</label>

                <input
                  type="text"
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  placeholder="Enter description"
                />

                <label>Remark</label>

                <input
                  type="text"
                  name="remark"
                  value={formData.remark || ""}
                  onChange={handleChange}
                  placeholder="Enter remark"
                />
              </div>
            )}

            <div className="modal-buttons">
              <button className="cancel-btn" onClick={closeForm}>
                CANCEL
              </button>

              <button
                className="save-btn"
                onClick={formMode === "VALUE" ? handleValueSave : handleSave}
              >
                {formMode === "EDIT" ? "UPDATE" : "SAVE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Assets;
