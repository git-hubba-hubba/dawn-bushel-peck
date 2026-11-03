import { RunResults } from "./Results";
import { api } from "../hooks/useWorkspace";
import { useState } from "react";
export function RunTimeline({ runs, refresh }) {
  const [error, setError] = useState("");
  async function cancel(id) {
    try {
      await api(`/runs/${id}/cancel`, { method: "POST", body: "{}" });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  if (!runs.length)
    return (
      <section className="panel empty-state" id="live-execution">
        <span className="eyebrow">EXECUTION TIMELINE</span>
        <h3>Your first run starts here</h3>
        <p>
          Save an idea and route it through a structure to see agent handoffs,
          deliverables, and measured performance.
        </p>
      </section>
    );
  return (
    <section className="panel run-panel" id="live-execution">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">LIVE EXECUTION</span>
          <h2>Agent activity & deliverables</h2>
        </div>
        <span className="subtle-pill">{runs.length} runs</span>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {runs.map((run) => (
        <article className="run-item" key={run._id}>
          <div className="run-heading">
            <strong>{run.structureId} ecosystem</strong>
            <span className={`run-status ${run.status}`}>{run.status}</span>
            {["queued", "running"].includes(run.status) && (
              <button onClick={() => cancel(run._id)}>Cancel</button>
            )}
          </div>
          {run.status === "queued" && (
            <p className="muted">Waiting for an available worker.</p>
          )}
          {run.error && <p className="error">{run.error}</p>}
          {run.report && <RunResults run={run} />}
          <details className="result-activity" open={!run.report}>
            <summary>
              {run.report
                ? "Inspect agent contributions & handoffs"
                : "Live agent activity"}
            </summary>
            <div className="step-list">
              {Object.values(run.stepState || {}).map((step) => (
                <details key={step.id} open={step.status === "running"}>
                  <summary>
                    <span className="status-dot" />
                    {step.role}
                    <span>
                      {step.status}
                      {step.durationMs
                        ? ` · ${(step.durationMs / 1000).toFixed(1)}s`
                        : ""}
                    </span>
                  </summary>
                  {step.mandate && <p className="muted">{step.mandate}</p>}
                  {step.dependsOn?.length > 0 && (
                    <p className="setup-note">
                      Receives work from: {step.dependsOn.join(", ")}
                    </p>
                  )}
                  {step.status === "running" && (
                    <p role="status">Generating deliverable…</p>
                  )}
                  {step.preview && (
                    <>
                      <p className="setup-note">
                        Live draft output · unvalidated until the agent
                        completes
                      </p>
                      <pre className="live-preview">{step.preview}</pre>
                    </>
                  )}
                  {step.output && (
                    <p className="deliverable">{step.output.summary}</p>
                  )}
                  {step.output && (
                    <p className="deliverable">{step.output.deliverable}</p>
                  )}
                </details>
              ))}
            </div>
          </details>
        </article>
      ))}
    </section>
  );
}
