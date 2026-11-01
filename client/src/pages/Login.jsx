import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const DEMO = [
  ['Student, Hostel A', 'student1.a@iitr.test'],
  ['Student, Hostel B', 'student1.b@iitr.test'],
  ['Warden, Hostel A', 'warden.a@iitr.test'],
  ['Bhawan Secretary, Hostel B', 'bhawansecy.b@iitr.test'],
  ['Water Works', 'water@iitr.test'],
  ['Sanitation', 'sanitation@iitr.test'],
  ['Electrical Maintenance', 'electrical@iitr.test'],
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login-intro">
        <div className="login-stamp" aria-hidden="true">Resolved</div>
        <h1>Report a hostel problem once. Follow it until it’s fixed.</h1>
        <p>
          Sensors in the washrooms, water coolers and corridors file complaints on their own. Students and the
          Bhawan council can add photos and send issues straight to the right department.
        </p>
      </section>

      <form className="card login-form" onSubmit={submit}>
        <h2>Log in</h2>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>

        <details className="demo">
          <summary>Demo accounts (password: password123)</summary>
          <ul>
            {DEMO.map(([label, mail]) => (
              <li key={mail}>
                <button type="button" className="linkish" onClick={() => { setEmail(mail); setPassword('password123'); }}>
                  {label}
                </button>
                <span>{mail}</span>
              </li>
            ))}
          </ul>
        </details>
      </form>
    </div>
  );
}
