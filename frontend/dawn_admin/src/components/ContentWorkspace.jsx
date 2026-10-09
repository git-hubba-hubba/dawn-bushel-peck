import { useId, useState } from "react";
import { api } from "../hooks/useWorkspace";
export function ContentWorkspace({ model, workspace, weights, onProject }) {
  const id = useId(),
    [content, setContent] = useState(""),
    [name, setName] = useState(""),
    [projectId, setProjectId] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [password, setPassword] = useState("");
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
      setContent(project.content);
      setName(project.name);
      setProjectId(project._id);
      onProject(project._id);
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
    });
  }
  return (
    <section className="panel content-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">START WITH YOUR IDEA</span>
          <h2>Your workflow</h2>
        </div>
        <span className="step-badge">01</span>
      </div>
      <p className="muted">
        Bring a concept, brief, or working draft into your selected ecosystem.
      </p>
      {!workspace.authenticated ? (
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
          <label htmlFor={`${id}-password`}>Unlock your workspace</label>
          <input
            id={`${id}-password`}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Workspace password"
            required
            maxLength={256}
          />
          <button className="run-button" disabled={busy}>
            {busy ? "Connecting…" : "Sign in"} <span>→</span>
          </button>
          <p className="setup-note">
            Your server must be connected to MongoDB. Credentials stay on the
            server.
          </p>
        </form>
      ) : (
        <>
          <label className="text-label" htmlFor={`${id}-project`}>
            Saved workflows
          </label>
          <select
            id={`${id}-project`}
            value={projectId}
            disabled={busy}
            onChange={(e) =>
              perform(async () => {
                if (!e.target.value) {
                  setProjectId("");
                  onProject("");
                  setContent("");
                  setName("");
                  onProject("");
                  return;
                }
                const project = await api(`/projects/${e.target.value}`);
                setProjectId(project._id);
                setContent(project.content);
                setName(project.name);
                onProject(project._id);
              })
            }
          >
            <option value="">New workflow</option>
            {workspace.projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
          <label className="upload-zone" htmlFor={id}>
            <span className="upload-icon">↥</span>
            <strong>Add your source material</strong>
            <span>Choose a document to get started</span>
            <small>PDF, DOCX, TXT, Markdown · up to 5 MB</small>
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
      <label className="text-label" htmlFor={`${id}-name`}>
        Concept name
      </label>
      <input
        id={`${id}-name`}
        value={name}
        maxLength={120}
        onChange={(e) => {
          setName(e.target.value);
          setProjectId("");
          onProject("");
        }}
        placeholder="Give your idea a name"
      />
      <label className="text-label" htmlFor={`${id}-idea`}>
        Or write your idea
      </label>
      <textarea
        id={`${id}-idea`}
        value={content}
        maxLength={80000}
        onChange={(e) => {
          setContent(e.target.value);
          setProjectId("");
          onProject("");
        }}
        placeholder="What would you like to develop?"
      />
      <div className="content-meta">
        <span>{content.length.toLocaleString()} / 80,000 characters</span>
        {content && (
          <button
            disabled={busy}
            onClick={() => {
              setContent("");
              setName("");
              setProjectId("");
              onProject("");
              onProject("");
            }}
          >
            Clear
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button
        className="secondary-button"
        disabled={busy || !workspace.authenticated || !content.trim()}
        onClick={() => perform(save)}
      >
        {projectId ? "Workflow saved" : "Save workflow"}
      </button>
      <p className="setup-note">
        Edits are saved as a new workflow so previous execution sources stay
        intact.
      </p>
      <div className="routing">
        <span className="legend-dot teal" />
        <span>Selected route</span>
        <strong>{model.name} ecosystem</strong>
      </div>
      <button
        className="run-button"
        disabled={
          busy ||
          !workspace.authenticated ||
          !workspace.status?.providerConfigured ||
          !content.trim()
        }
        onClick={() => run([model.id])}
      >
        {busy ? "Preparing…" : "Run through ecosystem"} <span>↗</span>
      </button>
      <button
        className="secondary-button"
        disabled={
          busy ||
          !workspace.authenticated ||
          !workspace.status?.providerConfigured ||
          !content.trim()
        }
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
        Compare all 7 structures
      </button>
      <p className="setup-note">
        Runs send your saved content to the AI provider and incur API usage.
        Payment and critical software changes require approval; other configured
        tools follow workspace permissions.
      </p>
    </section>
  );
}
