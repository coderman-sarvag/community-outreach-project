// Resets the database and fills it with demo data: 2 hostels, councils, students, authorities, devices.
// Run with: npm run seed
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import Hostel from './models/Hostel.js';
import Authority from './models/Authority.js';
import User from './models/User.js';
import Device from './models/Device.js';
import Complaint from './models/Complaint.js';
import Item from './models/Item.js';
import Counter, { nextComplaintNo } from './models/Counter.js';
import { LOCAL_AUTOMATED_IMAGE } from './config/automatedImage.js';

const PASSWORD = 'password123';

// items: [name, unit, quantity in stock]; 0 means it has to come through institute funds
const AUTHORITIES = [
  { code: 'WATER', name: 'Water Works', description: 'Leakage, water supply, tanks, drinking water quality', officer: 'Ramesh Chauhan', worker: 'Plumber',
    items: [['Tap (brass)', 'pcs', 12], ['PVC pipe 1 inch', 'm', 40], ['Flush valve', 'pcs', 4], ['RO filter cartridge', 'pcs', 0], ['Washroom drain cover', 'pcs', 6], ['Water tank float valve', 'pcs', 2], ['Plumbing tape', 'rolls', 25]] },
  { code: 'SANITATION', name: 'Sanitation', description: 'Garbage, dustbins, washroom cleaning, drainage', officer: 'Sunita Devi', worker: 'Sanitation worker',
    items: [['Dustbin 60 L', 'pcs', 5], ['Garbage bags (large)', 'packs', 30], ['Phenyl', 'L', 20], ['Floor mop', 'pcs', 8], ['Toilet cleaner', 'bottles', 15], ['Drain cleaning rod', 'pcs', 0]] },
  { code: 'FIRE', name: 'Fire & Safety', description: 'Fire extinguishers, smoke, gas leaks, emergency exits', officer: 'Vikram Rana', worker: 'Fire safety technician',
    items: [['Fire extinguisher (ABC, 6 kg)', 'pcs', 6], ['Smoke detector', 'pcs', 0], ['Fire hose reel', 'pcs', 1], ['Emergency exit sign', 'pcs', 4], ['Extinguisher refill', 'pcs', 10], ['Fire blanket', 'pcs', 3]] },
  { code: 'ANIMAL', name: 'Animal Control', description: 'Stray dogs, monkeys, snakes and other animals on premises', officer: 'Deepak Thapa', worker: 'Animal catcher team',
    items: [['Dog catching net', 'pcs', 3], ['Monkey cage trap', 'pcs', 2], ['Snake tongs', 'pcs', 2], ['Animal transport crate', 'pcs', 0], ['Safety gloves', 'pairs', 10]] },
  { code: 'MESS', name: 'Mess Services', description: 'Food quality, hygiene in kitchen and dining hall', officer: 'Harish Pant', worker: 'Mess staff',
    items: [['Steel plates', 'pcs', 150], ['Water jug', 'pcs', 20], ['Gas burner', 'pcs', 0], ['Dining table cover', 'pcs', 30], ['Kitchen exhaust fan', 'pcs', 1], ['Water cooler tap', 'pcs', 6]] },
  { code: 'ELECTRICAL', name: 'Electrical Maintenance', description: 'Lights, fans, sockets, geysers, power supply', officer: 'Manoj Kumar', worker: 'Electrician',
    items: [['Ceiling fan (1200 mm)', 'pcs', 0], ['Fan capacitor', 'pcs', 20], ['Fan regulator', 'pcs', 8], ['LED tube light 20 W', 'pcs', 25], ['Switch board (6 module)', 'pcs', 5], ['Socket 16 A', 'pcs', 12], ['Geyser heating element', 'pcs', 0], ['MCB 32 A', 'pcs', 6]] },
  { code: 'CIVIL', name: 'Civil Maintenance', description: 'Walls, ceilings, floors, plaster, seepage', officer: 'Prakash Joshi', worker: 'Mason',
    items: [['Cement', 'bags', 15], ['Wall putty', 'kg', 40], ['Floor tiles', 'boxes', 0], ['Waterproofing compound', 'L', 10], ['White paint', 'L', 25], ['Ceiling plaster sheet', 'pcs', 4]] },
  { code: 'FURNITURE', name: 'Furniture & Carpentry', description: 'Beds, tables, chairs, cupboards, doors, windows, latches', officer: 'Ramesh Saini', worker: 'Carpenter',
    items: [['Study chair', 'pcs', 4], ['Study table', 'pcs', 0], ['Bed plank', 'pcs', 10], ['Cupboard lock', 'pcs', 15], ['Door hinge', 'pcs', 30], ['Window latch', 'pcs', 12], ['Mattress', 'pcs', 0], ['Door handle', 'pcs', 8]] },
  { code: 'IT', name: 'Network & IT', description: 'Wi-Fi and LAN connectivity in rooms and common areas', officer: 'Ankit Saxena', worker: 'Network technician',
    items: [['Wi-Fi access point', 'pcs', 2], ['LAN cable (Cat6)', 'm', 300], ['RJ45 connector', 'pcs', 200], ['Network switch (24 port)', 'pcs', 0], ['LAN wall socket', 'pcs', 20]] },
];

