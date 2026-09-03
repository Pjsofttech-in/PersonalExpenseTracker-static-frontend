const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const TOKEN_KEY = "pet_token";

/* =========================================
   TOKEN HELPERS
   ========================================= */

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/* =========================================
   CORE REQUEST WRAPPER
   ========================================= */

const request = async (path, { method = "GET", body, auth = true } = {}) => {
  const headers = { "Content-Type": "application/json" };

  if (auth && getToken()) {
    headers["Authorization"] = "Bearer " + getToken();
  }

  /* BACKEND चालू नसेल तर fetch लगेच fail होतो */

  let response;

  try {
    response = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error(
      "Cannot reach the backend. Is Spring Boot running on port 8080?",
    );
  }

  /* ERROR HANDLING */

  if (!response.ok) {
    let message = "Something went wrong (status " + response.status + ")";

    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch (error) {
      /* body JSON नाही — default message वापर */
    }

    /* TOKEN EXPIRED / INVALID → logout */

    if (response.status === 401 || response.status === 403) {
      clearToken();
      window.dispatchEvent(new Event("authUpdated"));
    }

    throw new Error(message);
  }

  /* काही responses (DELETE) चा body रिकामा असतो */

  const text = await response.text();

  return text ? JSON.parse(text) : null;
};

/* =========================================
   AUTH API
   ========================================= */

/* REGISTER — body:
   { name, phoneNumber (10 digits), email, password } */

export const apiRegister = ({ name, phoneNumber, email, password }) =>
  request("/pjsofttech_welcome/register", {
    method: "POST",
    body: { name, phoneNumber, email, password },
    auth: false,
  });

export const apiLogin = async (email, password) => {
  const response = await fetch(BASE_URL + "/pjsofttech_welcome/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid email or password");
  }

  const token = (await response.text()).replace(/^"|"$/g, "").trim();

  localStorage.setItem(TOKEN_KEY, token);

  return token;
};

/* =========================================
   CATEGORIES API 
   ========================================= */

export const apiGetCategories = () => request("/pjsofttech/category");

export const apiAddCategory = (name) =>
  request("/pjsofttech/category", {
    method: "POST",
    body: { name },
  });

export const apiDeleteCategory = (id) =>
  request("/pjsofttech/category/" + id, { method: "DELETE" });

/* =========================================
   CONTACTS API
   ========================================= */

export const apiGetContacts = () => request("/pjsofttech/user/users");

export const apiAddContact = ({ name, phoneNumber, email }) =>
  request("/pjsofttech/user", {
    method: "POST",
    body: { name, phoneNumber, email },
  });

/* =========================================
   BANKS API 
   ========================================= */

export const apiGetBanks = () => request("/pjsofttech/bank");

export const apiAddBank = (bank) =>
  request("/pjsofttech/bank", { method: "POST", body: bank });

export const apiDeleteBank = (id) =>
  request("/pjsofttech/bank/" + id, { method: "DELETE" });

/* =========================================
   CONTACT UPDATE / DELETE
   ========================================= */

export const apiUpdateContact = (id, { name, phoneNumber, email }) =>
  request("/pjsofttech/user/" + id, {
    method: "PUT",
    body: { name, phoneNumber, email },
  });

export const apiDeleteContact = (id) =>
  request("/pjsofttech/user/" + id, { method: "DELETE" });

/* =========================================
   EXPENSES (TRANSACTIONS) API
   ========================================= */

export const apiGetExpenses = () => request("/pjsofttech/expense/expenses");

export const apiAddExpense = (expense) =>
  request("/pjsofttech/expense", { method: "POST", body: expense });

export const apiUpdateExpense = (id, expense) =>
  request("/pjsofttech/expense/" + id, { method: "PUT", body: expense });

export const apiDeleteExpense = (id) =>
  request("/pjsofttech/expense/" + id, { method: "DELETE" });

/* INSTALLMENT PAYMENT (List popup वाला) */

export const apiAddInstallmentPayment = (installmentId, payment) =>
  request("/pjsofttech/expense/installment/" + installmentId + "/payment", {
    method: "POST",
    body: payment,
  });

/* =========================================
   ASSETS API — /api/assets
   (नवीन backend — real Asset tracking)
   ========================================= */

export const apiGetAssets = () => request("/api/assets");

export const apiAddAsset = (asset) =>
  request("/api/assets", { method: "POST", body: asset });

export const apiUpdateAsset = (id, asset) =>
  request("/api/assets/" + id, { method: "PUT", body: asset });

export const apiUpdateAssetValue = (id, currentValue) =>
  request("/api/assets/" + id + "/valuation?currentValue=" + currentValue, {
    method: "PUT",
  });

export const apiDeleteAsset = (id) =>
  request("/api/assets/" + id, { method: "DELETE" });

/* ASSET CATEGORY — POST /api/assets/assets-category */

export const apiAddAssetCategory = (name) =>
  request("/api/assets/assets-category", { method: "POST", body: { name } });

/* =========================================
   LIABILITIES API — /api/liabilities
   (नवीन backend — real Liability tracking)
   ========================================= */

export const apiGetLiabilities = () => request("/api/liabilities");

export const apiAddLiability = (liability) =>
  request("/api/liabilities", { method: "POST", body: liability });

export const apiUpdateLiability = (id, liability) =>
  request("/api/liabilities/" + id, { method: "PUT", body: liability });

export const apiPayLiability = (id, payment) =>
  request("/api/liabilities/" + id + "/payments", {
    method: "POST",
    body: payment,
  });

export const apiCancelLiability = (id) =>
  request("/api/liabilities/" + id + "/cancel", { method: "PUT" });

export const apiDeleteLiability = (id) =>
  request("/api/liabilities/" + id, { method: "DELETE" });
