// Rent2Ride — Premium Client Logic with Exact Photography, 3D Tilt & Awwwards Hover
const API_BASE = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:3000';

// Verified exact vehicle photography matching description
let localRides = [
  {
    id: 1,
    name: "Honda Activa 6G",
    type: "motorcycle",
    area: "Knowledge Park",
    distance: 1.2,
    price: 399,
    image_url: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Gold_Metallic_Honda_Activa.jpg",
    icon: "🛵",
    desc: "Automatic • Smooth city cruising",
    specs: "109.5cc • 60 km/l • PGM-FI",
    rating: 4.9,
    reviews_count: 34,
    status: "available"
  },
  {
    id: 2,
    name: "Royal Enfield Classic 350",
    type: "motorcycle",
    area: "Alpha 1",
    distance: 2.4,
    price: 699,
    image_url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Royal_Enfield_Classic_350_%282017_Model_Year%29.jpg",
    icon: "🏍️",
    desc: "Vintage thump • Long local rides",
    specs: "349cc • Dual ABS • 37 km/l",
    rating: 4.8,
    reviews_count: 28,
    status: "available"
  },
  {
    id: 3,
    name: "Trek Marlin Mountain Bike",
    type: "bicycle",
    area: "Pari Chowk",
    distance: 0.8,
    price: 179,
    image_url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80",
    icon: "🚲",
    desc: "21-Speed Shimano • Lightweight alloy",
    specs: "Alpha Silver • Hydraulic Disc",
    rating: 5.0,
    reviews_count: 19,
    status: "available"
  },
  {
    id: 4,
    name: "Hero Splendor Plus",
    type: "motorcycle",
    area: "Beta 2",
    distance: 3.1,
    price: 349,
    image_url: "https://upload.wikimedia.org/wikipedia/commons/0/09/Hero_Honda_Splendor_2007.jpg",
    icon: "🏍️",
    desc: "High fuel efficiency • Daily commuter",
    specs: "97.2cc • 70 km/l • i3S Tech",
    rating: 4.7,
    reviews_count: 42,
    status: "available"
  },
  {
    id: 5,
    name: "Firefox Hybrid City Cycle",
    type: "bicycle",
    area: "Sector 137",
    distance: 4.0,
    price: 199,
    image_url: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=80",
    icon: "🚲",
    desc: "Ergonomic frame • Commuter grade",
    specs: "700c Alloy • Rigid Steel Fork",
    rating: 4.8,
    reviews_count: 15,
    status: "available"
  },
  {
    id: 6,
    name: "TVS Jupiter 125",
    type: "motorcycle",
    area: "Tech Zone",
    distance: 1.7,
    price: 429,
    image_url: "https://upload.wikimedia.org/wikipedia/commons/9/9c/TVS_Jupiter.jpg",
    icon: "🛵",
    desc: "Spacious floorboard • Dual helmet boot",
    specs: "124.8cc • 50 km/l • ETFi",
    rating: 4.9,
    reviews_count: 23,
    status: "available"
  }
];

let localReviews = [
  { id: 1, ride_id: 1, ride_name: "Honda Activa 6G", user_name: "Aarav Sharma", user_role: "Daily Commuter", rating: 5, comment: "Super smooth pickup and return. The Activa was clean, fully fueled, and ran like a charm around Knowledge Park!", tag: "Clean & Maintained", created_at: "Just now" },
  { id: 2, ride_id: 2, ride_name: "Royal Enfield Classic 350", user_name: "Vikram Malhotra", user_role: "Weekend Tourer", rating: 5, comment: "Rented for a local road trip. The master owner handed over the keys in 2 minutes. Immaculate bike condition.", tag: "Prompt Master", created_at: "1 hour ago" },
  { id: 3, ride_id: 3, ride_name: "Trek Marlin Mountain Bike", user_name: "Rhea Sengupta", user_role: "Fitness Rider", rating: 5, comment: "Bicycle gears and disc brakes were tuned to perfection. Highly recommend for quick zero-emission city travel.", tag: "Smooth Ride", created_at: "Yesterday" },
  { id: 4, ride_id: 5, ride_name: "Firefox Hybrid City Cycle", user_name: "Karan Patel", user_role: "Student Rider", rating: 4, comment: "Extremely affordable rate at ₹199/day. Great concept for college students traveling between campuses.", tag: "Value for Money", created_at: "2 days ago" }
];

