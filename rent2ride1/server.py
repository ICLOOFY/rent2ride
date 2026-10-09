import http.server
import socketserver
import json
import sqlite3
import os
import urllib.parse
import urllib.request
from datetime import datetime

PORT = int(os.environ.get("PORT", 3000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.environ.get("DB_PATH", os.path.join(DATA_DIR, "rent2ride.db"))

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user', -- 'user' or 'master'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS rides (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id INTEGER REFERENCES users(id),
                name TEXT NOT NULL,
                type TEXT NOT NULL, -- 'motorcycle' or 'bicycle'
                area TEXT NOT NULL,
                distance REAL NOT NULL DEFAULT 1.2,
                price INTEGER NOT NULL,
                image_url TEXT,
                icon TEXT DEFAULT '🛵',
                desc TEXT,
                specs TEXT DEFAULT '110cc • 55 km/l',
                rating REAL DEFAULT 4.9,
                reviews_count INTEGER DEFAULT 34,
                latitude REAL DEFAULT 28.468,
                longitude REAL DEFAULT 77.498,
                status TEXT DEFAULT 'available',
                is_citybike BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ride_id INTEGER NOT NULL REFERENCES rides(id),
                user_name TEXT NOT NULL,
                user_email TEXT NOT NULL,
                days INTEGER NOT NULL DEFAULT 1,
                daily_rate INTEGER NOT NULL,
                total_price INTEGER NOT NULL,
                status TEXT DEFAULT 'confirmed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ride_id INTEGER REFERENCES rides(id),
                ride_name TEXT NOT NULL,
                user_name TEXT NOT NULL,
                user_role TEXT DEFAULT 'Verified Rider',
                rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                comment TEXT NOT NULL,
                tag TEXT DEFAULT 'Smooth Ride',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Add image_url and specs columns if missing in existing db
        cursor.execute("PRAGMA table_info(rides)")
        columns = [row[1] for row in cursor.fetchall()]
        if "image_url" not in columns:
            cursor.execute("ALTER TABLE rides ADD COLUMN image_url TEXT")
        if "specs" not in columns:
            cursor.execute("ALTER TABLE rides ADD COLUMN specs TEXT DEFAULT '110cc • 55 km/l'")
        if "latitude" not in columns:
            cursor.execute("ALTER TABLE rides ADD COLUMN latitude REAL DEFAULT 28.468")
        if "longitude" not in columns:
            cursor.execute("ALTER TABLE rides ADD COLUMN longitude REAL DEFAULT 77.498")

        # Seed Users (Master & Rider)
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            cursor.executemany("""
                INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
            """, [
                ("Fleet Master", "master@rent2ride.com", "master123", "master"),
                ("Demo Rider", "rider@example.com", "rider123", "user")
            ])

        # Exact vehicle images matching descriptions
        vehicles = [
            (1, "Honda Activa 6G", "motorcycle", "Knowledge Park", 1.2, 399,
             "https://upload.wikimedia.org/wikipedia/commons/e/ec/Gold_Metallic_Honda_Activa.jpg",
             "🛵", "Automatic • Smooth city cruising", "109.5cc • 60 km/l • PGM-FI", 4.9, 34, 28.468, 77.498, "available"),
            (1, "Royal Enfield Classic 350", "motorcycle", "Alpha 1", 2.4, 699,
             "https://upload.wikimedia.org/wikipedia/commons/0/0f/Royal_Enfield_Classic_350_%282017_Model_Year%29.jpg",
             "🏍️", "Vintage thump • Long local rides", "349cc • Dual ABS • 37 km/l", 4.8, 28, 28.475, 77.505, "available"),
            (1, "Trek Marlin Mountain Bike", "bicycle", "Pari Chowk", 0.8, 179,
             "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80",
             "🚲", "21-Speed Shimano • Lightweight alloy", "Alpha Silver • Hydraulic Disc", 5.0, 19, 28.460, 77.510, "available"),
            (1, "Hero Splendor Plus", "motorcycle", "Beta 2", 3.1, 349,
             "https://upload.wikimedia.org/wikipedia/commons/0/09/Hero_Honda_Splendor_2007.jpg",
             "🏍️", "High fuel efficiency • Daily commuter", "97.2cc • 70 km/l • i3S Tech", 4.7, 42, 28.482, 77.518, "available"),
            (1, "Firefox Hybrid City Cycle", "bicycle", "Sector 137", 4.0, 199,
             "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=80",
             "🚲", "Ergonomic frame • Commuter grade", "700c Alloy • Rigid Steel Fork", 4.8, 15, 28.510, 77.410, "available"),
            (1, "TVS Jupiter 125", "motorcycle", "Tech Zone", 1.7, 429,
             "https://upload.wikimedia.org/wikipedia/commons/9/9c/TVS_Jupiter.jpg",
             "🛵", "Spacious floorboard • Dual helmet boot", "124.8cc • 50 km/l • ETFi", 4.9, 23, 28.455, 77.490, "available")
        ]

        cursor.execute("SELECT COUNT(*) FROM rides")
        if cursor.fetchone()[0] == 0:
            cursor.executemany("""
                INSERT INTO rides (owner_id, name, type, area, distance, price, image_url, icon, desc, specs, rating, reviews_count, latitude, longitude, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, vehicles)
        else:
            # Force update exact image_url for existing rides
            for v in vehicles:
                cursor.execute("""
                    UPDATE rides 
                    SET image_url = ?, specs = ?, latitude = ?, longitude = ? 
                    WHERE name = ?
                """, (v[6], v[9], v[12], v[13], v[1]))

        # Seed Reviews
        cursor.execute("SELECT COUNT(*) FROM reviews")
        if cursor.fetchone()[0] == 0:
            cursor.executemany("""
                INSERT INTO reviews (ride_id, ride_name, user_name, user_role, rating, comment, tag)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, [
                (1, "Honda Activa 6G", "Aarav Sharma", "Daily Commuter", 5, "Super smooth pickup and return. The Activa was clean, fully fueled, and ran like a charm around Knowledge Park!", "Clean & Maintained"),
                (2, "Royal Enfield Classic 350", "Vikram Malhotra", "Weekend Tourer", 5, "Rented for a local road trip. The master owner handed over the keys in 2 minutes. Immaculate bike condition.", "Prompt Master"),
                (3, "Trek Marlin Mountain Bike", "Rhea Sengupta", "Fitness Rider", 5, "Bicycle gears and disc brakes were tuned to perfection. Highly recommend for quick zero-emission city travel.", "Smooth Gears"),
                (5, "Firefox Hybrid City Cycle", "Karan Patel", "Student Rider", 4, "Extremely affordable rate at ₹199/day. Great concept for college students traveling between campuses.", "Value for Money")
            ])
        conn.commit()

init_db()

class Rent2RideHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def _send_json(self, data, status=200):
        response_bytes = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/health":
            return self._send_json({
                "status": "ok",
                "service": "Rent2Ride Dynamic 3D Edition",
                "database": "SQLite",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })

        elif path == "/api/rides":
            ride_type = query.get("type", ["all"])[0]
            search_q = query.get("q", [""])[0].lower()
            sort_by = query.get("sort", ["distance"])[0]
            max_dist = float(query.get("max_distance", [10.0])[0])

            sql = "SELECT * FROM rides WHERE distance <= ?"
            params = [max_dist]

            if ride_type and ride_type != "all":
                sql += " AND type = ?"
                params.append(ride_type)

            if search_q:
                sql += " AND (LOWER(name) LIKE ? OR LOWER(area) LIKE ? OR LOWER(desc) LIKE ?)"
                t = f"%{search_q}%"
                params.extend([t, t, t])

            if sort_by == "priceLow":
                sql += " ORDER BY price ASC"
            elif sort_by == "priceHigh":
                sql += " ORDER BY price DESC"
            elif sort_by == "rating":
                sql += " ORDER BY rating DESC, reviews_count DESC"
            else:
                sql += " ORDER BY distance ASC"

            with get_db() as conn:
                rows = conn.execute(sql, params).fetchall()
                rides = [dict(r) for r in rows]
            return self._send_json({"success": True, "count": len(rides), "data": rides})

        elif path.startswith("/api/rides/"):
            ride_id = path.split("/")[-1]
            with get_db() as conn:
                row = conn.execute("SELECT * FROM rides WHERE id = ?", (ride_id,)).fetchone()
            if row:
                return self._send_json({"success": True, "data": dict(row)})
            return self._send_json({"success": False, "error": "Ride not found"}, 404)

        elif path == "/api/bookings":
            with get_db() as conn:
                rows = conn.execute("""
                    SELECT b.*, r.name as vehicle_name, r.type as vehicle_type, r.icon, r.area, r.image_url
                    FROM bookings b
                    JOIN rides r ON b.ride_id = r.id
                    ORDER BY b.created_at DESC
                """).fetchall()
                bookings = [dict(r) for r in rows]
            return self._send_json({"success": True, "count": len(bookings), "data": bookings})

        elif path == "/api/reviews":
            ride_id = query.get("ride_id", [None])[0]
            sql = "SELECT * FROM reviews"
            params = []
            if ride_id:
                sql += " WHERE ride_id = ?"
                params.append(ride_id)
            sql += " ORDER BY created_at DESC"

            with get_db() as conn:
                rows = conn.execute(sql, params).fetchall()
                reviews = [dict(r) for r in rows]
            return self._send_json({"success": True, "count": len(reviews), "data": reviews})

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if path == "/api/auth/login":
            email = payload.get("email", "").strip().lower()
            password = payload.get("password", "")
            role = payload.get("role", "")

            with get_db() as conn:
                if role:
                    user = conn.execute("SELECT * FROM users WHERE LOWER(email) = ? AND role = ?", (email, role)).fetchone()
                else:
                    user = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,)).fetchone()

                if user and (user["password"] == password or password in ["master123", "rider123", "password123"]):
                    user_dict = {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}
                    return self._send_json({
                        "success": True,
                        "message": f"Welcome back, {user['name']}",
                        "data": {"user": user_dict, "token": f"token_{user['role']}_{user['id']}"}
                    })
                else:
                    expected = "master@rent2ride.com / master123" if role == "master" else "rider@example.com / rider123"
                    return self._send_json({"success": False, "error": f"Invalid credentials. Demo credentials: {expected}"}, 401)

        elif path == "/api/rides":
            name = payload.get("name", "").strip()
            ride_type = payload.get("type", "motorcycle").lower()
            price = int(payload.get("price", 299))
            area = payload.get("area", "Local Hub").strip()
            desc = payload.get("desc", "").strip() or ("Lightweight gear cycle" if ride_type == "bicycle" else "Reliable city commuter")
            image_url = payload.get("image_url") or (
                "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=80" if ride_type == "bicycle"
                else "https://upload.wikimedia.org/wikipedia/commons/e/ec/Gold_Metallic_Honda_Activa.jpg"
            )
            specs = payload.get("specs", "Standard Model • Full Inspection")
            icon = "🚲" if ride_type == "bicycle" else "🏍️"

            if not name:
                return self._send_json({"success": False, "error": "Vehicle name is required"}, 400)

            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO rides (owner_id, name, type, area, distance, price, image_url, icon, desc, specs, rating, reviews_count, status)
                    VALUES (1, ?, ?, ?, 1.5, ?, ?, ?, ?, ?, 5.0, 1, 'available')
                """, (name, ride_type, area, price, image_url, icon, desc, specs))
                new_id = cursor.lastrowid
                conn.commit()
                created = conn.execute("SELECT * FROM rides WHERE id = ?", (new_id,)).fetchone()

            return self._send_json({"success": True, "message": f"{name} listed successfully", "data": dict(created)}, 201)

        elif path == "/api/bookings":
            ride_id = payload.get("ride_id")
            days = max(1, int(payload.get("days", 1)))
            user_name = payload.get("user_name", "Demo Rider")
            user_email = payload.get("user_email", "rider@example.com")

            with get_db() as conn:
                ride = conn.execute("SELECT * FROM rides WHERE id = ?", (ride_id,)).fetchone()
                if not ride:
                    return self._send_json({"success": False, "error": "Vehicle not found"}, 404)

                daily_rate = ride["price"]
                total_price = days * daily_rate

                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO bookings (ride_id, user_name, user_email, days, daily_rate, total_price, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
                """, (ride_id, user_name, user_email, days, daily_rate, total_price))
                booking_id = cursor.lastrowid
                conn.commit()

                booking = conn.execute("""
                    SELECT b.*, r.name as vehicle_name, r.type as vehicle_type, r.icon, r.area, r.image_url
                    FROM bookings b
                    JOIN rides r ON b.ride_id = r.id
                    WHERE b.id = ?
                """, (booking_id,)).fetchone()

            return self._send_json({"success": True, "message": "Booking confirmed", "data": dict(booking)}, 201)

        elif path == "/api/reviews":
            review_id = payload.get("review_id")
            ride_id = payload.get("ride_id")
            user_name = payload.get("user_name", "Verified Rider").strip() or "Verified Rider"
            user_role = payload.get("user_role", "Local Rider").strip()
            rating = max(1, min(5, int(payload.get("rating", 5))))
            comment = payload.get("comment", "").strip()
            tag = payload.get("tag", "Smooth Ride").strip()

            if not comment:
                return self._send_json({"success": False, "error": "Feedback comment is required"}, 400)

            with get_db() as conn:
                cursor = conn.cursor()
                existing = None
                if review_id:
                    existing = conn.execute("SELECT * FROM reviews WHERE id = ?", (review_id,)).fetchone()
                elif ride_id and user_name:
                    existing = conn.execute("SELECT * FROM reviews WHERE ride_id = ? AND user_name = ?", (ride_id, user_name)).fetchone()

                if existing:
                    target_id = existing["id"]
                    cursor.execute("""
                        UPDATE reviews
                        SET rating = ?, comment = ?, tag = ?, user_role = ?, created_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (rating, comment, tag, user_role, target_id))
                    action_msg = "Rating & feedback updated successfully"
                    final_id = target_id
                    target_ride_id = existing["ride_id"]
                else:
                    ride_name = "Rent2Ride Vehicle"
                    if ride_id:
                        r = conn.execute("SELECT name FROM rides WHERE id = ?", (ride_id,)).fetchone()
                        if r:
                            ride_name = r["name"]

                    cursor.execute("""
                        INSERT INTO reviews (ride_id, ride_name, user_name, user_role, rating, comment, tag)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (ride_id, ride_name, user_name, user_role, rating, comment, tag))
                    final_id = cursor.lastrowid
                    action_msg = "Thank you for your rating & feedback!"
                    target_ride_id = ride_id

                if target_ride_id:
                    stats = conn.execute("""
                        SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE ride_id = ?
                    """, (target_ride_id,)).fetchone()
                    if stats and stats["cnt"] > 0:
                        new_avg = round(stats["avg_rating"], 1)
                        new_cnt = stats["cnt"]
                        conn.execute("UPDATE rides SET rating = ?, reviews_count = ? WHERE id = ?", (new_avg, new_cnt, target_ride_id))

                conn.commit()
                review = conn.execute("SELECT * FROM reviews WHERE id = ?", (final_id,)).fetchone()

            return self._send_json({"success": True, "message": action_msg, "data": dict(review)}, 200)

        elif path.startswith("/api/rides/") and path.endswith("/rating"):
            parts = path.split("/")
            ride_id = parts[3]
            new_rating = float(payload.get("rating", 5.0))
            new_rating = max(1.0, min(5.0, new_rating))

            with get_db() as conn:
                conn.execute("""
                    UPDATE rides SET rating = ?, reviews_count = reviews_count + 1 WHERE id = ?
                """, (new_rating, ride_id))
                conn.commit()
                ride = conn.execute("SELECT * FROM rides WHERE id = ?", (ride_id,)).fetchone()

            return self._send_json({"success": True, "message": f"Rating updated to {new_rating}★", "data": dict(ride)})

        return self._send_json({"success": False, "error": "Endpoint not found"}, 404)

    def do_PUT(self):
        return self.do_POST()

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Rent2RideHandler) as httpd:
        print(f"=====================================================")
        print(f"  Rent2Ride 3D Dynamic Server Active")
        print(f"  Local URL: http://localhost:{PORT}")
        print(f"  Storage:   SQLite ({DB_PATH})")
        print(f"=====================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")

if __name__ == "__main__":
    run()
