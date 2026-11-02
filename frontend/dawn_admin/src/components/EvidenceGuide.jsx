import { useId, useState } from "react";
import "./EvidenceGuide.css";
const prompts = [
  [
    "goal",
    "Goal & intended users",
    "What should the idea achieve, and who is it for?",
    "Example only: Launch a repair-request pilot for residents in one neighborhood.",
  ],
  [
    "workflow",
    "Required workflow",
    "What steps or rules must the system follow?",
    "Example only: Obtain customer approval of a quote before scheduling a repair.",
  ],
  [
    "resources",
    "Available resources",
    "Which people, tools, or budget are actually available?",
    "Example only: One operator is confirmed; implementation capacity is not yet known.",
  ],
  [
    "constraints",
    "Limits & exclusions",
    "What must be protected or kept out of scope?",
    "Example only: Restrict access to customer contact details and exclude payment processing.",
  ],
  [
    "success",
    "Acceptance criteria",
    "What observable check would show the work is ready?",
    "Example only: Tests reject scheduling without approval and prevent duplicate notifications.",
  ],
  [
    "sources",
    "Supporting sources & unknowns",
    "Which facts have a source, and what still needs confirmation?",
    "Example only: Staffing is confirmed in the project brief; pricing and hosting are undecided.",
  ],
];
export function EvidenceGuide({ content, result, onAddDetails, disabled }) {
  const id = useId(),
    [editing, setEditing] = useState(false),
    [details, setDetails] = useState({});
  const evidence = [
    ...new Set(result?.recommendations?.flatMap((item) => item.evidence) || []),
  ].filter((text) => content.includes(text));
  function submit(event) {
    event.preventDefault();
    const additions = prompts
      .filter(([key]) => details[key]?.trim())
      .map(([key, title]) => `${title}: ${details[key].trim()}`)
      .join("\n");
    if (!additions) return;
    if (onAddDetails(additions) === false) return;
    setDetails({});
    setEditing(false);
  }
  return (
    <section
      className="evidence-guide"
      aria-label="Grounded evidence suggestions"
    >
      <div className="evidence-guide-heading">
        <div>
          <span className="eyebrow">MAKE YOUR IDEA EASIER TO ASSESS</span>
          <h3>What counts as grounded evidence?</h3>
        </div>
        <span className="evidence-guide-tag">Facts from your brief</span>
      </div>
      <p>
        Grounded evidence is a detail traceable to your idea or an identified
        source. Add what you know; mark unknowns explicitly. Dawn resolves
        source IDs to the original text. AI timelines and fit recommendations
        remain estimates and judgments.
      </p>
      {result?.missingRequirements?.length > 0 && (
        <div className="evidence-missing">
          <h4>Suggestions for your idea</h4>
          <p>
            The assessment identified these details to confirm. Add an answer or
            say it is still unknown.
          </p>
          <ul>
            {result.missingRequirements.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {evidence.length > 0 && (
        <details className="evidence-quotes">
          <summary>Passages used from your idea ({evidence.length})</summary>
          {evidence.map((text, index) => (
            <blockquote key={index}>{text}</blockquote>
          ))}
        </details>
      )}
      <details className="evidence-examples" open={!result}>
        <summary>
          Useful evidence to include · examples are illustrative
        </summary>
        <div className="evidence-prompt-grid">
          {prompts.map(([key, title, question, example]) => (
            <article key={key}>
              <h4>{title}</h4>
              <p>{question}</p>
              <small>{example}</small>
            </article>
          ))}
        </div>
      </details>
      {!editing ? (
        <button
          className="secondary-button"
          disabled={disabled}
          onClick={() => setEditing(true)}
        >
          Add evidence to my idea
        </button>
      ) : (
        <form onSubmit={submit} className="evidence-form">
          <p>
            Enter only your own details. Examples are not copied into your
            brief. Leave fields blank when they do not apply.
          </p>
          {prompts.map(([key, title, question]) => (
            <div key={key}>
              <label htmlFor={`${id}-${key}`}>{title}</label>
              <textarea
                id={`${id}-${key}`}
                value={details[key] || ""}
                maxLength={1500}
                disabled={disabled}
                placeholder={question}
                onChange={(event) =>
                  setDetails({ ...details, [key]: event.target.value })
                }
              />
            </div>
          ))}
          <div className="evidence-form-actions">
            <button
              type="submit"
              className="run-button"
              disabled={
                disabled ||
                !Object.values(details).some((value) => value.trim())
              }
            >
              Add details & reassess
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
