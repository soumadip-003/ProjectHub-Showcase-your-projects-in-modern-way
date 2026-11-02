import { useEffect, useState, useCallback } from "react";
import SupportChat from "../components/SupportChat";
import "./AdminDashboard.css";

const API_URL = "http://localhost:5000/api";

function AdminDashboard() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [projects, setProjects] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [updatingInstitutionId, setUpdatingInstitutionId] =
    useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminEmail");
    window.location.replace("/admin/login");
  }, []);

  // Load all institutions and projects using the Admin token.
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = sessionStorage.getItem("adminToken");

      if (!token) {
        handleLogout();
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [institutionResponse, projectResponse] = await Promise.all([
        fetch(`${API_URL}/admin/institutions`, {
          method: "GET",
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/admin/projects`, {
          method: "GET",
          headers,
          cache: "no-store",
        }),
      ]);

      const institutionData = await institutionResponse.json();
      const projectData = await projectResponse.json();

      if (
        institutionResponse.status === 401 ||
        institutionResponse.status === 403 ||
        projectResponse.status === 401 ||
        projectResponse.status === 403
      ) {
        handleLogout();
        return;
      }

      if (!institutionResponse.ok) {
        throw new Error(
          institutionData.message || "Unable to load institutions."
        );
      }

      if (!projectResponse.ok) {
        throw new Error(
          projectData.message || "Unable to load projects."
        );
      }

      setInstitutions(institutionData.institutions || []);
      setProjects(projectData.projects || []);
    } catch (err) {
      console.error("Admin dashboard loading error:", err);
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Navigate between dashboard sections.
  const openSection = (section) => {
    setActivePage(section);
    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  };

  // Admin can approve or reject institution registrations.
  const updateInstitutionStatus = async (institutionId, status) => {
    const institution = institutions.find(
      (item) => item._id === institutionId
    );

    if (!institution) return;

    const action = status === "Approved" ? "approve" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${institution.name}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setUpdatingInstitutionId(institutionId);

    try {
      const token = sessionStorage.getItem("adminToken");

      if (!token) {
        handleLogout();
        return;
      }

      const response = await fetch(
        `${API_URL}/admin/institutions/${institutionId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || `Unable to ${action} institution.`
        );
      }

      // Update the institution only after the backend confirms success.
      setInstitutions((current) =>
        current.map((item) =>
          item._id === institutionId
            ? { ...item, ...data.institution }
            : item
        )
      );

      setSuccess(
        `${institution.name} ${status.toLowerCase()} successfully.`
      );
    } catch (err) {
      console.error("Institution status update error:", err);
      setError(err.message || "Unable to update institution status.");
    } finally {
      setUpdatingInstitutionId(null);
    }
  };

  // Search and filter projects. This page is view-only for Admin.
  const filteredProjects = projects.filter((project) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch = [
      project.title,
      project.studentName,
      project.institutionName,
    ].some((value) =>
      String(value || "").toLowerCase().includes(searchText)
    );

    const matchesStatus =
      statusFilter === "All" ||
      (project.status || "Pending") === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const approvedCount = projects.filter(
    (project) => project.status === "Approved"
  ).length;

  const pendingCount = projects.filter(
    (project) => project.status === "Pending"
  ).length;

  const rejectedCount = projects.filter(
    (project) => project.status === "Rejected"
  ).length;

  const activeInstitutions = institutions.filter(
    (institution) => institution.isActive !== false
  );

  const pendingInstitutions = activeInstitutions.filter(
    (institution) => (institution.status || "Pending") === "Pending"
  );

  const approvedInstitutions = activeInstitutions.filter(
    (institution) => institution.status === "Approved"
  );

  const rejectedInstitutions = activeInstitutions.filter(
    (institution) => institution.status === "Rejected"
  );

  return (
    <div className="admin-layout" id="admin-top">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img
            className="admin-brand-image"
            src="/projecthub-navbar-logo.png"
            alt="ProjectHub"
          />
        </div>

        <div className="admin-label">ADMINISTRATION</div>

        <nav className="admin-navigation">
          {[
            { name: "Dashboard", icon: "▦" },
            { name: "Institutions", icon: "▣" },
            { name: "Projects", icon: "▤" },
            { name: "Chats", icon: "✉" },
            { name: "Settings", icon: "⚙" },
          ].map((item) => (
            <button
              type="button"
              key={item.name}
              className={`admin-nav-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => openSection(item.name)}
            >
              <span>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-profile">
            <div className="admin-avatar">A</div>

            <div>
              <strong>Administrator</strong>
              <small>Platform Admin</small>
            </div>
          </div>

          <button
            type="button"
            className="admin-logout"
            onClick={handleLogout}
          >
            ↪ Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-breadcrumb">ProjectHub /</span>{" "}
            <strong>{activePage}</strong>
          </div>

          <div className="admin-topbar-right">
            <span className="admin-status-dot"></span>
            <span>Platform Overview</span>
          </div>
        </header>

        <div className="admin-content">
          {error && (
            <div className="admin-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="admin-success" role="status">
              {success}
            </div>
          )}

          {loading ? (
            <div className="admin-loading">
              Loading dashboard...
            </div>
          ) : (
            <>
              {/* Dashboard */}
              {activePage === "Dashboard" && (
                <>
                  <section className="admin-welcome">
                    <div>
                      <p className="admin-eyebrow">
                        ADMINISTRATION OVERVIEW
                      </p>

                      <h1>Admin Dashboard</h1>

                      <p>
                        Manage institute registrations and monitor
                        projects across ProjectHub.
                      </p>
                    </div>

                    <div className="admin-welcome-icon">📊</div>
                  </section>

                  <section className="admin-stats-grid">
                    <StatCard
                      icon="🏫"
                      label="Institutions"
                      value={activeInstitutions.length}
                      color="blue"
                    />

                    <StatCard
                      icon="⏳"
                      label="Pending Institutes"
                      value={pendingInstitutions.length}
                      color="orange"
                    />

                    <StatCard
                      icon="📁"
                      label="Total Projects"
                      value={projects.length}
                      color="purple"
                    />

                    <StatCard
                      icon="✅"
                      label="Approved Projects"
                      value={approvedCount}
                      color="green"
                    />

                    <StatCard
                      icon="⏳"
                      label="Pending Projects"
                      value={pendingCount}
                      color="orange"
                    />

                    <StatCard
                      icon="❌"
                      label="Rejected Projects"
                      value={rejectedCount}
                      color="orange"
                    />
                  </section>

                  <section className="admin-panel">
                    <div className="admin-panel-heading">
                      <div>
                        <h2>Pending Institute Registrations</h2>
                        <p>
                          Review registrations before allowing Institutes
                          to access their dashboards.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={() => openSection("Institutions")}
                      >
                        Manage Institutes →
                      </button>
                    </div>

                    <InstitutionTable
                      institutions={pendingInstitutions.slice(0, 5)}
                      onStatusChange={updateInstitutionStatus}
                      updatingInstitutionId={updatingInstitutionId}
                    />
                  </section>

                  <section className="admin-panel">
                    <div className="admin-panel-heading">
                      <div>
                        <h2>Recent Projects</h2>
                        <p>
                          View project submissions. Each Institute is
                          responsible for reviewing its own projects.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={() => openSection("Projects")}
                      >
                        View Projects →
                      </button>
                    </div>

                    <ProjectTable projects={projects.slice(0, 5)} />
                  </section>
                </>
              )}

              {/* Institutions */}
              {activePage === "Institutions" && (
                <section className="admin-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h1>Institution Management</h1>
                      <p>
                        Approve or reject registrations. Only approved
                        and active Institutes can access their dashboards.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={loadDashboard}
                    >
                      ↻ Refresh
                    </button>
                  </div>

                  <section className="admin-stats-grid">
                    <StatCard
                      icon="⏳"
                      label="Pending"
                      value={pendingInstitutions.length}
                      color="orange"
                    />

                    <StatCard
                      icon="✅"
                      label="Approved"
                      value={approvedInstitutions.length}
                      color="green"
                    />

                    <StatCard
                      icon="❌"
                      label="Rejected"
                      value={rejectedInstitutions.length}
                      color="orange"
                    />
                  </section>

                  <InstitutionTable
                    institutions={institutions}
                    onStatusChange={updateInstitutionStatus}
                    updatingInstitutionId={updatingInstitutionId}
                    showInactive
                  />
                </section>
              )}

              {/* Projects: read-only for Admin */}
              {activePage === "Projects" && (
                <section className="admin-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h1>Project Monitoring</h1>
                      <p>
                        View submitted projects and their review status.
                        Project approval is handled by each Institute.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={loadDashboard}
                    >
                      ↻ Refresh
                    </button>
                  </div>

                  <div className="admin-filters">
                    <input
                      type="search"
                      aria-label="Search projects"
                      placeholder="Search by project, student or institution..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />

                    <select
                      aria-label="Filter projects by status"
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(event.target.value)
                      }
                    >
                      <option value="All">All statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <p className="admin-results-count">
                    Showing {filteredProjects.length} of {projects.length}{" "}
                    projects
                  </p>

                  <ProjectTable projects={filteredProjects} />
                </section>
              )}

              {activePage === "Chats" && (
                <section className="admin-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h1>Institution Support Chats</h1>
                      <p>
                        Reply to institutions. Conversations expire 24 hours
                        after they start.
                      </p>
                    </div>
                  </div>
                  <SupportChat
                    role="admin"
                    onUnauthorized={handleLogout}
                  />
                </section>
              )}

              {/* Settings */}
              {activePage === "Settings" && (
                <section className="admin-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h1>Admin Settings</h1>
                      <p>
                        Administration and platform settings.
                      </p>
                    </div>
                  </div>

                  <div className="admin-info-note">
                    <strong>Admin account</strong>

                    <p>
                      Signed in as{" "}
                      {sessionStorage.getItem("adminEmail") ||
                        "Platform Administrator"}
                    </p>

                    <p>
                      Admin can manage Institute registrations and view
                      platform projects. Project reviews belong to
                      the respective Institute.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-btn"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <article className="admin-stat-card">
      <div className={`admin-stat-icon ${color}`}>
        {icon}
      </div>

      <div>
        <p>{label}</p>
        <h2>{value}</h2>
      </div>
    </article>
  );
}

function InstitutionTable({
  institutions,
  onStatusChange,
  updatingInstitutionId,
  showInactive = false,
}) {
  if (!institutions.length) {
    return (
      <p className="admin-empty">
        No institutions found.
      </p>
    );
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Institution</th>
            <th>Institution ID</th>
            <th>Registration Status</th>
            <th>Account</th>
            {onStatusChange && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {institutions.map((institution) => {
            const status = institution.status || "Pending";
            const isUpdating =
              updatingInstitutionId === institution._id;
            const isActive = institution.isActive !== false;

            return (
              <tr key={institution._id}>
                <td>
                  <strong>
                    {institution.name || "Unnamed institution"}
                  </strong>

                  <div className="admin-project-description">
                    {institution.email || ""}
                  </div>
                </td>

                <td className="admin-id">{institution._id}</td>

                <td>
                  <span
                    className={`admin-badge ${status.toLowerCase()}`}
                  >
                    {status}
                  </span>
                </td>

                <td>
                  <span
                    className={`admin-badge ${
                      isActive ? "approved" : "rejected"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </td>

                {onStatusChange && (
                  <td>
                    <div className="admin-project-actions">
                      {isActive && status !== "Approved" && (
                        <button
                          type="button"
                          className="admin-action-approve"
                          disabled={isUpdating}
                          onClick={() =>
                            onStatusChange(
                              institution._id,
                              "Approved"
                            )
                          }
                        >
                          {isUpdating ? "Updating..." : "Approve"}
                        </button>
                      )}

                      {isActive && status !== "Rejected" && (
                        <button
                          type="button"
                          className="admin-action-reject"
                          disabled={isUpdating}
                          onClick={() =>
                            onStatusChange(
                              institution._id,
                              "Rejected"
                            )
                          }
                        >
                          {isUpdating ? "Updating..." : "Reject"}
                        </button>
                      )}

                      {!isActive && showInactive && (
                        <span className="admin-empty">
                          Account inactive
                        </span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProjectTable({ projects }) {
  if (!projects.length) {
    return (
      <p className="admin-empty">
        No projects found.
      </p>
    );
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Student</th>
            <th>Institution</th>
            <th>Status</th>
            <th>Submitted</th>
          </tr>
        </thead>

        <tbody>
          {projects.map((project) => {
            const status = project.status || "Pending";

            return (
              <tr key={project._id}>
                <td>
                  <strong>
                    {project.title || "Untitled project"}
                  </strong>

                  {project.description && (
                    <div className="admin-project-description">
                      {project.description}
                    </div>
                  )}
                </td>

                <td>{project.studentName || "—"}</td>

                <td>
                  {project.institution?.name ||
                    project.institutionName ||
                    "—"}
                </td>

                <td>
                  <span
                    className={`admin-badge ${status.toLowerCase()}`}
                  >
                    {status}
                  </span>
                </td>

                <td>
                  {project.createdAt
                    ? new Date(project.createdAt).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;
