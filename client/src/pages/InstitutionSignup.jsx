import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./InstitutionSignup.css";

const API_URL = "http://localhost:5000/api/institutions";

export default function InstitutionSignup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    logo: "",
    location: "",
    website: "",
    description: "",
    contactEmail: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const contentType = response.headers.get("content-type") || "";

if (!contentType.includes("application/json")) {
  const responseText = await response.text();

  console.error("Unexpected server response:", responseText);

  throw new Error(
    "Server returned HTML instead of JSON. Check the backend signup route and API URL."
  );
}

const data = await response.json();

if (!response.ok) {
  throw new Error(data.message || "Registration failed.");
}
      setForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        logo: "",
        location: "",
        website: "",
        description: "",
        contactEmail: ""
      });
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
    <main className="institution-signup-page">
      <section className="institution-signup-card">
        <Link to="/" className="institution-signup-brand">
          ProjectHub
        </Link>

        <div className="institution-signup-heading">
          <span className="institution-signup-icon">🏫</span>
          <h1>Create Institute Account</h1>
          <p>
            Register your institution and showcase your students' projects.
          </p>
        </div>

        {error && (
          <div className="institution-signup-alert error-alert">
            {error}
          </div>
        )}

        {message && (
          <div className="institution-signup-alert success-alert">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="institution-signup-grid">
            <label>
              Institute Name *
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter official institute name"
                maxLength={200}
                required
              />
            </label>

            <label>
              Official Email *
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="office@example.com"
                required
              />
            </label>

            <label>
              Password *
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 12 characters"
                minLength={12}
                autoComplete="new-password"
                required
              />
            </label>

            <label>
              Confirm Password *
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                minLength={12}
                autoComplete="new-password"
                required
              />
            </label>

            <label>
              Location
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="City, State"
              />
            </label>

            <label>
              Contact Email
              <input
                type="email"
                name="contactEmail"
                value={form.contactEmail}
                onChange={handleChange}
                placeholder="Contact email"
              />
            </label>

            <label>
              Institute Website
              <input
                type="url"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://example.com"
              />
            </label>

            <label>
              Institute Logo URL
              <input
                type="url"
                name="logo"
                value={form.logo}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
              />
            </label>
          </div>

          <label className="institution-signup-description">
            About Your Institute
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Write a short description..."
              maxLength={3000}
              rows={4}
            />
          </label>

          <button
            type="submit"
            className="institution-signup-submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="institution-signup-footer">
          Already registered?{" "}
          <Link to="/institute/login">Login here</Link>
        </p>

        <p className="institution-signup-note">
          Your account will remain pending until the administrator approves it.
        </p>
      </section>
    </main>
  );
}
