const labels = {
  quality: ["Quality & fit", "A grounded, useful plan"],
  speed: ["Speed", "Less execution time"],
  efficiency: ["Token efficiency", "Lower token usage"],
};

export function ComparisonPriorities({ weights, setWeights }) {
  return (
    <div className="weight-controls">
      {Object.entries(labels).map(([key, [label, description]]) => (
        <label key={key}>
          {label}
          <strong>{weights[key]}</strong>
          <input
            aria-label={`${key} weight`}
            type="range"
            min="0"
            max="100"
            value={weights[key]}
            onChange={(event) => {
              const next = { ...weights, [key]: Number(event.target.value) };
              if (Object.values(next).some((value) => value > 0))
                setWeights(next);
            }}
          />
          <small>{description}</small>
        </label>
      ))}
    </div>
  );
}
