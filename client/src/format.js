export const STATUS_ORDER = [
  'pending', 'acknowledged', 'awaiting_items', 'items_arrived', 'worker_assigned', 'in_progress', 'resolved',
];

export const STATUS_LABEL = {
  pending: 'Pending',
  acknowledged: 'Received',
  awaiting_items: 'Item awaited',
  items_arrived: 'Item arrived',
  worker_assigned: 'Worker assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
};

export const SENSOR_LABEL = {
  leak: 'Leak sensor',
  dustbin: 'Dustbin sensor',
  water_quality: 'Water quality sensor',
  geyser: 'Geyser temperature sensor',
};

export function timeAgo(date) {
  if (!date) return '';
  const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const fullTime = (date) =>
  date
    ? new Date(date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

export function sourceLabel(c) {
  if (c.source === 'device') return `${SENSOR_LABEL[c.sensorType] || 'Sensor'} (${c.device?.deviceId || 'device'})`;
  if (c.source === 'council') return `${c.lodgedBy?.name || 'Council'}, ${c.lodgedBy?.designation || 'Council'}`;
  return c.lodgedBy?.name || 'Student';
}
