import { STATUS_LABEL, sourceLabel, timeAgo, fullTime } from '../format.js';
import StatusTrack from './StatusTrack.jsx';

export default function ComplaintCard({ c, viewerRole, children }) {
  const showStudent = c.student && viewerRole !== 'student';
  return (
    <article className={`ticket ${c.priority === 'high' ? 'is-high' : ''}`}>
      <header className="ticket-head">
        <span className="tag">{c.complaintNo}</span>
        <h3>{c.title}</h3>
        <span className={`status st-${c.status}`} key={c.status}>{STATUS_LABEL[c.status]}</span>
      </header>

      <dl className="facts">
        <div><dt>Department</dt><dd>{c.authority?.name}</dd></div>
        <div><dt>Hostel</dt><dd>{c.hostel?.name}</dd></div>
        {c.location && <div><dt>Location</dt><dd>{c.location}</dd></div>}
        <div><dt>Reported by</dt><dd>{sourceLabel(c)}</dd></div>
        <div><dt>Lodged</dt><dd title={fullTime(c.createdAt)}>{timeAgo(c.createdAt)}</dd></div>
        {c.priority === 'high' && <div><dt>Priority</dt><dd className="high">High</dd></div>}
      </dl>

      {showStudent && (
        <dl className="facts student-facts">
          <div><dt>Student</dt><dd>{c.student.name}</dd></div>
          <div><dt>Enrollment no.</dt><dd>{c.student.enrollmentNo}</dd></div>
          <div><dt>Branch</dt><dd>{c.student.branch}</dd></div>
          <div><dt>Room</dt><dd>{c.student.roomNo}</dd></div>
          {c.student.phone && <div><dt>Phone</dt><dd><a href={`tel:${c.student.phone}`}>{c.student.phone}</a></dd></div>}
        </dl>
      )}

      {c.source === 'device' && (
        <p className="sensor-line">
          Last reading: <strong>{c.reading || 'n/a'}</strong>
          {c.repeatCount > 0 && <>. Triggered again {c.repeatCount} time{c.repeatCount > 1 ? 's' : ''}, last {timeAgo(c.lastTriggeredAt)}</>}
        </p>
      )}

      {c.description && <p className="desc">{c.description}</p>}

      {c.image?.url && (
        <a className="photo" href={c.image.url} target="_blank" rel="noreferrer">
          <img src={c.image.url} loading="lazy"
            alt={c.source === 'device' ? 'Sorry, this is an automated complaint' : `Photo attached to ${c.complaintNo}`} />
        </a>
      )}

      <StatusTrack status={c.status} />

      {c.history?.length > 1 && (
        <details className="history">
          <summary>Updates ({c.history.length})</summary>
          <ol>
            {c.history.map((h, i) => (
              <li key={i}>
                <strong>{STATUS_LABEL[h.status]}</strong> by {h.byName}, {fullTime(h.at)}
                {h.note && <span className="note">{h.note}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}

      {children}
    </article>
  );
}
