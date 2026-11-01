let io = null;

export function setIO(instance) {
  io = instance;
}

const idOf = (v) => (v ? String(v._id ?? v) : null);

// Socket rooms that should receive a complaint, matching the visibility rules in scope.js
function roomsFor(c) {
  const rooms = [`council:${idOf(c.hostel)}`, `authority:${idOf(c.authority)}`];
  if (c.source === 'device') rooms.push(`students:${idOf(c.hostel)}`);
  if (c.student) rooms.push(`user:${idOf(c.student)}`);
  if (c.lodgedBy) rooms.push(`user:${idOf(c.lodgedBy)}`);
  return rooms;
}

export function emitComplaint(event, complaint) {
  if (!io) return;
  const data = complaint.toObject ? complaint.toObject() : { ...complaint };
  delete data.seenBy;
  io.to(roomsFor(complaint)).emit(event, data);
}
