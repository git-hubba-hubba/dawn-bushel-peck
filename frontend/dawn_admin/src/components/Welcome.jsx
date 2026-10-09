import { useRef, useState } from "react";
import "./Welcome.css";
function Tool({ kind }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "cog" ? (
        <>
          <path
            d="m20 6 8 0 2 7 6-3 6 6-3 6 7 2v8l-7 2 3 6-6 6-6-3-2 7h-8l-2-7-6 3-6-6 3-6-7-2v-8l7-2-3-6 6-6 6 3z"
            transform="translate(2 -3) scale(.9)"
          />
          <circle cx="24" cy="24" r="7" />
        </>
      ) : kind === "wrench" ? (
        <path d="M29 8a12 12 0 0 0-14 15L5 33a6 6 0 0 0 9 9l10-10A12 12 0 0 0 40 18l-8 8-9-9z" />
      ) : kind === "hammer" ? (
        <>
          <path d="m9 10 9-5 17 11-8 9-5-6-13 23-6-4 13-23z" />
          <path d="m29 12 8-3 7 6-7 8" />
        </>
      ) : (
        <>
          <path d="m16 10-12 14 12 14m16-28 12 14-12 14M28 6l-8 36" />
        </>
      )}
    </svg>
  );
}
export function Welcome({ workspace, onExplore }) {
  const [mode, setMode] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const form = useRef(null);
  function open(next) {
    setMode(next);
    setError("");
    setPassword("");
    setTimeout(() => {
      form.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "owner") await workspace.login(password);
      else await workspace.authenticate(mode, { email, password });
      setPassword("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <a href="#" className="welcome-logo" aria-label="Dawn home">
          dawn<span>.</span>
        </a>
        <button className="welcome-link" onClick={() => open("signin")}>
          Sign in <span aria-hidden="true">↗</span>
        </button>
      </header>
      <main className="welcome-main">
        <p className="welcome-kicker">
          <span /> A NEW DAY FOR YOUR IDEAS
        </p>
        <div
          className="sunrise-scene"
          aria-label="Dawn rises over a glowing horizon while cogs and tools orbit around it"
          role="img"
        >
          <div className="sunrise-halo" />
          <div className="sunrise-disc" />
          <div className="dawn-rise">
            <span className="dawn-word">dawn</span>
            <span className="dawn-reflection" aria-hidden="true">
              dawn
            </span>
          </div>
          <div className="orbit-ring" />
          <div className="tool-orbit">
            {["cog", "wrench", "cog", "hammer", "code", "cog"].map(
              (kind, i) => (
                <div className={`orbit-arm orbit-arm-${i}`} key={i}>
                  <div className="orbit-tool">
                    <Tool kind={kind} />
                  </div>
                </div>
              ),
            )}
          </div>
          <div className="sunrise-horizon" />
          <div className="sunrise-floor" />
          <span className="scene-coordinate coordinate-left">
            IDEA → EXECUTION
          </span>
          <span className="scene-coordinate coordinate-right">
            07 ECOSYSTEMS / ONE VISION
          </span>
        </div>
        <section className="welcome-copy">
          <p className="welcome-overline">YOUR NEXT CHAPTER STARTS HERE</p>
          <h1>Give your idea a new dawn.</h1>
          <p>
            One workflow. Seven ways to bring it to life.
            <br />
            Build with an agent ecosystem, follow every handoff, and find your
            best path to production.
          </p>
          <div className="welcome-ctas">
            <button className="welcome-primary" onClick={() => open("signup")}>
              Create your workspace <span aria-hidden="true">↗</span>
            </button>
            <button className="welcome-link" onClick={onExplore}>
              Explore the ecosystems <span aria-hidden="true">→</span>
            </button>
          </div>
          <p className="welcome-footnote">
            Your own private workspace. Saved workflows. Live agent activity.
          </p>
        </section>
        {mode && (
          <section
            className="welcome-auth"
            ref={form}
            aria-labelledby="auth-title"
          >
            <div className="welcome-auth-heading">
              <div>
                <p className="welcome-overline">LET’S GET STARTED</p>
                <h2 id="auth-title">
                  {mode === "signup"
                    ? "Create your private workspace"
                    : mode === "owner"
                      ? "Open the owner workspace"
                      : "Welcome back"}
                </h2>
              </div>
              <button
                className="welcome-link"
                onClick={() => {
                  setMode("");
                  setPassword("");
                }}
                aria-label="Close account form"
              >
                ✕
              </button>
            </div>
            <form onSubmit={submit}>
              {mode !== "owner" && (
                <>
                  <label htmlFor="account-email">Email address</label>
                  <input
                    id="account-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={254}
                    required
                    disabled={busy}
                  />
                </>
              )}
              <label htmlFor="account-password">
                {mode === "owner" ? "Workspace password" : "Password"}
              </label>
              <input
                id="account-password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={mode === "owner" ? undefined : 16}
                maxLength={256}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={busy}
              />
              {mode === "signup" && (
                <p className="welcome-auth-note">
                  Use at least 16 characters. Your workflows are private to your
                  account.
                </p>
              )}
              {error && (
                <p className="welcome-error" role="alert">
                  {error}
                </p>
              )}
              <button className="welcome-primary" disabled={busy}>
                {busy
                  ? "Connecting…"
                  : mode === "signup"
                    ? "Create account & enter workspace"
                    : "Sign in"}
                <span aria-hidden="true">→</span>
              </button>
            </form>
            <div className="welcome-auth-links">
              <button
                className="welcome-link"
                onClick={() => open(mode === "signup" ? "signin" : "signup")}
              >
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
              {mode !== "owner" && (
                <button className="welcome-link" onClick={() => open("owner")}>
                  Existing owner workspace
                </button>
              )}
            </div>
          </section>
        )}
      </main>
      <footer className="welcome-footer">
        <span>dawn / organizational intelligence</span>
        <span>From the first spark to what comes next.</span>
      </footer>
    </div>
  );
}
