import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt, FaSignInAlt } from "react-icons/fa";

import { getCurrentUser, logoutUser, AUTH_ENABLED } from "../../utils/auth";

import "../../css/TopNavigation.css";

function TopNavigation() {
  const navigate = useNavigate();

  // CURRENT USER (login / logout वर update होते)

  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const syncUser = () => {
      setCurrentUser(getCurrentUser());
    };

    window.addEventListener("authUpdated", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("authUpdated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  // LOGOUT

  const handleLogout = () => {
    logoutUser();

    navigate("/login");
  };

  // NAV LINKS — AUTH_ENABLED false असताना
  // login नसलं तरी दिसतात

  const showNavLinks = AUTH_ENABLED ? Boolean(currentUser) : true;

  // RETURN

  return (
    <div className="top-navigation">
      {/* NAV LINKS */}

      {showNavLinks && (
        <div className="nav-links">
          <NavLink to="/" className="nav-button">
            Dashboard
          </NavLink>

          <NavLink to="/income/add" className="nav-button">
            Add Income/Expense
          </NavLink>

          <NavLink to="/list" className="nav-button">
            List
          </NavLink>

          <NavLink to="/assets" className="nav-button">
            Investment
          </NavLink>

          <NavLink to="/settings" className="nav-button">
            Settings
          </NavLink>
        </div>
      )}

      {/* RIGHT SIDE — user badge + logout / login */}

      <div className="nav-right">
        {currentUser ? (
          <></>
        ) : (
          <NavLink to="/login" className="nav-login-link">
            <FaSignInAlt />
            Login
          </NavLink>
        )}
      </div>
    </div>
  );
}

export default TopNavigation;
