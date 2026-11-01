// Which complaints each role is allowed to see
export function scopeFilter(user) {
  switch (user.role) {
    case 'student':
      // automated complaints from their own hostel + complaints that concern them
      return {
        hostel: user.hostel,
        $or: [{ source: 'device' }, { student: user._id }, { lodgedBy: user._id }],
      };
    case 'council':
      return { hostel: user.hostel };
    case 'authority':
      return { authority: user.authority };
    default:
      return { _id: null };
  }
}

export const POPULATE = [
  { path: 'student', select: 'name email phone enrollmentNo branch roomNo' },
  { path: 'lodgedBy', select: 'name role designation' },
  { path: 'authority', select: 'name code email phone' },
  { path: 'hostel', select: 'name code' },
  { path: 'device', select: 'deviceId location sensorType lastSeen' },
];
