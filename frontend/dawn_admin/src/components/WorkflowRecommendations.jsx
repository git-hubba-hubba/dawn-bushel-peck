import { structures, structureById } from "../../../../shared/structures";
import { StructureResult } from "./Results";
export function WorkflowRecommendations({
  result,
  onSelect,
  illustrative = false,
}) {
  return (
    <section
      className="panel workflow-recommendations"
      id="idea-recommendation"
      aria-label="Suggested ecosystems before selection"
    >
      <span className="eyebrow">02 / YOUR IDEA, THROUGH A DIFFERENT LENS</span>
      <h2>Find your strongest starting point</h2>
      {!result ? (
        <div className="recommendation-empty">
          <div className="recommendation-spark" aria-hidden="true">
            ✧
          </div>
          <div>
            <h3>Your idea comes first. The right structure follows.</h3>
            <p>
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
                  onClick={() => onSelect(item.structureId)}
                >
                  Choose this ecosystem →
                </button>
              </StructureResult>
            ))}
          </div>
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
