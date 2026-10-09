const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase, db } = require('./config/database');

const ridesRouter = require('./routes/rides');
const bookingsRouter = require('./routes/bookings');
const authRouter = require('./routes/auth');
const citybikesRouter = require('./routes/citybikes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve frontend static files
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Rent2Ride Backend',
    database: 'SQLite',
    citybikes_integration: 'active',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/rides', ridesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/auth', authRouter);
app.use('/api/citybikes', citybikesRouter);

// Fallback to index.html for root or SPA paths
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server after initializing SQLite
let server;
async function start() {
  try {
    await initDatabase();
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`=========================================`);
      console.log(`🚀 Rent2Ride Server running on port ${PORT}`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
      console.log(`🚲 CityBikes API: Connected`);
      console.log(`🗄️ Database: SQLite (rent2ride.db)`);
      console.log(`=========================================`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
