export function rankRuns(runs, weights) {
  const completed = runs.filter(
    (run) => run.status === "completed" && run.evaluation && run.metrics,
  );
  if (!completed.length) return [];
  const minTime = Math.min(...completed.map((r) => r.metrics.durationMs)),
    minTokens = Math.min(
      ...completed.map((r) => r.metrics.inputTokens + r.metrics.outputTokens),
    );
  const total = weights.quality + weights.speed + weights.efficiency;
  return completed
    .map((run) => {
      const quality = (run.evaluation.quality + run.evaluation.purposeFit) / 2;
      const speed = (100 * minTime) / Math.max(run.metrics.durationMs, 1);
      const efficiency =
        (100 * minTokens) /
        Math.max(run.metrics.inputTokens + run.metrics.outputTokens, 1);
      return {
        id: run._id,
        structureId: run.structureId,
        score: Math.round(
          (quality * weights.quality +
            speed * weights.speed +
            efficiency * weights.efficiency) /
            total,
        ),
        quality: Math.round(quality),
        speed: Math.round(speed),
        efficiency: Math.round(efficiency),
        metrics: run.metrics,
        purposeFit: run.evaluation.purposeFit,
        evidence: run.evaluation.evidence || [],
        reasoning: run.evaluation.reasoning,
      };
    })
    .sort((a, b) => b.score - a.score);
}
