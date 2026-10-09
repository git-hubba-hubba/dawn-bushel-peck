export function Sidebar({ view, setView, workspace }) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#">
        <span className="brand-mark">d</span>dawn
        <span className="brand-dot">.</span>
      </a>
      <div className="workspace-badge">
        <span className="workspace-icon">D</span>
        <div>
          Idea workspace<small>Organizational intelligence</small>
        </div>
      </div>
      <p className="nav-label">WORKSPACE</p>
      {[
        ["studio", "◈", "Ecosystem studio"],
        ["analytics", "▥", "Top structures"],
      ].map(([key, icon, label]) => (
        <button
          key={key}
          className={`nav-item ${view === key ? "active" : ""}`}
          onClick={() => setView(key)}
        >
          <span aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
      <div className="sidebar-bottom">
        <span className="status-dot" />
        {workspace.status ? "MongoDB connected" : "Local workspace"}
        <small>
          {workspace.status?.providerConfigured
            ? "AI execution configured"
            : "Provider connection pending"}
        </small>
        {workspace.authenticated && (
          <button className="logout-button" onClick={workspace.logout}>
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
