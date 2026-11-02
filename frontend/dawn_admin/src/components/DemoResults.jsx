import {
  demoWorkflow,
  demoRecommendations,
  demoRoadmap,
} from "../demo/workflow";
import { WorkflowRoadmap } from "./WorkflowRoadmap";
import { ResultMetrics, StructureResult } from "./Results";
const purposes = [
  "Define what to build",
  "Turn scope into work",
  "Know how to validate",
  "Prepare day-to-day delivery",
  "Launch with a fallback",
];
export function DemoResults({ onExit }) {
  return (
    <section className="panel demo-panel demo-results">
      <div className="result-overview">
        <span className="eyebrow">EXAMPLE RESULTS → YOUR NEXT STEP</span>
        <h2>A production-readiness package</h2>
        <p>
          A repair-service idea becomes a reviewable plan: clear scope,
          implementation work, checks, and launch decisions.
        </p>
        <span className="result-label">
          Authored example · no live AI execution or deployment
        </span>
      </div>
      <ResultMetrics
        items={[
          [
            "Deliverables to review",
            "5",
            "Requirements through launch planning",
          ],
          ["Structures to consider", "3", "Illustrative fit recommendations"],
          [
            "External deployment",
            "Pending",
            "Requires a target, validation & approval",
          ],
        ]}
      />
      <section className="result-benefits" aria-label="Why Dawn is useful">
        <span className="eyebrow">WHY USE DAWN?</span>
        <h3>Make the path from idea to execution easier to assess.</h3>
        <div className="result-benefit-grid">
          <article>
            <span>01 / CLARITY</span>
            <h4>See what needs to happen</h4>
            <p>
              Bring requirements, work items, and open questions together in one
              reviewable package.
            </p>
          </article>
          <article>
            <span>02 / VISIBILITY</span>
            <h4>Follow how the work develops</h4>
            <p>
              Inspect specialist contributions and handoffs instead of receiving
              only a final answer.
            </p>
          </article>
          <article>
            <span>03 / CHOICE</span>
            <h4>Compare ways to organize the work</h4>
            <p>
              Use structure fit and real run measurements to choose a route
              suited to your priorities.
            </p>
          </article>
        </div>
      </section>
      <div className="result-section-heading">
        <span className="eyebrow">WHAT YOU RECEIVE</span>
        <h3>Five deliverables, each with a purpose</h3>
        <p>Open a card to inspect the sample content.</p>
      </div>
      <div className="deliverable-card-grid">
        {demoWorkflow.deliverables.map(([title, body], index) => (
          <details className="deliverable-card" key={title}>
            <summary>
              <span className="result-number">0{index + 1}</span>
              <span>
                <strong>{title}</strong>
                <small>{purposes[index]}</small>
              </span>
              <span className="result-open" aria-hidden="true">
                +
              </span>
            </summary>
            <p>{body}</p>
          </details>
        ))}
      </div>
      <div className="result-section-heading">
        <span className="eyebrow">WHICH ROUTE FITS THIS BRIEF?</span>
        <h2>Three illustrative structure recommendations</h2>
        <p>
          For this pilot, Agile is the leading example because the brief calls
          for small releases and feedback. These are authored recommendations.
          Real rankings require completed comparison runs.
        </p>
      </div>
      <div className="structure-result-grid">
        {demoRecommendations.map((item, index) => (
          <StructureResult
            key={item.id}
            id={item.id}
            position={index}
            reason={item.reason}
            evidence={[item.evidence]}
            tradeoff={item.tradeoff}
          />
        ))}
      </div>
      <WorkflowRoadmap
        roadmap={demoRoadmap}
        missingRequirements={[
          "Confirm operator and implementation capacity.",
          "Choose hosting and an email adapter.",
          "Confirm technician qualification requirements and local operating rules.",
        ]}
      />
      <section className="result-next-step">
        <span className="eyebrow">TURN THE EXAMPLE INTO YOUR OWN RUN</span>
        <h3>Try this brief in your private workspace.</h3>
        <ol>
          <li>Download the sample workflow and sign in.</li>
          <li>Upload it, save it, and compare all seven structures.</li>
          <li>
            Review real outputs, observed runtime and tokens, and labeled AI
            judgments before choosing a route.
          </li>
        </ol>
        <a
          className="secondary-button demo-download"
          href="/demo-workflow.md"
          download
        >
          Download demo workflow (.md)
        </a>
        <button className="run-button" onClick={onExit}>
          Create an account or sign in to try this workflow →
        </button>
        <p className="setup-note">
          Real execution needs a configured provider and running worker and
          incurs API usage. Launch actions need configured tools; payment and
          critical restructuring require approval.
        </p>
      </section>
    </section>
  );
}
