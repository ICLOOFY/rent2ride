const citybikesService = require('../services/citybikesService');

// GET /api/citybikes/networks
async function getNetworks(req, res) {
  try {
    const { fields, country, city, q } = req.query;
    let networks = await citybikesService.fetchNetworks(fields);

    if (country) {
      const c = country.toUpperCase();
      networks = networks.filter(n => n.location && n.location.country && n.location.country.toUpperCase() === c);
    }

    if (city) {
      const cityLower = city.toLowerCase();
      networks = networks.filter(n => n.location && n.location.city && n.location.city.toLowerCase().includes(cityLower));
    }

    if (q) {
      const search = q.toLowerCase();
      networks = networks.filter(n =>
        (n.name && n.name.toLowerCase().includes(search)) ||
        (n.location && n.location.city && n.location.city.toLowerCase().includes(search))
      );
    }

    res.json({
      success: true,
      count: networks.length,
      data: networks
    });
  } catch (err) {
    console.error('Error fetching CityBikes networks:', err);
    res.status(502).json({ success: false, error: 'Failed to fetch CityBikes networks: ' + err.message });
  }
}

// GET /api/citybikes/networks/:networkId
async function getNetworkDetails(req, res) {
  try {
    const { networkId } = req.params;
    const network = await citybikesService.fetchNetworkDetails(networkId);
    res.json({
      success: true,
      data: network
    });
  } catch (err) {
    console.error(`Error fetching CityBikes network '${req.params.networkId}':`, err);
    res.status(502).json({ success: false, error: err.message });
  }
}

// POST /api/citybikes/sync/:networkId
async function syncNetwork(req, res) {
  try {
    const { networkId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;
    const result = await citybikesService.syncStationsToDatabase(networkId, limit);
    res.json({
      success: true,
      message: `Synced ${result.imported_count} stations from ${result.network} into Rent2Ride catalog`,
      data: result
    });
  } catch (err) {
    console.error(`Error syncing CityBikes network '${req.params.networkId}':`, err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getNetworks,
  getNetworkDetails,
  syncNetwork
};
