import {
  apiGetExpenses,
  apiAddExpense,
  apiUpdateExpense,
  apiDeleteExpense,
  apiGetCategories,
  apiAddCategory,
  apiGetContacts,
  apiAddContact,
  apiGetBanks,
  apiAddBank,
  apiAddInstallmentPayment,
} from "./api";

/* =========================================
   PAYMENT METHOD MAP
   ========================================= */

const METHOD_TO_BACKEND = {
  Cash: "CASH",
  Bank: "BANK_TRANSFER",
  UPI: "UPI",
  Card: "CREDIT_CARD",
  Cheque: "CHEQUE",
};

const METHOD_FROM_BACKEND = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank",
  UPI: "UPI",
  CREDIT_CARD: "Card",
  CHEQUE: "Cheque",
};

/* =========================================
   DATE HELPERS
   ========================================= */

const toDateOnly = (value) => String(value || "").slice(0, 10);

const addDaysISO = (dateStr, days) => {
  const date = new Date(dateStr || new Date().toISOString());

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
};

/* =========================================
   INSTALLMENT SCHEDULE BUILDER
   ========================================= */

const buildSchedule = (total, startDate, count = 2) => {
  const safeTotal = Number(total || 0);

  const first = Math.round((safeTotal / count) * 100) / 100;

  const schedule = [];

  let allocated = 0;

  for (let i = 1; i <= count; i += 1) {
    const isLast = i === count;

    const dueAmount = isLast
      ? Math.round((safeTotal - allocated) * 100) / 100
      : first;

    allocated += dueAmount;

    schedule.push({
      installmentNumber: i,
      dueAmount,
      dueDate: addDaysISO(startDate, 30 * i),
    });
  }

  return schedule;
};

/* =========================================
   BACKEND → FRONTEND MAPPING
   ========================================= */

const mapInstallmentToFrontend = (installment) => {
  const payments = installment.payments || [];

  const lastPayment = payments.length ? payments[payments.length - 1] : null;

  return {
    id: installment.id,
    invoiceNo: "INV-" + (installment.installmentNumber || 1),
    amount: Number(installment.dueAmount || 0),
    dueDate: toDateOnly(installment.dueDate),
    paymentDate: lastPayment ? toDateOnly(lastPayment.date) : "",
    remark: lastPayment ? lastPayment.remark || "" : "",
    status: installment.status === "PAID" ? "Completed" : "Pending",
    payMethod: "",
    txnId: "",
  };
};

const mapExpenseToFrontend = (dto) => {
  const amount = Number(dto.amount || 0);

  const gstPercentage = Number(dto.gstPercentage || 0);

  const tdsPercentage = Number(dto.tdsPercentage || 0);

  const gstAmount = Number(
    dto.gstAmount != null ? dto.gstAmount : (amount * gstPercentage) / 100,
  );

  const tdsAmount = Number(
    dto.tdsAmount != null ? dto.tdsAmount : (amount * tdsPercentage) / 100,
  );

  const total = Number(dto.total || amount + gstAmount - tdsAmount);

  const paid = Number(dto.paid || 0);

  const pending =
    dto.pending != null ? Number(dto.pending) : Math.max(total - paid, 0);

  const installments = (dto.installments || []).map(mapInstallmentToFrontend);

  const date = toDateOnly(dto.date);

  /* STATUS: backend enum → frontend label */

  let paymentStatus = "Pending";

  if (dto.paymentStatus === "COMPLETE") {
    paymentStatus = "Complete";
  } else if (dto.paymentStatus === "PARTIAL") {
    paymentStatus = "Partial";
  } else if (dto.paymentType === "INSTALLMENT") {
    paymentStatus = "Installment";
  }

  return {
    id: dto.id,
    type: dto.type === "INCOME" ? "Income" : "Expense",
    date,
    dueDate: installments.length
      ? installments[installments.length - 1].dueDate
      : "",
    user: dto.contact ? dto.contact.name : "",
    category: dto.category ? dto.category.name : "",
    particular: dto.particular || "",
    amount,
    gstEnabled: gstPercentage > 0,
    gstPercent: gstPercentage ? String(gstPercentage) : "",
    gstNumber: String(dto.gstNumberStr || dto.gstNumber || ""),
    tdsEnabled: tdsPercentage > 0,
    tdsPercent: tdsPercentage ? String(tdsPercentage) : "",
    gstAmount,
    tdsAmount,
    total,
    paymentStatus,
    billType: dto.type === "INCOME" ? "Invoice" : "Receipt",
    paymentMethod: METHOD_FROM_BACKEND[dto.paymentMethod] || "",
    bankAccount: "",
    transactionId: "",
    notes: dto.remark || "",
    paid,
    pending,
    createdAt: date ? new Date(date).toISOString() : new Date().toISOString(),
    installments,
  };
};

/* =========================================
   LOAD 
   ========================================= */

export const loadTransactionsFromBackend = async () => {
  const expenses = await apiGetExpenses();

  return (expenses || []).map(mapExpenseToFrontend);
};

/* =========================================
   SETTINGS DATA — AddIncome dropdowns साठी
   ========================================= */

export const loadCategoriesFromBackend = async () => {
  const categories = await apiGetCategories();

  return (categories || []).map((c) => ({ id: c.id, name: c.name }));
};