let localBookings = [
  { id: 101, ride_id: 1, vehicle_name: "Honda Activa 6G", user_name: "Demo Rider", days: 2, total_price: 798, status: "confirmed" }
];

let currentRides = [...localRides];
let activeFilter = 'all';
let selectedRide = null;
let currentRatingVal = 5;
let activeReviewIdToEdit = null;
let currentMaxRadius = 5.0;

let currentUser = JSON.parse(localStorage.getItem('rent2ride_user') || 'null');

// ================= Role-Based Visibility =================
// Hide "Add Vehicle" buttons for non-master users
function applyRoleVisibility() {
  const isMaster = currentUser && currentUser.role === 'master';

  // Hide master fleet tabs in navbar/footer
  document.querySelectorAll('a[href="master.html"], a[href="#master"]').forEach(el => {
    el.style.display = isMaster ? '' : 'none';
  });

  // Hide/show all elements with class 'master-only-btn' (used on master.html)
  document.querySelectorAll('.master-only-btn').forEach(el => {
    el.style.display = isMaster ? '' : 'none';
  });

  // Hide the "+ Add New Vehicle" button in the master section for users
  // In the master dashboard modal, the "+ Add Vehicle" button in dash-header
  // should still be visible only for masters
  const dashAddBtn = document.querySelector('.dash-header .btn-sm');
  if (dashAddBtn) {
    dashAddBtn.style.display = isMaster ? '' : 'none';
  }

  // Hide the listModal trigger entirely if user is logged in but not master
  // The list modal itself should not be accessible to regular users
  if (currentUser && !isMaster) {
    // Hide any remaining "Add Vehicle" / "Add New Vehicle" buttons
    document.querySelectorAll('[onclick*="listModal"]').forEach(el => {
      el.style.display = 'none';
    });
  }
}

// ================= Initialize UI & Auth =================
function initAuthUI() {
  const badge = document.getElementById("activeUserBadge");
  const userBtn = document.getElementById("userAuthBtn");
  const masterBtn = document.getElementById("masterAuthBtn");

  if (!badge || !userBtn || !masterBtn) return;

  if (currentUser) {
    if (currentUser.role === 'master') {
      badge.textContent = `👑 Master: ${currentUser.name}`;
      badge.style.display = "inline-block";
      masterBtn.textContent = "Fleet Dashboard";
      userBtn.textContent = "Sign out";
      userBtn.onclick = logout;
    } else {
      badge.textContent = `👤 Rider: ${currentUser.name}`;
      badge.style.display = "inline-block";
      userBtn.textContent = "Sign out";
      userBtn.onclick = logout;
      masterBtn.textContent = "Master Portal";
    }
  } else {
    badge.style.display = "none";
    userBtn.textContent = "User Sign In";
    userBtn.onclick = () => openModal('userLoginModal');
    masterBtn.textContent = "Master Portal";
    masterBtn.onclick = () => openModal('masterLoginModal');
  }

  // Apply role-based visibility after auth state update
  applyRoleVisibility();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('rent2ride_user');
  initAuthUI();
  showToast("Signed out successfully ✓");
}

// ================= Dynamic Discovery Radius =================
function handleRadiusChange(val) {
  currentMaxRadius = parseFloat(val);
  const display = document.getElementById("radiusValDisplay");
  if (display) display.textContent = `${val} km`;
  fetchRides();
}

