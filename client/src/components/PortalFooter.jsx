import { Link } from 'react-router-dom';

export default function PortalFooter() {
  return (
    <footer className="portal-footer">
      <div className="wrap footer-grid">
        <section>
          <h2>Direct to Authority</h2>
          <p>
            The Bhawan complaint app for IIT Roorkee hostels. Sensors, students and the Bhawan council report
            problems directly to Water Works, Sanitation, Electrical and the other departments, and follow them
            until they are resolved.
          </p>
        </section>
        <section>
          <h2>Quick links</h2>
          <ul>
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/lodge">Lodge a complaint</Link></li>
            <li><Link to="/authorities">Departments</Link></li>
            <li><a href="https://www.iitr.ac.in" target="_blank" rel="noreferrer">IIT Roorkee website</a></li>
          </ul>
        </section>
        <section>
          <h2>How it works</h2>
          <ol>
            <li>Lodge a complaint with a photo, or a sensor reports it automatically.</li>
            <li>The department acknowledges it and starts work.</li>
            <li>You get a notification when it is resolved.</li>
          </ol>
        </section>
      </div>
      <div className="footer-base">
        <div className="wrap">
          <span>© {new Date().getFullYear()} Direct to Authority · Bhawan Complaint App, IIT Roorkee</span>
          <span>A student community outreach project</span>
        </div>
      </div>
    </footer>
  );
}
