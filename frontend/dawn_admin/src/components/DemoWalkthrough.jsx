import { structures } from "../../../../shared/structures";
import { demoWorkflow, demoRecommendations } from "../demo/workflow";
import "./DemoWalkthrough.css";

const chapters = [
  [
    "Start with a spark",
    "Describe the idea in plain language. Include who it helps, the workflow, and what success looks like. Dawn uses this same brief to assess each structure.",
    "YOUR IDEA",
  ],
  [
    "Seven ways to organize the work",
    "Each ecosystem coordinates agents differently. For this sample pilot, Agile is the authored leading fit because short delivery cycles leave room for feedback.",
    "EXPLORE THE FIT",
  ],
  [
    "Watch the handoffs happen",
    "Follow the selected structure’s actual dependency graph. Up to three ready roles work together; downstream agents wait for the contributions they need.",
    "FOLLOW THE AGENTS",
  ],
  [
    "A direction you can explain",
    "Review the leading fit, alternatives, trade-offs, and a practical pilot package. In your workspace, completed comparison runs add measured time and token usage.",
    "REVIEW THE OUTCOME",
  ],
];

function AgentFlow({ model, completed, active, playing }) {
  const waves = [];
  const positions = {};
  const pending = new Set(model.nodes.map((node) => node.id));
  while (pending.size) {
    const ready = model.nodes
      .filter(
        (node) =>
          pending.has(node.id) &&
          node.dependsOn.every((id) => !pending.has(id)),
      )
      .slice(0, 3);
    if (!ready.length) break;
    waves.push(ready);
    ready.forEach((node) => pending.delete(node.id));
  }
  waves.forEach((wave, row) =>
    wave.forEach((node, column) => {
      positions[node.id] = {
        x: 330 + (column - (wave.length - 1) / 2) * 210,
        y: 45 + row * 78,
      };
    }),
  );
  return (
    <div className="tour-flow-scroll">
      <svg
        className="tour-flow"
        viewBox={`0 0 660 ${Math.max(240, waves.length * 78 + 15)}`}
        role="img"
        aria-label={`${model.name} animated execution graph: ${completed.length} of ${model.nodes.length} example roles completed`}
      >
        {model.nodes.flatMap((node) =>
          node.dependsOn.map((dependency) => {
            const from = positions[dependency],
              to = positions[node.id];
            if (!from || !to) return null;
            return (
              <path
                key={`${dependency}-${node.id}`}
                className={`tour-connection ${completed.includes(dependency) ? "delivered" : ""} ${playing && active.includes(node.id) ? "flowing" : ""}`}
                d={`M ${from.x} ${from.y + 23} C ${from.x} ${from.y + 50}, ${to.x} ${to.y - 50}, ${to.x} ${to.y - 23}`}
              />
            );
          }),
        )}
        {model.nodes.map((node) => {
          const point = positions[node.id];
          if (!point) return null;
          const done = completed.includes(node.id),
            running = playing && active.includes(node.id);
          const words = node.role.split(" "),
            middle = Math.ceil(words.length / 2);
          return (
            <g
              key={node.id}
              className={`tour-flow-node ${done ? "done" : running ? "running" : ""}`}
              transform={`translate(${point.x}, ${point.y})`}
            >
              <title>
                {node.role}:{" "}
                {done ? "completed example" : running ? "replaying" : "waiting"}
              </title>
              <rect x="-90" y="-23" width="180" height="46" rx="9" />
              <circle cx="-74" cy="0" r="3" />
              <text x="3" y="-3" textAnchor="middle">
                {words.slice(0, middle).join(" ")}
                <tspan x="3" dy="14">
                  {words.slice(middle).join(" ")}
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DemoWalkthrough({
  step,
  sceneVersion,
  model,
  completed,
  active,
  playing,
  tourPlaying,
  tourStarted,
  tourFinished,
  elapsed,
  duration,
  onToggle,
  onRestart,
}) {
  const [title, description, label] = chapters[step];
  return (
    <section
      id="demo-walkthrough"
      className="demo-walkthrough"
      aria-label="Animated virtual walkthrough"
      data-playing={tourPlaying || playing}
    >
      <div className="tour-window-bar">
        <span className="tour-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>dawn / an idea in motion</span>
        <span className="tour-example-badge">ILLUSTRATIVE DEMO</span>
      </div>
      <div className="tour-scene" key={`${step}-${sceneVersion}`}>
        <div className="tour-scene-label">
          <span className="eyebrow">{label}</span>
          <span>0{step + 1} / 04</span>
        </div>
        {step === 0 && (
          <div className="tour-idea-scene">
            <div className="tour-idea-icon" aria-hidden="true">
              ✳
            </div>
            <div className="tour-mock-editor">
              <span className="tour-field-label">THE IDEA</span>
              <h2>Neighborhood Repair</h2>
              <p className={tourStarted ? "tour-typed-line" : ""}>
                A neighborhood repair service, built around a small pilot.
              </p>
              <div className="tour-idea-facts">
                {[
                  "Customer intake",
                  "Approved quotes",
                  "Qualified technicians",
                ].map((text, index) => (
                  <span key={text} style={{ "--item": index }}>
                    {text}
                  </span>
                ))}
              </div>
              <div className="tour-mock-action">
                Find the ecosystem that fits <span aria-hidden="true">↗</span>
              </div>
            </div>
            <span className="tour-cursor" aria-hidden="true">
              ↖<small>Your idea starts here</small>
            </span>
          </div>
        )}
        {step === 1 && (
          <div className="tour-fit-scene">
            <p className="tour-stage-kicker">
              ONE SHARED BRIEF → SEVEN EXECUTION PATTERNS
            </p>
            <div className="tour-structure-grid">
              {structures.map((item, index) => (
                <div
                  key={item.id}
                  className={`tour-structure-tile ${item.id === "agile" ? "recommended" : ""}`}
                  style={{ "--item": index }}
                >
                  <span aria-hidden="true">{item.symbol}</span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.id === "agile" ? "Example leading fit" : item.tag}
                  </small>
                </div>
              ))}
            </div>
            <p className="tour-stage-footnote">
              Authored fit example · no performance scores are simulated
            </p>
          </div>
        )}
        {step === 2 && (
          <div className="tour-agents-scene">
            <div className="tour-flow-heading">
              <h2>{model.name} in motion</h2>
              <span>
                {completed.length} / {model.nodes.length} roles
              </span>
            </div>
            <AgentFlow
              model={model}
              completed={completed}
              active={active}
              playing={playing}
            />
            <div className="tour-flow-legend">
              <span>○ Waiting</span>
              <span>◉ Working</span>
              <span>● Complete</span>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="tour-outcome-scene">
            <div className="tour-winner">
              <span className="tour-winner-symbol" aria-hidden="true">
                ✧
              </span>
              <span className="eyebrow">EXAMPLE LEADING FIT</span>
              <h2>Agile ecosystem</h2>
              <p>{demoRecommendations[0].reason}</p>
              <span className="tour-winner-note">
                Authored recommendation · validate with real runs
              </span>
            </div>
            <div className="tour-package">
              {demoWorkflow.deliverables.map(([name], index) => (
                <div key={name} style={{ "--item": index }}>
                  <span>✓</span>
                  {name}
                  <small>Example deliverable</small>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="tour-guide">
        <div className="tour-guide-mark" aria-hidden="true">
          d.
        </div>
        <div className="tour-caption" aria-live="polite" aria-atomic="true">
          <span className="eyebrow">
            YOUR WALKTHROUGH GUIDE / CHAPTER 0{step + 1}
          </span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="tour-playback">
        <button className="run-button" onClick={onToggle}>
          {tourPlaying
            ? "Pause walkthrough"
            : tourFinished
              ? "Replay walkthrough"
              : tourStarted
                ? "Resume walkthrough"
                : "Play virtual walkthrough"}
          <span aria-hidden="true">{tourPlaying ? "Ⅱ" : "▷"}</span>
        </button>
        {tourStarted && (
          <button className="tour-restart" onClick={onRestart}>
            Restart tour ↺
          </button>
        )}
        <span className="tour-playback-note">
          {tourPlaying
            ? "Guided playback · explore at your own pace"
            : "Play the tour, or explore the chapters below"}
        </span>
      </div>
      <div
        className="tour-chapter-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round((elapsed / duration) * 100))}
        aria-label="Chapter playback progress"
      >
        <span
          style={{ width: `${Math.min(100, (elapsed / duration) * 100)}%` }}
        />
      </div>
    </section>
  );
}
