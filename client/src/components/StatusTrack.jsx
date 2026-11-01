import { STATUS_ORDER, STATUS_LABEL } from '../format.js';

const STEP_LABEL = { pending: 'Lodged', acknowledged: 'Acknowledged', in_progress: 'In progress', resolved: 'Resolved' };

// Per-complaint progress bar: four stages, filled up to the current one
export default function StatusTrack({ status }) {
  const current = STATUS_ORDER.indexOf(status);
  const percent = Math.round((current / (STATUS_ORDER.length - 1)) * 100);
  return (
    <div className="track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      aria-valuetext={STATUS_LABEL[status]}>
      <div className="track-bar">
        <div className={`track-fill fill-${status}`} style={{ width: `${percent}%` }} />
      </div>
      <ol className="track-steps">
        {STATUS_ORDER.map((s, i) => (
          <li key={s} className={i < current ? 'done' : i === current ? 'current' : ''}>
            {STEP_LABEL[s]}
          </li>
        ))}
      </ol>
    </div>
  );
}
