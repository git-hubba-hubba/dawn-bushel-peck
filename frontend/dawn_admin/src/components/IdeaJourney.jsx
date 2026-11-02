export function IdeaJourney({
  hasIdea,
  hasRecommendation,
  hasComparison,
  onCompare,
}) {
  const steps = [
    [
      "01",
      "Describe your idea",
      "A few sentences are enough to begin",
      "#idea-input",
      hasIdea,
    ],
    [
      "02",
      "Find your best fit",
      "Review the recommendation and trade-offs",
      "#idea-recommendation",
      hasRecommendation,
    ],
    [
      "03",
      "Compare the evidence",
      "Run all seven and review the results",
      "#idea-execution",
      false,
    ],
  ];
  const current = !hasIdea ? 0 : !hasRecommendation ? 1 : 2;
  return (
    <nav className="idea-journey" aria-label="Your idea journey">
      {steps.map(([number, title, description, href, complete], index) => (
        <a
          key={number}
          href={href}
          className={`${index === current ? "current" : ""} ${complete ? "complete" : ""}`}
          aria-current={index === current ? "step" : undefined}
          onClick={
            index === 2 && hasComparison
              ? (event) => {
                  event.preventDefault();
                  onCompare();
                }
              : undefined
          }
        >
          <span className="journey-number">{complete ? "✓" : number}</span>
          <span>
            <strong>{title}</strong>
            <small>{description}</small>
          </span>
          <span className="journey-arrow" aria-hidden="true">
            ↗
          </span>
        </a>
      ))}
    </nav>
  );
}