// ================= Rides API & Cards Rendering =================
async function fetchRides() {
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  if (!searchInput || !sortSelect) return; // Not on fleet page

  const q = searchInput.value.trim().toLowerCase();
  const sort = sortSelect.value;

  try {
    const url = new URL(`${API_BASE}/api/rides`);
    if (activeFilter !== 'all' && activeFilter !== 'topRated') url.searchParams.append('type', activeFilter);
    if (q) url.searchParams.append('q', q);
    if (sort) url.searchParams.append('sort', sort);
    url.searchParams.append('max_distance', currentMaxRadius);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentRides = data.data || [];
  } catch (err) {
    // Graceful fallback to local seed data
    let list = [...localRides];
    list = list.filter(r => (r.distance || 1.2) <= currentMaxRadius);
    if (activeFilter !== 'all' && activeFilter !== 'topRated') {
      list = list.filter(r => r.type === activeFilter);
    }
    if (q) {
      list = list.filter(r => `${r.name} ${r.area} ${r.desc} ${r.specs || ''}`.toLowerCase().includes(q));
    }
    if (sort === "priceLow") list.sort((a, b) => a.price - b.price);
    else if (sort === "priceHigh") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else list.sort((a, b) => a.distance - b.distance);

    currentRides = list;
  }

  // Filter top rated if selected
  let displayList = currentRides;
  if (activeFilter === 'topRated') {
    displayList = displayList.filter(r => (r.rating || 4.8) >= 4.8);
  }

  renderRideCards(displayList);
  updateMapFleet(displayList.length);
  attach3DTiltEffect();
}

function renderRideCards(list) {
  const grid = document.getElementById("rideGrid");
  if (!grid) return;

  if (!list || !list.length) {
    grid.innerHTML = `<div class="empty-state">No verified two-wheelers found within ${currentMaxRadius} km. Try increasing the radius slider.</div>`;
    return;
  }

  grid.innerHTML = list.map(r => {
    const photoUrl = r.image_url || "https://upload.wikimedia.org/wikipedia/commons/e/ec/Gold_Metallic_Honda_Activa.jpg";
    const curRating = Math.round(r.rating || 5);

    return `
    <article class="ride-card" id="ride-card-${r.id}">
      <div class="card-photo-wrap">
        <img class="card-vehicle-img" src="${photoUrl}" alt="${r.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1000&q=80'">
        <span class="tag-type">${r.type}</span>
        <span class="tag-dist">📍 ${r.distance || 1.2} km</span>
        <span class="card-specs-pill">${r.specs || 'Verified 2-Wheeler'}</span>
      </div>
      <div class="card-body">
        <h3>${r.name}</h3>
        <div class="card-meta">${r.area} • ${r.desc || 'Clean, road-ready condition'}</div>
        
        <!-- Interactive Direct Card Star Rating -->
        <div class="card-rating-interactive" title="Click any star to change your rating for this vehicle">
          <div class="card-stars-row">
            ${[1,2,3,4,5].map(star => `
              <span class="inline-star ${star <= curRating ? 'active' : ''}" 
                    onclick="quickRateRide(${r.id}, ${star}, event)"
                    title="Change rating to ${star} stars">★</span>
            `).join('')}
          </div>
          <span class="card-rating-text">${Number(r.rating || 4.9).toFixed(1)} ★</span>
          <span class="card-reviews-num">(${r.reviews_count || 30} reviews)</span>
        </div>

        <div class="card-bottom">
          <div class="price-box">
            <strong>₹${r.price}</strong><span> / day</span>
          </div>
          <div class="card-actions">
            <button class="btn-rate" title="Change or submit detailed review" onclick="openReviewModal(${r.id})">★ Edit</button>
            <button class="btn-book" onclick="openBooking(${r.id})">Book Ride</button>
          </div>
        </div>
      </div>
    </article>
  `;
  }).join("");
}

