import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useComplaints } from '../useComplaints.js';
import SummaryBar from '../components/SummaryBar.jsx';
import ComplaintList from '../components/ComplaintList.jsx';

export default function StudentHome() {
  const { user } = useAuth();
  const { items, loading, error } = useComplaints();
  const [council, setCouncil] = useState([]);
  const [tab, setTab] = useState('mine');

  useEffect(() => {
    api('/meta/council').then(setCouncil).catch(() => {});
  }, []);

  const mine = items.filter((c) => c.student?._id === user._id || c.lodgedBy?._id === user._id);
  const auto = items.filter((c) => c.source === 'device');
  const shown = tab === 'mine' ? mine : auto;

  return (
    <div className="layout">
      <div className="main-col">
        <div className="page-head">
          <h1>Hello, {user.name.split(' ')[0]}</h1>
          <Link to="/lodge" className="btn primary">Lodge a complaint</Link>
        </div>

        <SummaryBar items={mine} heading="Your complaints" />

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')}>
            My complaints <span>{mine.length}</span>
          </button>
          <button role="tab" aria-selected={tab === 'auto'} onClick={() => setTab('auto')}>
            Sensor alerts in {user.hostel?.name} <span>{auto.length}</span>
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="loading">Loading complaints…</p>
        ) : (
          <ComplaintList
            items={shown}
            viewerRole="student"
            empty={tab === 'mine' ? 'You haven’t lodged any complaints yet.' : 'No sensor has reported a problem in your hostel.'}
          />
        )}
      </div>

      <aside className="side-col">
        <section className="card">
          <h2>{user.hostel?.name} council</h2>
          <ul className="contacts">
            {council.map((m) => (
              <li key={m._id}>
                <strong>{m.name}</strong>
                <span>{m.designation}</span>
                <a href={`tel:${m.phone}`}>{m.phone}</a>
                <a href={`mailto:${m.email}`}>{m.email}</a>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>Contact a department directly</h2>
          <p className="muted">Water Works, Sanitation, Electrical and others take complaints straight from you.</p>
          <Link to="/authorities" className="btn ghost">See all departments</Link>
        </section>
      </aside>
    </div>
  );
}
