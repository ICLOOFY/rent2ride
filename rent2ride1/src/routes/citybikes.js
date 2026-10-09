const express = require('express');
const router = express.Router();
const citybikesController = require('../controllers/citybikesController');

router.get('/networks', citybikesController.getNetworks);
router.get('/networks/:networkId', citybikesController.getNetworkDetails);
router.post('/sync/:networkId', citybikesController.syncNetwork);

module.exports = router;
