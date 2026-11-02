import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./StudentAuth.css";

const API_URL = "http://localhost:5000/api";

function StudentAuth({ mode = "login" }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    setFormData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/student/${isRegister ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const contentType = response.headers.get("content-type") || "";
      const responseBody = await response.text();
      let data;

      if (!contentType.includes("application/json")) {
        throw new Error(
          `Student API returned a non-JSON response (HTTP ${response.status}). Restart the backend and verify it is running on port 5000.`
        );
      }

      try {
        data = JSON.parse(responseBody);
      } catch {
        throw new Error("Student API returned invalid JSON. Please restart the backend.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      if (!data.token || !data.student) {
        throw new Error("Authentication response was incomplete.");
      }

      localStorage.setItem("studentToken", data.token);
      localStorage.setItem("student", JSON.stringify(data.student));
      navigate("/student/dashboard", { replace: true });
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to connect to ProjectHub. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="student-auth-page">
      <form className="student-auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="student-auth-brand">ProjectHub</Link>
        <p className="student-auth-eyebrow">STUDENT PORTAL</p>
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="student-auth-subtitle">
          {isRegister
            ? "Track your submissions and share your work."
            : "Sign in to manage your submitted projects."}
        </p>

        {error && <div className="student-auth-error" role="alert">{error}</div>}

        {isRegister && (
          <label>
            Full name
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
              minLength="2"
              maxLength="100"
              required
            />
          </label>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            maxLength="254"
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? "8" : undefined}
            maxLength="128"
            required
          />
          {isRegister && <small>Use at least 8 characters.</small>}
        </label>

        <button type="submit" disabled={loading}>
          {loading
            ? "Please wait..."
            : isRegister
              ? "Create account"
              : "Sign in"}
        </button>
        <p className="student-auth-switch">
          {isRegister ? "Already have an account?" : "New to ProjectHub?"}{" "}
          <Link to={isRegister ? "/student/login" : "/student/signup"}>
            {isRegister ? "Sign in" : "Create account"}
          </Link>
        </p>
        <Link className="student-auth-home" to="/">Back to ProjectHub</Link>
      </form>
    </main>
  );
}

export default StudentAuth;
