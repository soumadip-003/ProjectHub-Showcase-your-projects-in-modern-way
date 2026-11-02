import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./InstitutionLogin.css";

const API_URL = "http://localhost:5000/api";

function InstitutionLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/institution/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      const token = data.token || data.accessToken;
      const institution = data.institution;

      if (!token) {
        throw new Error("Login response did not contain an authentication token.");
      }

      localStorage.setItem("institutionToken", token);

      if (institution) {
        localStorage.setItem("institution", JSON.stringify(institution));
      }

      navigate("/institute/dashboard");
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="institution-login-page">
      <form onSubmit={handleSubmit} className="institution-login-card">
        <Link to="/" className="institution-login-brand">
          ProjectHub
        </Link>

        <h1 className="institution-login-title">Institution Login</h1>

        <p className="institution-login-subtitle">
          Sign in to manage your institution's projects.
        </p>

        {error && <div className="institution-login-error">{error}</div>}

        <label htmlFor="email" className="institution-login-label">
          Institution Email
        </label>

        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter registered email"
          autoComplete="username"
          required
          className="institution-login-input"
        />

        <label htmlFor="password" className="institution-login-label">
          Password
        </label>

        <input
          id="password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter password"
          autoComplete="current-password"
          required
          className="institution-login-input"
        />

        <button
          type="submit"
          className="institution-login-button"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <p className="institution-login-footer">
          Don't have an account?{" "}
          <Link to="/institute/signup">
            Register your institution
          </Link>
        </p>

        <Link to="/" className="institution-login-home-link">
          Back to Home
        </Link>
      </form>
    </main>
  );
}

export default InstitutionLogin;
