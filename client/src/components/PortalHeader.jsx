import { Link } from 'react-router-dom';

// Institute strip + masthead, shared by the login page and every logged-in page
export default function PortalHeader() {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <>
      <div className="topstrip">
        <div className="wrap">
          <span>Indian Institute of Technology Roorkee</span>
          <span className="topstrip-mid">Bhawan Services · Student Community Outreach</span>
          <span className="topstrip-date">{today}</span>
        </div>
      </div>
      <div className="masthead">
        <div className="wrap">
          <Link to="/" className="masthead-brand">
            <span className="emblem" aria-hidden="true">DTA</span>
            <span className="masthead-text">
              <span className="masthead-hi" lang="hi">भारतीय प्रौद्योगिकी संस्थान रुड़की</span>
              <strong>Direct to Authority</strong>
              <span className="masthead-sub">Bhawan Complaint App · IIT Roorkee</span>
            </span>
          </Link>
          <p className="masthead-note">
            Hostel complaints, sent straight to the department that fixes them.
          </p>
        </div>
      </div>
    </>
  );
}
