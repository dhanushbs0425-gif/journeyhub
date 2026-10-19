# JourneyHub — Collaborative Travel Planning & Budget Management Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-026e00?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-4.21-black?logo=express)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-green?logo=mongodb)](https://mongodb.com)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen)](#testing-instructions)
[![MCA Capstone](https://img.shields.io/badge/MCA-Capstone%20Project-blueviolet)](#)

**JourneyHub** is a full-stack, collaborative travel planning and budget management platform designed for groups, families, and travel circles. Built as an **MCA Capstone Project**, it uses deterministic engineering algorithms (greedy debt simplification, interval intersection graph detection, and consensus availability matching) with **zero AI/ML dependencies**.

---

## 🌟 Key Highlights & Distinctive Features

1. **What-If Trip Simulator**
   - Allows users to model itinerary changes, luxury upgrades, or alternative routes in an isolated sandbox (`TripScenario`).
   - Displays real-time delta metrics ($\Delta$ Cost, $\Delta$ Duration, Schedule Conflicts) without modifying live plans until confirmed.
2. **Missed-Activity Recovery Engine**
   - Automatically detects free time gaps in the remaining trip schedule when an activity is marked as missed.
   - Calculates duration requirements and recommends open slots with 1-click conflict-free rescheduling.
3. **Group Availability Matcher**
   - Members submit their discrete free calendar ranges.
   - The consensus engine evaluates date intersection frequencies to rank travel windows with the highest member availability.
4. **Personal Travel Diary & Memory Archive**
   - Chronological travel journal with mood indicators, memorable location pins, star ratings, and an aggregated photo gallery.
5. **Trip Readiness Checklist**
   - Dynamic 5-pillar composite preparedness gauge evaluating itinerary coverage, packing progress, confirmed bookings, emergency contacts, and member confirmations.
6. **Greedy Debt Simplification**
   - Net-debt balance minimization algorithm ($O(N \log N)$) that compresses complex circular debts into the minimum number of transactions ($\le N-1$).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3 Custom Properties (Deep Navy / Teal palette), Vanilla JavaScript (Modular SPA) |
| **Backend** | Node.js (v20+), Express.js 4 REST API |
| **Database** | MongoDB with Mongoose 8 (Automatic In-Memory Mongo Daemon fallback for zero-setup evaluation) |
| **Authentication** | JSON Web Tokens (JWT) & bcryptjs salted password hashing |
| **Visualizations** | Chart.js 4 (Category distribution doughnut & daily spending trends) |
| **Geospatial** | Leaflet with OpenStreetMap tiles |
| **Real-time** | Socket.IO collaboration gateway |

---

## 📁 Project Directory Structure

```text
journeyhub/
├── package.json                    # Project metadata, dependencies, scripts
├── .env.example                    # Environment variable template
├── .env                            # Active environment configuration
├── .gitignore                      # Git exclusion rules
├── server.js                       # Express server and Socket.IO initialization
├── README.md                       # Comprehensive project documentation
├── src/
│   ├── config/
│   │   └── db.js                   # Resilient database connection (URI + MongoMemoryServer)
│   ├── models/
│   │   ├── User.js                 # User accounts, hashed passwords, preferences
│   │   ├── Trip.js                 # Trip entities, dates, budgets, readiness score
│   │   ├── TripMember.js           # Roles (owner, editor, viewer), availability windows
│   │   ├── Destination.js          # Catalog of global & domestic destinations
│   │   ├── ItineraryActivity.js    # Scheduled activities, timeslots, missed state
│   │   ├── Expense.js              # Categorized expenditures, split shares
│   │   ├── ExpenseSettlement.js    # Settled debt records between members
│   │   ├── PackingItem.js          # Collaborative packing checklist items
│   │   ├── Vote.js                 # Group voting polls and duplicate prevention
│   │   ├── ChangeRequest.js        # Formal itinerary change requests & audit log
│   │   ├── Notification.js         # User alerts (invites, budget warnings, polls)
│   │   ├── TravelDiaryEntry.js     # Journal entries, photos, ratings, weather
│   │   ├── TripScenario.js         # What-If simulation engine state
│   │   └── BookingDocument.js      # Confirmation numbers, flights, hotels, vouchers
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification & token generator
│   │   ├── tripAuth.js             # Role-based authorization (owner, editor, viewer)
│   │   └── errorHandler.js         # Mongoose & API error translation
│   ├── controllers/                # 17 REST controllers implementing business logic
│   ├── routes/                     # Express REST routes mounted on /api/*
│   ├── utils/
│   │   ├── debtSimplifier.js       # Greedy net transaction minimization algorithm
│   │   ├── conflictDetector.js     # Interval overlap & gap slot search utility
│   │   ├── availabilityMatcher.js  # Group calendar date intersection aggregator
│   │   └── seedData.js             # Realistic MCA demo seed generator
│   └── tests/
│       ├── debtSimplifier.test.js  # Unit tests for debt minimization math
│       ├── conflictDetector.test.js# Unit tests for conflict detection & recovery slots
│       ├── availabilityMatcher.test.js # Unit tests for date overlap matching
│       ├── api.test.js             # Integration tests for auth, trip CRUD & simulation
│       └── runAllTests.js          # Master test runner
└── public/
    ├── index.html                  # Single-page application entry shell
    ├── css/
    │   ├── variables.css           # Color tokens, radii, shadows, and dark theme
    │   ├── layout.css              # App shell, topbar, responsive sidebar
    │   ├── components.css          # Cards, modals, toasts, progress bars, buttons
    │   └── pages.css               # Specialized views for all 18 pages
    └── js/
        ├── api.js                  # Central fetch client with token handling
        ├── state.js                # Reactive global state store
        ├── router.js               # Client-side hash router with auth guards
        ├── components/             # Navbar, sidebar, modal, and toast managers
        ├── pages/                  # 18 Modular page view controllers
        └── app.js                  # App bootstrapper
```

---

## ⚡ Quick Start & Database Setup

### Prerequisites
* Node.js v20.x or higher
* npm v10.x or higher
* *Optional*: Local MongoDB daemon (if not running, JourneyHub **automatically launches an embedded MongoDB 7.0 engine** with zero installation required!)

### 1. Installation
Clone or navigate to the project directory:
```bash
cd journeyhub
npm install
```

### 2. Environment & SMTP Email Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your `.env` file with your preferred SMTP credentials for real Email OTP delivery (e.g. Gmail App Password, Brevo, or Ethereal):
```env
PORT=5000
NODE_ENV=development

# Leave empty for automatic embedded MongoDB, or provide MongoDB URI:
MONGODB_URI=

# JWT Secrets
JWT_SECRET=journeyhub_super_secure_capstone_jwt_secret_key_2026
JWT_EXPIRES_IN=7d

# Predefined Organiser Passwords (Used during initial seeding only)
ORGANISER_DEFAULT_PASSWORD=Organiser@2026!
ORGANISER_SAI_PASSWORD=Organiser@Sai2026
ORGANISER_DHANUSH_PASSWORD=Organiser@Dhanush2026
ORGANISER_DIVYA_PASSWORD=Organiser@Divya2026

# Real SMTP Email Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM="JourneyHub Team" <noreply@journeyhub.dev>
```

### 3. Seed Three Predefined Organiser Accounts
To seed or verify the three predefined Organisers without overwriting existing passwords:
```bash
npm run seed:organisers
```
To seed the complete catalog (72 Indian Destinations, published trips, join requests, mystery trip):
```bash
npm run seed
```

### 4. Start the Application
```bash
npm start
```
Open your browser and visit: **`http://localhost:5000`**

---

## 🔑 Predefined Organiser Accounts & Real Authentication

JourneyHub features a **production-grade database authentication system** without hardcoded frontend credentials or fake OTP bypasses:

### 1. Three Predefined Organisers
Pre-seeded into MongoDB with role `organiser` and `emailVerified: true`:

| Name | Registered Email | Role | Initial Password |
|---|---|---|---|
| **Sai** | `sai@journeyhub.dev` | Organiser | `Organiser@Sai2026` |
| **Dhanush** | `dhanush@journeyhub.dev` | Organiser | `Organiser@Dhanush2026` |
| **Divya** | `divya@journeyhub.dev` | Organiser | `Organiser@Divya2026` |

* Organisers can create trips, manage mystery miles destinations, approve/reject traveler join requests, and manage itineraries.
* Organisers can securely change their password via `PATCH /api/users/change-password`.
* Passwords are never overwritten by subsequent seed executions.

### 2. First-Time User Registration Flow (Email OTP)
* **Step 1 (Register)**: User inputs Full Name, Email, Password, and Confirm Password (`#/register`).
* **Step 2 (Real OTP)**: Server generates a cryptographically secure 6-digit OTP, stores only a bcrypt hash in MongoDB with a 5-minute expiry, and dispatches the real email via Nodemailer.
* **Step 3 (Verify OTP)**: User enters the 6-digit OTP at `#/verify-otp`. Rate limits and incorrect attempt counters protect against brute-force guessing.
* **Step 4 (Profile Customization)**: On successful verification, the real User document is saved in MongoDB (`role: 'user'`, `emailVerified: true`), and the user customizes their avatar, home city, budget preference, and travel categories (`#/profile-setup`).

### 3. Ordinary Login & Password Recovery
* **Ordinary Login**: Verified users log in directly using email and password (`#/login`). **No OTP is required for normal logins**.
* **Password Recovery**: Users request a reset code at `#/forgot-password`, receive a time-limited OTP via email, and update their password at `#/reset-password`.

---

## 🧪 Testing Instructions

Run the full master automated test suite:
```bash
npm test
```

### Test Coverage Highlights:
- **Debt Minimization**: Validates that 2 circular cross-debts simplify down to 1 direct transaction, and checks balance arithmetic.
- **Conflict Detection**: Verifies that time overlaps (`09:00 - 11:00` vs. `10:30 - 12:00`) generate precise warning intervals.
- **Missed Activity Recovery**: Tests identifying unoccupied 90-minute gap slots between scheduled events.
- **Availability Matcher**: Asserts candidate window detection with 100% member consensus.
- **Backend API Integration**: Tests bcrypt password hashing, trip creation, and What-If scenario simulation.

---

## 📡 RESTful API Documentation

### Authentication & Users
- `POST /api/auth/register` — Create a new traveler account.
- `POST /api/auth/login` — Authenticate and obtain JWT token.
- `GET /api/auth/me` — Retrieve current user profile and preferences.
- `PUT /api/auth/profile` — Update traveler profile, avatar, emergency contacts.
- `PUT /api/auth/change-password` — Change password with current password verification.
- `GET /api/users/search?q=:query` — Search users to invite.
- `GET /api/users/stats` — Travel statistics summary.

### Trips & Readiness
- `POST /api/trips` — Create a new trip.
- `GET /api/trips` — Get user's trips (supports `?status=upcoming|ongoing|completed` and `?q=`).
- `GET /api/trips/:tripId` — Get trip details with **Trip Readiness Checklist** score.
- `PUT /api/trips/:tripId` — Update trip information (Editor/Owner).
- `DELETE /api/trips/:tripId` — Delete trip and cascade related records (Owner only).

### Day-Wise Itinerary & Missed Recovery
- `GET /api/trips/:tripId/itinerary` — Get day-wise activities and schedule conflicts.
- `POST /api/trips/:tripId/itinerary` — Schedule a new activity with overlap warning.
- `PUT /api/trips/:tripId/itinerary/:activityId` — Edit activity.
- `DELETE /api/trips/:tripId/itinerary/:activityId` — Remove activity.
- `POST /api/trips/:tripId/itinerary/:activityId/missed` — Mark missed and get suggested gap slots.
- `POST /api/trips/:tripId/itinerary/:activityId/reschedule` — Confirm reschedule to approved gap slot.

### Group Collaboration & Availability
- `GET /api/trips/:tripId/members` — List members with role badges.
- `POST /api/trips/:tripId/members` — Invite a member by email or ID.
- `PUT /api/trips/:tripId/members/:memberId/role` — Update role (Owner only).
- `DELETE /api/trips/:tripId/members/:memberId` — Remove member / leave trip.
- `GET /api/trips/:tripId/availability` — Compute ranked candidate travel windows.
- `POST /api/trips/:tripId/availability` — Submit personal free dates.
- `POST /api/trips/:tripId/availability/apply` — Apply winning dates to live trip.

### Expenses & Debt Settlements
- `GET /api/trips/:tripId/expenses` — Expenses list, category breakdown, budget burn rate.
- `POST /api/trips/:tripId/expenses` — Add expense with equal or custom split.
- `DELETE /api/trips/:tripId/expenses/:expenseId` — Delete expense.
- `GET /api/trips/:tripId/settlements` — Greedily minimized debt matrix and history.
- `POST /api/trips/:tripId/settlements` — Record debt settlement payment.

### Distinctive Modules
- `GET /api/trips/:tripId/scenarios` — What-If simulation scenarios.
- `POST /api/trips/:tripId/scenarios/:scenarioId/simulate` — Compute delta metrics ($\Delta$ Cost/Time).
- `POST /api/trips/:tripId/scenarios/:scenarioId/apply` — Apply scenario to live trip.
- `GET /api/trips/:tripId/diary` — Travel diary entries and photo memories.
- `POST /api/trips/:tripId/diary` — Create journal entry.
- `GET /api/trips/:tripId/packing` — Packing checklist items and completion status.
- `POST /api/trips/:tripId/packing/presets` — Auto-seed essential travel packing presets.
- `GET /api/trips/:tripId/bookings` — Flight, hotel, and transit confirmation vouchers.
- `GET /api/reports/trip/:tripId` — Visual analytics summary.
- `GET /api/reports/trip/:tripId/csv` — Downloadable CSV financial statement.

---

## 🎨 UI/UX Design System

- **Primary Colors**: Deep Navy (`#0f172a`), Dark Slate (`#1e293b`), Primary Teal (`#0d9488`), Vibrant Orange (`#f97316`).
- **Typography**: Inter (UI prose & data tables), Plus Jakarta Sans (Headings & metrics).
- **Responsive Breakpoints**: Desktop ($\ge 1024\text{px}$), Tablet ($768\text{px} - 1023\text{px}$), Mobile Drawer ($< 768\text{px}$).
- **Accessibility & Feedback**: Form input validation, non-blocking toast notifications, and modal dialogues with keyboard Escape support.

---

## 📜 Academic Integrity Note
Developed exclusively with deterministic software engineering, relational document schemas, and mathematical graph/interval algorithms. Completely free of external AI/ML services or third-party wrappers, fulfilling all MCA Capstone criteria.
