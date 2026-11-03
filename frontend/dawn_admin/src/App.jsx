import { AccountForm } from "./components/AccountForm";
import { useEffect, useRef, useState } from "react";
import { IdeaJourney } from "./components/IdeaJourney";
import { structureById } from "../../../shared/structures";
import { useWorkspace } from "./hooks/useWorkspace";
import { DemoTutorial } from "./components/DemoTutorial";
import { Welcome } from "./components/Welcome";
import { Sidebar } from "./components/Sidebar";
import { EcosystemCarousel } from "./components/EcosystemCarousel";
import { ContentWorkspace } from "./components/ContentWorkspace";
import { Analytics } from "./components/Analytics";
import { RunTimeline } from "./components/RunTimeline";
import { ActionProposals } from "./components/ActionProposals";
import { WorkspaceArtifacts } from "./components/WorkspaceArtifacts";
import "./App.css";
import "./Workspace.css";
export default function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const authDialog = useRef(null);
  useEffect(() => {
    if (authOpen) authDialog.current?.showModal();
    else authDialog.current?.close();
  }, [authOpen]);
  const [recommendations, setRecommendations] = useState(null);
  const [demo, setDemo] = useState(false);
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
    analytics: "Top structures",
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
  if (demo) return <DemoTutorial onExit={() => setDemo(false)} />;
  if (!workspace.authenticated && !exploring)
    return (
      <Welcome
        workspace={workspace}
        onExplore={() => setExploring(true)}
        onDemo={() => setDemo(true)}
      />
    );
  return (
    <div className="app-shell">
      <dialog
        ref={authDialog}
        className="account-dialog"
        aria-label="Sign in to your workspace"
        onCancel={() => setAuthOpen(false)}
      >
        {authOpen && (
          <AccountForm
            workspace={workspace}
            onClose={() => setAuthOpen(false)}
          />
        )}
      </dialog>
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
            setRecommendations(null);
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
            <button className="welcome-back" onClick={() => setAuthOpen(true)}>
              Create account / Sign in
            </button>
          )}
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                A LITTLE SPARK. A CLEARER DIRECTION.
              </div>
              <h1>
                {view === "studio" ? (
                  <>
                    Your idea.
                    <br />
                    <span>Its best way forward.</span>
                  </>
                ) : (
                  <>
                    Seven structures.
                    <br />
                    <span>One informed decision.</span>
                  </>
                )}
              </h1>
              <p>
                Tell Dawn what you want to build. Find the organizational
                structure that fits your idea, then compare how seven agent
                ecosystems bring it to life.
              </p>
            </div>
            <div className="dawn-emblem" aria-hidden="true">
              <div className="emblem-sun" />
              <div className="emblem-horizon" />
              <span>ONE IDEA / SEVEN POSSIBILITIES</span>
            </div>
          </div>
          {view === "studio" && (
            <IdeaJourney
              hasIdea={Boolean(projectId)}
              hasRecommendation={Boolean(recommendations)}
              hasComparison={Boolean(
                projectId &&
                workspace.runs.some(
                  (run) =>
                    run.projectId === projectId &&
                    run.batchId === workspace.batchId,
                ),
              )}
              onCompare={() => setView("analytics")}
            />
          )}
          {workspace.error && (
            <div className="connection-notice" role="status">
              {workspace.error}
              <button className="secondary-button" onClick={workspace.refresh}>
                Check connection again
              </button>
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
            <ContentWorkspace
              model={model}
              workspace={workspace}
              weights={weights}
              setWeights={setWeights}
              onCompare={() => setView("analytics")}
              onProject={(id) => {
                setProjectId(id);
                setRecommendations(null);
              }}
              onSelect={onSelect}
              assessmentResult={recommendations}
              onRecommendations={setRecommendations}
            />
            <EcosystemCarousel selected={selected} onSelect={setSelected} />
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