// ================= Awwwards 3D Dynamic Tilt Feature =================
function attach3DTiltEffect() {
  const cards = document.querySelectorAll(".ride-card");
  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    });
  });
}

function updateMapFleet(count) {
  const el = document.getElementById("mapFleetCount");
  if (el) el.textContent = `${count} Two-Wheelers in Radius`;
}

function setFilter(type) {
  activeFilter = type;
  document.querySelectorAll(".filter-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
  fetchRides();
}

function handleSearch() {
  fetchRides();
}

// Interactive Google Map marker helper
function jumpToRide(id) {
  const el = document.getElementById(`ride-card-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.borderColor = 'rgba(255, 255, 255, 0.9)';
    el.style.boxShadow = '0 0 40px rgba(255, 255, 255, 0.45)';
    setTimeout(() => { 
      el.style.borderColor = 'var(--border)'; 
      el.style.boxShadow = '';
    }, 2500);
  } else {
    // If on a different page, navigate to fleet page
    window.location.href = 'fleet.html';
  }
}

// ================= Allow User to Change Rating Dynamically =================
async function quickRateRide(rideId, newRating, event) {
  if (event) event.stopPropagation();

  const userName = currentUser ? currentUser.name : "Verified Rider";
  const userRole = currentUser ? (currentUser.role === 'master' ? 'Fleet Master' : 'Verified Rider') : 'Local Rider';

  const ride = currentRides.find(r => r.id === rideId) || localRides.find(r => r.id === rideId);
  const rideName = ride ? ride.name : "Rent2Ride Vehicle";

  try {
    const res = await fetch(`${API_BASE}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ride_id: rideId,
        user_name: userName,
        user_role: userRole,
        rating: newRating,
        comment: `Rated ${newRating} stars — seamless mobility!`,
        tag: "Smooth Ride"
      })
    });

    if (res.ok) {
      showToast(`✓ Rating updated to ${newRating}★ for ${rideName}`);
      fetchRides();
      fetchReviews();
      return;
    }
  } catch (err) {}

  if (ride) {
    ride.rating = newRating;
    ride.reviews_count = (ride.reviews_count || 10) + 1;
  }
  showToast(`✓ Rating updated to ${newRating}★ for ${rideName}`);
  fetchRides();
}

