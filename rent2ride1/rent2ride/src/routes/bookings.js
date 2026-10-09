const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');
const { authenticateToken } = require('../controllers/authController');

router.post('/', authenticateToken, bookingsController.createBooking);
router.get('/', authenticateToken, bookingsController.getBookings);
router.get('/:id', authenticateToken, bookingsController.getBookingById);

module.exports = router;
