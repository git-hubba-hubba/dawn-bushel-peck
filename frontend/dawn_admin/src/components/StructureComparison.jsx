import { structures } from "../../../../shared/structures";
export function StructureComparison({ onSelect }) {
  return (
    <section className="panel comparison">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">THE BIG PICTURE</span>
          <h2>Compare operating models</h2>
        </div>
      </div>
      <p className="muted">
        Qualitative guidance from your PDF. Performance analytics use actual
        runs and adjustable priorities.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Structure</th>
              <th>Decision authority</th>
              <th>Best fit</th>
              <th>Primary trade-off</th>
            </tr>
          </thead>
          <tbody>
            {structures.map((item) => (
              <tr key={item.id}>
                <td>
                  <button onClick={() => onSelect(item.id)}>
                    {item.name} ↗
                  </button>
                </td>
                <td>{item.authority}</td>
                <td>{item.fit}</td>
                <td>{item.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
