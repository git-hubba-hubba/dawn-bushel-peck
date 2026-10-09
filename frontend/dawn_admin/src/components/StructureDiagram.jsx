const navy = "#52615a",
  teal = "#729589",
  orange = "#c7a474";
function Node({ x, y, label, width = 112, color = teal }) {
  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - 18}
        width={width}
        height="36"
        rx="7"
        fill={color}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill={color === navy ? "var(--dawn-text)" : "var(--dawn-ink)"}
        fontSize="11"
        fontWeight="600"
      >
        {label}
      </text>
    </g>
  );
}
function Line({
  x1,
  y1,
  x2,
  y2,
  dashed = false,
  color = "var(--dawn-border)",
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth="1.5"
      strokeDasharray={dashed ? "5 4" : undefined}
    />
  );
}
export function StructureDiagram({ model }) {
  let content;
  if (model.id === "flat")
    content = (
      <>
        <Node x={320} y={58} label="CEO / Owner" color={navy} />
        <Line x1={320} y1={76} x2={320} y2={124} />
        <Line x1={65} y1={124} x2={575} y2={124} />
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <Line x1={65 + i * 85} y1={124} x2={65 + i * 85} y2={168} />
            <Node x={65 + i * 85} y={186} width={72} label={`Agent ${i + 1}`} />
          </g>
        ))}
      </>
    );
  if (["functional", "divisional", "decentralized"].includes(model.id)) {
    const labels =
      model.id === "functional"
        ? ["Finance", "Marketing", "Product Dev", "Operations"]
        : model.id === "divisional"
          ? ["Division A", "Division B", "Division C"]
          : [
              "Unit / Site 1",
              "Unit / Site 2",
              "Unit / Site 3",
              "Unit / Site 4",
            ];
    content = (
      <>
        <Node
          x={320}
          y={40}
          label={
            model.id === "functional"
              ? "CEO"
              : model.id === "divisional"
                ? "Corporate HQ"
                : "Executive strategy"
          }
          width={150}
          color={navy}
        />
        {labels.map((label, i) => {
          const x = 80 + i * (480 / (labels.length - 1));
          return (
            <g key={label}>
              <Line
                x1={320}
                y1={58}
                x2={x}
                y2={102}
                dashed={model.id === "decentralized"}
                color={model.id === "decentralized" ? orange : undefined}
              />
              <rect
                x={x - 69}
                y="92"
                width="138"
                height="149"
                rx="10"
                fill="var(--dawn-inset)"
                stroke="var(--dawn-border)"
                strokeDasharray="4 3"
              />
              <Node x={x} y={119} label={label} color={navy} />
              <Line x1={x} y1={137} x2={x} y2={169} />
              <Node
                x={x}
                y={186}
                label={
                  model.id === "functional"
                    ? "Specialists"
                    : model.id === "divisional"
                      ? "Own functions"
                      : "Local team"
                }
              />
              <text
                x={x}
                y="225"
                fontSize="10"
                fill="var(--dawn-sage)"
                textAnchor="middle"
              >
                {model.id === "decentralized"
                  ? "Daily decisions"
                  : model.id === "divisional"
                    ? "Finance · Ops · Marketing"
                    : "Domain expertise"}
              </text>
            </g>
          );
        })}
      </>
    );
  }
  if (model.id === "agile")
    content = (
      <>
        {[
          [125, 65],
          [515, 65],
          [125, 220],
          [515, 220],
        ].map(([x, y], i) => (
          <g key={i}>
            <Line x1={320} y1={143} x2={x} y2={y} dashed color={teal} />
            <Node x={x} y={y} label={`Squad ${i + 1}`} width={125} />
          </g>
        ))}
        <Line x1={190} y1={65} x2={450} y2={65} dashed color={orange} />
        <Line x1={190} y1={220} x2={450} y2={220} dashed color={orange} />
        <Line x1={125} y1={84} x2={125} y2={201} dashed color={orange} />
        <Line x1={515} y1={84} x2={515} y2={201} dashed color={orange} />
        <circle cx="320" cy="143" r="45" fill={navy} />
        <text
          x="320"
          y="140"
          textAnchor="middle"
          fill="var(--dawn-text)"
          fontSize="11"
        >
          Vision &
          <tspan x="320" dy="16">
            coaching
          </tspan>
        </text>
      </>
    );
  if (model.id === "matrix")
    content = (
      <>
        <Node x={360} y={25} label="CEO" color={navy} />
        {["Finance", "Marketing", "Engineering"].map((label, i) => (
          <g key={label}>
            <Line x1={360} y1={43} x2={240 + i * 120} y2={65} />
            <Node
              x={240 + i * 120}
              y={83}
              label={label}
              width={104}
              color={navy}
            />
            <Line
              x1={240 + i * 120}
              y1={101}
              x2={240 + i * 120}
              y2={250}
              dashed
            />
          </g>
        ))}
        {["Project A", "Project B", "Project C"].map((label, i) => (
          <g key={label}>
            <Node x={90} y={130 + i * 50} label={label} color={orange} />
            <Line
              x1={146}
              y1={130 + i * 50}
              x2={560}
              y2={130 + i * 50}
              dashed
              color={orange}
            />
            {[0, 1, 2]
              .filter((j) => !(i === 1 && j === 0))
              .map((j) => (
                <circle
                  key={j}
                  cx={240 + j * 120}
                  cy={130 + i * 50}
                  r="9"
                  fill={teal}
                />
              ))}
          </g>
        ))}
      </>
    );
  if (model.id === "network") {
    const points = [
      [320, 40],
      [465, 90],
      [470, 205],
      [320, 250],
      [170, 205],
      [175, 90],
      [320, 145],
    ];
    content = (
      <>
        {points.flatMap(([x, y], i) =>
          points
            .slice(i + 1)
            .map(([a, b], j) => (
              <Line
                key={`${i}-${j}`}
                x1={x}
                y1={y}
                x2={a}
                y2={b}
                color="var(--dawn-border)"
              />
            )),
        )}
        {points.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="24" fill={teal} />
            <text
              x={x}
              y={y + 4}
              fontSize="10"
              fill="var(--dawn-ink)"
              textAnchor="middle"
            >
              Peer {i + 1}
            </text>
          </g>
        ))}
      </>
    );
  }
  return (
    <div className="diagram">
      <svg
        viewBox="0 0 640 285"
        role="img"
        aria-label={`${model.name} organizational diagram. ${model.flow}`}
      >
        {content}
      </svg>
      <span>
        Organizational topology from your notes · execution roles appear in the
        run timeline
      </span>
    </div>
  );
}