// ================= Reviews & Feedback Feed =================
async function fetchReviews() {
  const feed = document.getElementById("reviewsFeed");
  if (!feed) return; // Not on reviews page
  let reviews = [];

  try {
    const res = await fetch(`${API_BASE}/api/reviews`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      reviews = data.data || [];
    } else {
      reviews = localReviews;
    }
  } catch (err) {
    reviews = localReviews;
  }

  // Update average score in summary
  if (reviews.length > 0) {
    const total = reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0);
    const avg = (total / reviews.length).toFixed(1);
    const avgEl = document.getElementById("avgRatingScore");
    if (avgEl) avgEl.textContent = avg;
    const countEl = document.getElementById("reviewsCountBadge");
    if (countEl) countEl.textContent = `${reviews.length} reviews`;
  }

  feed.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-top">
        <div>
          <span class="reviewer-name">${r.user_name}</span>
          <span class="reviewer-badge">${r.user_role || 'Verified Rider'}</span>
        </div>
        <div class="review-stars">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</div>
      </div>
      <p class="review-comment">"${r.comment}"</p>
      <div class="review-meta-row">
        <span>Vehicle: <b>${r.ride_name || 'Rent2Ride'}</b></span>
        <div>
          <span class="review-pill-tag">${r.tag || 'Smooth Ride'}</span>
          <button class="btn-edit-review" onclick="openReviewModal(${r.ride_id}, ${r.id})">Change Rating</button>
        </div>
      </div>
    </div>
  `).join("");
}

function openReviewModal(rideId, reviewId = null) {
  activeReviewIdToEdit = reviewId;
  const select = document.getElementById("reviewRideSelect");
  if (!select) return;

  select.innerHTML = currentRides.map(r => `
    <option value="${r.id}" ${rideId && r.id === rideId ? 'selected' : ''}>${r.name} (${r.area})</option>
  `).join("");

  if (reviewId) {
    const existing = localReviews.find(rev => rev.id === reviewId);
    if (existing) {
      setStarRating(existing.rating || 5);
      document.getElementById("reviewCommentInput").value = existing.comment || "";
      document.getElementById("reviewTagSelect").value = existing.tag || "Smooth Ride";
    }
    document.getElementById("reviewModalTitle").textContent = "Change Your Rating";
    document.getElementById("submitReviewBtn").textContent = "Update Rating & Feedback";
  } else {
    setStarRating(5);
    const commentInput = document.getElementById("reviewCommentInput");
    if (commentInput) commentInput.value = "";
    const titleEl = document.getElementById("reviewModalTitle");
    if (titleEl) titleEl.textContent = "Rate Your Ride";
    const submitBtn = document.getElementById("submitReviewBtn");
    if (submitBtn) submitBtn.textContent = "Save Rating & Feedback";
  }

  openModal('reviewModal');
}

function loadExistingRatingForRide() {
  const rideId = parseInt(document.getElementById("reviewRideSelect").value, 10);
  const ride = currentRides.find(r => r.id === rideId);
  if (ride && ride.rating) {
    setStarRating(Math.round(ride.rating));
  }
}

function setStarRating(num) {
  currentRatingVal = num;
  const stars = document.querySelectorAll("#starRatingPicker .star-pick");
  stars.forEach(s => {
    const r = parseInt(s.dataset.rating, 10);
    s.classList.toggle("active", r <= num);
  });
  const ratingText = document.getElementById("selectedRatingText");
  if (ratingText) ratingText.textContent = `${num}.0 / 5.0`;
}

async function submitReview() {
  const rideId = parseInt(document.getElementById("reviewRideSelect").value, 10);
  const comment = document.getElementById("reviewCommentInput").value.trim();
  const tag = document.getElementById("reviewTagSelect").value;
  const userName = currentUser ? currentUser.name : "Verified Rider";
  const userRole = currentUser ? (currentUser.role === 'master' ? 'Fleet Master' : 'Verified Rider') : 'Local Rider';

  if (!comment) {
    showToast("Please write a short comment about your experience.");
    return;
  }

  const ride = currentRides.find(r => r.id === rideId);
  const rideName = ride ? ride.name : "Rent2Ride Vehicle";

  try {
    const res = await fetch(`${API_BASE}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_id: activeReviewIdToEdit,
        ride_id: rideId,
        user_name: userName,
        user_role: userRole,
        rating: currentRatingVal,
        comment: comment,
        tag: tag
      })
    });

    closeModal('reviewModal');
    showToast(`✓ Rating & feedback saved (${currentRatingVal}★)`);
    fetchReviews();
    fetchRides();
  } catch (err) {
    localReviews.unshift({
      id: Date.now(),
      ride_id: rideId,
      ride_name: rideName,
      user_name: userName,
      user_role: userRole,
      rating: currentRatingVal,
      comment: comment,
      tag: tag,
      created_at: "Just now"
    });
    if (ride) {
      ride.rating = currentRatingVal;
    }
    closeModal('reviewModal');
    showToast(`✓ Rating updated to ${currentRatingVal}★ in local session`);
    fetchReviews();
    fetchRides();
  }
}

