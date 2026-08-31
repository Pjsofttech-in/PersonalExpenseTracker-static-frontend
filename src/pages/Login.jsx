import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaGoogle,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

import { loginUser } from "../utils/auth";
import { apiLogin } from "../utils/api";

import "../css/Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  /* =========================================
     SUBMIT
     ========================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError("");

    /* BACKEND LOGIN → JWT token */

    try {
      const cleanEmail = email.trim().toLowerCase();

      await apiLogin(cleanEmail, password);

      loginUser(
        {
          name: cleanEmail.split("@")[0],
          email: cleanEmail,
          mobile: "",
        },
        rememberMe,
      );

      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    }
  };

  // RETURN

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo">💰</div>

        <h1>Welcome Back</h1>

        <p className="subtitle">Login to your account</p>

        {/* ERROR */}

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* EMAIL */}

          <div className="input-box">
            <FaEnvelope className="icon" />

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD */}

          <div className="input-box password-box">
            <FaLock className="icon" />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              className="eye-btn"
              title={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {/* OPTIONS */}

          <div className="options">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember Me
            </label>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();

                setError(
                  "Password reset needs a backend / email service — coming soon!",
                );
              }}
            >
              Forgot Password?
            </a>
          </div>

          {/* LOGIN */}

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="google-btn"
          onClick={() => {
            setError("Google login needs a backend — use email login for now.");
          }}
        >
          <FaGoogle />
          Continue with Google
        </button>

        <p className="register-text">
          Don't have an account?
          <Link to="/register">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
