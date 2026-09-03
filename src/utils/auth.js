export const AUTH_ENABLED = true;

const REGISTERED_USERS_KEY = "registeredUsers";
const CURRENT_USER_KEY = "currentUser";

/* =========================================
   REGISTERED USERS
   ========================================= */

export const getRegisteredUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(REGISTERED_USERS_KEY)) || [];
  } catch (error) {
    return [];
  }
};

export const saveRegisteredUsers = (users) => {
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
};

// EMAIL ने user शोधा

export const findUserByEmail = (email) => {
  const users = getRegisteredUsers();

  return users.find(
    (user) => user.email.toLowerCase() === String(email).toLowerCase(),
  );
};

/* =========================================
   CURRENT (LOGGED IN) USER
   ========================================= */

export const getCurrentUser = () => {
  try {
    return (
      JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) ||
      JSON.parse(sessionStorage.getItem(CURRENT_USER_KEY)) ||
      null
    );
  } catch (error) {
    return null;
  }
};

/* =========================================
   LOGIN
   ========================================= */

export const loginUser = (user, rememberMe) => {
  // Password session मध्ये साठवू नये

  const sessionUser = {
    name: user.name || "",
    email: user.email,
    mobile: user.mobile || "",
    loginAt: new Date().toISOString(),
  };

  const storage = rememberMe ? localStorage : sessionStorage;

  storage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));

  // TopNavigation इ. लगेच update व्हावेत म्हणून

  window.dispatchEvent(new Event("authUpdated"));
};

/* =========================================
   LOGOUT
   ========================================= */

export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
  sessionStorage.removeItem(CURRENT_USER_KEY);

  // BACKEND JWT TOKEN पण काढा

  localStorage.removeItem("pet_token");

  window.dispatchEvent(new Event("authUpdated"));
};
