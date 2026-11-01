import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Authorities() {
  const [list, setList] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/meta/authorities').then(setList).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="single">
      <div className="page-head">
        <h1>Departments</h1>
      </div>
      <p className="muted lead">Send a complaint straight to the department that fixes it.</p>
      {error && <p className="error">{error}</p>}
      <ul className="dept-grid">
        {list.map((a) => (
          <li key={a._id} className="card dept">
            <h2>{a.name}</h2>
            <p>{a.description}</p>
            <p className="dept-contact">
              <a href={`mailto:${a.email}`}>{a.email}</a>
              <a href={`tel:${a.phone}`}>{a.phone}</a>
            </p>
            <Link className="btn primary" to={`/lodge?authority=${a._id}`}>Lodge complaint to {a.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
