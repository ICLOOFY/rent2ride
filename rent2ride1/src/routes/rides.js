const express = require('express');
const router = express.Router();
const ridesController = require('../controllers/ridesController');
const { authenticateToken } = require('../controllers/authController');

router.get('/', ridesController.getRides);
router.get('/:id', ridesController.getRideById);
router.post('/', authenticateToken, ridesController.createRide);
router.put('/:id', authenticateToken, ridesController.updateRide);
router.delete('/:id', authenticateToken, ridesController.deleteRide);

module.exports = router;
