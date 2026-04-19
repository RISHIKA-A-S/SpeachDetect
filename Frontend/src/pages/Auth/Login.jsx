import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useUser } from "../../context/UserContext";
import "../Auth/Auth.css";

const Login = () => {
  const { updateUser } = useUser();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axiosInstance.post(API_PATHS.AUTH.LOGIN, form);

      // ✅ SAVE TOKEN (CRITICAL)
      localStorage.setItem("token", res.data.token);

      // ✅ Update user context
      updateUser({
        email: form.email,
        isLoggedIn: true,
      });

      // ✅ Redirect to dashboard/home
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* ── HERO ── */}
      <motion.section
        className="auth-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1>Welcome Back</h1>
        <p>Log in to continue your speech fluency journey with SPEAKEASE.</p>

        <div className="auth-hero-wave">
          <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="#ffffff"
              fillOpacity="1"
              d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,120L0,120Z"
            />
          </svg>
        </div>
      </motion.section>

      {/* ── FORM ── */}
      <section className="auth-form-section">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Header */}
          <div className="auth-card-header">
            <span className="auth-card-icon">🔐</span>
            <h2>Log In</h2>
            <p>Enter your credentials to access your account</p>
          </div>

          {/* Body */}
          <div className="auth-card-body">
            <form onSubmit={handleSubmit}>

              <div className="auth-field">
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="auth-field">
                <label>Password</label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <motion.button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? "Logging in…" : "Log In"}
              </motion.button>

              {error && (
                <div className="auth-error">
                  <span>⚠️</span> {error}
                </div>
              )}
            </form>

            <p className="auth-switch">
              Don't have an account?{" "}
              <Link to="/signup">Sign up for free</Link>
            </p>
          </div>
        </motion.div>
      </section>

    </div>
  );
};

export default Login;