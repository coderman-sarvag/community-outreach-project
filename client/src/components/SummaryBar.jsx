import { STATUS_ORDER, STATUS_LABEL } from '../format.js';

// Overall progress for everything on this dashboard
export default function SummaryBar({ items, heading }) {
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
  items.forEach((c) => (counts[c.status] += 1));
  const total = items.length;
  const resolvedPct = total ? Math.round((counts.resolved / total) * 100) : 0;

  return (
    <section className="summary" aria-label="Progress summary">
      <div className="summary-head">
        <h2>{heading}</h2>
        <p>
          <strong>{counts.resolved}</strong> of {total} resolved ({resolvedPct}%)
        </p>
      </div>
      <div className="summary-bar">
        {total === 0 && <div className="summary-empty" />}
        {STATUS_ORDER.map(
          (s) => counts[s] > 0 && (
            <div key={s} className={`seg fill-${s}`} style={{ flexGrow: counts[s] }} title={`${STATUS_LABEL[s]}: ${counts[s]}`} />
          )
        )}
      </div>
      <ul className="summary-legend">
        {STATUS_ORDER.map((s) => (
          <li key={s}>
            <span className={`dot fill-${s}`} aria-hidden="true" />
            {STATUS_LABEL[s]} <strong>{counts[s]}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
