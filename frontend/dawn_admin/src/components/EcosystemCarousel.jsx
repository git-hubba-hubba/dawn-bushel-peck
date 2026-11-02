import { useEffect, useRef } from "react";
import { structures } from "../../../../shared/structures";
import { StructureDiagram } from "./StructureDiagram";
import "./EcosystemCarousel.css";
const advantages = {
  flat: [
    [
      "Direct decisions",
      "Specialists report straight to the owner, shortening the decision path.",
    ],
    [
      "Work in parallel",
      "Research, product, and finance contribute independently before one integrated decision.",
    ],
    [
      "A clear final owner",
      "One coordinator resolves the contributions into a plan.",
    ],
  ],
  functional: [
    [
      "Depth by discipline",
      "Each specialist's work is reviewed by its own department head.",
    ],
    [
      "Defined accountability",
      "Product, finance, marketing, and operations have separate mandates.",
    ],
    [
      "Strategic consistency",
      "Leadership integrates departmental plans into one direction.",
    ],
  ],
  divisional: [
    [
      "Context-specific plans",
      "Each division develops its own response to the shared strategy.",
    ],
    [
      "Local accountability",
      "Divisional heads consolidate the work of their own specialists.",
    ],
    [
      "Coordinated autonomy",
      "HQ reconciles the divisional plans without removing their distinct contributions.",
    ],
  ],
  agile: [
    [
      "Feedback before commitment",
      "Discovery and delivery squads exchange work before bounded iterations.",
    ],
    [
      "Incremental development",
      "Teams refine an initial direction rather than relying on one large handoff.",
    ],
    [
      "Learning stays visible",
      "The retrospective records what changed and what needs another check.",
    ],
  ],
  matrix: [
    [
      "Shared expertise",
      "Contributors receive both project and functional mandates.",
    ],
    [
      "Two perspectives on priorities",
      "Project delivery is considered alongside discipline-specific requirements.",
    ],
    [
      "Explicit conflict resolution",
      "Joint coordination reconciles competing instructions in the final plan.",
    ],
  ],
  network: [
    [
      "Independent perspectives",
      "Peers develop their own contributions instead of following a single hierarchy.",
    ],
    [
      "Peer review",
      "Review exchanges challenge and improve the initial proposals.",
    ],
    [
      "Dissent is preserved",
      "The consensus records unresolved disagreement instead of hiding it.",
    ],
  ],
  decentralized: [
    [
      "Decisions close to the work",
      "Local units develop their own operational response to the strategy.",
    ],
    [
      "Concrete daily execution",
      "Front-line plans translate unit direction into practical actions.",
    ],
    [
      "A common direction",
      "The alignment review checks independent plans against shared executive goals.",
    ],
  ],
};
export function EcosystemCarousel({ selected, onSelect }) {
  const viewport = useRef(null),
    timer = useRef(null);
  const index = structures.findIndex((item) => item.id === selected);
  useEffect(() => {
    const track = viewport.current;
    if (!track) return;
    const align = (behavior) =>
      track.scrollTo({ left: index * track.clientWidth, behavior });
    align(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    );
    const observer = new ResizeObserver(() => align("instant"));
    observer.observe(track);
    return () => {
      observer.disconnect();
      clearTimeout(timer.current);
    };
  }, [index]);
  function syncSelection() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const track = viewport.current;
      if (!track?.clientWidth) return;
      const next = Math.max(
        0,
        Math.min(
          structures.length - 1,
          Math.round(track.scrollLeft / track.clientWidth),
        ),
      );
      if (next !== index) onSelect(structures[next].id);
    }, 140);
  }
  function keyboard(event) {
    const next =
      event.key === "ArrowRight"
        ? Math.min(index + 1, 6)
        : event.key === "ArrowLeft"
          ? Math.max(index - 1, 0)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 6
              : null;
    if (next === null) return;
    event.preventDefault();
    onSelect(structures[next].id);
    document.getElementById(`ecosystem-tab-${structures[next].id}`)?.focus();
  }
  return (
    <section
      className="ecosystem-browser"
      aria-label="Ecosystem carousel"
      aria-roledescription="carousel"
    >
      <div className="ecosystem-browser-heading">
        <div>
          <span className="eyebrow">03 / FIND YOUR OPERATING MODEL</span>
          <h2>Choose your ecosystem</h2>
          <p>
            Browse seven ways to develop the same idea. See the advantage of
            each before you commit.
          </p>
        </div>
        <div className="ecosystem-controls">
          <span aria-live="polite">
            {String(index + 1).padStart(2, "0")} / 07
          </span>
          <button
            aria-label="Previous ecosystem"
            disabled={index === 0}
            onClick={() => onSelect(structures[index - 1].id)}
          >
            ←
          </button>
          <button
            aria-label="Next ecosystem"
            disabled={index === 6}
            onClick={() => onSelect(structures[index + 1].id)}
          >
            →
          </button>
        </div>
      </div>
      <div
        className="ecosystem-index"
        role="tablist"
        aria-label="Organizational structures"
        onKeyDown={keyboard}
      >
        {structures.map((item) => (
          <button
            key={item.id}
            id={`ecosystem-tab-${item.id}`}
            role="tab"
            aria-selected={selected === item.id}
            aria-controls={`ecosystem-slide-${item.id}`}
            tabIndex={selected === item.id ? 0 : -1}
            onClick={() => onSelect(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div
        className="ecosystem-viewport"
        ref={viewport}
        onScroll={syncSelection}
      >
        {structures.map((model, position) => (
          <article
            className="ecosystem-slide"
            key={model.id}
            id={`ecosystem-slide-${model.id}`}
            role="tabpanel"
            aria-labelledby={`ecosystem-tab-${model.id}`}
            aria-hidden={selected !== model.id}
            inert={selected !== model.id}
          >
            <div className="ecosystem-story">
              <div className="ecosystem-slide-label">
                <span>MODEL {String(position + 1).padStart(2, "0")}</span>
                <span>{model.tag}</span>
              </div>
              <h2>{model.name} ecosystem</h2>
              <p className="ecosystem-description">{model.description}</p>
              <div className="ecosystem-advantages">
                <h3>What this structure gives you</h3>
                {advantages[model.id].map(([title, body], i) => (
                  <div key={title}>
                    <span>0{i + 1}</span>
                    <section>
                      <h4>{title}</h4>
                      <p>{body}</p>
                    </section>
                  </div>
                ))}
              </div>
              <div className="ecosystem-tradeoff">
                <span>PLAN FOR</span>
                <h4>{model.risk}</h4>
                <p>{model.caution}</p>
              </div>
            </div>
            <div className="ecosystem-map">
              <span className="eyebrow">HOW THE WORK CONNECTS</span>
              <StructureDiagram model={model} />
              <dl>
                <div>
                  <dt>Best suited to</dt>
                  <dd>{model.fit}</dd>
                </div>
                <div>
                  <dt>Decision authority</dt>
                  <dd>{model.authority}</dd>
                </div>
                <div>
                  <dt>Information flow</dt>
                  <dd>{model.flow}</dd>
                </div>
              </dl>
              <p className="ecosystem-footnote">
                Structural advantages describe the execution pattern. They are
                not measured performance guarantees; compare runs on your own
                idea.
              </p>
            </div>
          </article>
        ))}
      </div>
      <p className="ecosystem-browse-hint">
        Swipe or scroll horizontally · use the arrows or a structure name to
        jump
      </p>
    </section>
  );
}
