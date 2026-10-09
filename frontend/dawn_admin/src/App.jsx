import { useState } from "react";
import { structures, structureById } from "../../../shared/structures";
import { useWorkspace } from "./hooks/useWorkspace";
import { Welcome } from "./components/Welcome";
import { Sidebar } from "./components/Sidebar";
import { StructureDiagram } from "./components/StructureDiagram";
import { ContentWorkspace } from "./components/ContentWorkspace";
import { Analytics } from "./components/Analytics";
import { RunTimeline } from "./components/RunTimeline";
import { ActionProposals } from "./components/ActionProposals";
import { WorkspaceArtifacts } from "./components/WorkspaceArtifacts";
import "./App.css";
export default function App() {
  const [exploring, setExploring] = useState(false);
  const [selected, setSelected] = useState("flat"),
    [view, setView] = useState("studio"),
    [projectId, setProjectId] = useState(""),
    [weights, setWeights] = useState({
      quality: 50,
      speed: 50,
      efficiency: 50,
    });
  const workspace = useWorkspace(),
    model = structureById[selected];
  const onSelect = (id) => {
    setSelected(id);
    setView("studio");
  };
  const titles = {
    studio: "Ecosystem studio",
    analytics: "Performance analytics",
    compare: "Structure comparison",
    actions: "Action proposals",
  };
  const selectedRuns = workspace.runs
    .filter(
      (run) =>
        run.structureId === selected &&
        (!projectId || run.projectId === projectId),
    )
    .slice(0, 6);
  if (!workspace.authenticated && !exploring)
    return (
      <Welcome workspace={workspace} onExplore={() => setExploring(true)} />
    );
  return (
    <div className="app-shell">
      <Sidebar
        selected={selected}
        view={view}
        onSelect={onSelect}
        setView={setView}
        workspace={{
          ...workspace,
          logout: async () => {
            await workspace.logout();
            setExploring(false);
            setProjectId("");
          },
        }}
      />
      <div className="main-shell">
        <header className="topbar">
          <span>
            Workspace <span className="crumb">/</span>{" "}
            <strong>{titles[view]}</strong>
          </span>
          {workspace.authenticated ? (
            <span className="avatar">D</span>
          ) : (
            <button
              className="welcome-back"
              onClick={() => setExploring(false)}
            >
              Create account / Sign in
            </button>
          )}
        </header>
        <main>
          <div className="page-heading">
            <div className="eyebrow">ONE IDEA. MULTIPLE PERSPECTIVES.</div>
            <h1>
              Find the right structure.
              <br />
              <span>Give your idea room to thrive.</span>
            </h1>
            <p>
              Save a workflow, compare seven structures, and follow your agents
              from inception toward production readiness.
            </p>
          </div>
          <div className="intro-metrics">
            <div>
              <span>Organizational structures</span>
              <strong>
                07 <small>distinct operating models</small>
              </strong>
            </div>
            <div>
              <span>Completed executions</span>
              <strong>
                {String(
                  workspace.runs.filter((run) => run.status === "completed")
                    .length,
                ).padStart(2, "0")}{" "}
                <small>measured agent workflows</small>
              </strong>
            </div>
            <div>
              <span>Execution environment</span>
              <strong className="setup-value">
                {workspace.status?.providerConfigured
                  ? "Ready to execute"
                  : "Awaiting connection"}
                <small>
                  {workspace.status
                    ? "MongoDB connected"
                    : "Sign in to connect your workspace"}
                </small>
              </strong>
            </div>
          </div>
          {workspace.error && (
            <div className="connection-notice" role="status">
              {workspace.error}
            </div>
          )}
          {view === "analytics" ? (
            <Analytics
              workspace={workspace}
              weights={weights}
              setWeights={setWeights}
              projectId={projectId}
            />
          ) : null}
          <div hidden={view !== "studio"}>
            <div className="section-title">
              <div>
                <h2>Choose your ecosystem</h2>
                <p>
                  Same idea. A different way to organize, collaborate, and
                  execute.
                </p>
              </div>
              <span className="subtle-pill">
                Based on your organizational notes
              </span>
            </div>
            <div
              className="structure-tabs"
              role="tablist"
              aria-label="Organizational structures"
            >
              {structures.map((item) => (
                <button
                  role="tab"
                  aria-selected={selected === item.id}
                  aria-controls="structure-panel"
                  id={`tab-${item.id}`}
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                >
                  <span aria-hidden="true">{item.symbol}</span>
                  {item.name}
                </button>
              ))}
            </div>
            <div className="studio-grid">
              <section
                className="panel model-panel"
                role="tabpanel"
                id="structure-panel"
                aria-labelledby={`tab-${selected}`}
              >
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">STRUCTURE PREVIEW</span>
                    <h2>{model.name} ecosystem</h2>
                  </div>
                  <span className="model-tag">{model.tag}</span>
                </div>
                <p className="model-description">{model.description}</p>
                <StructureDiagram model={model} />
                <div className="diagram-legend">
                  <span>
                    <i className="legend-dot navy" /> Leadership / strategy
                  </span>
                  <span>
                    <i className="legend-dot teal" /> Teams / specialists
                  </span>
                  <span>
                    <i className="legend-dot orange" /> Collaboration / guidance
                  </span>
                </div>
                <div className="model-details">
                  <div>
                    <span>DECISION AUTHORITY</span>
                    <p>{model.authority}</p>
                  </div>
                  <div>
                    <span>INFORMATION FLOW</span>
                    <p>{model.flow}</p>
                  </div>
                </div>
              </section>
              <ContentWorkspace
                model={model}
                workspace={workspace}
                weights={weights}
                onProject={setProjectId}
              />
            </div>
            <div className="insight-grid">
              <section className="panel insight">
                <span className="insight-icon">↗</span>
                <div>
                  <span className="eyebrow">WHERE IT THRIVES</span>
                  <h3>{model.fit}</h3>
                  <p>{model.strength}</p>
                </div>
              </section>
              <section className="panel insight">
                <span className="insight-icon risk-icon">◎</span>
                <div>
                  <span className="eyebrow">DESIGN FOR THE TRADE-OFF</span>
                  <h3>{model.risk}</h3>
                  <p>{model.caution}</p>
                </div>
              </section>
            </div>
            <RunTimeline runs={selectedRuns} refresh={workspace.refresh} />
            <details className="panel">
              <summary>Actions & saved deliverables</summary>
              <ActionProposals workspace={workspace} />
              <WorkspaceArtifacts artifacts={workspace.artifacts} />
            </details>
          </div>
          <footer>
            <span className="status-dot" /> Private workspace · explicit action
            controls
            <span>Source: Organizational Structure Notes · pp. 4–11</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
