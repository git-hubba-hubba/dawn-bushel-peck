import { useState } from "react";
import { api } from "../hooks/useWorkspace";
export function ActionProposals({ workspace }) {
  const [error, setError] = useState("");
  const actions = workspace.runs.flatMap((run) =>
    (run.actions || []).map((action) => ({ ...action, runId: run._id })),
  );
  async function review(action, decision) {
    try {
      await api(`/runs/${action.runId}/actions/${action._id}/${decision}`, {
        method: "POST",
        body: "{}",
      });
      setError("");
      await workspace.refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <section className="panel action-panel">
      <span className="eyebrow">CONTROLLED AUTONOMY</span>
      <h2>External action proposals</h2>
      <p className="muted">
        Agents can propose actions. Free workspace drafts and tasks can execute
        automatically. Payment and critical software restructuring require
        approval. External tools must first be connected.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {actions.length ? (
        actions.map((action) => (
          <article className="action-card" key={action._id}>
            <div className="run-heading">
              <strong>{action.tool}</strong>
              <span className="run-status">{action.status}</span>
            </div>
            <p>{action.description}</p>
            <pre>{action.payload}</pre>
            {action.status === "pending" && (
              <div className="action-buttons">
                <button onClick={() => review(action, "reject")}>
                  Reject proposal
                </button>
                <button onClick={() => review(action, "approve")}>
                  Approve action
                </button>
              </div>
            )}
          </article>
        ))
      ) : (
        <div className="analytics-empty">
          <span>◎</span>
          <h3>No action proposals yet</h3>
          <p>
            Run a concept through an ecosystem to generate deliverables and any
            suggested external actions.
          </p>
        </div>
      )}
    </section>
  );
}
