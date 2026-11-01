import ComplaintCard from './ComplaintCard.jsx';

export default function ComplaintList({ items, viewerRole, empty, renderActions }) {
  if (items.length === 0) return <p className="empty">{empty}</p>;
  return (
    <div className="ticket-list">
      {items.map((c) => (
        <ComplaintCard key={c._id} c={c} viewerRole={viewerRole}>
          {renderActions?.(c)}
        </ComplaintCard>
      ))}
    </div>
  );
}
