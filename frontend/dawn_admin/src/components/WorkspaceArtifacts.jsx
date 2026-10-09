export function WorkspaceArtifacts({ artifacts }) {
  if (!artifacts.length) return null;
  return (
    <section className="panel artifact-panel">
      <span className="eyebrow">EXECUTED WORKSPACE ACTIONS</span>
      <h2>Drafts & tasks</h2>
      {artifacts.map((item) => (
        <details key={item._id}>
          <summary>
            <span className="artifact-type">{item.type}</span>
            {item.title}
          </summary>
          <p className="deliverable">{item.body || item.description}</p>
        </details>
      ))}
    </section>
  );
}
