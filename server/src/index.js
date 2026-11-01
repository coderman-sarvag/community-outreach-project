import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import './models/index.js';
import { connectDB } from './config/db.js';
import { cloudinaryEnabled, LOCAL_UPLOAD_DIR } from './config/cloudinary.js';
import { initSocket } from './socket.js';
import { ASSETS_DIR, automatedImage } from './config/automatedImage.js';
import authRoutes from './routes/auth.js';
import metaRoutes from './routes/meta.js';
import complaintRoutes from './routes/complaints.js';
import deviceRoutes from './routes/device.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing in server/.env');
  process.exit(1);
}

const app = express();
app.set('trust proxy', true);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));
app.use('/uploads', express.static(LOCAL_UPLOAD_DIR));
app.use('/static', express.static(ASSETS_DIR, { maxAge: '7d' }));

// Serve the built React app (client/dist) from the same server, if it exists
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|uploads|static|socket\.io).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5 MB.' : err.message;
    return res.status(400).json({ message: msg });
  }
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

function lanAddresses() {
  return Object.entries(os.networkInterfaces()).flatMap(([name, list]) =>
    (list || []).filter((a) => a.family === 'IPv4' && !a.internal).map((a) => ({ name, address: a.address }))
  );
}

const server = http.createServer(app);
initSocket(server);

connectDB(process.env.MONGO_URI)
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\nServer listening on port ${PORT}`);
      console.log(`Images: ${cloudinaryEnabled() ? 'Cloudinary' : 'local folder server/uploads (Cloudinary keys not set)'}`);
      automatedImage().then((img) => console.log(`Sensor complaint picture: ${img.url}`));
      console.log('\nPut ONE of these in SERVER_URL of your ESP sketches (use the network your ESP is on):');
      for (const { name, address } of lanAddresses()) {
        console.log(`  http://${address}:${PORT}/api/device/report    (${name})`);
      }
      console.log(`\nWebsite: http://localhost:5173 (dev) or http://localhost:${PORT} (after building the client)\n`);
    });
  })
  .catch((e) => {
    console.error('Could not connect to MongoDB:', e.message);
    console.error('Check that MongoDB is running and MONGO_URI in server/.env is correct.');
    process.exit(1);
  });
