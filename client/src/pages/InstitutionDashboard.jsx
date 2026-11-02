import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SupportChat from "../components/SupportChat";
import "./InstitutionDashboard.css";

const API_URL = "http://localhost:5000/api";
const DEFAULT_LOGO = "/institute-logo.png";

const navItems = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "projects", label: "All Projects", icon: "▤" },
  { id: "pending", label: "Pending Review", icon: "◷" },
  { id: "approved", label: "Approved", icon: "✓" },
  { id: "rejected", label: "Rejected", icon: "×" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

function getProjectId(project) {
  return project?._id || project?.id;
}

function getProjectTitle(project) {
  return (
    project?.title ||
    project?.projectTitle ||
    project?.name ||
    "Untitled Project"
  );
}

function getProjectStatus(project) {
  const status = String(project?.status || "Pending").toLowerCase();

  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";

  return "Pending";
}

function getInstitutionName(institution) {
  return (
    institution?.name ||
    institution?.institutionName ||
    "Your Institution"
  );
}

function getInstitutionLogo(institution) {
  const savedLogo =
    institution?.logo ||
    institution?.logoUrl ||
    institution?.logoURL ||
    "";

  if (!savedLogo) return DEFAULT_LOGO;
  if (savedLogo.startsWith("/")) return `http://localhost:5000${savedLogo}`;
  return savedLogo;
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getErrorMessage(data, fallback) {
  return data?.message || data?.error || fallback;
}

function InstitutionLogo({ institution, className }) {
  const [imageFailed, setImageFailed] = useState(false);
  const institutionName = getInstitutionName(institution);
  const logo = getInstitutionLogo(institution);

  useEffect(() => {
    setImageFailed(false);
  }, [logo]);

  if (!logo || imageFailed) {
    return (
      <div className={className} aria-label={`${institutionName} initials`}>
        P
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={logo}
        alt={`${institutionName} logo`}
        onError={() => {
          if (logo !== DEFAULT_LOGO) {
            setImageFailed(true);
          } else {
            setImageFailed(true);
          }
        }}
      />
    </div>
  );
}

function InstitutionDashboard() {
  const navigate = useNavigate();

  const [institution, setInstitution] = useState(() => {
    try {
      const stored = localStorage.getItem("institution");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [projects, setProjects] = useState([]);
  const [activePage, setActivePage] = useState("overview");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Institution logo settings
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoSaving, setLogoSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const institutionName = getInstitutionName(institution);

  const logout = useCallback(() => {
    localStorage.removeItem("institutionToken");
    localStorage.removeItem("institution");
    navigate("/institute/login", { replace: true });
  }, [navigate]);

  const loadProjects = useCallback(async () => {
    const token = localStorage.getItem("institutionToken");

    if (!token) {
      navigate("/institute/login", { replace: true });
      return;
    }

    try {
      setLoading(true);
      setError("");

      const storedInstitution = localStorage.getItem("institution");

      if (storedInstitution) {
        try {
          setInstitution(JSON.parse(storedInstitution));
        } catch {
          localStorage.removeItem("institution");
        }
      }

      const response = await fetch(`${API_URL}/projects/institution`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          getErrorMessage(
            data,
            "Your session expired or your institution is not approved."
          )
        );
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to load institution projects.")
        );
      }

      const projectList = Array.isArray(data)
        ? data
        : Array.isArray(data.projects)
          ? data.projects
          : Array.isArray(data.data)
            ? data.data
            : [];

      setProjects(projectList);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const handleLogoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSettingsMessage("");
    setSettingsError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSettingsError("Please select a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setSettingsError("Logo size must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    setSelectedLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!selectedLogo) {
      setSettingsError("Please choose a logo image first.");
      return;
    }

    const token = localStorage.getItem("institutionToken");
    if (!token) return logout();

    try {
      setLogoSaving(true);
      setSettingsError("");
      setSettingsMessage("");

      const formData = new FormData();
      formData.append("logo", selectedLogo);

      const response = await fetch(`${API_URL}/institutions/me/logo`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Unable to upload institute logo."));
      }

      const updatedInstitution = data.institution || data.data?.institution;
      if (!updatedInstitution) {
        throw new Error("Server response did not include updated institution details.");
      }

      setInstitution(updatedInstitution);
      localStorage.setItem("institution", JSON.stringify(updatedInstitution));
      setSelectedLogo(null);
      setLogoPreview("");
      setSettingsMessage("Institute logo updated successfully.");
    } catch (err) {
      setSettingsError(err.message || "Could not upload the logo.");
    } finally {
      setLogoSaving(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!window.confirm("Are you sure you want to remove your institute logo?")) return;

    const token = localStorage.getItem("institutionToken");
    if (!token) return logout();

    try {
      setLogoSaving(true);
      setSettingsError("");
      setSettingsMessage("");

      const response = await fetch(`${API_URL}/institutions/me/logo`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Unable to remove institute logo."));
      }

      const updatedInstitution = data.institution || data.data?.institution;
      if (!updatedInstitution) {
        throw new Error("Server response did not include updated institution details.");
      }

      setInstitution(updatedInstitution);
      localStorage.setItem("institution", JSON.stringify(updatedInstitution));
      setSelectedLogo(null);
      setLogoPreview("");
      setSettingsMessage("Institute logo removed successfully.");
    } catch (err) {
      setSettingsError(err.message || "Could not remove the logo.");
    } finally {
      setLogoSaving(false);
    }
  };

  const counts = useMemo(() => {
    const approved = projects.filter(
      (project) => getProjectStatus(project) === "Approved"
    ).length;

    const rejected = projects.filter(
      (project) => getProjectStatus(project) === "Rejected"
    ).length;

    const pending = projects.filter(
      (project) => getProjectStatus(project) === "Pending"
    ).length;

    return {
      total: projects.length,
      pending,
      approved,
      rejected,
    };
  }, [projects]);

  const categories = useMemo(() => {
    const values = projects
      .map((project) => project.category || project.projectCategory)
      .filter(Boolean);

    return ["All Categories", ...new Set(values)];
  }, [projects]);

  const visibleProjects = useMemo(() => {
    let result = [...projects];

    if (activePage === "pending") {
      result = result.filter(
        (project) => getProjectStatus(project) === "Pending"
      );
    } else if (activePage === "approved") {
      result = result.filter(
        (project) => getProjectStatus(project) === "Approved"
      );
    } else if (activePage === "rejected") {
      result = result.filter(
        (project) => getProjectStatus(project) === "Rejected"
      );
    }

    if (categoryFilter !== "All Categories") {
      result = result.filter(
        (project) =>
          (project.category || project.projectCategory) === categoryFilter
      );
    }

    const searchTerm = search.trim().toLowerCase();

    if (searchTerm) {
      result = result.filter((project) => {
        const searchableText = [
          getProjectTitle(project),
          project.category,
          project.projectCategory,
          project.description,
          project.studentName,
          project.author,
          project.teamName,
          project.technology,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(searchTerm);
      });
    }

    return result.sort(
      (a, b) =>
        new Date(b.createdAt || b.submittedAt || 0).getTime() -
        new Date(a.createdAt || a.submittedAt || 0).getTime()
    );
  }, [projects, activePage, search, categoryFilter]);

  const handleReview = async (project, status) => {
    const projectId = getProjectId(project);

    if (!projectId) {
      setActionError("This project does not have a valid ID.");
      return;
    }

    const title = getProjectTitle(project);
    const action = status === "Approved" ? "approve" : "reject";

    if (!window.confirm(`Are you sure you want to ${action} "${title}"?`)) {
      return;
    }

    const token = localStorage.getItem("institutionToken");

    if (!token) {
      logout();
      return;
    }

    try {
      setUpdatingId(projectId);
      setActionError("");

      const response = await fetch(
        `${API_URL}/projects/${projectId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          getErrorMessage(
            data,
            "You are not authorized to review this project."
          )
        );
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Failed to ${action} the project.`)
        );
      }

      setProjects((currentProjects) =>
        currentProjects.map((item) =>
          String(getProjectId(item)) === String(projectId)
            ? {
                ...item,
                ...(data.project || {}),
                status: data.project?.status || status,
              }
            : item
        )
      );
    } catch (err) {
      setActionError(err.message || "Could not update the project.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteProject = async (project) => {
    const projectId = getProjectId(project);

    if (!projectId) {
      setActionError("This project does not have a valid ID.");
      return;
    }

    const title = getProjectTitle(project);

    if (
      !window.confirm(
        `Delete "${title}" permanently? This action cannot be undone.`
      )
    ) {
      return;
    }

    const token = localStorage.getItem("institutionToken");

    if (!token) {
      logout();
      return;
    }

    try {
      setUpdatingId(projectId);
      setActionError("");

      const response = await fetch(`${API_URL}/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          getErrorMessage(data, "You are not authorized to delete this project.")
        );
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to delete the project.")
        );
      }

      setProjects((currentProjects) =>
        currentProjects.filter(
          (item) => String(getProjectId(item)) !== String(projectId)
        )
      );
    } catch (err) {
      setActionError(err.message || "Could not delete the project.");
    } finally {
      setUpdatingId(null);
    }
  };

  const selectPage = (page) => {
    setActivePage(page);
    setSearch("");
    setCategoryFilter("All Categories");
    setMobileMenuOpen(false);
  };

  const pageTitle =
    activePage === "overview"
      ? "Dashboard Overview"
      : navItems.find((item) => item.id === activePage)?.label || "Dashboard";

  const pageSubtitle =
    activePage === "overview"
      ? "Track and manage projects submitted to your institution."
      : activePage === "settings"
        ? "Manage your institution profile and logo."
        : `Review and manage your institution's ${pageTitle.toLowerCase()}.`;

  const renderProjectTable = (items, allowDelete = false) => (
    <div className="id-table-wrap">
      <table className="id-table">
        <thead>
          <tr>
            <th>PROJECT</th>
            <th>CATEGORY</th>
            <th>SUBMITTED</th>
            <th>STATUS</th>
            <th className="id-actions-heading">ACTIONS</th>
          </tr>
        </thead>

        <tbody>
          {items.map((project) => {
            const projectId = getProjectId(project);
            const status = getProjectStatus(project);
            const title = getProjectTitle(project);
            const category =
              project.category || project.projectCategory || "General";

            return (
              <tr key={projectId || title}>
                <td>
                  <div className="id-project-cell">
                    <div className="id-project-icon">
                      {(title[0] || "P").toUpperCase()}
                    </div>

                    <div className="id-project-info">
                      <span className="id-project-title">{title}</span>
                      <span className="id-project-subtitle">
                        {project.studentName ||
                          project.author ||
                          project.teamName ||
                          "Project submission"}
                      </span>
                    </div>
                  </div>
                </td>

                <td>
                  <span className="id-category">{category}</span>
                </td>

                <td className="id-date">
                  {formatDate(project.createdAt || project.submittedAt)}
                </td>

                <td>
                  <span
                    className={`id-status id-status-${status.toLowerCase()}`}
                  >
                    <span className="id-status-dot" />
                    {status}
                  </span>
                </td>

                <td>
                  <div className="id-row-actions">
                    {status === "Pending" ? (
                      <>
                        <button
                          className="id-icon-btn id-approve-btn"
                          title="Approve project"
                          aria-label={`Approve ${title}`}
                          disabled={updatingId === projectId}
                          onClick={() => handleReview(project, "Approved")}
                        >
                          {updatingId === projectId ? "…" : "✓"}
                        </button>

                        <button
                          className="id-icon-btn id-reject-btn"
                          title="Reject project"
                          aria-label={`Reject ${title}`}
                          disabled={updatingId === projectId}
                          onClick={() => handleReview(project, "Rejected")}
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <span className="id-reviewed-label">
                        {status === "Approved" ? "Reviewed ✓" : "Reviewed"}
                      </span>
                    )}
                    {allowDelete && (
                      <button
                        className="id-icon-btn id-delete-btn"
                        title="Delete project"
                        aria-label={`Delete ${title}`}
                        disabled={updatingId === projectId}
                        onClick={() => handleDeleteProject(project)}
                      >
                        {updatingId === projectId ? "…" : "⌫"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {items.length === 0 && (
        <div className="id-empty-state">
          <div className="id-empty-icon">▤</div>
          <h3>No projects found</h3>
          <p>
            {search || categoryFilter !== "All Categories"
              ? "Try changing your search or filters."
              : "Projects submitted to your institution will appear here."}
          </p>

          {(search || categoryFilter !== "All Categories") && (
            <button
              className="id-secondary-btn"
              onClick={() => {
                setSearch("");
                setCategoryFilter("All Categories");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="id-app">
      {mobileMenuOpen && (
        <button
          className="id-mobile-overlay"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`id-sidebar ${mobileMenuOpen ? "id-sidebar-open" : ""}`}>
        <div className="id-brand">
          <div className="id-brand-copy">
            <img
              className="id-brand-logo"
              src="/projecthub-navbar-logo.png"
              alt="ProjectHub"
            />
            <span className="id-brand-caption">INSTITUTION PORTAL</span>
          </div>

          <button
            className="id-mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <div className="id-sidebar-label">WORKSPACE</div>

        <nav className="id-navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`id-nav-item ${
                activePage === item.id ? "id-nav-active" : ""
              }`}
              onClick={() => selectPage(item.id)}
            >
              <span className="id-nav-icon">{item.icon}</span>
              <span>{item.label}</span>

              {item.id === "pending" && counts.pending > 0 && (
                <span className="id-nav-count">{counts.pending}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="id-sidebar-bottom">
          <div className="id-help-card">
            <div className="id-help-icon">✦</div>
            <h4>Need assistance?</h4>
            <p>Manage your project submissions with ease.</p>
            <button type="button" onClick={() => setChatOpen(true)}>
              Get help <span>↗</span>
            </button>
          </div>

          <div className="id-sidebar-profile">
            <InstitutionLogo
              institution={institution}
              className="id-avatar"
            />

            <div className="id-profile-copy">
              <span className="id-profile-name">{institutionName}</span>
              <span className="id-profile-role">Institution account</span>
            </div>

            <button
              className="id-logout-icon"
              title="Logout"
              aria-label="Logout"
              onClick={logout}
            >
              ↪
            </button>
          </div>
        </div>
      </aside>

      <main className="id-main">
        <header className="id-topbar">
          <div className="id-topbar-left">
            <button
              className="id-menu-toggle"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              ☰
            </button>

            <div className="id-breadcrumb">
              <span>Workspace</span>
              <span className="id-breadcrumb-separator">/</span>
              <strong>{pageTitle}</strong>
            </div>
          </div>

          <div className="id-topbar-right">
            <span className="id-live-indicator">
              <span /> Institution Portal
            </span>

            <InstitutionLogo
              institution={institution}
              className="id-topbar-avatar"
            />
          </div>
        </header>

        <div className="id-content">
          <section className="id-page-heading">
            <div>
              <div className="id-eyebrow">
                <span className="id-eyebrow-line" />
                INSTITUTION WORKSPACE
              </div>

              <h1>{pageTitle}</h1>
              <p>{pageSubtitle}</p>
            </div>

            <button
              className="id-refresh-btn"
              onClick={loadProjects}
              disabled={loading}
            >
              <span className={loading ? "id-refresh-spinning" : ""}>↻</span>
              Refresh
            </button>
          </section>

          {error && (
            <div className="id-alert id-alert-error">
              <span>!</span>
              <div>
                <strong>Unable to load projects</strong>
                <p>{error}</p>
              </div>
              <button onClick={loadProjects}>Try again</button>
            </div>
          )}

          {actionError && (
            <div className="id-alert id-alert-error">
              <span>!</span>
              <div>
                <strong>Action unsuccessful</strong>
                <p>{actionError}</p>
              </div>
              <button onClick={() => setActionError("")}>Dismiss</button>
            </div>
          )}

          {activePage === "overview" && (
            <>
              <section className="id-welcome-banner">
                <div className="id-welcome-content">
                  <div className="id-welcome-badge">
                    <span>✦</span> INSTITUTION DASHBOARD
                  </div>

                  <h2>
                    Welcome back,
                    <br />
                    <span>{institutionName}</span>
                  </h2>

                  <p>
                    Review student projects, track submissions, and recognize
                    great ideas from your institution.
                  </p>

                  <button
                    className="id-banner-btn"
                    onClick={() => selectPage("pending")}
                  >
                    Review pending projects <span>→</span>
                  </button>
                </div>

                <div className="id-banner-art" aria-hidden="true">
                  <div className="id-art-orbit id-art-orbit-one" />
                  <div className="id-art-orbit id-art-orbit-two" />
                  <div className="id-art-core">
                    <span>✦</span>
                  </div>
                  <div className="id-art-card id-art-card-one">
                    <span>✓</span> Project approved
                  </div>
                  <div className="id-art-card id-art-card-two">
                    <span>↗</span> Ideas in progress
                  </div>
                  <div className="id-art-dot id-art-dot-one" />
                  <div className="id-art-dot id-art-dot-two" />
                </div>
              </section>

              <section className="id-stats-grid">
                <article className="id-stat-card id-stat-purple">
                  <div className="id-stat-top">
                    <span className="id-stat-label">Total Projects</span>
                    <span className="id-stat-icon">▤</span>
                  </div>
                  <div className="id-stat-number">
                    {loading ? "—" : counts.total}
                  </div>
                  <div className="id-stat-bottom">
                    <span className="id-stat-accent">All submissions</span>
                    <span className="id-stat-caption">in your institution</span>
                  </div>
                  <div className="id-stat-glow" />
                </article>

                <article className="id-stat-card id-stat-orange">
                  <div className="id-stat-top">
                    <span className="id-stat-label">Pending Review</span>
                    <span className="id-stat-icon">◷</span>
                  </div>
                  <div className="id-stat-number">
                    {loading ? "—" : counts.pending}
                  </div>
                  <div className="id-stat-bottom">
                    <span className="id-stat-accent">Needs attention</span>
                    <span className="id-stat-caption">awaiting your review</span>
                  </div>
                  <div className="id-stat-glow" />
                </article>

                <article className="id-stat-card id-stat-green">
                  <div className="id-stat-top">
                    <span className="id-stat-label">Approved Projects</span>
                    <span className="id-stat-icon">✓</span>
                  </div>
                  <div className="id-stat-number">
                    {loading ? "—" : counts.approved}
                  </div>
                  <div className="id-stat-bottom">
                    <span className="id-stat-accent">
                      Successfully reviewed
                    </span>
                  </div>
                  <div className="id-stat-glow" />
                </article>

                <article className="id-stat-card id-stat-red">
                  <div className="id-stat-top">
                    <span className="id-stat-label">Rejected Projects</span>
                    <span className="id-stat-icon">×</span>
                  </div>
                  <div className="id-stat-number">
                    {loading ? "—" : counts.rejected}
                  </div>
                  <div className="id-stat-bottom">
                    <span className="id-stat-accent">Review completed</span>
                  </div>
                  <div className="id-stat-glow" />
                </article>
              </section>

              <section className="id-panel">
                <div className="id-panel-heading">
                  <div>
                    <h3>Recent Projects</h3>
                    <p>Your institution's latest submissions</p>
                  </div>

                  <button
                    className="id-text-btn"
                    onClick={() => selectPage("projects")}
                  >
                    View all projects <span>→</span>
                  </button>
                </div>

                {loading ? (
                  <div className="id-loading">
                    <span className="id-spinner" />
                    Loading projects...
                  </div>
                ) : (
                  renderProjectTable(
                    [...projects]
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt || b.submittedAt || 0).getTime() -
                          new Date(a.createdAt || a.submittedAt || 0).getTime()
                      )
                      .slice(0, 5),
                    true
                  )
                )}
              </section>

              <section className="id-bottom-grid">
                <div className="id-panel id-summary-panel">
                  <div className="id-panel-heading">
                    <div>
                      <h3>Review Summary</h3>
                      <p>Current project review status</p>
                    </div>
                    <span className="id-summary-symbol">◉</span>
                  </div>

                  <div className="id-progress-list">
                    {[
                      {
                        label: "Approved",
                        count: counts.approved,
                        color: "purple",
                        fill: "id-fill-purple",
                      },
                      {
                        label: "Pending",
                        count: counts.pending,
                        color: "orange",
                        fill: "id-fill-orange",
                      },
                      {
                        label: "Rejected",
                        count: counts.rejected,
                        color: "red",
                        fill: "id-fill-red",
                      },
                    ].map((item) => (
                      <div className="id-progress-item" key={item.label}>
                        <div className="id-progress-label">
                          <span>
                            <i className={`id-progress-${item.color}`} />
                            {item.label}
                          </span>
                          <strong>{item.count}</strong>
                        </div>

                        <div className="id-progress-track">
                          <div
                            className={`id-progress-fill ${item.fill}`}
                            style={{
                              width: `${
                                counts.total
                                  ? (item.count / counts.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="id-panel id-quick-panel">
                  <div className="id-panel-heading">
                    <div>
                      <h3>Quick Actions</h3>
                      <p>Jump straight into your workflow</p>
                    </div>
                  </div>

                  <button
                    className="id-quick-action"
                    onClick={() => selectPage("pending")}
                  >
                    <span className="id-quick-icon id-quick-orange">◷</span>
                    <span className="id-quick-copy">
                      <strong>Review pending projects</strong>
                      <small>{counts.pending} waiting for review</small>
                    </span>
                    <span className="id-quick-arrow">→</span>
                  </button>

                  <button
                    className="id-quick-action"
                    onClick={() => selectPage("approved")}
                  >
                    <span className="id-quick-icon id-quick-green">✓</span>
                    <span className="id-quick-copy">
                      <strong>View approved projects</strong>
                      <small>{counts.approved} approved submissions</small>
                    </span>
                    <span className="id-quick-arrow">→</span>
                  </button>
                </div>
              </section>
            </>
          )}

          {activePage === "settings" && (
            <section className="id-settings-layout">
              <div className="id-panel id-settings-panel">
                <div className="id-panel-heading">
                  <div>
                    <h3>Institution Logo</h3>
                    <p>Upload or change the logo displayed on your institution portal.</p>
                  </div>
                </div>

                <div className="id-settings-logo-area">
                  <div className="id-settings-logo-preview">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Selected institute logo preview" />
                    ) : (
                      <InstitutionLogo institution={institution} className="id-settings-logo-current" />
                    )}
                  </div>
                  <div className="id-settings-logo-copy">
                    <strong>{institutionName}</strong>
                    <span>JPG, PNG or WEBP · Maximum 2 MB</span>
                    <label className="id-secondary-btn id-file-picker">
                      Choose Logo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleLogoSelect}
                        disabled={logoSaving}
                      />
                    </label>
                    {selectedLogo && <small className="id-selected-file">Selected: {selectedLogo.name}</small>}
                  </div>
                </div>

                {settingsError && (
                  <div className="id-alert id-alert-error id-settings-alert">
                    <span>!</span><div><p>{settingsError}</p></div>
                  </div>
                )}
                {settingsMessage && <div className="id-settings-success">{settingsMessage}</div>}

                <div className="id-settings-actions">
                  <button className="id-primary-btn" onClick={handleLogoUpload} disabled={!selectedLogo || logoSaving}>
                    {logoSaving ? "Saving..." : "Save Logo"}
                  </button>
                  <button
                    className="id-secondary-btn"
                    onClick={handleLogoRemove}
                    disabled={logoSaving || !institution?.logo}
                  >
                    Remove Logo
                  </button>
                  {selectedLogo && (
                    <button
                      className="id-text-btn"
                      onClick={() => {
                        setSelectedLogo(null);
                        setLogoPreview("");
                        setSettingsError("");
                      }}
                      disabled={logoSaving}
                    >
                      Cancel selection
                    </button>
                  )}
                </div>
              </div>

              <div className="id-panel id-settings-panel">
                <div className="id-panel-heading">
                  <div>
                    <h3>Institution Information</h3>
                    <p>Your registered institution details.</p>
                  </div>
                </div>
                <div className="id-settings-info-grid">
                  <div><span>Institution Name</span><strong>{institution?.name || institution?.institutionName || "—"}</strong></div>
                  <div><span>Email Address</span><strong>{institution?.email || "—"}</strong></div>
                  <div><span>Location</span><strong>{institution?.location || "Not provided"}</strong></div>
                  <div><span>Website</span><strong>{institution?.website || "Not provided"}</strong></div>
                  <div><span>Contact Email</span><strong>{institution?.contactEmail || "Not provided"}</strong></div>
                  <div><span>Account Status</span><strong className="id-settings-status">{institution?.status || "—"}</strong></div>
                </div>
                <p className="id-settings-note">
                  Institution information is shown here for reference. Logo changes are saved to your account.
                </p>
              </div>

              <div className="id-panel id-settings-panel id-settings-logout-panel">
                <div className="id-panel-heading">
                  <div>
                    <h3>Sign Out</h3>
                    <p>Sign out of your institution account on this device.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="id-settings-logout-btn"
                  onClick={logout}
                >
                  <span aria-hidden="true">↪</span>
                  Logout
                </button>
              </div>
            </section>
          )}

          {activePage !== "overview" && activePage !== "settings" && (
            <section className="id-panel id-projects-panel">
              <div className="id-panel-heading id-list-heading">
                <div>
                  <h3>{pageTitle}</h3>
                  <p>
                    {visibleProjects.length} project
                    {visibleProjects.length === 1 ? "" : "s"} found
                  </p>
                </div>

                <div className="id-filter-controls">
                  <label className="id-search-box">
                    <span>⌕</span>
                    <input
                      type="search"
                      placeholder="Search projects..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </label>

                  <select
                    className="id-category-select"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    aria-label="Filter by category"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="id-loading">
                  <span className="id-spinner" />
                  Loading projects...
                </div>
              ) : (
                renderProjectTable(visibleProjects)
              )}
            </section>
          )}

          <footer className="id-footer">
            <span>
              © {new Date().getFullYear()} ProjectHub
              <span className="id-footer-dot">·</span>
              Institution Workspace
            </span>

            <span className="id-footer-updated">
              {lastUpdated
                ? `Last synced at ${lastUpdated.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Secure institution portal"}
            </span>
          </footer>
        </div>
      </main>
      {chatOpen && (
        <SupportChat
          role="institution"
          onClose={() => setChatOpen(false)}
          onUnauthorized={logout}
        />
      )}
    </div>
  );
}

export default InstitutionDashboard;