import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

// Portal menu bar under the masthead
export default function Navbar() {
  const { user, logout } = useAuth();
  const canLodge = user.role === 'student' || user.role === 'council';
  const place = user.role === 'authority' ? user.authority?.name : user.hostel?.name;
  const role = user.role === 'student' ? `Student, Room ${user.roomNo}` : user.designation;

  return (
    <header className="menubar">
      <div className="wrap menubar-inner">
        <nav aria-label="Main">
          <NavLink to="/" end>Dashboard</NavLink>
          {canLodge && <NavLink to="/lodge">Lodge complaint</NavLink>}
          {canLodge && <NavLink to="/authorities">Departments</NavLink>}
        </nav>
        <div className="nav-user">
          <span>
            {user.name}
            <small>{role} · {place}</small>
          </span>
          <button className="btn small logout" onClick={logout}>Log out</button>
        </div>
      </div>
    </header>
  );
}
