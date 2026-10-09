const { query } = require('../config/database');

const CITYBIKES_BASE_URL = 'http://api.citybik.es/v2';

// Fetch all bike sharing networks from CityBikes API
async function fetchNetworks(fields) {
  let url = `${CITYBIKES_BASE_URL}/networks`;
  if (fields) {
    url += `?fields=${encodeURIComponent(fields)}`;
  }

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`CityBikes API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.networks || [];
}

// Fetch stations and real-time status for a specific network
async function fetchNetworkDetails(networkId) {
  const url = `${CITYBIKES_BASE_URL}/networks/${encodeURIComponent(networkId)}`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch network '${networkId}': ${response.status}`);
  }

  const data = await response.json();
  return data.network;
}

// Sync stations from a CityBikes network into the Rent2Ride SQLite database
async function syncStationsToDatabase(networkId, limit = 10) {
  const network = await fetchNetworkDetails(networkId);
  if (!network || !network.stations) {
    throw new Error('No stations found for this network');
  }

  const stations = network.stations.slice(0, limit);
  const importedRides = [];

  for (const station of stations) {
    const stationName = station.name || `${network.name} Station`;
    const area = network.location ? `${network.location.city || ''}, ${network.location.country || ''}`.replace(/^, /, '') : 'City Center';
    const freeBikes = station.free_bikes || 0;
    const distance = Math.round((Math.random() * 2.5 + 0.5) * 10) / 10;
    const price = 149; // Standard flat rate for public city cycle rental
    const desc = `CityBikes: ${freeBikes} free bikes • ${station.empty_slots || 0} slots available`;

    // Check if ride already exists
    const existing = await query.get(
      'SELECT id FROM rides WHERE name = ? AND area = ?',
      [stationName, area]
    );

    if (!existing) {
      const result = await query.run(
        `INSERT INTO rides (owner_id, name, type, area, distance, price, icon, desc, latitude, longitude, status, is_citybike)
         VALUES (?, ?, 'bicycle', ?, ?, ?, '🚲', ?, ?, ?, 'available', 1)`,
        [1, stationName, area, distance, price, desc, station.latitude, station.longitude]
      );
      importedRides.push({ id: result.lastID, name: stationName, free_bikes: freeBikes });
    }
  }

  return {
    network: network.name,
    city: network.location ? network.location.city : 'Unknown',
    imported_count: importedRides.length,
    rides: importedRides
  };
}

module.exports = {
  fetchNetworks,
  fetchNetworkDetails,
  syncStationsToDatabase
};
