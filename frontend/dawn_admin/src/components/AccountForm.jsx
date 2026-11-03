import { useState } from "react";
import "./Welcome.css";
export function AccountForm({
  workspace,
  initialMode = "signin",
  onClose,
  onDemo,
}) {
  const [mode, setMode] = useState(initialMode),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function open(next) {
    setMode(next);
    setError("");
    setPassword("");
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "owner") await workspace.login(password);
      else await workspace.authenticate(mode, { email, password });
      setPassword("");
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="welcome-auth" aria-labelledby="auth-title">
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
          onClick={onClose}
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
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
        {onDemo && (
          <button className="welcome-link" onClick={onDemo}>
            Demo_Dawn — try the guided tutorial
          </button>
        )}
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
  );
}
