export function WorkflowRoadmap({ roadmap, missingRequirements = [] }) {
  if (!roadmap?.length) return null;
  return (
    <section
      className="workflow-roadmap"
      aria-label="Idea-specific execution timeline"
    >
      <span className="eyebrow">ESTIMATED PATH TO EXECUTION</span>
      <h3>Your next steps and timeline</h3>
      <p className="result-label">
        Days are relative to kickoff. This is a model estimate, conditional on
        the assumptions below—not a delivery commitment. Parallel tasks have
        overlapping day ranges.
      </p>
      <ol className="roadmap-list">
        {roadmap.map((task) => (
          <li key={task.id}>
            <div className="roadmap-time">
              Day {task.startDay}–{task.endDay}
              <small>{task.owner}</small>
            </div>
            <div>
              <h4>{task.title}</h4>
              <p>{task.action}</p>
              <div className="roadmap-example">
                <strong>Concrete example</strong>
                <p>{task.example}</p>
              </div>
              <p>
                <strong>Done when:</strong> {task.acceptance}
              </p>
              <p>
                <strong>Depends on:</strong>{" "}
                {task.dependsOn.length
                  ? task.dependsOn
                      .map(
                        (id) =>
                          roadmap.find((item) => item.id === id)?.title || id,
                      )
                      .join("; ")
                  : "Can start independently"}
              </p>
              <p>
                <strong>From your idea:</strong> “{task.sourceEvidence}”
              </p>
              {task.assumption && (
                <p>
                  <strong>Confirm this assumption:</strong> {task.assumption}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {missingRequirements.length > 0 && (
        <details className="result-expand" open>
          <summary>Requirements still needed from you</summary>
          <ul>
            {missingRequirements.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
