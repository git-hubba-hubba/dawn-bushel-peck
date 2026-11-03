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
    throw Object.assign(new Error("Dawn could not reach the API server."), {
      code: "api_unreachable",
      title: "API connection interrupted",
      nextStep:
        "Check your connection and ask the server operator to verify that the API is running, then retry. This does not confirm an AI credit shortage.",
    });
  }
  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    throw Object.assign(
      new Error(
        "The API returned an unexpected response instead of valid data.",
      ),
      {
        code: "api_invalid_response",
        title: "API response could not be read",
        nextStep:
          "Ask the server operator to check the API server and proxy, then retry.",
      },
    );
  }
  if (!response.ok)
    throw Object.assign(new Error(data.error || "Request failed."), {
      status: response.status,
      code: data.code,
      title: data.title,
      nextStep: data.nextStep,
    });
  return data;
}
export function useWorkspace() {
  const [assessmentHealth, setAssessmentHealth] = useState(null);
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
      return true;
    } catch (e) {
      setError(e.status === 401 ? "" : e.message);
      setStatus(null);
      if (e.status === 401) {
        setAuthenticated(false);
        setStatus(null);
        setProjects([]);
        setRuns([]);
        setArtifacts([]);
        setAssessmentHealth(null);
      }
      return false;
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
    if (!(await refresh()))
      throw new Error(
        "Signed in, but workspace data could not be loaded. Check the API connection and retry.",
      );
  }
  async function authenticate(mode, credentials) {
    await api(`/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    if (!(await refresh()))
      throw new Error(
        "Signed in, but workspace data could not be loaded. Check the API connection and retry.",
      );
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setAuthenticated(false);
    setAssessmentHealth(null);
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
    assessmentHealth,
    reportAssessment: setAssessmentHealth,
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
