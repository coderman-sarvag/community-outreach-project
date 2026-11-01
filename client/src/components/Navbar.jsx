import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const canLodge = user.role === 'student' || user.role === 'council';
  const place = user.role === 'authority' ? user.authority?.name : user.hostel?.name;

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="brand">
          Hostel Complaints <span>{place}</span>
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>Dashboard</NavLink>
          {canLodge && <NavLink to="/lodge">Lodge complaint</NavLink>}
          {canLodge && <NavLink to="/authorities">Departments</NavLink>}
        </nav>
        <div className="nav-user">
          <span>
            {user.name}
            <small>{user.role === 'student' ? `Room ${user.roomNo}` : user.designation}</small>
          </span>
          <button className="btn ghost small" onClick={logout}>Log out</button>
        </div>
      </div>
    </header>
  );
}