const COUNCIL = {
  A: [
    ['Dr. Rakesh Verma', 'Warden', 'warden'],
    ['Dr. Neha Singh', 'Assistant Warden', 'aswarden'],
    ['Suresh Kumar', 'Supervisor', 'supervisor'],
    ['Aman Gupta', 'Bhawan Secretary', 'bhawansecy'],
    ['Riya Sharma', 'Technical Secretary', 'techsecy'],
    ['Karan Mehta', 'Mess Secretary', 'messsecy'],
  ],
  B: [
    ['Dr. Anil Joshi', 'Warden', 'warden'],
    ['Dr. Pooja Rawat', 'Assistant Warden', 'aswarden'],
    ['Mahesh Negi', 'Supervisor', 'supervisor'],
    ['Rohit Bisht', 'Bhawan Secretary', 'bhawansecy'],
    ['Sneha Iyer', 'Technical Secretary', 'techsecy'],
    ['Arjun Nair', 'Mess Secretary', 'messsecy'],
  ],
};

const STUDENTS = {
  A: [
    ['Aarav Sharma', '24118001', 'Electronics and Communication', 'A-101'],
    ['Ishita Patel', '24114012', 'Computer Science', 'A-104'],
    ['Kabir Singh', '24117023', 'Mechanical', 'A-210'],
    ['Meera Nair', '24115034', 'Electrical', 'A-215'],
    ['Vivaan Gupta', '24113045', 'Civil', 'A-302'],
  ],
  B: [
    ['Ananya Reddy', '24118056', 'Electronics and Communication', 'B-102'],
    ['Rohan Das', '24114067', 'Computer Science', 'B-108'],
    ['Saanvi Mishra', '24117078', 'Mechanical', 'B-201'],
    ['Aditya Kulkarni', '24115089', 'Electrical', 'B-206'],
    ['Tanya Bansal', '24113090', 'Civil', 'B-305'],
  ],
};

const DEVICES = [
  ['leak', 'LEAK', 'Washroom 2, Ground floor'],
  ['dustbin', 'BIN', 'Corridor dustbin, First floor'],
  ['water_quality', 'TDS', 'Water cooler, Ground floor'],
  ['geyser', 'GEYSER', 'Washroom 1 geyser, First floor'],
];

const phone = (n) => `+91 98${String(10000000 + n * 7919).slice(-8)}`;

