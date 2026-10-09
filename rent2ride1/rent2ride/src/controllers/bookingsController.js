const { query } = require('../config/database');

// POST /api/bookings
async function createBooking(req, res) {
  try {
    const { ride_id, days = 1, user_name, user_email, user_id } = req.body;

    if (!ride_id) {
      return res.status(400).json({ success: false, error: 'ride_id is required' });
    }

    const ride = await query.get('SELECT * FROM rides WHERE id = ?', [ride_id]);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    const rentalDays = Math.max(1, parseInt(days, 10) || 1);
    const dailyRate = ride.price;
    const totalPrice = rentalDays * dailyRate;
    const bookingUserId = req.user ? req.user.id : (user_id || 1);
    const bookingUserName = req.user ? req.user.name : (user_name || 'Rider');
    const bookingUserEmail = req.user ? req.user.email : (user_email || 'rider@example.com');

    const result = await query.run(
      `INSERT INTO bookings (ride_id, user_id, user_name, user_email, days, daily_rate, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [ride_id, bookingUserId, bookingUserName, bookingUserEmail, rentalDays, dailyRate, totalPrice]
    );

    const booking = await query.get(
      `SELECT b.*, r.name as vehicle_name, r.type as vehicle_type, r.area, r.icon
       FROM bookings b
       JOIN rides r ON b.ride_id = r.id
       WHERE b.id = ?`,
      [result.lastID]
    );

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: booking
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ success: false, error: 'Failed to process booking' });
  }
}

// GET /api/bookings
async function getBookings(req, res) {
  try {
    const bookings = await query.all(
      `SELECT b.*, r.name as vehicle_name, r.type as vehicle_type, r.area, r.icon
       FROM bookings b
       JOIN rides r ON b.ride_id = r.id
       ORDER BY b.created_at DESC`
    );
    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
}

// GET /api/bookings/:id
async function getBookingById(req, res) {
  try {
    const { id } = req.params;
    const booking = await query.get(
      `SELECT b.*, r.name as vehicle_name, r.type as vehicle_type, r.area, r.icon
       FROM bookings b
       JOIN rides r ON b.ride_id = r.id
       WHERE b.id = ?`,
      [id]
    );
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    res.json({ success: true, data: booking });
  } catch (err) {
    console.error('Error fetching booking by ID:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch booking' });
  }
}

module.exports = {
  createBooking,
  getBookings,
  getBookingById
};
