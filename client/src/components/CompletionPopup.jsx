import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { popupsOff, turnPopupsOff } from '../popupCookie.js';
import { fullTime } from '../format.js';

/*
  Shows resolved complaints one at a time.
  - Close: marks this one as seen (it won't pop up again) and shows the next.
  - Don't show again this session: hides all popups until the next login / browser restart.
    Unseen ones pop up again at the next login.
*/
export default function CompletionPopup() {
  const { user, socket } = useAuth();
  const [queue, setQueue] = useState([]);
  const [off, setOff] = useState(popupsOff());
  const closeRef = useRef(null);

  useEffect(() => {
    if (off) return;
    api('/complaints/notifications')
      .then((list) =>
        setQueue((q) => [...q, ...list.filter((c) => !q.some((x) => x._id === c._id))])
      )
      .catch(() => {});
  }, [user?._id, off]);

  useEffect(() => {
    if (!socket) return;
    const onResolved = (c) => {
      if (popupsOff()) return;
      setQueue((q) => (q.some((x) => x._id === c._id) ? q : [...q, c]));
    };
    socket.on('complaint:resolved', onResolved);
    return () => socket.off('complaint:resolved', onResolved);
  }, [socket]);

  const current = queue[0];

  useEffect(() => {
    closeRef.current?.focus();
  }, [current?._id]);

  if (off || !current) return null;

  const close = () => {
    api(`/complaints/${current._id}/seen`, { method: 'POST' }).catch(() => {});
    setQueue((q) => q.slice(1));
  };
  const silence = () => {
    turnPopupsOff();
    setOff(true);
    setQueue([]);
  };
  const last = current.history?.[current.history.length - 1];

  return (
    <div className="popup-backdrop" onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="popup" role="dialog" aria-modal="true" aria-labelledby="popup-title">
        <span className="popup-stamp" aria-hidden="true">Resolved</span>
        <p className="popup-count">
          {queue.length > 1 ? `1 of ${queue.length} completed complaints` : 'Completed complaint'}
        </p>
        <h2 id="popup-title">
          Complaint <span className="tag">{current.complaintNo}</span> is resolved
        </h2>
        <p className="popup-title-line">{current.title}</p>
        <dl className="facts">
          <div><dt>Department</dt><dd>{current.authority?.name}</dd></div>
          <div><dt>Resolved</dt><dd>{fullTime(current.resolvedAt)}</dd></div>
          {current.student && <div><dt>Student</dt><dd>{current.student.name}, {current.student.roomNo}</dd></div>}
          {current.location && <div><dt>Location</dt><dd>{current.location}</dd></div>}
        </dl>
        {last?.note && <p className="popup-note">“{last.note}” by {last.byName}</p>}
        <div className="popup-actions">
          <button ref={closeRef} className="btn primary" onClick={close}>
            {queue.length > 1 ? 'Close and show next' : 'Close'}
          </button>
          <button className="btn ghost" onClick={silence}>Don’t show again this session</button>
        </div>
      </div>
    </div>
  );
}
