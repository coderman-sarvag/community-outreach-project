import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

export default function Lodge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isCouncil = user.role === 'council';

  const [authorities, setAuthorities] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    authorityId: params.get('authority') || '',
    studentId: '',
    title: '',
    location: user.role === 'student' ? `Room ${user.roomNo}` : '',
    description: '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/meta/authorities').then(setAuthorities).catch(() => {});
    if (isCouncil) api('/meta/students').then(setStudents).catch(() => {});
  }, [isCouncil]);

  useEffect(() => {
    if (!file) return setPreview('');
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (f && f.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5 MB.');
      e.target.value = '';
      return;
    }
    setError('');
    setFile(f || null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => v && data.append(k, v));
    if (file) data.append('image', file);
    try {
      await api('/complaints', { method: 'POST', form: data });
      navigate('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="single narrow">
      <div className="page-head">
        <h1>Lodge a complaint</h1>
      </div>
      <form className="card form" onSubmit={submit}>
        <label>
          Department
          <select value={form.authorityId} onChange={set('authorityId')} required>
            <option value="">Choose who should fix it</option>
            {authorities.map((a) => <option key={a._id} value={a._id}>{a.name}: {a.description}</option>)}
          </select>
        </label>

        {isCouncil && (
          <label>
            On behalf of
            <select value={form.studentId} onChange={set('studentId')}>
              <option value="">No specific student (hostel issue)</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.name}, {s.enrollmentNo}, Room {s.roomNo}</option>
              ))}
            </select>
          </label>
        )}

        <label>
          Title
          <input value={form.title} onChange={set('title')} maxLength={120} required placeholder="e.g. Garbage spilling near the stairs" />
        </label>
        <label>
          Location
          <input value={form.location} onChange={set('location')} maxLength={120} placeholder="Room, floor or area" />
        </label>
        <label>
          Details
          <textarea value={form.description} onChange={set('description')} rows={4} maxLength={2000}
            placeholder="What’s wrong, since when, anything the staff should know" />
        </label>

        <label>
          Photo (optional, up to 5 MB)
          <input type="file" accept="image/*" onChange={pickFile} />
        </label>
        {preview && <img className="preview" src={preview} alt="Selected photo preview" />}

        {error && <p className="error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Lodging…' : 'Lodge complaint'}</button>
        </div>
      </form>
    </div>
  );
}
