import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

import { loginUser } from "../utils/auth";
import { apiRegister, apiLogin } from "../utils/api";

import "../css/Register.css";

// EMAIL FORMAT

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  /* =========================================
     HANDLE CHANGE
     ========================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================================
     SUBMIT — VALIDATION + REGISTER
     ========================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const mobile = formData.mobile.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (!EMAIL_PATTERN.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      setError("Mobile number must be exactly 10 digits.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");

    /* BACKEND REGISTER + लगेच LOGIN (JWT token) */

    try {
      await apiRegister({
        name,
        phoneNumber: mobile,
        email,
        password,
      });

      // REGISTER नंतर लगेच LOGIN

      await apiLogin(email, password);

      loginUser({ name, email, mobile }, true);

      navigate("/");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    }
  };

  // RETURN

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="logo">💰</div>

        <h1>Create Account</h1>

        <p className="subtitle">Start managing your expenses today</p>

        {/* ERROR */}

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* FULL NAME */}

          <div className="input-box">
            <FaUser className="icon" />

            <input
              type="text"
              placeholder="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          {/* EMAIL */}

          <div className="input-box">
            <FaEnvelope className="icon" />

            <input
              type="email"
              placeholder="Email Address"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* MOBILE */}

          <div className="input-box">
            <FaPhone className="icon" />

            <input
              type="text"
              placeholder="Mobile Number"
              name="mobile"
              maxLength={10}
              value={formData.mobile}
              onChange={handleChange}
            />
          </div>

          {/* PASSWORD */}

          <div className="input-box password-box">
            <FaLock className="icon" />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
            />

            <button
              type="button"
              className="eye-btn"
              title={showPassword ? "Hide passwords" : "Show passwords"}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {/* CONFIRM PASSWORD */}

          <div className="input-box password-box">
            <FaLock className="icon" />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          {/* REGISTER */}

          <button type="submit" className="register-btn">
            Create Account
          </button>
        </form>

        <p className="login-text">
          Already have an account?
          <Link to="/login"> Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
