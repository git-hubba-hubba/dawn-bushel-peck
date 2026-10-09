import { useCallback, useEffect, useState } from "react";
export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: "same-origin",
      ...options,
      headers:
        options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(
      "The backend is unavailable. Start the API and configure MongoDB.",
    );
  }
  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The backend is unavailable. Start the API and configure MongoDB.",
    );
  }
  if (!response.ok)
    throw Object.assign(new Error(data.error || "Request failed."), {
      status: response.status,
    });
  return data;
}
export function useWorkspace() {
  const [status, setStatus] = useState(null),
    [projects, setProjects] = useState([]),
    [runs, setRuns] = useState([]),
    [artifacts, setArtifacts] = useState([]),
    [error, setError] = useState(""),
    [authenticated, setAuthenticated] = useState(false),
    [batchId, setBatchId] = useState("");
  const refresh = useCallback(async () => {
    try {
      const [nextStatus, nextProjects, nextRuns, nextArtifacts] =
        await Promise.all([
          api("/status"),
          api("/projects"),
          api("/runs"),
          api("/artifacts"),
        ]);
      setStatus(nextStatus);
      setProjects(nextProjects);
      setRuns(nextRuns);
      setArtifacts(nextArtifacts);
      setAuthenticated(true);
      setError("");
    } catch (e) {
      setError(e.message);
      if (e.status === 401) {
        setAuthenticated(false);
        setStatus(null);
        setProjects([]);
        setRuns([]);
        setArtifacts([]);
      }
    }
  }, []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) refresh();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (!authenticated) return;
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, [authenticated, refresh]);
  const hasActiveRuns = runs.some((run) =>
    ["queued", "running"].includes(run.status),
  );
  useEffect(() => {
    if (!authenticated || !hasActiveRuns) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const nextRuns = await api("/runs");
        if (active) setRuns(nextRuns);
      } catch {
        /* The regular refresh reports connection errors. */
      }
    }, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [authenticated, hasActiveRuns]);
  async function login(password) {
    await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    await refresh();
  }
  async function authenticate(mode, credentials) {
    await api(`/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    await refresh();
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setAuthenticated(false);
    setStatus(null);
    setProjects([]);
    setRuns([]);
    setArtifacts([]);
    setBatchId("");
  }
  async function start(projectId, structures, weights) {
    const result = await api("/runs", {
      method: "POST",
      body: JSON.stringify({ projectId, structures, weights }),
    });
    setBatchId(result.batchId);
    await refresh();
    return result;
  }
  return {
    status,
    projects,
    runs,
    artifacts,
    error,
    authenticated,
    batchId,
    setBatchId,
    refresh,
    login,
    authenticate,
    logout,
    start,
  };
}
