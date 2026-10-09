const http = require('http');
const { app, start } = require('../src/server');
const { initDatabase, query, db } = require('../src/config/database');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Rent2Ride Test Suite ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failed++;
    }
  }

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`Test server listening on ephemeral port ${port}`);

  try {
    await initDatabase();

    // Test 1: Health Check
    const health = await makeRequest({
      hostname: '127.0.0.1',
      port: port,
      path: '/api/health',
      method: 'GET'
    });
    assert(health.status === 200 && health.data.status === 'ok', 'GET /api/health returns 200 OK');

    // Test 2: Fetch Seed Rides
    const ridesRes = await makeRequest({
      hostname: '127.0.0.1',
      port: port,
      path: '/api/rides',
      method: 'GET'
    });
    assert(ridesRes.status === 200 && ridesRes.data.count >= 6, `GET /api/rides returns ${ridesRes.data.count} initial rides`);

    // Test 3: Filter Rides by Motorcycle
    const motoRes = await makeRequest({
      hostname: '127.0.0.1',
      port: port,
      path: '/api/rides?type=motorcycle',
      method: 'GET'
    });
    assert(motoRes.status === 200 && motoRes.data.data.every(r => r.type === 'motorcycle'), 'GET /api/rides?type=motorcycle filters correctly');

    // Test 4: Create a New Ride Listing
    const newRideData = {
      name: 'KTM Duke 250',
      type: 'motorcycle',
      price: 899,
      area: 'Delta 1',
      distance: 2.1,
      desc: 'High performance • City commuter'
    };
    const createRideRes = await makeRequest({
      hostname: '127.0.0.1',
      port: port,
      path: '/api/rides',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, newRideData);
    assert(createRideRes.status === 201 && createRideRes.data.data.name === 'KTM Duke 250', 'POST /api/rides inserts new listing into SQLite');
    const createdRideId = createRideRes.data.data.id;

    // Test 5: Create a Booking with Cost Calculation
    const bookingData = {
      ride_id: createdRideId,
      days: 3,
      user_name: 'Test Rider',
      user_email: 'tester@example.com'
    };
    const bookingRes = await makeRequest({
      hostname: '127.0.0.1',
      port: port,
      path: '/api/bookings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, bookingData);
    const expectedTotal = 899 * 3; // 2697
    assert(
      bookingRes.status === 201 &&
      bookingRes.data.data.total_price === expectedTotal &&
      bookingRes.data.data.days === 3,
      `POST /api/bookings calculates total correctly (3 days * ₹899 = ₹${expectedTotal})`
    );

    // Test 6: Verify User Authentication
    const loginRes = await makeRequest({
      hostname: '127.0.0.1',
      port: port,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'demo@example.com', password: 'password123' });
    assert(loginRes.status === 200 && loginRes.data.data.token, 'POST /api/auth/login authenticates with SQLite and returns JWT');

    // Test 7: CityBikes Proxy Endpoint Structure
    const cbRes = await makeRequest({
      hostname: '127.0.0.1',
      port: port,
      path: '/api/citybikes/networks?fields=id,name,location',
      method: 'GET'
    });
    assert(cbRes.status === 200 || cbRes.status === 502, `GET /api/citybikes/networks handles request (status: ${cbRes.status})`);

  } catch (err) {
    console.error('Test execution encountered exception:', err);
    failed++;
  } finally {
    server.close();
    db.close();
  }

  console.log(`-----------------------------------------`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
