import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useComplaints } from '../useComplaints.js';
import SummaryBar from '../components/SummaryBar.jsx';
import ComplaintList from '../components/ComplaintList.jsx';

const NEXT = (worker) => ({
  pending: ['acknowledged', 'Mark received'],
  awaiting_items: ['items_arrived', 'Items have arrived'],
  items_arrived: ['worker_assigned', `Send ${worker.toLowerCase()}`],
  worker_assigned: ['in_progress', 'Start work'],
  in_progress: ['resolved', 'Mark resolved'],
});

function Actions({ c, items, worker, onDone, onStockChange }) {
  const [note, setNote] = useState('');
  const [item, setItem] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const next = NEXT(worker)[c.status];
  const checkingItem = c.status === 'acknowledged';
  if (!next && !checkingItem) return null;

  const advance = async (status) => {
    setBusy(true);
    setError('');
    try {
      onDone(await api(`/complaints/${c._id}/status`, { method: 'PATCH', body: { status, note, item } }));
      if (item) onStockChange();
      setNote('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const picked = items.find((i) => i.name === item);

  return (
    <div className="actions">
      {checkingItem && (
        <select value={item} onChange={(e) => setItem(e.target.value)} aria-label={`Item needed for ${c.complaintNo}`}>
          <option value="">No item needed</option>
          {items.map((i) => (
            <option key={i._id} value={i.name}>{i.name} ({i.quantity > 0 ? `${i.quantity} ${i.unit} in stock` : 'out of stock'})</option>
          ))}
        </select>
      )}
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the student and council (optional)"
        aria-label={`Note for ${c.complaintNo}`} maxLength={500} />
      {checkingItem ? (
        <>
          <button className="btn primary" onClick={() => advance('worker_assigned')} disabled={busy || picked?.quantity === 0}>
            {item ? 'Available, send' : 'Send'} {worker.toLowerCase()}
          </button>
          <button className="btn ghost" onClick={() => advance('awaiting_items')} disabled={busy || !item}
            title={item ? '' : 'Choose the item first'}>
            Not available, request institute funds
          </button>
        </>
      ) : (
        <button className={`btn ${next[0] === 'resolved' ? 'success' : 'primary'}`} onClick={() => advance(next[0])} disabled={busy}>
          {busy ? 'Saving…' : next[1]}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

// Department stock: only the department sees it
function Stock({ items, onChange }) {
  const [error, setError] = useState('');
  const set = async (i, quantity) => {
    setError('');
    try {
      await api(`/meta/items/${i._id}`, { method: 'PATCH', body: { quantity } });
      onChange();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <section className="card">
      <h2>Items in stock</h2>
      {error && <p className="error">{error}</p>}
      <ul className="stock">
        {items.map((i) => (
          <li key={i._id} className={i.quantity === 0 ? 'out' : ''}>
            <span>{i.name}<small>{i.quantity === 0 ? 'Not available' : `${i.quantity} ${i.unit}`}</small></span>
            <span className="stock-btns">
              <button className="btn ghost small" onClick={() => set(i, i.quantity - 1)} disabled={i.quantity === 0}
                aria-label={`One less ${i.name}`}>−</button>
              <button className="btn ghost small" onClick={() => set(i, i.quantity + 1)} aria-label={`One more ${i.name}`}>+</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AuthorityHome() {
  const { user } = useAuth();
  const { items, loading, error, upsert } = useComplaints();
  const [view, setView] = useState('open');
  const [hostel, setHostel] = useState('');
  const [stock, setStock] = useState([]);
  const loadStock = () => api('/meta/items').then(setStock).catch(() => {});
  useEffect(() => {
    loadStock();
  }, []);
  const worker = user.authority?.worker || 'Worker';

  const hostels = useMemo(
    () => [...new Map(items.map((c) => [c.hostel?._id, c.hostel?.name])).entries()],
    [items]
  );

  const inHostel = items.filter((c) => !hostel || c.hostel?._id === hostel);
  const shown = inHostel
    .filter((c) => (view === 'open' ? c.status !== 'resolved' : view === 'resolved' ? c.status === 'resolved' : true))
    .sort((a, b) => (view === 'open' ? (b.priority === 'high') - (a.priority === 'high') : 0));
  const openCount = inHostel.filter((c) => c.status !== 'resolved').length;

  return (
    <div className="layout">
    <div className="main-col">
      <div className="page-head">
        <h1>{user.authority?.name}</h1>
      </div>

      <SummaryBar items={inHostel} heading="Complaints for your department" />

      <div className="filters">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={view === 'open'} onClick={() => setView('open')}>Open <span>{openCount}</span></button>
          <button role="tab" aria-selected={view === 'resolved'} onClick={() => setView('resolved')}>Resolved</button>
          <button role="tab" aria-selected={view === 'all'} onClick={() => setView('all')}>All</button>
        </div>
        <select value={hostel} onChange={(e) => setHostel(e.target.value)} aria-label="Hostel">
          <option value="">All hostels</option>
          {hostels.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="loading">Loading complaints…</p>
      ) : (
        <ComplaintList
          items={shown}
          viewerRole="authority"
          empty={view === 'open' ? 'No open complaints for your department.' : 'Nothing here yet.'}
          renderActions={(c) => <Actions c={c} items={stock} worker={worker} onDone={upsert} onStockChange={loadStock} />}
        />
      )}
    </div>
    <aside className="side-col">
      <Stock items={stock} onChange={loadStock} />
    </aside>
    </div>
  );
}
