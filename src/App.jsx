import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import TopNavigation from "./components/navigation/TopNavigation";

import { getCurrentUser, AUTH_ENABLED } from "./utils/auth";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AddIncome from "./pages/income/AddIncome";
import Settings from "./pages/Settings";
import List from "./pages/List";
import Assets from "./pages/Assets";

/* =========================================
   AUTH GUARDS
   ========================================= */

// PRIVATE ROUTE — login नसेल तर /login वर पाठवते

function PrivateRoute({ children }) {
  if (!AUTH_ENABLED) {
    return children;
  }

  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// PUBLIC ONLY — login असेल तर /login, /register वरून dashboard वर पाठवते

function PublicOnlyRoute({ children }) {
  const currentUser = getCurrentUser();

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/* =========================================
   NAVIGATION — login / register वर लपवते
   ========================================= */

function ConditionalNavigation() {
  const location = useLocation();

  const hideNavigation =
    location.pathname === "/login" || location.pathname === "/register";

  if (hideNavigation) {
    return null;
  }

  return <TopNavigation />;
}

/* =========================================
   APP
   ========================================= */

function App() {
  return (
    <BrowserRouter>
      <ConditionalNavigation />

      <Routes>
        {/* PUBLIC — login असेल तर dashboard वर */}

        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />

        {/* PRIVATE — login नंतरच */}

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/income/add"
          element={
            <PrivateRoute>
              <AddIncome />
            </PrivateRoute>
          }
        />

        <Route
          path="/list"
          element={
            <PrivateRoute>
              <List />
            </PrivateRoute>
          }
        />
        <Route
          path="/assets"
          element={
            <PrivateRoute>
              <Assets />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />

        {/* OLD ROUTE — RecentTransactions चे edit बटण इथे जात होतं (आता fix आहे) */}

        <Route
          path="/add-income"
          element={<Navigate to="/income/add" replace />}
        />

        {/* REST — dashboard वर पाठवा */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
