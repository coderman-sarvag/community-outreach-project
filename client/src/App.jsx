import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import PortalHeader from './components/PortalHeader.jsx';
import PortalFooter from './components/PortalFooter.jsx';
import CompletionPopup from './components/CompletionPopup.jsx';
import Login from './pages/Login.jsx';
import StudentHome from './pages/StudentHome.jsx';
import CouncilHome from './pages/CouncilHome.jsx';
import AuthorityHome from './pages/AuthorityHome.jsx';
import Authorities from './pages/Authorities.jsx';
import Lodge from './pages/Lodge.jsx';

const PAGE_NAME = { '/': 'Dashboard', '/lodge': 'Lodge complaint', '/authorities': 'Departments' };

const NOTICE = {
  student: 'Attach a photo when you lodge a complaint. Departments act faster when they can see the problem.',
  council: 'You can lodge complaints on behalf of students. Every complaint from your Bhawan is listed on the dashboard.',
  authority: 'Acknowledge new complaints promptly. Students and the Bhawan council are notified when you mark one resolved.',
};

// Breadcrumb and notice line under the menu bar
function SubBar({ role }) {
  const { pathname } = useLocation();
  return (
    <div className="subbar">
      <div className="wrap subbar-inner">
        <nav aria-label="Breadcrumb" className="crumbs">
          <Link to="/">Home</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{PAGE_NAME[pathname] || 'Dashboard'}</span>
        </nav>
        <p className="notice"><strong>Notice</strong>{NOTICE[role]}</p>
      </div>
    </div>
  );
}

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <p className="loading wrap">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <PortalHeader />
      <Navbar />
      <SubBar role={user.role} />
      <main className="page wrap">
        <Outlet />
      </main>
      <PortalFooter />
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
