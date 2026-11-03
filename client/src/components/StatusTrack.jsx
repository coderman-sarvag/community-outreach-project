import { STATUS_LABEL } from '../format.js';

// Per-complaint progress bar. The "item" step shows whether the needed item was in stock,
// is awaited through institute funds, or has arrived; the next step names the worker who visits.
const STEP_OF = { pending: 0, acknowledged: 1, awaiting_items: 2, items_arrived: 2, worker_assigned: 3, in_progress: 4, resolved: 5 };
const LAST = 5;

export default function StatusTrack({ c, showItem }) {
  const { status } = c;
  const step = STEP_OF[status] ?? 0;
  const awaited = c.history?.some((h) => h.status === 'awaiting_items');
  const worker = c.authority?.worker || 'Worker';

  const itemLabel =
    status === 'awaiting_items' ? 'Item not available'
    : awaited ? 'Items arrived'
    : step > 2 ? 'Items available'
    : 'Item check';
  const workerLabel = step > 3 ? `${worker} visited` : step === 3 ? `${worker} will visit` : `${worker} visit`;
  const steps = ['Lodged', 'Received', itemLabel, workerLabel, 'In progress', 'Resolved'];

  // items_arrived completes the item step, so the bar reaches it
  const reached = status === 'items_arrived' ? 2.5 : step;
  const percent = Math.round((reached / LAST) * 100);

  let detail = '';
  if (showItem && c.item) {
    if (status === 'awaiting_items') detail = `${c.item} is not in stock. Approval requested from institute funds.`;
    else if (status === 'items_arrived') detail = `${c.item} has arrived. ${worker} will be sent next.`;
    else if (step > 2) detail = `${c.item} ${awaited ? 'received through institute funds' : 'taken from department stock'}.`;
  }

  return (
    <div className="track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      aria-valuetext={STATUS_LABEL[status]}>
      <div className="track-bar">
        <div className={`track-fill fill-${status}`} style={{ width: `${percent}%` }} />
      </div>
      <ol className="track-steps">
        {steps.map((label, i) => (
          <li key={i} className={
            i === 2 && status === 'awaiting_items' ? 'current blocked'
            : i < step || (i === 2 && status === 'items_arrived') ? 'done'
            : i === step ? 'current' : ''
          }>
            {label}
          </li>
        ))}
      </ol>
      {detail && <p className={`track-detail ${status === 'awaiting_items' ? 'blocked' : ''}`}>{detail}</p>}
    </div>
  );
}
