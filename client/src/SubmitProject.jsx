
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./SubmitProject.css";

const API_URL = "http://localhost:5000/api";

function SubmitProject() {
  const [institutions, setInstitutions] = useState([]);

  const [formData, setFormData] = useState({
    institutionId: "",
    title: "",
    description: "",
    technologies: "",
    githubUrl: "",
    demoUrl: "",
  });

  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // Load institutions from the backend
  // useEffect(() => {
  //   const fetchInstitutions = async () => {
  //     try {
  //       const response = await fetch(
  //         `${API_URL}/projects/institutions`
  //       );

  //       const data = await response.json();

  //       if (!response.ok) {
  //         throw new Error(
  //           data.message || "Failed to load institutions."
  //         );
  //       }

  //       setInstitutions(data.institutions || []);
  //     } catch (error) {
  //       console.error("Institution loading error:", error);
  //       setMessage(
  //         "Unable to load institutions. Please check your backend."
  //       );
  //       setMessageType("error");
  //     } finally {
  //       setLoadingInstitutions(false);
  //     }
  //   };

  //   fetchInstitutions();
  // }, []);
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        console.log("Fetching institutions...");

        const response = await fetch(
          "http://localhost:5000/api/projects/institutions"
        );

        console.log("Response status:", response.status);

        const data = await response.json();

        console.log("API response:", data);

        if (!response.ok) {
          throw new Error(
            data.message || `HTTP error: ${response.status}`
          );
        }

        setInstitutions(data.institutions || []);

        if (!data.institutions?.length) {
          setMessage("No institutions found in the database.");
          setMessageType("error");
        } else {
          setMessage("");
          setMessageType("");
        }
      } catch (error) {
        console.error("Institution loading error:", error);

        setMessage(
          `Unable to load institutions: ${error.message}`
        );

        setMessageType("error");
      } finally {
        setLoadingInstitutions(false);
      }
    };

    fetchInstitutions();
  }, []);
  // Handle input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Submit project to the backend
  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (!formData.institutionId) {
      setMessage("Please select your institution.");
      setMessageType("error");
      return;
    }

    const technologies = formData.technologies
      .split(",")
      .map((technology) => technology.trim())
      .filter(Boolean);

    const projectData = {
      ...formData,
      technologies,
    };

    try {
      setSubmitting(true);

      const token = localStorage.getItem("studentToken");
      const response = await fetch(`${API_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Project submission failed."
        );
      }

      setMessage(
        data.message ||
        "Project submitted successfully! Waiting for institution approval."
      );

      setMessageType("success");

      setFormData({
        institutionId: "",
        title: "",
        description: "",
        technologies: "",
        githubUrl: "",
        demoUrl: "",
      });
    } catch (error) {
      console.error("Project submission error:", error);
      setMessage(error.message || "Something went wrong.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="submission-section">
      <div className="submission-container">
        <h1 className="submission-heading">
          Submit Your Project
        </h1>

        <p><Link to="/student/dashboard">Back to dashboard</Link></p>

        <p>
          Share your project with the ProjectHub community.
        </p>

        {message && (
          <div
            className={
              messageType === "success"
                ? "form-message success-message"
                : "form-message error-message"
            }
            role="status"
          >
            {message}
          </div>
        )}

        <form
          className="submission-form"
          onSubmit={handleSubmit}
        >
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="institutionId">
                Select Institution *
              </label>

              <select
                id="institutionId"
                name="institutionId"
                value={formData.institutionId}
                onChange={handleChange}
                required
                disabled={
                  loadingInstitutions ||
                  institutions.length === 0
                }
              >
                <option value="">
                  {loadingInstitutions
                    ? "Loading institutions..."
                    : institutions.length === 0
                      ? "No institutions available"
                      : "Choose your institution"}
                </option>

                {institutions.map((institution) => (
                  <option
                    key={institution._id}
                    value={institution._id}
                  >
                    {institution.name}
                  </option>
                ))}
              </select>

              {!loadingInstitutions &&
                institutions.length === 0 && (
                  <small>
                    Institution list is empty. Please check
                    the backend API.
                  </small>
                )}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="title">
              Project Title *
            </label>

            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter your project title"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="description">
              Project Description *
            </label>

            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your project..."
              rows="5"
              maxLength="2000"
              required
            />

            <span className="character-count">
              {formData.description.length}/2000
            </span>
          </div>

          <div className="form-field">
            <label htmlFor="technologies">
              Technologies Used *
            </label>

            <input
              id="technologies"
              type="text"
              name="technologies"
              value={formData.technologies}
              onChange={handleChange}
              placeholder="React, Node.js, MongoDB"
              required
            />

            <small>
              Separate technologies with commas.
            </small>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="githubUrl">
                GitHub Repository URL
              </label>

              <input
                id="githubUrl"
                type="url"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleChange}
                placeholder="https://github.com/username/project"
              />
            </div>

            <div className="form-field">
              <label htmlFor="demoUrl">
                Live Demo URL
              </label>

              <input
                id="demoUrl"
                type="url"
                name="demoUrl"
                value={formData.demoUrl}
                onChange={handleChange}
                placeholder="https://your-project.example"
              />
            </div>
          </div>

          <button
            type="submit"
            className="primary-button form-submit"
            disabled={submitting || loadingInstitutions}
          >
            {submitting
              ? "Submitting..."
              : "Submit Project"}
          </button>

          <p className="form-note">
            Your project will be reviewed by your institution
            before appearing in the public gallery.
          </p>
        </form>
      </div>
    </section>
  );
}

export default SubmitProject;
