import { WorkflowRoadmap } from "./WorkflowRoadmap";
import { structureById } from "../../../../shared/structures";
import "./Results.css";
export function ResultMetrics({ items }) {
  return (
    <dl className="result-metrics">
      {items.map(([label, value, context]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
          {context && <small>{context}</small>}
        </div>
      ))}
    </dl>
  );
}
export function StructureResult({
  id,
  position,
  reason,
  evidence = [],
  tradeoff,
  score,
  children,
}) {
  const model = structureById[id];
  return (
    <article
      className={`structure-result ${position === 0 ? "leading-result" : ""}`}
    >
      <div className="result-card-heading">
        <span className="result-number">0{position + 1}</span>
        <div>
          <span className="eyebrow">
            {position === 0 ? "LEADING OPTION" : "ALTERNATIVE TO CONSIDER"}
          </span>
          <h3>{model?.name || id}</h3>
        </div>
        {score !== undefined && (
          <span className="result-score">
            {score}
            <small>weighted / 100</small>
          </span>
        )}
      </div>
      <h4>Why it fits</h4>
      <p>{reason}</p>
      {children}
      {evidence.length > 0 && (
        <>
          <h4>Evidence behind the recommendation</h4>
          <ul>
            {evidence.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {tradeoff && (
        <div className="result-tradeoff">
          <h4>Plan for this trade-off</h4>
          <p>{tradeoff}</p>
        </div>
      )}
    </article>
  );
}
export function RunResults({ run }) {
  const { report, metrics, evaluation } = run;
  return (
    <section className="run-results" aria-label="Workflow results">
      <div className="result-overview">
        <span className="eyebrow">YOUR WORKFLOW RESULT</span>
        <h3>Review the outcome, then decide what happens next.</h3>
        <p className="result-summary">{report.summary}</p>
        <span className="result-label">
          Generated deliverable · external launch is not confirmed by this
          result
        </span>
      </div>
      <ResultMetrics
        items={[
          [
            "Total run time",
            `${(metrics.durationMs / 1000).toFixed(1)}s`,
            "Observed execution + evaluation",
          ],
          [
            "Tokens used",
            (metrics.inputTokens + metrics.outputTokens).toLocaleString(),
            "Observed provider usage",
          ],
          ["Agent handoffs", metrics.handoffs, "Dependency transfers"],
          [
            "Estimated cost",
            metrics.costUsd == null
              ? "Not configured"
              : `$${metrics.costUsd.toFixed(4)}`,
            "Estimate, not a billing record",
          ],
        ]}
      />
      <WorkflowRoadmap
        roadmap={report.roadmap}
        missingRequirements={report.missingRequirements}
      />
      <div className="result-action-grid">
        <section className="result-action-card">
          <span className="eyebrow">DECISIONS MADE</span>
          <h4>What the agents concluded</h4>
          {report.decisions?.length ? (
            <ul>
              {report.decisions.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No decisions were included in this report.</p>
          )}
        </section>
        <section className="result-action-card">
          <span className="eyebrow">NEXT ACTIONS</span>
          <h4>Your path forward</h4>
          {report.nextSteps.length ? (
            <ol>
              {report.nextSteps.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          ) : (
            <p>No next steps were included in this report.</p>
          )}
        </section>
      </div>
      <details className="result-expand">
        <summary>Read the full deliverable</summary>
        <p className="deliverable">{report.deliverable}</p>
      </details>
      <details className="result-expand">
        <summary>
          Risks & unresolved requirements ({report.risks.length})
        </summary>
        {report.risks.length ? (
          <ul>
            {report.risks.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>
            No risks were included in this report; review the deliverable before
            acting.
          </p>
        )}
      </details>
      <details className="result-expand">
        <summary>Why the AI evaluator rated this output</summary>
        <ResultMetrics
          items={[
            ["AI quality", `${evaluation.quality}/100`, "Model judgment"],
            [
              "AI purpose fit",
              `${evaluation.purposeFit}/100`,
              "Model judgment",
            ],
          ]}
        />
        <p>{evaluation.reasoning}</p>
        <ul>
          {evaluation.evidence?.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </details>
      {run.actions?.length > 0 && (
        <p className="result-label">
          {run.actions.filter((action) => action.status === "succeeded").length}{" "}
          workspace actions completed ·{" "}
          {run.actions.filter((action) => action.status === "pending").length}{" "}
          awaiting review. Open Actions & saved deliverables below.
        </p>
      )}
    </section>
  );
}