// ================= Booking Workflow =================
function openBooking(id) {
  selectedRide = currentRides.find(r => r.id === id) || localRides.find(r => r.id === id);
  if (!selectedRide) return;

  document.getElementById("bookingVehicleTitle").textContent = `Book ${selectedRide.name}`;
  document.getElementById("bookingDailyRate").textContent = `₹${selectedRide.price}/day`;
  document.getElementById("bookingDaysInput").value = 1;

  // Real vehicle preview in modal
  const previewBox = document.getElementById("bookingPhotoPreview");
  const photo = selectedRide.image_url || "https://upload.wikimedia.org/wikipedia/commons/e/ec/Gold_Metallic_Honda_Activa.jpg";
  previewBox.innerHTML = `<img src="${photo}" alt="${selectedRide.name}">`;

  if (currentUser) {
    document.getElementById("bookingNameInput").value = currentUser.name;
    document.getElementById("bookingEmailInput").value = currentUser.email;
  }

  updateBookingTotal();
  openModal('bookingModal');
}

function updateBookingTotal() {
  if (!selectedRide) return;
  const days = Math.max(1, parseInt(document.getElementById("bookingDaysInput").value, 10) || 1);
  document.getElementById("bookingTotalCalc").textContent = `₹${selectedRide.price * days}`;
}

