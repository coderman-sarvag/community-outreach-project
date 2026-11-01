import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import CompletionPopup from './components/CompletionPopup.jsx';
import Login from './pages/Login.jsx';
import StudentHome from './pages/StudentHome.jsx';
import CouncilHome from './pages/CouncilHome.jsx';
import AuthorityHome from './pages/AuthorityHome.jsx';
import Authorities from './pages/Authorities.jsx';
import Lodge from './pages/Lodge.jsx';

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <p className="loading">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <Navbar />
      <main className="page">
        <Outlet />
      </main>
      {(user.role === 'student' || user.role === 'council') && <CompletionPopup />}
    </>
  );
}

function RoleGate({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

function Home() {
  const { user } = useAuth();
  if (user.role === 'student') return <StudentHome />;
  if (user.role === 'council') return <CouncilHome />;
  return <AuthorityHome />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Home />} />
        <Route path="/authorities" element={<RoleGate roles={['student', 'council']}><Authorities /></RoleGate>} />
        <Route path="/lodge" element={<RoleGate roles={['student', 'council']}><Lodge /></RoleGate>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
