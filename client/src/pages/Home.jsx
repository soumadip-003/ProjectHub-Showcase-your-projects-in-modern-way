import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

const API_URL = 'http://localhost:5000/api/projects/gallery';

const TECHNOLOGIES = [
  'All',
  'React',
  'JavaScript',
  'Python',
  'Node.js',
  'HTML',
  'CSS',
  'AI',
  'MongoDB',
];

const PROJECT_COLORS = [
  'purple',
  'blue',
  'orange',
  'green',
  'pink',
  'cyan',
];

function normalizeTechnologies(technologies) {
  if (Array.isArray(technologies)) {
    return technologies
      .flatMap((item) =>
        typeof item === 'string' ? item.split(',') : []
      )
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof technologies === 'string') {
    return technologies
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function Home() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const [submittedProjects, setSubmittedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch approved projects from MongoDB through the backend API.
  useEffect(() => {
    const controller = new AbortController();

    async function fetchProjects() {
      try {
        const response = await fetch(API_URL, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
          signal: controller.signal,
        });

        let data;

        try {
          data = await response.json();
        } catch {
          throw new Error('The server returned an invalid response.');
        }

        if (!response.ok || data.success !== true) {
          throw new Error(
            data.message || 'Unable to load approved projects.'
          );
        }

        const projects = Array.isArray(data.projects)
          ? data.projects
          : [];

        if (controller.signal.aborted) return;

        // The public gallery API returns approved projects only.
        setError('');
        setSubmittedProjects(projects);
      } catch (err) {
        if (err.name === 'AbortError') return;

        console.error('Project gallery loading error:', err);

        if (!controller.signal.aborted) {
          setSubmittedProjects([]);
          setError(
            'Could not load projects. Please check whether the backend server is running.'
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchProjects();

    return () => controller.abort();
  }, [refreshKey]);

  const refreshProjects = () => {
    setLoading(true);
    setError('');
    setRefreshKey((currentKey) => currentKey + 1);
  };

  // Normalize API data for the existing project-card design.
  const projects = submittedProjects.map((project, index) => {
    const tech = normalizeTechnologies(project.technologies);

    return {
      ...project,
      id: project._id || project.id || `project-${index}`,
      tech,
      author: project.studentName || 'Student',
      institutionName: project.institutionName || '',
      github: project.githubUrl || '',
      demo: project.demoUrl || '',
      color: PROJECT_COLORS[index % PROJECT_COLORS.length],
      icon: '💻',
    };
  });

  // Search and technology filtering.
  const filteredProjects = projects.filter((project) => {
    const searchTerm = search.toLowerCase().trim();

    const searchableFields = [
      project.title,
      project.description,
      project.author,
      project.institutionName,
      ...project.tech,
    ];

    const matchesSearch = searchableFields.some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(searchTerm)
    );

    const matchesFilter =
      activeFilter === 'All' ||
      project.tech.some((tech) => {
        const normalizedTech = tech.toLowerCase();
        const normalizedFilter = activeFilter.toLowerCase();

        return (
          normalizedTech === normalizedFilter ||
          normalizedTech.includes(normalizedFilter)
        );
      });

    return matchesSearch && matchesFilter;
  });

  const scrollToProjects = () => {
    document.getElementById('projects')?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  return (
    <div className="app">
      {/* NAVBAR */}
      <header className="navbar">
        <a href="#home" className="brand">
          <img
            className="brand-image"
            src="/projecthub-navbar-logo.png"
            alt="ProjectHub"
          />
        </a>

        <nav className="nav-links">
          <a className="nav-active" href="#home">
            Home
          </a>

          <a href="#projects">Explore Projects</a>

          <a href="#about">About</a>
        </nav>

        <div className="nav-actions">
          <Link to="/institute/signup" className="login-link">
            Institute Sign Up
          </Link>

          <Link to="/admin/login" className="login-link">
            Admin Login
          </Link>

          <Link to="/student/login" className="nav-submit">
            + Submit Project
          </Link>
        </div>

      </header>

      <main>
        {/* HERO SECTION */}
        <section className="hero" id="home">
          <div className="hero-glow glow-one"></div>
          <div className="hero-glow glow-two"></div>

          <div className="hero-content">
            <div className="announcement">
              <span className="announcement-dot"></span>
              A community for student innovators
              <span className="announcement-arrow">↗</span>
            </div>

            <h1>
              Great ideas deserve
              <br />
              to be <span className="gradient-text">showcased.</span>
            </h1>

            <p className="hero-description">
              Discover inspiring student projects, explore new technologies,
              and share the things you build with the world.
            </p>

            <div className="hero-buttons">
              <button
                className="primary-button"
                onClick={scrollToProjects}
              >
                Explore Projects <span>↗</span>
              </button>

              <Link to="/student/login" className="secondary-button">
                Submit Your Work <span>＋</span>
              </Link>

              <Link
                to="/institute/signup"
                className="secondary-button"
              >
                Register Your Institute <span>＋</span>
              </Link>
            </div>


            <div className="hero-trust">
              <div className="avatar-stack">
                <span>👨🏻‍💻</span>
                <span>👩🏽‍💻</span>
                <span>👨🏾‍🎓</span>
                <span>👩🏻‍🎓</span>
              </div>

              <div>
                <strong>Built by students, for students.</strong>
                <p>Learn together. Build together.</p>
              </div>
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="hero-visual">
            <div className="visual-orbit orbit-one"></div>
            <div className="visual-orbit orbit-two"></div>

            <div className="floating-card card-top">
              <span className="floating-icon purple-bg">✧</span>

              <div>
                <strong>Build something amazing</strong>
                <p>Your next idea starts here</p>
              </div>
            </div>

            <div className="code-window">
              <div className="window-header">
                <div className="window-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <span className="window-name">your-project.jsx</span>
                <span className="window-menu">•••</span>
              </div>

              <div className="code-content">
                <div>
                  <span className="line-number">01</span>{' '}
                  <span className="code-purple">const</span>{' '}
                  <span className="code-blue">dream</span> ={' '}
                  <span className="code-green">"big"</span>;
                </div>

                <div>
                  <span className="line-number">02</span>{' '}
                  <span className="code-purple">const</span>{' '}
                  <span className="code-blue">idea</span> ={' '}
                  <span className="code-green">"yours"</span>;
                </div>

                <div>
                  <span className="line-number">03</span>
                </div>

                <div>
                  <span className="line-number">04</span>{' '}
                  <span className="code-purple">function</span>{' '}
                  <span className="code-yellow">buildFuture</span>() {'{'}
                </div>

                <div>
                  <span className="line-number">05</span> &nbsp;{' '}
                  <span className="code-purple">return</span>{' '}
                  <span className="code-green">
                    "Something great ✨"
                  </span>;
                </div>

                <div>
                  <span className="line-number">06</span> {'}'}
                </div>

                <div>
                  <span className="line-number">07</span>
                </div>

                <div>
                  <span className="line-number">08</span>{' '}
                  <span className="code-comment">
                    // Share it with the world.
                  </span>
                </div>

                <div>
                  <span className="line-number">09</span>{' '}
                  <span className="code-blue">buildFuture</span>();
                  <span className="cursor-blink">▍</span>
                </div>
              </div>

              <div className="code-footer">
                <span>⌘ &nbsp; Ready to create</span>
                <span className="code-status">● Live preview</span>
              </div>
            </div>

            <div className="floating-card card-bottom">
              <span className="floating-icon orange-bg">🚀</span>

              <div>
                <strong>Idea → Project → Impact</strong>
                <p>Make your work count</p>
              </div>
            </div>
          </div>

          <a href="#projects" className="scroll-indicator">
            <span></span> Scroll to explore
          </a>
        </section>

        {/* STATS SECTION */}
        <section
          className="stats-section"
          aria-label="Platform highlights"
        >
          <div className="stat-item">
            <strong>
              {submittedProjects.length}
              <span>+</span>
            </strong>
            <p>Approved projects</p>
          </div>

          <div className="stat-divider"></div>

          <div className="stat-item">
            <strong>∞</strong>
            <p>Ideas to discover</p>
          </div>

          <div className="stat-divider"></div>

          <div className="stat-item">
            <strong>100<span>%</span></strong>
            <p>Made for creativity</p>
          </div>
        </section>

        {/* PROJECTS SECTION */}
        <section className="projects-section" id="projects">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE SHOWCASE</span>

              <h2>
                Explore what students <span>build.</span>
              </h2>

              <p>
                Real ideas. Creative solutions. Endless possibilities.
              </p>
            </div>

            <span className="project-count">
              {filteredProjects.length}{' '}
              {filteredProjects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>

          <div className="project-toolbar">
            <div className="search-box">
              <span>⌕</span>

              <input
                type="search"
                placeholder="Search projects, technologies..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search projects"
              />

              <kbd>⌕</kbd>
            </div>

            <div className="filter-list">
              {TECHNOLOGIES.map((tech) => (
                <button
                  key={tech}
                  type="button"
                  className={
                    activeFilter === tech
                      ? 'filter-chip selected'
                      : 'filter-chip'
                  }
                  onClick={() => setActiveFilter(tech)}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="empty-state">
              <h3>Loading approved projects...</h3>
              <p>Please wait while we fetch projects from ProjectHub.</p>
            </div>
          )}

          {/* API error state */}
          {!loading && error && (
            <div className="empty-state" role="alert">
              <span>⚠️</span>
              <h3>Unable to load projects</h3>
              <p>{error}</p>

              <button
                type="button"
                className="primary-button"
                onClick={refreshProjects}
              >
                Try Again ↻
              </button>
            </div>
          )}

          {/* Project cards */}
          {!loading && !error && (
            <>
              <div className="project-grid">
                {filteredProjects.map((project, index) => (
                  <article
                    className="project-card"
                    key={project.id}
                  >
                    <div className={`project-art ${project.color}`}>
                      <span className="project-art-icon">
                        {project.icon}
                      </span>

                      <span className="project-art-label">
                        STUDENT PROJECT
                      </span>

                      <span className="project-art-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="project-info">
                      <div className="project-author">
                        <span className="author-avatar">
                          {project.author.charAt(0).toUpperCase()}
                        </span>

                        <span>{project.author}</span>

                        {project.institutionName && (
                          <span title="Institution">
                            · {project.institutionName}
                          </span>
                        )}
                      </div>

                      <h3>{project.title}</h3>

                      <p className="project-description">
                        {project.description}
                      </p>

                      <div className="tech-tags">
                        {project.tech.map((tech, techIndex) => (
                          <span key={`${tech}-${techIndex}`}>
                            {tech}
                          </span>
                        ))}
                      </div>

                      <div className="project-card-footer">
                        {project.github && (
                          <a
                            href={project.github}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            ↗ GitHub
                          </a>
                        )}

                        {project.demo && (
                          <a
                            href={project.demo}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Live Demo ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Empty state */}
              {filteredProjects.length === 0 && (
                <div className="empty-state">
                  <span>🔎</span>

                  <h3>
                    {projects.length === 0
                      ? 'No approved projects yet'
                      : 'No projects found'}
                  </h3>

                  <p>
                    {projects.length === 0
                      ? 'Approved projects will appear here after admin review.'
                      : 'Try another search or select a different technology.'}
                  </p>

                  {projects.length === 0 ? (
                    <Link to="/student/login" className="primary-button">
                      Submit Your Project <span>↗</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setActiveFilter('All');
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Refresh gallery */}
          {!loading && !error && (
            <div className="gallery-refresh">
              <button
                type="button"
                className="gallery-refresh-button"
                onClick={refreshProjects}
              >
                <span aria-hidden="true">↻</span>
                Refresh Projects
              </button>
            </div>
          )}
        </section>

        {/* ABOUT SECTION */}
        <section className="about-section" id="about">
          <span className="eyebrow">WHY PROJECTHUB?</span>

          <h2>
            Learn by building.
            <br />
            <span>Grow by sharing.</span>
          </h2>

          <p>
            ProjectHub is a student project showcase concept where
            creativity meets technology. Explore ideas, learn from
            fellow students, and celebrate the work you create.
          </p>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer" id="admin">
        <a href="#home" className="brand footer-brand">
          <img
            className="brand-image"
            src="/projecthub-navbar-logo.png"
            alt="ProjectHub"
          />
        </a>

        <p>Made with curiosity &amp; code.</p>

        <span>
          © {new Date().getFullYear()} ProjectHub · Student Project Showcase
        </span>
      </footer>
    </div>
  );
}

export default Home;