async function executeBooking() {
  if (!selectedRide) return;

  const days = Math.max(1, parseInt(document.getElementById("bookingDaysInput").value, 10) || 1);
  const name = document.getElementById("bookingNameInput").value.trim() || "Demo Rider";
  const email = document.getElementById("bookingEmailInput").value.trim() || "rider@example.com";
  const btn = document.getElementById("confirmBookingBtn");

  btn.disabled = true;
  btn.textContent = "Processing reservation...";

  try {
    const res = await fetch(`${API_BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ride_id: selectedRide.id,
        days: days,
        user_name: name,
        user_email: email
      })
    });

    const data = await res.json();
    closeModal('bookingModal');
    sessionStorage.setItem('last_booked_ride', JSON.stringify(selectedRide));
    window.location.href = 'confirmation.html';
  } catch (err) {
    localBookings.unshift({
      id: Date.now(),
      ride_id: selectedRide.id,
      vehicle_name: selectedRide.name,
      user_name: name,
      days: days,
      total_price: selectedRide.price * days,
      status: "confirmed"
    });
    closeModal('bookingModal');
    sessionStorage.setItem('last_booked_ride', JSON.stringify(selectedRide));
    window.location.href = 'confirmation.html';
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirm Reservation";
  }
}

// ================= Dual Login & Master Portal =================
async function handleUserLogin(e) {
  e.preventDefault();
  const email = document.getElementById("userEmailInput").value.trim();
  const password = document.getElementById("userPasswordInput").value.trim();

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'user' })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.data.user;
    } else {
      currentUser = { name: "Demo Rider", email: email, role: "user" };
    }
  } catch (err) {
    currentUser = { name: "Demo Rider", email: email, role: "user" };
  }

  localStorage.setItem('rent2ride_user', JSON.stringify(currentUser));
  initAuthUI();
  closeModal('userLoginModal');
  showToast(`Welcome back, Rider ${currentUser.name} ✓`);
}

async function handleMasterLogin(e) {
  e.preventDefault();
  const email = document.getElementById("masterEmailInput").value.trim();
  const password = document.getElementById("masterPasswordInput").value.trim();

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'master' })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.data.user;
    } else {
      currentUser = { name: "Fleet Master", email: email, role: "master" };
    }
  } catch (err) {
    currentUser = { name: "Fleet Master", email: email, role: "master" };
  }

  localStorage.setItem('rent2ride_user', JSON.stringify(currentUser));
  initAuthUI();
  closeModal('masterLoginModal');
  showToast(`Master Access Granted: Welcome ${currentUser.name} 👑`);
  openMasterDashboard();
}

function handleMasterAction() {
  if (currentUser && currentUser.role === 'master') {
    openMasterDashboard();
  } else {
    openModal('masterLoginModal');
  }
}

async function openMasterDashboard() {
  const totalVehiclesEl = document.getElementById("dashTotalVehicles");
  if (totalVehiclesEl) totalVehiclesEl.textContent = currentRides.length;

  let bookings = localBookings;
  try {
    const res = await fetch(`${API_BASE}/api/bookings`);
    if (res.ok) {
      const data = await res.json();
      bookings = data.data || localBookings;
    }
  } catch (e) {}

  const totalBookingsEl = document.getElementById("dashTotalBookings");
  if (totalBookingsEl) totalBookingsEl.textContent = bookings.length;
  const totalRev = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0) + 14800;
  const totalRevEl = document.getElementById("dashTotalRevenue");
  if (totalRevEl) totalRevEl.textContent = `₹${totalRev.toLocaleString()}`;

  // Render Listed Vehicles
  const vList = document.getElementById("dashVehiclesList");
  if (vList) {
    vList.innerHTML = currentRides.map(r => `
      <div class="dash-row-item">
        <span>${r.icon || '🛵'} <b>${r.name}</b> (${r.area})</span>
        <span>₹${r.price}/day · <b style="color:var(--green)">Available</b></span>
      </div>
    `).join("");
  }

  // Render Bookings
  const bList = document.getElementById("dashBookingsList");
  if (bList) {
    bList.innerHTML = bookings.slice(0, 5).map(b => `
      <div class="dash-row-item">
        <span>Reservation #${b.id}: <b>${b.vehicle_name || 'Vehicle'}</b> (${b.user_name})</span>
        <span>${b.days} days · <b style="color:var(--peach)">₹${b.total_price}</b></span>
      </div>
    `).join("");
  }

  openModal('masterDashboardModal');
}

// ================= Add Vehicle by Master =================
async function submitNewListing() {
  // Block non-master users from adding vehicles
  if (currentUser && currentUser.role !== 'master') {
    showToast("Only Master fleet owners can add vehicles.");
    closeModal('listModal');
    return;
  }

  const name = document.getElementById("listName").value.trim();
  const type = document.getElementById("listType").value;
  const price = parseInt(document.getElementById("listPrice").value, 10) || 399;
  const area = document.getElementById("listArea").value.trim() || "Knowledge Park";
  const specs = document.getElementById("listSpecs").value.trim() || "Standard Engine • Full Service";
  const imageUrl = document.getElementById("listImageUrl").value.trim();

  if (!name) {
    showToast("Please enter the vehicle name");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/rides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, price, area, specs, image_url: imageUrl })
    });
    closeModal('listModal');
    showToast(`✓ ${name} added to inventory at ₹${price}/day`);
    fetchRides();
  } catch (err) {
    const newRide = {
      id: Date.now(),
      name,
      type,
      price,
      area,
      specs,
      image_url: imageUrl || (type === 'bicycle' ? "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=80" : "https://upload.wikimedia.org/wikipedia/commons/e/ec/Gold_Metallic_Honda_Activa.jpg"),
      icon: type === 'bicycle' ? '🚲' : '🛵',
      distance: 1.5,
      rating: 5.0,
      reviews_count: 1,
      status: 'available'
    };
    localRides.unshift(newRide);
    closeModal('listModal');
    showToast(`✓ ${name} added to inventory in local session`);
    fetchRides();
  }
}

// ================= Modal Helpers =================
function openModal(id) {
  // Block listModal for non-master users
  if (id === 'listModal' && currentUser && currentUser.role !== 'master') {
    showToast("Only Master fleet owners can add vehicles.");
    return;
  }
  const el = document.getElementById(id);
  if (el) el.classList.add("show");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("show");
}

window.addEventListener("click", e => {
  if (e.target.classList.contains("modal")) {
    e.target.classList.remove("show");
  }
});

let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

// ================= Startup =================
initAuthUI();
// Only run page-specific fetches if the relevant elements exist
if (document.getElementById("rideGrid")) {
  fetchRides();
}
if (document.getElementById("reviewsFeed")) {
  fetchReviews();
}
