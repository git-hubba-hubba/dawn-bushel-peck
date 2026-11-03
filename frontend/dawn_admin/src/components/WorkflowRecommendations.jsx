import { structures, structureById } from "../../../../shared/structures";
import { StructureResult } from "./Results";
export function WorkflowRecommendations({
  result,
  onSelect,
  illustrative = false,
  assessing = false,
  failure,
  blockedReason,
  onRetry,
  selected,
  selectionDisabled = false,
  selectionError,
}) {
  return (
    <section
      className="panel workflow-recommendations"
      id="idea-recommendation"
      aria-label="Suggested ecosystems before selection"
    >
      <span className="eyebrow">02 / YOUR IDEA, THROUGH A DIFFERENT LENS</span>
      <h2>Find your strongest starting point</h2>
      {failure ? (
        <div className="error" role="alert">
          <h3>{failure.title || "Assessment needs attention"}</h3>
          <p>
            <strong>Why it failed:</strong> {failure.message}
          </p>
          {failure.nextStep && (
            <p>
              <strong>What to do:</strong> {failure.nextStep}
            </p>
          )}
          <p className="setup-note">
            Assessment: {failure.code.replaceAll("_", " ")}
          </p>
          <p>
            Your idea remains editable. Resolve the reported issue, then retry.
            No ecosystem recommendation is available yet.
          </p>
          <button
            className="secondary-button"
            disabled={Boolean(blockedReason)}
            onClick={onRetry}
          >
            Retry assessment here
          </button>
          {blockedReason && <p>{blockedReason}</p>}
          <a href="#idea-input">Return to your idea ↑</a>
        </div>
      ) : assessing ? (
        <p role="status">
          Assessing your saved idea. Recommendations will appear here when the
          assessment completes.
        </p>
      ) : !result ? (
        <div className="recommendation-empty">
          <div className="recommendation-spark" aria-hidden="true">
            ✧
          </div>
          <div>
            <h3>Your idea comes first. The right structure follows.</h3>
            <p>
              {blockedReason && <span>{blockedReason} </span>}
              Describe your idea above to get a leading recommendation, two
              alternatives, and the reasons behind each. Then test the fit by
              comparing all seven executions.
            </p>
            <div className="structure-chips">
              {structures.map((item) => (
                <span key={item.id}>{item.name}</span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {result.recommendations[0] && (
            <div className="recommendation-spotlight">
              <span className="spotlight-icon" aria-hidden="true">
                ↗
              </span>
              <div>
                <span className="eyebrow">
                  {illustrative
                    ? "DEMO LEADING OPTION"
                    : "RECOMMENDED STARTING POINT"}
                </span>
                <h3>
                  {structureById[result.recommendations[0].structureId]?.name}{" "}
                  ecosystem
                </h3>
                <p>
                  Leading fit for this brief. Review the evidence and confirm
                  the assumptions below.
                </p>
              </div>
            </div>
          )}
          <p className="result-summary">{result.objective}</p>
          <p className="result-label">
            {illustrative
              ? "Authored demo fit assessment"
              : "AI fit assessment based on this saved idea"}{" "}
            · provisional until you validate assumptions. Real run comparisons
            provide measured runtime and token data.
          </p>
          {selectionError && (
            <p className="error" role="status">
              {selectionError}
            </p>
          )}
          <div className="structure-result-grid">
            {result.recommendations.map((item, index) => (
              <StructureResult
                key={item.structureId}
                id={item.structureId}
                position={index}
                reason={item.reason}
                evidence={item.evidence}
                tradeoff={item.tradeoff}
              >
                <h4>Your first concrete action</h4>
                <p>{item.firstAction}</p>
                <button
                  className="run-button"
                  disabled={selectionDisabled}
                  aria-pressed={selected === item.structureId}
                  onClick={() => onSelect(item.structureId)}
                >
                  {selected === item.structureId
                    ? "Selected ecosystem ✓"
                    : "Choose this ecosystem →"}
                </button>
              </StructureResult>
            ))}
          </div>
          {selected && (
            <p role="status">
              Selected: {structureById[selected]?.name} ecosystem.{" "}
              {illustrative ? (
                "Explore its illustrative execution pattern below."
              ) : (
                <>
                  Choice saved. Review its execution pattern below, then{" "}
                  <a href="#idea-execution">run this ecosystem</a> to generate
                  your idea’s deliverables and estimated roadmap.
                </>
              )}
            </p>
          )}
          {result.missingRequirements.length > 0 && (
            <details className="result-expand" open>
              <summary>Confirm these before execution</summary>
              <ul>
                {result.missingRequirements.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
