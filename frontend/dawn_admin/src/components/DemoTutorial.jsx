import { useCallback, useEffect, useRef, useState } from "react";
import { structureById } from "../../../../shared/structures";
import {
  demoWorkflow,
  demoRecommendations,
  nextDemoWave,
  contribution,
} from "../demo/workflow";
import { WorkflowRecommendations } from "./WorkflowRecommendations";
import { DemoResults } from "./DemoResults";
import { DemoWalkthrough } from "./DemoWalkthrough";
import { EcosystemCarousel } from "./EcosystemCarousel";
import "./DemoTutorial.css";
export function DemoTutorial({ onExit }) {
  const [step, setStep] = useState(0),
    [selected, setSelected] = useState("agile"),
    [completed, setCompleted] = useState([]),
    [playing, setPlaying] = useState(false),
    [tourPlaying, setTourPlaying] = useState(false),
    [tourStarted, setTourStarted] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [detailsOpen, setDetailsOpen] = useState(true),
    [sceneVersion, setSceneVersion] = useState(0);
  const elapsedRef = useRef(0);
  const updateElapsed = useCallback((value) => {
    elapsedRef.current = value;
    setElapsed(value);
  }, []);
  const model = structureById[selected],
    active = nextDemoWave(model, completed);
  useEffect(() => {
    if (!playing || step !== 2 || completed.length === model.nodes.length)
      return;
    const timer = setInterval(
      () =>
        setCompleted((previous) => [
          ...previous,
          ...nextDemoWave(model, previous),
        ]),
      1800,
    );
    return () => clearInterval(timer);
  }, [playing, step, model, completed.length]);
  const replayWaves = (() => {
    let done = [],
      count = 0;
    while (done.length < model.nodes.length) {
      const next = nextDemoWave(model, done);
      if (!next.length) break;
      done = [...done, ...next];
      count += 1;
    }
    return count;
  })();
  const duration = [9000, 12000, replayWaves * 1800 + 3500, 12000][step];
  useEffect(() => {
    if (!tourPlaying || document.hidden) return;
    const timer = setInterval(() => {
      const nextElapsed = elapsedRef.current + 250;
      if (nextElapsed >= duration) {
        // Pausing can interrupt a wave; let every dependency finish before leaving.
        if (step === 2 && completed.length < model.nodes.length) {
          updateElapsed(duration - 250);
          return;
        }
        clearInterval(timer);
        if (step === 3) {
          setTourPlaying(false);
          setPlaying(false);
          updateElapsed(duration);
          return;
        }
        setStep(step + 1);
        updateElapsed(0);
        setPlaying(step + 1 === 2);
        if (step + 1 === 2) setCompleted([]);
      } else updateElapsed(nextElapsed);
    }, 250);
    return () => clearInterval(timer);
  }, [
    tourPlaying,
    duration,
    step,
    updateElapsed,
    completed.length,
    model.nodes.length,
  ]);
  useEffect(() => {
    function pauseWhenHidden() {
      if (document.hidden) {
        setTourPlaying(false);
        setPlaying(false);
      }
    }
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);
  function goToStep(next) {
    setTourPlaying(false);
    setTourStarted(false);
    setPlaying(false);
    updateElapsed(0);
    setDetailsOpen(true);
    setStep(next);
  }
  function startTour(restart = false) {
    if (restart || (step === 3 && elapsed >= duration)) {
      setSceneVersion((version) => version + 1);
      setStep(0);
      setCompleted([]);
      updateElapsed(0);
      setPlaying(false);
    } else if (step === 2) {
      if (completed.length === model.nodes.length) {
        setCompleted([]);
        updateElapsed(0);
      }
      setPlaying(true);
    }
    setDetailsOpen(false);
    setTourStarted(true);
    setTourPlaying(true);
    if (!tourStarted || restart)
      requestAnimationFrame(() => {
        document.getElementById("demo-walkthrough")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        });
      });
  }
  const finished = completed.length === model.nodes.length;
  return (
    <div className="demo-page">
      <header className="demo-header">
        <strong>
          dawn<span>.</span> <small>GUIDED DEMO</small>
        </strong>
        <button className="secondary-button" onClick={onExit}>
          Back to login
        </button>
      </header>
      <main>
        <div className="demo-notice" role="note">
          Illustrative tutorial · prerecorded examples · no live AI calls, saved
          account data, or external actions. Replay timing is not a performance
          measurement.
        </div>
        <div className="page-heading">
          <div className="eyebrow">DEMO_DAWN</div>
          <h1>See an idea come to life.</h1>
          <p>
            Take a virtual walk through Dawn. Watch one repair-service idea
            become an ecosystem recommendation and a reviewable pilot plan.
          </p>
          <button
            className="run-button demo-tour-start"
            onClick={() => startTour(true)}
          >
            Start animated tour <span aria-hidden="true">▷</span>
          </button>
        </div>
        <nav className="demo-steps" aria-label="Tutorial steps">
          {[
            "1. Sample workflow",
            "2. Choose a structure",
            "3. Follow agents",
            "4. Review results",
          ].map((title, index) => (
            <button
              key={title}
              aria-current={step === index ? "step" : undefined}
              onClick={() => goToStep(index)}
            >
              {title}
            </button>
          ))}
        </nav>
        <DemoWalkthrough
          step={step}
          sceneVersion={sceneVersion}
          model={model}
          completed={completed}
          active={active}
          playing={playing}
          tourPlaying={tourPlaying}
          tourStarted={tourStarted}
          elapsed={elapsed}
          duration={duration}
          tourFinished={step === 3 && elapsed >= duration}
          onToggle={() => {
            if (tourPlaying) {
              setTourPlaying(false);
              setPlaying(false);
            } else startTour();
          }}
          onRestart={() => startTour(true)}
        />
        <details
          className="demo-chapter-details"
          open={detailsOpen}
          onToggle={(event) => {
            const open = event.currentTarget.open;
            setDetailsOpen(open);
            if (open && tourStarted) {
              setTourPlaying(false);
              setPlaying(false);
            }
          }}
        >
          <summary>Explore this chapter in detail</summary>
          {detailsOpen && step === 0 && (
            <section className="panel demo-panel">
              <span className="eyebrow">UPLOAD OR WRITE → SAVE</span>
              <h2>{demoWorkflow.name}</h2>
              <p>
                In your workspace, upload a PDF, DOCX, TXT, or Markdown file, or
                write a brief. Save it before running or comparing structures.
              </p>
              <pre className="demo-source">{demoWorkflow.content}</pre>
              <a
                className="secondary-button demo-download"
                href="/demo-workflow.md"
                download
              >
                Download demo workflow (.md)
              </a>
              <p className="setup-note">
                Download this source and upload it after signing in to test real
                execution. A configured provider and running worker are
                required; real runs incur API usage.
              </p>
            </section>
          )}
          {detailsOpen && step === 1 && (
            <section className="panel demo-panel">
              <span className="eyebrow">SEVEN DISTINCT EXECUTION PATTERNS</span>
              <h2>Choose how this workflow moves</h2>
              <WorkflowRecommendations
                selected={selected}
                illustrative
                result={{
                  objective:
                    "Illustrative assessment: launch a small repair pilot with approved quotes and restricted customer contact access.",
                  missingRequirements: [
                    "Confirm staffing, pricing, local rules, and hosting.",
                  ],
                  recommendations: demoRecommendations.map((item) => ({
                    structureId: item.id,
                    reason: item.reason,
                    evidence: [item.evidence],
                    tradeoff: item.tradeoff,
                    firstAction:
                      "Confirm the operator, required intake fields, and approval-gated scheduling before building the pilot.",
                  })),
                }}
                onSelect={(id) => {
                  setSelected(id);
                  setCompleted([]);
                  setPlaying(false);
                  setTourPlaying(false);
                }}
              />
              <EcosystemCarousel
                selected={selected}
                onSelect={(id) => {
                  setSelected(id);
                  setCompleted([]);
                  setPlaying(false);
                  setTourPlaying(false);
                }}
              />
              <p>
                {model.nodes.length} roles ·{" "}
                {model.nodes.reduce(
                  (count, node) => count + node.dependsOn.length,
                  0,
                )}{" "}
                dependency handoffs · up to 3 roles per wave
              </p>
            </section>
          )}
          {detailsOpen && step === 2 && (
            <section className="panel demo-panel">
              <span className="eyebrow">ILLUSTRATIVE AGENT REPLAY</span>
              <h2>{model.name}: follow every handoff</h2>
              <p>
                Agents wait for their dependencies. Independent roles work
                together, then hand results to the next roles. Real executions
                stream generated draft output and validate final deliverables.
              </p>
              <div className="demo-controls">
                <button
                  className="run-button"
                  onClick={() => {
                    setTourPlaying(false);
                    updateElapsed(0);
                    if (finished) setCompleted([]);
                    setPlaying(!playing || finished);
                  }}
                >
                  {finished
                    ? "Replay agents"
                    : playing
                      ? "Pause replay"
                      : "Start agent replay"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setTourPlaying(false);
                    updateElapsed(0);
                    setCompleted(model.nodes.map((node) => node.id));
                    setPlaying(false);
                  }}
                >
                  Show completed example
                </button>
              </div>
              <p role="status">
                {completed.length} / {model.nodes.length} example roles
                completed
                {finished
                  ? " · Example package ready"
                  : playing
                    ? " · Replay running"
                    : " · Replay paused"}
              </p>
              <div className="step-list">
                {model.nodes.map((node) => {
                  const done = completed.includes(node.id),
                    running = playing && !done && active.includes(node.id);
                  return (
                    <details key={node.id} open={running}>
                      <summary>
                        <span
                          className={`demo-agent-dot ${running ? "running" : done ? "done" : ""}`}
                        />
                        {node.role}
                        <span>
                          {done
                            ? "completed example"
                            : running
                              ? "replaying"
                              : "waiting"}
                        </span>
                      </summary>
                      <p>{node.mandate}</p>
                      <p className="setup-note">
                        Dependencies:{" "}
                        {node.dependsOn.length
                          ? node.dependsOn.join(", ")
                          : "Independent role"}
                      </p>
                      {(running || done) && (
                        <p className="deliverable">
                          Example contribution: {contribution(node)}
                        </p>
                      )}
                    </details>
                  );
                })}
              </div>
            </section>
          )}
          {detailsOpen && step === 3 && <DemoResults onExit={onExit} />}
        </details>
        <div className="demo-controls demo-navigation">
          <button
            className="secondary-button"
            disabled={step === 0}
            onClick={() => goToStep(step - 1)}
          >
            Previous
          </button>
          <button
            className="run-button"
            onClick={() => (step === 3 ? onExit() : goToStep(step + 1))}
          >
            {step === 3 ? "Finish tutorial" : "Next step →"}
          </button>
        </div>
      </main>
    </div>
  );
}
