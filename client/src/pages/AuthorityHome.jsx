import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useComplaints } from '../useComplaints.js';
import SummaryBar from '../components/SummaryBar.jsx';
import ComplaintList from '../components/ComplaintList.jsx';

const NEXT = {
  pending: ['acknowledged', 'Acknowledge'],
  acknowledged: ['in_progress', 'Start work'],
  in_progress: ['resolved', 'Mark resolved'],
};

function Actions({ c, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const next = NEXT[c.status];
  if (!next) return null;

  const advance = async () => {
    setBusy(true);
    setError('');
    try {
      onDone(await api(`/complaints/${c._id}/status`, { method: 'PATCH', body: { status: next[0], note } }));
      setNote('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="actions">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the student and council (optional)"
        aria-label={`Note for ${c.complaintNo}`} maxLength={500} />
      <button className={`btn ${next[0] === 'resolved' ? 'success' : 'primary'}`} onClick={advance} disabled={busy}>
        {busy ? 'Saving…' : next[1]}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function AuthorityHome() {
  const { user } = useAuth();
  const { items, loading, error, upsert } = useComplaints();
  const [view, setView] = useState('open');
  const [hostel, setHostel] = useState('');

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
    <div className="single">
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
          renderActions={(c) => <Actions c={c} onDone={upsert} />}
        />
      )}
    </div>
  );
}
