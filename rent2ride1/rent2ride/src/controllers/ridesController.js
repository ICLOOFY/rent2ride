const { query } = require('../config/database');

// GET /api/rides
async function getRides(req, res) {
  try {
    const { type, q, sort, max_distance, status } = req.query;

    let sql = 'SELECT * FROM rides WHERE 1=1';
    const params = [];

    // Filter by vehicle type (motorcycle / bicycle)
    if (type && type !== 'all') {
      sql += ' AND type = ?';
      params.push(type.toLowerCase());
    }

    // Filter by max distance (default: within 5km operating radius if specified)
    if (max_distance) {
      sql += ' AND distance <= ?';
      params.push(parseFloat(max_distance));
    }

    // Filter by status if provided (e.g. available)
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    // Search query matching name, area, or description
    if (q) {
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(area) LIKE ? OR LOWER(desc) LIKE ?)';
      const term = `%${q.toLowerCase().trim()}%`;
      params.push(term, term, term);
    }

    // Sort options
    if (sort === 'priceLow') {
      sql += ' ORDER BY price ASC';
    } else if (sort === 'priceHigh') {
      sql += ' ORDER BY price DESC';
    } else {
      // Default: distance ascending
      sql += ' ORDER BY distance ASC';
    }

    const rides = await query.all(sql, params);
    res.json({
      success: true,
      count: rides.length,
      data: rides
    });
  } catch (err) {
    console.error('Error fetching rides:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch rides' });
  }
}

// GET /api/rides/:id
async function getRideById(req, res) {
  try {
    const { id } = req.params;
    const ride = await query.get('SELECT * FROM rides WHERE id = ?', [id]);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }
    res.json({ success: true, data: ride });
  } catch (err) {
    console.error('Error fetching ride by ID:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch ride details' });
  }
}

// POST /api/rides
async function createRide(req, res) {
  try {
    const { name, type, price, area, distance, desc, icon, latitude, longitude } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }

    const rideType = (type && type.toLowerCase() === 'bicycle') ? 'bicycle' : 'motorcycle';
    const rideIcon = icon || (rideType === 'bicycle' ? '🚲' : (name.toLowerCase().includes('scooter') || name.toLowerCase().includes('activa') || name.toLowerCase().includes('jupiter') ? '🛵' : '🏍️'));
    const rideArea = area || 'Local Hub';
    const rideDistance = parseFloat(distance) || (Math.round((Math.random() * 3 + 0.5) * 10) / 10);
    const ridePrice = parseInt(price, 10);
    const rideDesc = desc || (rideType === 'bicycle' ? 'Eco-friendly • Flexible local ride' : 'Reliable • Comfortable ride');
    const ownerId = req.user ? req.user.id : 1;

    const result = await query.run(
      `INSERT INTO rides (owner_id, name, type, area, distance, price, icon, desc, latitude, longitude, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
      [ownerId, name, rideType, rideArea, rideDistance, ridePrice, rideIcon, rideDesc, latitude || null, longitude || null]
    );

    const newRide = await query.get('SELECT * FROM rides WHERE id = ?', [result.lastID]);
    res.status(201).json({
      success: true,
      message: 'Listing published successfully',
      data: newRide
    });
  } catch (err) {
    console.error('Error creating ride:', err);
    res.status(500).json({ success: false, error: 'Failed to create listing' });
  }
}

// PUT /api/rides/:id
async function updateRide(req, res) {
  try {
    const { id } = req.params;
    const { name, price, status, area, desc } = req.body;

    const existing = await query.get('SELECT * FROM rides WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }

    await query.run(
      `UPDATE rides
       SET name = COALESCE(?, name),
           price = COALESCE(?, price),
           status = COALESCE(?, status),
           area = COALESCE(?, area),
           desc = COALESCE(?, desc)
       WHERE id = ?`,
      [name, price, status, area, desc, id]
    );

    const updated = await query.get('SELECT * FROM rides WHERE id = ?', [id]);
    res.json({ success: true, message: 'Ride updated', data: updated });
  } catch (err) {
    console.error('Error updating ride:', err);
    res.status(500).json({ success: false, error: 'Failed to update ride' });
  }
}

// DELETE /api/rides/:id
async function deleteRide(req, res) {
  try {
    const { id } = req.params;
    const result = await query.run('DELETE FROM rides WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }
    res.json({ success: true, message: 'Ride deleted successfully' });
  } catch (err) {
    console.error('Error deleting ride:', err);
    res.status(500).json({ success: false, error: 'Failed to delete ride' });
  }
}

module.exports = {
  getRides,
  getRideById,
  createRide,
  updateRide,
  deleteRide
};
