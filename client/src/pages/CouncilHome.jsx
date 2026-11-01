import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useComplaints } from '../useComplaints.js';
import { STATUS_ORDER, STATUS_LABEL, SENSOR_LABEL, timeAgo } from '../format.js';
import SummaryBar from '../components/SummaryBar.jsx';
import ComplaintList from '../components/ComplaintList.jsx';

export default function CouncilHome() {
  const { user } = useAuth();
  const { items, loading, error } = useComplaints();
  const [devices, setDevices] = useState([]);
  const [status, setStatus] = useState('');
  const [dept, setDept] = useState('');
  const [source, setSource] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const load = () => api('/meta/devices').then(setDevices).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const departments = useMemo(
    () => [...new Map(items.map((c) => [c.authority?._id, c.authority?.name])).entries()],
    [items]
  );

  const term = q.trim().toLowerCase();
  const shown = items.filter(
    (c) =>
      (!status || c.status === status) &&
      (!dept || c.authority?._id === dept) &&
      (!source || c.source === source) &&
      (!term ||
        [c.complaintNo, c.title, c.student?.name, c.student?.enrollmentNo, c.student?.roomNo, c.location]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(term)))
  );

  return (
    <div className="layout">
      <div className="main-col">
        <div className="page-head">
          <h1>{user.hostel?.name} complaints</h1>
          <Link to="/lodge" className="btn primary">Lodge a complaint</Link>
        </div>

        <SummaryBar items={items} heading="All complaints in your hostel" />

        <div className="filters">
          <input type="search" placeholder="Search name, enrollment no., room, CMP no." value={q}
            onChange={(e) => setQ(e.target.value)} aria-label="Search complaints" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department">
            <option value="">Any department</option>
            {departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Reported by">
            <option value="">Anyone</option>
            <option value="student">Students</option>
            <option value="council">Council</option>
            <option value="device">Sensors</option>
          </select>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="loading">Loading complaints…</p>
        ) : (
          <ComplaintList items={shown} viewerRole="council" empty="No complaints match these filters." />
        )}
      </div>

      <aside className="side-col">
        <section className="card">
          <h2>Sensors in {user.hostel?.name}</h2>
          <ul className="devices">
            {devices.map((d) => (
              <li key={d._id}>
                <strong>{SENSOR_LABEL[d.sensorType]}</strong>
                <span>{d.location}</span>
                <span className="muted">
                  {d.deviceId}, {d.lastSeen ? `last report ${timeAgo(d.lastSeen)}${d.lastReading ? `, ${d.lastReading}` : ''}` : 'no reports yet'}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>Contact a department directly</h2>
          <Link to="/authorities" className="btn ghost">See all departments</Link>
        </section>
      </aside>
    </div>
  );
}
