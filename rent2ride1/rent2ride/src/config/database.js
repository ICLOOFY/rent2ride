const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/rent2ride.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`Connected to SQLite database at: ${dbPath}`);
  }
});

// Promisified helper methods
const query = {
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

async function initDatabase() {
  await query.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'rider',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      area TEXT NOT NULL,
      distance REAL NOT NULL DEFAULT 1.0,
      price INTEGER NOT NULL,
      icon TEXT DEFAULT '🛵',
      desc TEXT,
      latitude REAL,
      longitude REAL,
      status TEXT DEFAULT 'available',
      is_citybike BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL REFERENCES rides(id),
      user_id INTEGER REFERENCES users(id),
      user_name TEXT,
      user_email TEXT,
      days INTEGER NOT NULL DEFAULT 1,
      daily_rate INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      status TEXT DEFAULT 'confirmed',
      start_date DATE DEFAULT (DATE('now')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS citybikes_cache (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT,
      country TEXT,
      latitude REAL,
      longitude REAL,
      company TEXT,
      raw_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default demo user if not exists
  const existingUser = await query.get('SELECT id FROM users WHERE email = ?', ['demo@example.com']);
  let defaultUserId = 1;
  if (!existingUser) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('password123', salt);
    const result = await query.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Demo Rider', 'demo@example.com', hash, 'rider']
    );
    defaultUserId = result.lastID;
    console.log('Default demo user created (demo@example.com / password123)');
  } else {
    defaultUserId = existingUser.id;
  }

  // Seed default rides from Rent2Ride reference if rides table is empty
  const rideCount = await query.get('SELECT COUNT(*) as count FROM rides');
  if (rideCount.count === 0) {
    const seedRides = [
      { name: "Honda Activa 6G", type: "motorcycle", area: "Knowledge Park", distance: 1.2, price: 399, icon: "🛵", desc: "Automatic • Comfortable city ride", lat: 28.468, lon: 77.498 },
      { name: "Royal Enfield Classic", type: "motorcycle", area: "Alpha 1", distance: 2.4, price: 699, icon: "🏍️", desc: "Classic • Long local rides", lat: 28.475, lon: 77.505 },
      { name: "Mountain Bicycle", type: "bicycle", area: "Pari Chowk", distance: 0.8, price: 179, icon: "🚲", desc: "Gear cycle • Lightweight", lat: 28.460, lon: 77.510 },
      { name: "Hero Splendor", type: "motorcycle", area: "Beta 2", distance: 3.1, price: 349, icon: "🏍️", desc: "Reliable • Fuel efficient", lat: 28.482, lon: 77.518 },
      { name: "Hybrid City Bike", type: "bicycle", area: "Sector 137", distance: 4.0, price: 199, icon: "🚲", desc: "Hybrid • Smooth city ride", lat: 28.510, lon: 77.410 },
      { name: "TVS Jupiter", type: "motorcycle", area: "Tech Zone", distance: 1.7, price: 429, icon: "🛵", desc: "Automatic • Spacious", lat: 28.455, lon: 77.490 }
    ];

    for (const r of seedRides) {
      await query.run(
        `INSERT INTO rides (owner_id, name, type, area, distance, price, icon, desc, latitude, longitude, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
        [defaultUserId, r.name, r.type, r.area, r.distance, r.price, r.icon, r.desc, r.lat, r.lon]
      );
    }
    console.log(`Seeded ${seedRides.length} initial rides into SQLite database.`);
  }
}

module.exports = {
  db,
  query,
  initDatabase
};
