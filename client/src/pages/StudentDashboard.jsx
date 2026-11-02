import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./StudentDashboard.css";

const API_URL = "http://localhost:5000/api";

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("studentToken");

    async function loadDashboard() {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [profileResponse, projectsResponse] = await Promise.all([
          fetch(`${API_URL}/auth/student/me`, { headers }),
          fetch(`${API_URL}/projects/student`, { headers }),
        ]);
        const [profileData, projectsData] = await Promise.all([
          profileResponse.json(),
          projectsResponse.json(),
        ]);

        if (!profileResponse.ok || !projectsResponse.ok) {
          const response = !profileResponse.ok
            ? profileResponse
            : projectsResponse;
          const data = !profileResponse.ok ? profileData : projectsData;

          if (response.status === 401) {
            localStorage.removeItem("studentToken");
            localStorage.removeItem("student");
            navigate("/student/login", { replace: true });
            return;
          }

          throw new Error(data.message || "Could not load your dashboard.");
        }

        if (active) {
          setStudent(profileData.student);
          setProjects(projectsData.projects || []);
          localStorage.setItem("student", JSON.stringify(profileData.student));
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Could not load your dashboard.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (!token) {
      navigate("/student/login", { replace: true });
    } else {
      loadDashboard();
    }

    return () => {
      active = false;
    };
  }, [navigate]);

  const counts = useMemo(
    () => ({
      total: projects.length,
      pending: projects.filter((project) => project.status === "Pending").length,
      approved: projects.filter((project) => project.status === "Approved").length,
      rejected: projects.filter((project) => project.status === "Rejected").length,
    }),
    [projects]
  );

  function handleLogout() {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("student");
    navigate("/student/login", { replace: true });
  }

  return (
    <main className="student-dashboard">
      <header className="student-dashboard-header">
        <div className="student-dashboard-brand">
          <img src="/projecthub-navbar-logo.png" alt="ProjectHub" />
        </div>
        <div className="student-dashboard-actions">
          <Link className="student-dashboard-submit" to="/submit">Submit a project</Link>
          <button type="button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <section className="student-dashboard-content">
        <div className="student-dashboard-welcome">
          <div>
            <p className="student-dashboard-eyebrow">STUDENT WORKSPACE</p>
            <h1>{student ? `Welcome, ${student.name}` : "Your projects"}</h1>
            <p>Track submissions and follow review decisions from your institution.</p>
          </div>
          {student && <span className="student-dashboard-email">{student.email}</span>}
        </div>

        {error && <div className="student-dashboard-error" role="alert">{error}</div>}

        <section className="student-dashboard-stats" aria-label="Project statistics">
          {[
            ["Total projects", counts.total, "total"],
            ["Pending review", counts.pending, "pending"],
            ["Approved", counts.approved, "approved"],
            ["Needs attention", counts.rejected, "rejected"],
          ].map(([label, count, kind]) => (
            <article className={`student-stat student-stat-${kind}`} key={kind}>
              <span>{label}</span>
              <strong>{count}</strong>
            </article>
          ))}
        </section>

        <section className="student-projects-section">
          <div className="student-projects-heading">
            <div>
              <h2>My submissions</h2>
              <p>Your projects and their latest review status.</p>
            </div>
            <Link to="/submit">+ New submission</Link>
          </div>

          {loading ? (
            <div className="student-dashboard-empty">Loading your projects...</div>
          ) : projects.length === 0 ? (
            <div className="student-dashboard-empty">
              <h3>No projects submitted yet</h3>
              <p>Submit your first project to start tracking its review here.</p>
              <Link to="/submit">Submit a project</Link>
            </div>
          ) : (
            <div className="student-project-list">
              {projects.map((project) => (
                <article className="student-project-card" key={project._id}>
                  <div className="student-project-main">
                    <div className="student-project-title-row">
                      <h3>{project.title}</h3>
                      <span className={`student-project-status status-${String(project.status || "Pending").toLowerCase()}`}>
                        {project.status || "Pending"}
                      </span>
                    </div>
                    <p className="student-project-description">{project.description}</p>
                    <div className="student-project-meta">
                      <span>{project.institutionName}</span>
                      <span>Submitted {formatDate(project.createdAt)}</span>
                      {project.reviewedAt && <span>Reviewed {formatDate(project.reviewedAt)}</span>}
                    </div>
                    {project.technologies?.length > 0 && (
                      <div className="student-project-tech">
                        {project.technologies.map((technology) => (
                          <span key={technology}>{technology}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="student-project-links">
                    {project.githubUrl && (
                      <a href={project.githubUrl} target="_blank" rel="noreferrer">GitHub</a>
                    )}
                    {project.demoUrl && (
                      <a href={project.demoUrl} target="_blank" rel="noreferrer">Live demo</a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <footer className="student-dashboard-footer">
        <div className="student-dashboard-footer-brand">
          <img src="/projecthub-navbar-logo.png" alt="ProjectHub" />
        </div>
        <span>
          © {new Date().getFullYear()} ProjectHub · Student Project Showcase
        </span>
      </footer>
    </main>
  );
}

export default StudentDashboard;
