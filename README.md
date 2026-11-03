# Direct to Authority: Bhawan Complaint App (IIT Roorkee)

Students, the Bhawan council and departments (Water Works, Sanitation, etc.) each get their own dashboard.
Four ESP8266 sensors lodge complaints automatically. Photos go to Cloudinary. Everything updates live.

```
COMMUNITY OUTREACH PROJECT/
  server/   Express + MongoDB (Mongoose) + Socket.IO + Cloudinary   -> port 5000
  client/   React (Vite)                                             -> port 5173 in dev
  esp/      4 Arduino sketches that report to the server
```

## 1. Install once

1. **Node.js 20 LTS or newer**: https://nodejs.org (check with `node -v` in a new terminal).
2. **MongoDB** (local, for running on your laptop):
   - Download **MongoDB Community Server** (Windows, msi): https://www.mongodb.com/try/download/community
   - Run the installer, choose **Complete**, keep **Install MongoD as a Service** ticked, and keep
     **Install MongoDB Compass** ticked.
   - Open Compass, click **Connect** on `mongodb://localhost:27017`. If it connects, MongoDB is running.
   - Nothing to change in `.env`: `MONGO_URI=mongodb://127.0.0.1:27017/community_outreach` already points to it.
     The `community_outreach` database appears in Compass after `npm run seed`.
3. **Cloudinary** (stores complaint photos):
   - Sign up free at https://cloudinary.com.
   - In the console, open the dashboard / API keys page and copy **Cloud name**, **API Key** and **API Secret**.

## 2. Configure

Open `server/.env` in a text editor and fill in:

```
JWT_SECRET=any_long_random_text_you_make_up
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Never share these values or commit `.env`. When the server starts, the terminal says `Images: Cloudinary`
if the keys work. Without keys, photos are saved in `server/uploads` and the app still works.
Photos then appear in Cloudinary's Media Library under `community-outreach/complaints`.

Every sensor complaint carries the "Sorry, this is an automated complaint" picture (`server/assets`).
With Cloudinary set up it is uploaded there once and reused.

### MongoDB Atlas (only needed when deploying)

1. https://www.mongodb.com/cloud/atlas > create a free **M0** cluster.
2. **Database Access** > add a user with a password (letters and numbers only is easiest).
3. **Network Access** > Add IP address > **Allow access from anywhere** (0.0.0.0/0).
4. **Connect** > Drivers > copy the connection string, put your password in it and add the database name:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/community_outreach?retryWrites=true&w=majority`
5. Use that as `MONGO_URI`, then run `npm run seed` once to fill it.

## 3. Install, fill the database, run

Open a terminal in the `COMMUNITY OUTREACH PROJECT` folder:

```
npm run setup      # installs server and client packages
npm run seed       # creates hostels, council, students, departments, devices (resets the database)
npm run build      # builds the website
npm start          # runs everything on port 5000
```

Open **http://localhost:5000**. On the first start, Windows asks whether Node.js may use the network:
tick **Private networks** and click **Allow** (the ESP cannot reach your PC otherwise).

While changing website code, use two terminals instead: `npm run dev:server` and `npm run dev:client`,
then open http://localhost:5173 (it reloads on every save).

## 4. Logins (password for every account: `password123`)

| Role | Email |
|---|---|
| Students, Hostel A | `student1.a@iitr.test` to `student5.a@iitr.test` |
| Students, Hostel B | `student1.b@iitr.test` to `student5.b@iitr.test` |
| Council, Hostel A | `warden.a`, `aswarden.a`, `supervisor.a`, `bhawansecy.a`, `techsecy.a`, `messsecy.a` (all `@iitr.test`) |
| Council, Hostel B | same with `.b` |
| Departments | `water`, `sanitation`, `fire`, `animal`, `mess`, `electrical`, `civil`, `furniture`, `it` (all `@iitr.test`) |

In Compass, connect to `mongodb://127.0.0.1:27017` and open the `community_outreach` database to see
`users`, `hostels`, `authorities`, `devices` and `complaints`.

## 5. Who sees what

