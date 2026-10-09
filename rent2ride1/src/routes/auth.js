const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/me', authController.authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  res.json({ success: true, data: req.user });
});

module.exports = router;
