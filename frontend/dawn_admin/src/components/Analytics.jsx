import { useEffect, useState } from "react";
import { structureById } from "../../../../shared/structures";
import { api } from "../hooks/useWorkspace";
export function Analytics({ workspace, weights, setWeights, projectId }) {
  const [result, setResult] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!workspace.authenticated || !workspace.batchId) return;
    let active = true;
    api("/analytics", {
      method: "POST",
      body: JSON.stringify({ batchId: workspace.batchId, weights }),
    })
      .then((data) => {
        if (active) {
          setResult({ ...data, batchId: workspace.batchId });
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [workspace.authenticated, workspace.batchId, workspace.runs, weights]);
  const batches = [
    ...new Set(
      workspace.runs
        .filter((run) => !projectId || run.projectId === projectId)
        .map((run) => run.batchId),
    ),
  ];
  const validBatch = batches.includes(workspace.batchId);
  return (
    <section className="panel analytics-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">EVIDENCE OVER GUESSWORK</span>
          <h2>Top 3 structures for your workflow</h2>
        </div>
        <span className="model-tag">Measured runs</span>
      </div>
      <p className="muted">
        Adjust your priorities. Quality includes AI-scored purpose fit; speed
        and efficiency use observed runtime and tokens.
      </p>
      <div className="weight-controls">
        {Object.keys(weights).map((key) => (
          <label key={key}>
            {key}
            <strong>{weights[key]}</strong>
            <input
              aria-label={`${key} weight`}
              type="range"
              min="0"
              max="100"
              value={weights[key]}
              onChange={(e) => {
                const next = { ...weights, [key]: Number(e.target.value) };
                if (Object.values(next).some((value) => value > 0))
                  setWeights(next);
              }}
            />
          </label>
        ))}
      </div>
      <label className="text-label" htmlFor="comparison-batch">
        Comparison batch
      </label>
      <select
        id="comparison-batch"
        value={workspace.batchId}
        onChange={(e) => workspace.setBatchId(e.target.value)}
      >
        <option value="">Select a run batch</option>
        {batches.map((batch, i) => (
          <option key={batch} value={batch}>
            Batch {batches.length - i} ·{" "}
            {workspace.runs.filter((r) => r.batchId === batch).length}{" "}
            structures
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && validBatch && result.batchId === workspace.batchId ? (
        <>
          <p className="setup-note">
            {result.completed} of {result.total} runs completed. Rankings are
            provisional until all runs finish.
          </p>
          {result.rankings.length < 3 && (
            <p className="setup-note">
              Complete at least three structures to get a top three. Compare all
              seven to assess every option.
            </p>
          )}
          {result.rankings.slice(0, 3).map((rank, i) => (
            <article className="recommendation" key={rank.id}>
              <div className="ranking">
                <span className="rank-index">0{i + 1}</span>
                <strong>
                  {structureById[rank.structureId]?.name || rank.structureId}
                </strong>
                <div className="ranking-track">
                  <div style={{ width: `${rank.score}%` }} />
                </div>
                <span>{rank.score}/100</span>
              </div>
              <p>
                AI quality: {rank.quality}/100 · Purpose fit: {rank.purposeFit}
                /100 · Observed runtime:{" "}
                {(rank.metrics.durationMs / 1000).toFixed(1)}s · Tokens:{" "}
                {(
                  rank.metrics.inputTokens + rank.metrics.outputTokens
                ).toLocaleString()}{" "}
                · Handoffs: {rank.metrics.handoffs}
              </p>
              <p>{rank.reasoning}</p>
              <ul>
                {rank.evidence?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
          <p className="setup-note">{result.method}</p>
        </>
      ) : (
        <div className="analytics-empty">
          <span>▥</span>
          <h3>No performance data yet</h3>
          <p>
            Compare structures on the same saved concept to see measured
            results. Equal weights are the starting point; change them to match
            your priorities.
          </p>
        </div>
      )}
    </section>
  );
}