| | Student | Bhawan council | Department |
|---|---|---|---|
| Sees | Own complaints + sensor complaints of own hostel | Every complaint of own hostel, with student name, enrollment no., branch, room | Every complaint for that department, from all hostels |
| Lodge complaints | Yes, with photo | Yes, with photo, for a student or the hostel | No |
| Update status | No | No | Mark received, item available (send worker) or not available (request institute funds), items arrived, start work, mark resolved |
| Home page extras | Council names and contacts | Sensor list with last report | Open / Resolved / All, hostel filter |
| Stock list of items | No | No | Yes, own department only (+/- to update) |
| "Resolved" popups | Yes | Yes | No |

Popups: every resolved complaint pops up, one at a time. **Close** marks it seen and shows the next.
**Don't show again this session** hides them until the next login (session cookie); unseen ones come back then.

## 6. Sensors (automatic complaints)

| Sketch (in `esp/`) | Device ID (Hostel A) | Sends to | Triggers when |
|---|---|---|---|
| `leak_detector` | `HA-LEAK-01` | Water Works | Rain sensor wet |
| `dustbin_monitor` | `HA-BIN-01` | Sanitation | Garbage within 5 cm of the lid, 3 readings in a row |
| `water_quality_monitor` | `HA-TDS-01` | Water Works | TDS above 500 ppm, 5 readings in a row |
| `geyser_monitor` | `HA-GEYSER-01` | Electrical Maintenance | Outlet below 35 °C for 1 minute (demo setting) |

Hostel B uses `HB-...` IDs. The key for each device is `key-` plus the lowercase ID, e.g. `key-ha-leak-01`.
`npm run seed` prints the full list.

The server keeps **one open complaint per device**: if a sensor triggers again before the complaint is
resolved, the existing complaint's "triggered again" count goes up instead of a new ticket appearing.
After it is resolved, the next trigger opens a new complaint.

### Connecting an ESP without deploying (same Wi-Fi)

1. Connect the **PC and the ESP to the same 2.4 GHz hotspot**.
2. On the PC: Settings > Network & internet > Wi-Fi > (the hotspot) > set **Network profile type: Private**.
3. Run `npm start`. The terminal prints lines like
   `http://10.219.106.127:5000/api/device/report  (Wi-Fi)`. Copy the one for your Wi-Fi.
4. In the sketch, set the hotspot names/passwords, paste that into `SERVER_URL`, and set `DEVICE_ID` / `DEVICE_KEY`.
5. Upload, open the Serial Monitor at 115200, trigger the sensor. `HTTP 201 created` means the complaint is on
   the website; `HTTP 200 duplicate` means it updated the already-open one.

Test from the PC without any ESP (PowerShell):

```
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/device/report -ContentType 'application/json' -Body '{"deviceId":"HA-BIN-01","apiKey":"key-ha-bin-01","reading":"4 cm"}'
```

If the IP changes after reconnecting the hotspot, restart `npm start`, copy the new address and re-upload the sketch.

| Serial Monitor shows | Meaning |
|---|---|
| `HTTP 201 ... created` | New complaint lodged |
| `HTTP 200 ... duplicate` | Complaint already open; count increased |
| `HTTP 401` | Wrong DEVICE_ID or DEVICE_KEY |
| `HTTP -1` (connection refused / timeout) | Wrong IP, server not running, PC and ESP on different networks, or firewall |

A failed report is retried every 30 seconds until it gets through.

### Connecting an ESP after deploying

Set `SERVER_URL` to `https://<your-app-name>.onrender.com/api/device/report`. The sketches detect `https`
automatically. Then the ESP works on any Wi-Fi with internet, and the PC no longer needs to be on.

## 7. API reference

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/login` | everyone |
| GET | `/api/complaints` | logged in (filtered by role) |
| POST | `/api/complaints` (multipart: title, description, location, authorityId, studentId, image) | student, council |
| PATCH | `/api/complaints/:id/status` `{status, note}` | department |
| GET | `/api/complaints/notifications` / POST `/api/complaints/:id/seen` | student, council |
| GET | `/api/meta/authorities`, `/api/meta/council`, `/api/meta/students`, `/api/meta/devices` | logged in |
| POST | `/api/device/report` `{deviceId, apiKey, reading}` | ESP devices |
| GET | `/api/health` | anyone (quick "is the server up" check) |
