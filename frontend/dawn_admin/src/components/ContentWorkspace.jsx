import { WorkflowRecommendations } from "./WorkflowRecommendations";
import { ComparisonPriorities } from "./ComparisonPriorities";
import { EvidenceGuide } from "./EvidenceGuide";
import { useId, useState } from "react";
import { useIdeaAssessment } from "../hooks/useIdeaAssessment";
import { api } from "../hooks/useWorkspace";
export function ContentWorkspace({
  model,
  workspace,
  weights,
  setWeights,
  onCompare,
  onProject,
  onRecommendations,
  assessmentResult,
  onSelect,
}) {
  const id = useId(),
    [content, setContent] = useState(""),
    [name, setName] = useState(""),
    [projectId, setProjectId] = useState(""),
    [chosenStructure, setChosenStructure] = useState(""),
    [savedName, setSavedName] = useState(""),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [password, setPassword] = useState("");
  const assessment = useIdeaAssessment({
    content,
    name,
    projectId,
    setProjectId,
    workspace,
    weights,
    onProject,
    onRecommendations,
    busy,
  });
  const blockedReason = !workspace.authenticated
    ? "Sign in to save your idea and use AI assessment or execution."
    : workspace.error ||
      (!workspace.status
        ? "Workspace connection is not verified. Restore the API connection to continue."
        : "") ||
      (!workspace.status?.providerConfigured
        ? "Configure the server AI provider before assessment or execution."
        : "") ||
      (!content.trim() ? "Describe your idea above to continue." : "") ||
      (busy
        ? "Wait for the current operation to finish."
        : assessment.assessing
          ? "Wait for the assessment to finish."
          : "");
  async function choose(structureId) {
    await perform(async () => {
      const selectedId = await save();
      await api(`/projects/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({ selectedStructure: structureId }),
      });
      setChosenStructure(structureId);
      onSelect(structureId);
      setNotice(
        "Ecosystem choice saved. Run it below to generate deliverables and an estimated roadmap.",
      );
      await workspace.refresh();
    });
  }
  async function rename() {
    await perform(async () => {
      const result = await api(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      setSavedName(result.name);
      setNotice("Workflow renamed.");
      await workspace.refresh();
    });
  }
  async function perform(task) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose a file under 5 MB.");
      return;
    }
    await perform(async () => {
      const body = new FormData();
      body.append("file", file);
      const project = await api("/documents", { method: "POST", body });
      setChosenStructure(project.selectedStructure || "");
      if (project.selectedStructure) onSelect(project.selectedStructure);
      setContent(project.content);
      setName(project.name);
      setSavedName(project.name);
      setProjectId(project._id);
      onProject(project._id);
      onRecommendations(project.recommendations || null);
      await workspace.refresh();
    });
  }
  async function save() {
    let selected = projectId;
    if (!selected) {
      const project = await api("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim() || "Untitled workflow",
          content,
        }),
      });
      setSavedName(name.trim() || "Untitled workflow");
      selected = project._id;
      setProjectId(selected);
      onProject(selected);
    }
    await workspace.refresh();
    return selected;
  }
  async function run(all) {
    await perform(async () => {
      const selected = await save();
      await workspace.start(selected, all, weights);
      setNotice(
        "Execution queued. Live agent activity will appear below when a worker picks it up.",
      );
      setTimeout(
        () =>
          document
            .getElementById("live-execution")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        0,
      );
    });
  }
  return (
    <>
      <section
        className="panel content-panel"
        id="idea-input"
        aria-label="Describe your idea"
      >
        <div className="panel-heading">
          <div>
            <span className="eyebrow">01 / THE STARTING POINT</span>
            <h2>What do you have in mind?</h2>
          </div>
          <span className="editor-status">
            {projectId ? "✓ Saved idea" : "Your next beginning"}
          </span>
        </div>
        <p className="muted">
          Describe what you want to build, who it helps, and what success looks
          like. Dawn will assess which agent ecosystem fits.
        </p>
        <div className="idea-composer-grid">
          <div className="idea-editor">
            {workspace.authenticated && workspace.projects.length > 0 && (
              <>
                <label className="text-label" htmlFor={`${id}-project`}>
                  Saved workflows
                </label>
                <select
                  id={`${id}-project`}
                  value={projectId}
                  disabled={busy}
                  onChange={(event) => {
                    const selectedId = event.target.value;
                    perform(async () => {
                      if (!selectedId) {
                        setChosenStructure("");
                        setProjectId("");
                        onProject("");
                        setContent("");
                        setName("");
                        return;
                      }
                      const project = await api(`/projects/${selectedId}`);
                      setProjectId(project._id);
                      setChosenStructure(project.selectedStructure || "");
                      if (project.selectedStructure)
                        onSelect(project.selectedStructure);
                      setContent(project.content);
                      setName(project.name);
                      setSavedName(project.name);
                      onProject(project._id);
                      onRecommendations(project.recommendations || null);
                    });
                  }}
                >
                  <option value="">New workflow</option>
                  {workspace.projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            <label className="text-label" htmlFor={`${id}-name`}>
              Workflow name <span className="optional-label">optional</span>
            </label>
            <input
              id={`${id}-name`}
              value={name}
              disabled={busy}
              maxLength={120}
              onChange={(event) => {
                setName(event.target.value);
                setNotice("");
              }}
              placeholder="Give your idea a name"
            />
            {projectId && (
              <button
                className="secondary-button"
                disabled={
                  busy ||
                  assessment.assessing ||
                  !name.trim() ||
                  name.trim() === savedName
                }
                onClick={rename}
              >
                Save workflow name
              </button>
            )}
            {notice && <p role="status">{notice}</p>}
            <label className="text-label" htmlFor={`${id}-idea`}>
              Or write your idea
            </label>
            <textarea
              id={`${id}-idea`}
              value={content}
              disabled={busy}
              maxLength={80000}
              onChange={(event) => {
                setContent(event.target.value);
                setNotice("");
                setChosenStructure("");
                setProjectId("");
                onProject("");
              }}
              placeholder="I want to build…

Who is it for? What problem does it solve? Share any goals, resources, or constraints you already know."
            />
            <div className="content-meta">
              <span>{content.length.toLocaleString()} / 80,000 characters</span>
              {content && (
                <button
                  disabled={busy}
                  onClick={() => {
                    setNotice("");
                    setChosenStructure("");
                    setContent("");
                    setName("");
                    setProjectId("");
                    onProject("");
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {workspace.authenticated && (
              <>
                <label className="upload-zone" htmlFor={id}>
                  <span className="upload-icon" aria-hidden="true">
                    ↥
                  </span>
                  <span>
                    <strong>Or upload a brief</strong>
                    <small>PDF, DOCX, TXT, Markdown · up to 5 MB</small>
                  </span>
                  <span aria-hidden="true">+</span>
                </label>
                <input
                  className="file-input"
                  id={id}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  disabled={busy}
                  onChange={upload}
                />
              </>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="assessment-status">
              <button
                className="run-button assessment-button"
                disabled={Boolean(blockedReason)}
                aria-describedby={`${id}-assessment-help`}
                onClick={assessment.assess}
              >
                <span>
                  {assessment.assessing
                    ? "Assessing your idea…"
                    : assessment.failure
                      ? "Retry ecosystem assessment"
                      : "Suggest ecosystems for my idea"}
                </span>
                <span aria-hidden="true">↗</span>
              </button>
              <p
                id={`${id}-assessment-help`}
                role="status"
                className="setup-note"
              >
                {blockedReason ||
                  (assessment.assessing
                    ? "Assessing your saved idea… You can keep editing; outdated results will be discarded."
                    : !workspace.authenticated
                      ? "Sign in to save your idea and get a personalized recommendation."
                      : !workspace.status?.providerConfigured
                        ? "Your idea is editable. AI assessment and comparisons become available when the server provider is configured."
                        : "Automatically assesses after you pause typing for 1.5 seconds. Your idea is saved and sent to the AI provider; API usage applies.")}
              </p>
            </div>
            <details className="source-options">
              <summary>Save without assessing</summary>
              <button
                className="secondary-button"
                disabled={
                  busy ||
                  assessment.assessing ||
                  !workspace.authenticated ||
                  !content.trim()
                }
                onClick={() => perform(save)}
              >
                {projectId ? "Workflow saved" : "Save workflow"}
              </button>
              <p className="setup-note">
                Edits create a new saved workflow, preserving earlier execution
                sources.
              </p>
            </details>
            {!workspace.authenticated && (
              <details className="source-options">
                <summary>Existing owner workspace sign in</summary>
                <form
                  className="login-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    perform(async () => {
                      await workspace.login(password);
                      setPassword("");
                    });
                  }}
                >
                  <label htmlFor={`${id}-password`}>
                    Unlock your workspace
                  </label>
                  <input
                    id={`${id}-password`}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Workspace password"
                    required
                    maxLength={256}
                  />
                  <button className="run-button" disabled={busy}>
                    {busy ? "Connecting…" : "Sign in"}
                    <span>→</span>
                  </button>
                </form>
              </details>
            )}
          </div>
          <aside
            className="idea-compass"
            aria-label="How Dawn finds your best fit"
          >
            <div className="compass-symbol" aria-hidden="true">
              ✳
            </div>
            <span className="eyebrow">THE RIGHT TEAM FOR YOUR IDEA</span>
            <h3>
              Different structures.
              <br />
              Different possibilities.
            </h3>
            <p>
              Dawn assesses how each structure’s decision-making, specialist
              roles, and handoffs suit your idea.
            </p>
            <div className="compass-divider" />
            <h4>What matters most to you?</h4>
            <p>
              Set your priorities for the recommendation and run comparison.
            </p>
            <ComparisonPriorities weights={weights} setWeights={setWeights} />
            <p className="setup-note">
              Equal priorities to start. Fit and quality are AI judgments;
              runtime and token usage are measured after execution.
            </p>
          </aside>
        </div>
        {content.trim() && (
          <EvidenceGuide
            content={content}
            result={assessmentResult}
            disabled={busy}
            onAddDetails={(details) => {
              const combined = `${content.trim()}\n\nAdditional user-provided details and open questions:\n${details}`;
              if (combined.length > 80000) {
                setError(
                  "These details would exceed 80,000 characters. Shorten the brief before adding them.",
                );
                return false;
              }
              setChosenStructure("");
              setContent(combined);
              setProjectId("");
              onProject("");
            }}
          />
        )}
      </section>
      <WorkflowRecommendations
        result={assessmentResult}
        assessing={assessment.assessing}
        failure={assessment.failure}
        blockedReason={blockedReason}
        onRetry={assessment.assess}
        selectionError={error}
        selected={chosenStructure}
        selectionDisabled={
          busy ||
          assessment.assessing ||
          !workspace.authenticated ||
          !workspace.status
        }
        onSelect={choose}
      />
      <section
        className="panel execution-launch"
        id="idea-execution"
        aria-label="Compare agent ecosystems"
      >
        <div>
          <span className="eyebrow">READY TO TEST THE FIT?</span>
          <h3>One idea. Seven ways to execute.</h3>
          <p>
            Run the same saved idea through all seven structures. Compare
            outputs, quality, time, and token usage to find your strongest
            option.
          </p>
        </div>
        <div className="execution-buttons">
          <p id={`${id}-execution-help`} className="setup-note" role="status">
            {blockedReason ||
              "Ready to queue live execution. A running worker is required to process it."}
          </p>
          <button
            className="run-button"
            disabled={Boolean(blockedReason)}
            aria-describedby={`${id}-execution-help`}
            onClick={() =>
              run([
                "flat",
                "functional",
                "divisional",
                "agile",
                "matrix",
                "network",
                "decentralized",
              ])
            }
          >
            {busy ? "Preparing…" : "Compare all 7 structures"}
            <span aria-hidden="true">↗</span>
          </button>
          <details
            className="single-run-options"
            open={Boolean(chosenStructure)}
          >
            <summary>Or run one ecosystem</summary>
            <div className="routing">
              <span>Selected route</span>
              <strong>{model.name} ecosystem</strong>
            </div>
            <button
              className="secondary-button"
              disabled={Boolean(blockedReason)}
              onClick={() => run([model.id])}
            >
              Run through ecosystem
            </button>
          </details>
          {workspace.batchId && (
            <button className="secondary-button" onClick={onCompare}>
              View comparison results →
            </button>
          )}
        </div>
        <p className="setup-note execution-note">
          Comparisons use the AI provider across seven workflows and incur API
          usage. Recommendations are provisional. Payment and critical software
          changes require approval.
        </p>
      </section>
    </>
  );
}