export const loadContactsFromBackend = async () => {
  const contacts = await apiGetContacts();

  return (contacts || []).map((c) => ({
    id: c.id,
    username: c.name,
    phone: c.phoneNumber || "",
    email: c.email || "",
  }));
};

export const loadBanksFromBackend = async () => {
  const banks = await apiGetBanks();

  return (banks || []).map((b) => ({
    id: b.id,
    bankName: b.name,
    accountNumber: b.accountNumber || "",
    accountType: b.accountType === "CURRENT" ? "Current" : "Savings",
    ifscCode: b.ifsc || "",
    branch: b.branch || "",
  }));
};

/* =========================================
   FIND OR CREATE (नाव → id)
   ========================================= */

export const findOrCreateCategory = async (name) => {
  const clean = String(name || "").trim();

  if (!clean) throw new Error("Category is required");

  const categories = await apiGetCategories();

  const found = (categories || []).find(
    (c) => (c.name || "").toLowerCase() === clean.toLowerCase(),
  );

  if (found) return found.id;

  const created = await apiAddCategory(clean);

  return created.id;
};

export const findOrCreateContact = async (name) => {
  const clean = String(name || "").trim();

  if (!clean) throw new Error("User (contact) is required");

  const contacts = await apiGetContacts();

  const found = (contacts || []).find(
    (c) => (c.name || "").toLowerCase() === clean.toLowerCase(),
  );

  if (found) return found.id;

  const created = await apiAddContact({
    name: clean,
    phoneNumber: "",
    email: "",
  });

  return created.id;
};

export const findOrCreateBank = async (label) => {
  const clean = String(label || "").trim() || "Default Bank";

  const banks = await apiGetBanks();

  const found = (banks || []).find(
    (b) => (b.name || "").toLowerCase() === clean.toLowerCase(),
  );

  if (found) return found.id;

  const created = await apiAddBank({
    name: clean,
    branch: "",
    accountNumber: "",
    ifsc: "",
    accountType: "SAVINGS",
  });

  return created.id;
};

/* =========================================
   SAVE — Add Income form → backend
   ========================================= */

export const saveTransactionToBackend = async (form, editId) => {
  /* 1. CATEGORY / CONTACT / BANK resolve */

  const categoryId = await findOrCreateCategory(form.category);

  const contactId = await findOrCreateContact(form.user);

  const method = METHOD_TO_BACKEND[form.paymentMethod] || "CASH";

  let bankId = null;

  if (method === "BANK_TRANSFER") {
    bankId = await findOrCreateBank(form.bankAccount);
  }

  /* 2. REQUEST BODY build */

  const amount = Number(form.amount || 0);

  const isInstallment = form.paymentStatus === "Installment";

  const total = Number(
    form.total ||
      amount + Number(form.gstAmount || 0) - Number(form.tdsAmount || 0),
  );

  const request = {
    categoryId,
    contactId,
    bankId,

    type: form.type === "Income" ? "INCOME" : "EXPENSE",

    date: toDateOnly(form.date) + "T00:00:00",

    particular: form.particular || "",

    amount,

    gstPercentage: form.gstEnabled ? Number(form.gstPercent || 0) : 0,

    gstNumber: form.gstEnabled ? form.gstNumber || "" : "",

    tdsPercentage: form.tdsEnabled ? Number(form.tdsPercent || 0) : 0,

    paymentType: isInstallment ? "INSTALLMENT" : "ONE_TIME",

    paymentMethod: method,

    remark: form.notes || "",
  };

  /* 3. INSTALLMENT → schedule पाठवा */

  if (isInstallment) {
    const schedule = buildSchedule(total, form.date, 2);

    request.numberOfInstallments = schedule.length;

    request.installments = schedule;
  }

  /* 4. ADD किंवा UPDATE */

  if (editId) {
    return apiUpdateExpense(editId, request);
  }

  return apiAddExpense(request);
};

/* =========================================
   DELETE
   ========================================= */

export const deleteTransactionFromBackend = (id) => apiDeleteExpense(id);

/* =========================================
   INSTALLMENT PAYMENT — List popup
   ========================================= */

export const payInstallmentOnBackend = (installmentId, amount, date, remark) =>
  apiAddInstallmentPayment(installmentId, {
    amount: Number(amount),
    date: toDateOnly(date) || new Date().toISOString().slice(0, 10),
    remark: remark || "",
  });

/* =========================================
   FIRST-RUN DEFAULTS
   ========================================= */

const DEFAULT_CATEGORIES = [
  "Salary",
  "Business",
  "Freelance",
  "Food",
  "Travel",
  "Bills & Utilities",
  "Shopping",
  "Rent",
  "Health",
  "Other",
];

export const ensureDefaultsOnBackend = async () => {
  try {
    const categories = await apiGetCategories();

    if (!categories || categories.length === 0) {
      for (const name of DEFAULT_CATEGORIES) {
        await apiAddCategory(name);
      }
    }

    const contacts = await apiGetContacts();

    if (!contacts || contacts.length === 0) {
      await apiAddContact({
        name: "Self",
        phoneNumber: "",
        email: "",
      });
    }
  } catch (error) {}
};
