import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AdminLogin.css";

const API_URL = "http://localhost:5000/api";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.token) {
        throw new Error(data.message || "Admin login failed.");
      }

      // Store the token for this browser tab's session.
      sessionStorage.setItem("adminToken", data.token);
      sessionStorage.setItem("adminEmail", data.admin.email);

      // Clear the password from the component state.
      setPassword("");

      navigate("/admin", { replace: true });
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the server. Please check whether the backend is running."
          : err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-decoration decoration-one"></div>
      <div className="admin-login-decoration decoration-two"></div>

      <div className="admin-login-card">
        <Link to="/" className="admin-login-brand">
          <span className="admin-login-logo">✦</span>
          <span>
            Project<span className="admin-login-brand-highlight">Hub</span>
          </span>
        </Link>

        <div className="admin-login-icon">🔐</div>

        <p className="admin-login-eyebrow">ADMINISTRATOR PORTAL</p>

        <h1>Welcome Back!</h1>

        <p className="admin-login-description">
          Sign in to manage projects and institution accounts.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="admin-login-field">
            <label htmlFor="admin-email">Admin Email</label>

            <input
              id="admin-email"
              type="email"
              placeholder="Enter your admin email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>

          <div className="admin-login-field">
            <label htmlFor="admin-password">Password</label>

            <div className="admin-login-password-wrapper">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />

              <button
                type="button"
                className="admin-show-password"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="admin-login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="admin-login-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In to Dashboard"}
            {!loading && <span> →</span>}
          </button>
        </form>

        <div className="admin-login-security">
          <span>🛡️</span>
          <p>Authorized administrators only.</p>
        </div>

        <Link to="/" className="admin-login-back">
          ← Back to Home
        </Link>
      </div>

      <p className="admin-login-footer">
        © {new Date().getFullYear()} ProjectHub. All rights reserved.
      </p>
    </div>
  );
}

export default AdminLogin;