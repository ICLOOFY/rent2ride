# Rent2Ride — Hyper-Local Mobility Backend & API

Rent2Ride is a hyper-local peer-to-peer two-wheeler rental platform connecting riders with nearby motorcycles and bicycles within a 5 km operating radius, integrated with the global **CityBikes open data API** and persistent **SQLite** storage.

---

## Tech Stack

- **Runtime**: Node.js (v20+ LTS)
- **Framework**: Express.js
- **Database**: SQLite3 with auto-initialization, migrations, and seed data
- **Containerization**: Docker & Docker Compose with persistent storage volume
- **Integrations**: CityBikes REST API (`api.citybik.es/v2`)
- **Authentication**: Password hashing with `bcryptjs` + stateless JWT tokens
- **Frontend**: Responsive HTML5, CSS3, and JavaScript served statically

---

## Project Structure

```text
rent2ride/
├── Dockerfile                 # Multi-stage container build with node:20-alpine
├── docker-compose.yml         # Container configuration & SQLite data volume
├── .dockerignore              # Excluded files during container build
├── .env.example               # Environment variable templates
├── .env                       # Local environment variables
├── package.json               # Node.js dependencies & scripts
├── README.md                  # System & API documentation
├── public/                    # Frontend static client
│   ├── index.html             # Rent2Ride web application
│   ├── style.css              # Responsive design & design system
│   └── script.js              # Fetch client connected to backend & CityBikes
├── src/                       # Backend application code
│   ├── server.js              # Express app & route configuration
│   ├── config/
│   │   └── database.js        # SQLite connection, schema & seed data
│   ├── controllers/
│   │   ├── authController.js       # Register, login, JWT issuance
│   │   ├── ridesController.js      # CRUD, 5 km radius filtering & sorting
│   │   ├── bookingsController.js   # Booking workflow & rate calculations
│   │   └── citybikesController.js  # CityBikes network exploration & DB sync
│   ├── routes/
│   │   ├── auth.js                 # /api/auth routes
│   │   ├── rides.js                # /api/rides routes
│   │   ├── bookings.js             # /api/bookings routes
│   │   └── citybikes.js            # /api/citybikes routes
│   └── services/
│       └── citybikesService.js     # External CityBikes HTTP client
├── test/
│   └── api.test.js            # Automated integration & smoke test suite
└── data/                      # Persistent SQLite database storage
    └── rent2ride.db           # SQLite DB file (auto-generated on boot)
```

---

## Running with Docker (Recommended)

To build and run the entire application inside a container:

```bash
# 1. Navigate to the project directory
cd rent2ride

# 2. Build and launch with Docker Compose
docker compose up --build
```

The application will be running at **`http://localhost:3000`**.

> **Note on Persistence**: The `./data` directory on your host is mapped to `/app/data` inside the container. Any vehicle listings, bookings, or user accounts created will persist across container restarts.

### Running with Dockerfile directly
```bash
# Build the Docker image
docker build -t rent2ride-app .

# Run with a mounted persistent volume for the SQLite database
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name rent2ride rent2ride-app
```

---

## Running Natively (Node.js)

If you have Node.js installed locally:

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# Or start in development mode with auto-reload:
npm run dev
```

Run the automated test suite:
```bash
npm test
```

---

## Database Schema (SQLite)

The SQLite database file is created automatically on application boot at `data/rent2ride.db`.

### 1. `users`
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `name`: TEXT NOT NULL
- `email`: TEXT UNIQUE NOT NULL
- `password_hash`: TEXT NOT NULL
- `role`: TEXT DEFAULT 'rider'
- `created_at`: DATETIME

### 2. `rides`
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `owner_id`: INTEGER REFERENCES users(id)
- `name`: TEXT NOT NULL
- `type`: TEXT NOT NULL (`motorcycle` | `bicycle`)
- `area`: TEXT NOT NULL
- `distance`: REAL NOT NULL (in km)
- `price`: INTEGER NOT NULL (daily rate in ₹)
- `icon`: TEXT (e.g. 🛵, 🏍️, 🚲)
- `desc`: TEXT
- `latitude`: REAL
- `longitude`: REAL
- `status`: TEXT DEFAULT 'available'
- `is_citybike`: BOOLEAN DEFAULT 0
- `created_at`: DATETIME

### 3. `bookings`
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `ride_id`: INTEGER NOT NULL REFERENCES rides(id)
- `user_id`: INTEGER REFERENCES users(id)
- `user_name`: TEXT
- `user_email`: TEXT
- `days`: INTEGER NOT NULL
- `daily_rate`: INTEGER NOT NULL
- `total_price`: INTEGER NOT NULL (`days * daily_rate`)
- `status`: TEXT DEFAULT 'confirmed'
- `start_date`: DATE DEFAULT (DATE('now'))
- `created_at`: DATETIME

---

## REST API Reference

### Health Check
- **`GET /api/health`**
  ```json
  {
    "status": "ok",
    "service": "Rent2Ride Backend",
    "database": "SQLite",
    "citybikes_integration": "active",
    "timestamp": "2026-09-17T01:30:00.000Z"
  }
  ```

### Rides
- **`GET /api/rides`**
  - Query parameters:
    - `type`: `all` | `motorcycle` | `bicycle`
    - `q`: search string for name, area, or description
    - `sort`: `distance` (default) | `priceLow` | `priceHigh`
    - `max_distance`: maximum distance in km (default: 5 km radius)

- **`GET /api/rides/:id`**
  - Retrieve single vehicle details

- **`POST /api/rides`**
  - Publish a new vehicle listing
  - Payload:
    ```json
    {
      "name": "Yamaha FZ-S",
      "type": "motorcycle",
      "price": 499,
      "area": "Knowledge Park 2",
      "desc": "150cc • Well maintained"
    }
    ```

- **`PUT /api/rides/:id`**
  - Update vehicle details or status (`available`, `rented`, `maintenance`)

- **`DELETE /api/rides/:id`**
  - Remove listing

### Bookings
- **`POST /api/bookings`**
  - Book a vehicle for `N` days
  - Payload:
    ```json
    {
      "ride_id": 1,
      "days": 3,
      "user_name": "John Doe",
      "user_email": "john@example.com"
    }
    ```
  - Response:
    ```json
    {
      "success": true,
      "message": "Booking confirmed successfully",
      "data": {
        "id": 1,
        "ride_id": 1,
        "vehicle_name": "Honda Activa 6G",
        "days": 3,
        "daily_rate": 399,
        "total_price": 1197,
        "status": "confirmed"
      }
    }
    ```

- **`GET /api/bookings`**
  - List all confirmed bookings with vehicle details

### Authentication
- **`POST /api/auth/register`**
  - Payload: `{ "name": "...", "email": "...", "password": "..." }`
- **`POST /api/auth/login`**
  - Payload: `{ "email": "demo@example.com", "password": "password123" }`
  - Returns JWT Bearer token and user profile

### CityBikes Open API Integration
- **`GET /api/citybikes/networks`**
  - Retrieve bike-sharing networks worldwide (supports `?country=`, `?city=`, `?q=`, `?fields=`)
- **`GET /api/citybikes/networks/:networkId`**
  - Retrieve live station status (free bikes, empty docks) for a specific city network (e.g. `velib`, `citi-bike-nyc`, `smartbike-delhi`)
- **`POST /api/citybikes/sync/:networkId?limit=10`**
  - Syncs live stations from the chosen network into the Rent2Ride SQLite catalog as bookable city bicycles!
