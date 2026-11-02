import { useEffect, useState } from "react";
import { ComparisonPriorities } from "./ComparisonPriorities";
import { structureById } from "../../../../shared/structures";
import { StructureResult, ResultMetrics } from "./Results";
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
      <ComparisonPriorities weights={weights} setWeights={setWeights} />
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
          <div className="structure-result-grid">
            {result.rankings.slice(0, 3).map((rank, i) => (
              <StructureResult
                key={rank.id}
                id={rank.structureId}
                position={i}
                score={rank.score}
                reason={rank.reasoning}
                evidence={rank.evidence}
                tradeoff={structureById[rank.structureId]?.caution}
              >
                <ResultMetrics
                  items={[
                    [
                      "Observed runtime",
                      `${(rank.metrics.durationMs / 1000).toFixed(1)}s`,
                      "Measured",
                    ],
                    [
                      "Tokens used",
                      (
                        rank.metrics.inputTokens + rank.metrics.outputTokens
                      ).toLocaleString(),
                      "Measured",
                    ],
                    ["AI quality", `${rank.quality}/100`, "Model judgment"],
                    ["Purpose fit", `${rank.purposeFit}/100`, "Model judgment"],
                  ]}
                />
              </StructureResult>
            ))}
          </div>
          <div className="table-scroll">
            <table aria-label="All completed structure rankings">
              <caption>Every completed ecosystem, compared</caption>
              <thead>
                <tr>
                  <th scope="col">Rank / structure</th>
                  <th scope="col">Weighted score</th>
                  <th scope="col">AI quality</th>
                  <th scope="col">Purpose fit</th>
                  <th scope="col">Runtime</th>
                  <th scope="col">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {result.rankings.map((rank, index) => (
                  <tr key={rank.id}>
                    <th scope="row">
                      {index + 1}. {structureById[rank.structureId]?.name}
                    </th>
                    <td>{rank.score}/100</td>
                    <td>{rank.quality}/100</td>
                    <td>{rank.purposeFit}/100</td>
                    <td>{(rank.metrics.durationMs / 1000).toFixed(1)}s</td>
                    <td>
                      {(
                        rank.metrics.inputTokens + rank.metrics.outputTokens
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
