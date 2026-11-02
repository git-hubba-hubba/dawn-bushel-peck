import { useEffect, useRef, useState } from "react";
import { api } from "./useWorkspace";
export function useIdeaAssessment(options) {
  const [assessing, setAssessing] = useState(false),
    [failure, setFailure] = useState(null);
  const current = useRef(options),
    pending = useRef(false),
    attempted = useRef(""),
    mounted = useRef(false);
  const key = JSON.stringify([
    options.content.trim(),
    options.name.trim(),
    options.weights,
  ]);
  useEffect(() => {
    current.current = { ...options, key };
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function assess() {
    const source = current.current;
    if (
      pending.current ||
      source.busy ||
      !source.workspace.authenticated ||
      !source.workspace.status?.providerConfigured ||
      !source.content.trim()
    )
      return;
    pending.current = true;
    attempted.current = source.key;
    setAssessing(true);
    setFailure(null);
    const stillCurrent = () =>
      mounted.current &&
      current.current.key === source.key &&
      current.current.workspace.authenticated;
    let phase = "workflow_save";
    try {
      let projectId = source.projectId;
      if (!projectId) {
        const project = await api("/projects", {
          method: "POST",
          body: JSON.stringify({
            name: source.name.trim() || "Untitled workflow",
            content: source.content,
          }),
        });
        projectId = project._id;
        if (!stillCurrent()) return;
        current.current.setProjectId(projectId);
        current.current.onProject(projectId);
      }
      phase = "assessment_request";
      const result = await api(`/projects/${projectId}/recommendations`, {
        method: "POST",
        body: JSON.stringify({ weights: source.weights }),
      });
      if (stillCurrent()) current.current.onRecommendations(result);
      if (mounted.current) await current.current.workspace.refresh();
    } catch (error) {
      if (stillCurrent())
        setFailure({
          key: source.key,
          message: error.message,
          code: error.code || (error.status === 429 ? "request_limit" : phase),
        });
    } finally {
      pending.current = false;
      if (mounted.current) setAssessing(false);
    }
  }
  useEffect(() => {
    if (
      !options.workspace.authenticated ||
      !options.workspace.status?.providerConfigured ||
      !options.content.trim() ||
      options.busy ||
      assessing ||
      attempted.current === key
    )
      return;
    const timer = setTimeout(() => {
      void assess();
    }, 1500);
    return () => clearTimeout(timer);
    // The current ref supplies callbacks and source data without restarting on polling renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    key,
    options.workspace.authenticated,
    options.workspace.status?.providerConfigured,
    options.busy,
    assessing,
  ]);
  return { assessing, failure: failure?.key === key ? failure : null, assess };
}