async function run() {
  await connectDB(process.env.MONGO_URI);
  await Promise.all([
    Hostel.deleteMany({}),
    Authority.deleteMany({}),
    User.deleteMany({}),
    Device.deleteMany({}),
    Complaint.deleteMany({}),
    Counter.deleteMany({}),
    Item.deleteMany({}),
  ]);

  const hash = await bcrypt.hash(PASSWORD, 10);
  let n = 1;

  const authorities = {};
  for (const a of AUTHORITIES) {
    const email = `${a.code.toLowerCase()}@iitr.test`;
    authorities[a.code] = await Authority.create({
      code: a.code,
      name: a.name,
      description: a.description,
      worker: a.worker,
      email,
      phone: phone(n++),
    });
    await Item.insertMany(
      a.items.map(([name, unit, quantity]) => ({ authority: authorities[a.code]._id, name, unit, quantity }))
    );
    await User.create({
      name: a.officer,
      email,
      password: hash,
      role: 'authority',
      authority: authorities[a.code]._id,
      designation: `${a.name} Officer`,
      phone: phone(n++),
    });
  }

  const hostels = {};
  const people = { A: {}, B: {} };
  for (const code of ['A', 'B']) {
    hostels[code] = await Hostel.create({ name: `Hostel ${code}`, code });
    const lc = code.toLowerCase();

    for (const [name, designation, slug] of COUNCIL[code]) {
      people[code][slug] = await User.create({
        name,
        email: `${slug}.${lc}@iitr.test`,
        password: hash,
        role: 'council',
        hostel: hostels[code]._id,
        designation,
        phone: phone(n++),
      });
    }

    for (const [i, [name, enrollmentNo, branch, roomNo]] of STUDENTS[code].entries()) {
      people[code][`student${i + 1}`] = await User.create({
        name,
        email: `student${i + 1}.${lc}@iitr.test`,
        password: hash,
        role: 'student',
        hostel: hostels[code]._id,
        enrollmentNo,
        branch,
        roomNo,
        phone: phone(n++),
      });
    }

    for (const [sensorType, short, location] of DEVICES) {
      const deviceId = `H${code}-${short}-01`;
      people[code][sensorType] = await Device.create({
        deviceId,
        apiKey: `key-${deviceId.toLowerCase()}`,
        sensorType,
        hostel: hostels[code]._id,
        location,
      });
    }
  }

  // A few sample complaints so every dashboard has something to show
  const ago = (h) => new Date(Date.now() - h * 3600 * 1000);
  const make = async (c) => {
    const statusFlow = c.flow || ['pending', 'acknowledged', 'worker_assigned', 'in_progress', 'resolved'];
    const steps = statusFlow.slice(0, statusFlow.indexOf(c.status) + 1);
    const officer = await User.findOne({ role: 'authority', authority: c.authority }).lean();
    const history = steps.map((s, i) => ({
      status: s,
      note: i === 0 ? c.firstNote || 'Complaint lodged' : c.notes?.[s] || '',
      byName: i === 0 ? c.byName : officer.name,
      at: ago(c.hoursAgo - i),
    }));
    const { flow, ...fields } = c;
    await Complaint.create({
      complaintNo: await nextComplaintNo(),
      ...fields,
      image: c.source === 'device' ? { url: LOCAL_AUTOMATED_IMAGE } : c.image,
      history,
      resolvedAt: c.status === 'resolved' ? ago(c.hoursAgo - steps.length + 1) : undefined,
      createdAt: ago(c.hoursAgo),
    });
  };

  const A = people.A, B = people.B;
  await make({
    title: 'Fan not working', description: 'Ceiling fan stopped working, regulator also not responding.',
    location: 'Room A-101', authority: authorities.ELECTRICAL._id, hostel: hostels.A._id, source: 'student',
    lodgedBy: A.student1._id, student: A.student1._id, byName: A.student1.name, status: 'resolved', hoursAgo: 30,
    item: 'Fan capacitor',
    notes: { acknowledged: 'Complaint received', worker_assigned: 'Electrician will visit (Fan capacitor taken from stock)', in_progress: 'Replacing capacitor', resolved: 'Capacitor replaced, fan working' },
  });
  await make({
    title: 'Ceiling fan burnt out', description: 'Fan motor smells burnt and does not start at all.',
    location: 'Room A-210', authority: authorities.ELECTRICAL._id, hostel: hostels.A._id, source: 'student',
    lodgedBy: A.student3._id, student: A.student3._id, byName: A.student3.name, status: 'awaiting_items', hoursAgo: 20,
    flow: ['pending', 'acknowledged', 'awaiting_items'], item: 'Ceiling fan (1200 mm)',
    notes: { acknowledged: 'Complaint received', awaiting_items: 'Ceiling fan (1200 mm) not in stock. Approval requested from institute funds.' },
  });
  await make({
    title: 'Garbage spilling near staircase', description: 'Bin near the first floor staircase is overflowing.',
    location: 'First floor staircase', authority: authorities.SANITATION._id, hostel: hostels.A._id, source: 'student',
    lodgedBy: A.student2._id, student: A.student2._id, byName: A.student2.name, status: 'in_progress', hoursAgo: 6,
    notes: { acknowledged: 'Complaint received', worker_assigned: 'Sanitation worker will visit', in_progress: 'Cleaning staff on the way' },
  });
  await make({
    title: 'Dinner quality complaint', description: 'Rice was undercooked at dinner for the last two days.',
    location: 'Mess hall', authority: authorities.MESS._id, hostel: hostels.A._id, source: 'student',
    lodgedBy: A.student1._id, student: A.student1._id, byName: A.student1.name, status: 'pending', hoursAgo: 3,
  });
  await make({
    title: 'Water leakage detected', description: 'Leak sensor at Washroom 2, Ground floor detected water on the floor.',
    location: 'Washroom 2, Ground floor', authority: authorities.WATER._id, hostel: hostels.A._id, source: 'device',
    device: A.leak._id, sensorType: 'leak', reading: 'wet', priority: 'high', byName: 'HA-LEAK-01',
    firstNote: 'Reported automatically by HA-LEAK-01', status: 'acknowledged', hoursAgo: 2,
    notes: { acknowledged: 'Plumber informed' },
  });
  await make({
    title: 'Wi-Fi down on second floor', description: 'No internet in rooms B-201 to B-210 since morning.',
    location: 'Second floor', authority: authorities.IT._id, hostel: hostels.B._id, source: 'student',
    lodgedBy: B.student3._id, student: B.student3._id, byName: B.student3.name, status: 'pending', hoursAgo: 5,
  });
  await make({
    title: 'Broken window latch', description: 'Window latch broken, window cannot be closed at night.',
    location: 'Room B-305', authority: authorities.FURNITURE._id, hostel: hostels.B._id, source: 'council',
    lodgedBy: B.bhawansecy._id, student: B.student5._id, byName: B.bhawansecy.name, status: 'acknowledged', hoursAgo: 8,
    notes: { acknowledged: 'Complaint received' },
  });
  await make({
    title: 'Dustbin full', description: 'Dustbin at Corridor dustbin, First floor is full (garbage 4.2 cm below the lid).',
    location: 'Corridor dustbin, First floor', authority: authorities.SANITATION._id, hostel: hostels.B._id,
    source: 'device', device: B.dustbin._id, sensorType: 'dustbin', reading: '4.2 cm', byName: 'HB-BIN-01',
    firstNote: 'Reported automatically by HB-BIN-01', status: 'pending', hoursAgo: 1,
  });

  console.log('\nSeed complete. Every account uses the password:', PASSWORD);
  console.log('Students:    student1.a@iitr.test ... student5.a@iitr.test, student1.b@iitr.test ... student5.b@iitr.test');
  console.log('Council:     warden.a, aswarden.a, supervisor.a, bhawansecy.a, techsecy.a, messsecy.a  (@iitr.test; same for .b)');
  console.log('Authorities:', AUTHORITIES.map((a) => `${a.code.toLowerCase()}@iitr.test`).join(', '));
  console.log('\nDevices (deviceId / apiKey):');
  for (const d of await Device.find().select('+apiKey').sort('deviceId').lean()) {
    console.log(`  ${d.deviceId.padEnd(14)} ${d.apiKey.padEnd(22)} ${d.sensorType}`);
  }
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
