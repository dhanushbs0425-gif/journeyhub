# JourneyHub — Collaborative Travel Planning & Budget Management Platform

[![Live Site](https://img.shields.io/badge/Live%20Site-Cloudflare%20Worker-0070f3?logo=cloudflare&logoColor=white)](https://journeyhub.dhanushbs0425.workers.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-026e00?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-4.21-black?logo=express)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-green?logo=mongodb)](https://mongodb.com)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Passing%20(14%20Suites)-brightgreen)](#-testing--verification-instructions)
[![MCA Capstone](https://img.shields.io/badge/MCA-Capstone%20Project-blueviolet)](#-academic-integrity-note)

> **Live Production Application:** [https://journeyhub.dhanushbs0425.workers.dev/](https://journeyhub.dhanushbs0425.workers.dev/)

**JourneyHub** is a comprehensive full-stack collaborative travel planning, expedition management, and group budget simplification platform. Designed and engineered as an **MCA Capstone Project**, it delivers production-grade traveler collaboration using deterministic engineering algorithms (greedy net debt simplification, interval intersection graph detection, and consensus availability matching) with **zero external AI/ML dependencies**.

---

## 🌟 Key Highlights & Core Capabilities

### 1. 🚀 Direct Registration & Dual-Identifier Authentication (No OTP Friction)
- **Direct Registration**: Travelers register directly with **Full Name**, **Email Address**, **Mobile Phone Number**, **Password**, and **Confirm Password** (`#/register`). No email or phone OTP verification is required to create an account.
- **Dual-Identifier Login**: Users and organisers can sign in using **either their Email Address OR Mobile Phone Number**, combined with their secure password (`#/login`).
- **Security & Integrity**: Passwords are cryptographically salted and hashed using `bcryptjs`. Authenticated sessions are managed via signed JSON Web Tokens (JWT). Duplicate email addresses and mobile numbers are strictly rejected with user-friendly validation messages.
- **Predefined Organiser Accounts**: Built-in accounts for verified travel organisers (**Sai**, **Dhanush**, and **Divya**) with role-based access control (RBAC) and protected privileges.

### 2. 🌄 Intelligent Destination Photography & Dynamic Image Fallbacks
- **Authentic Destination Imagery**: Every trip automatically displays high-resolution, destination-specific photography over HTTPS (e.g., Ooty shows Nilgiri tea hills, Goa displays coastal waters, Manali displays snow peaks, Munnar highlights mountain mist, Jaipur shows royal palaces, and Hampi highlights stone heritage).
- **No Indiscriminate Placeholders**: Eliminates single generic image reuse across diverse trips.
- **Smart Placeholder Upgrade**: Automatically detects and upgrades legacy generic placeholders to authentic destination photography without manual re-entry.
- **Custom URL Preservation**: If an organiser provides their own custom image URL, it is preserved completely without overwriting.
- **Interactive Form Preview**: The trip creation screen provides real-time image preview as organisers type the destination name or enter a custom photo URL.
- **Resilient Error Handling**: Integrated `handleImageError` client handler replaces broken or blocked image URLs with safe destination fallbacks while clearing `onerror` to prevent infinite reload loops.

### 3. 👥 Robust Organiser Join Requests Management (Accept, Reject, Delete, Clear All)
- **Complete End-to-End Pipeline**: User join requests are persisted directly in MongoDB, synchronised in real time, and surfaced on the responsible organiser's dashboard.
- **Quota & Membership Sync**:
  - **Accept**: Confirms the traveler, adds them as an accepted member in `TripMember`, and decrements available seat quotas.
  - **Reject**: Updates the request status with organiser feedback while maintaining audit history.
  - **Delete**: Allows organisers to selectively remove individual completed or obsolete requests.
  - **Clear All**: Clears only the authenticated organiser's request list after modal confirmation, strictly isolated from other organisers.
- **Cross-Organiser Isolation**: Strict authorisation middleware blocks one organiser from viewing or modifying another organiser's private requests (HTTP 403).

### 4. 🧭 Public Explore Trips & Publication State Synchronization
- **Bidirectional Publication Sync**: Synchronises `isPublished` (boolean) and `publicationStatus` (`'Published'` vs `'Draft'`) at both model and controller levels.
- **Universal Discoverability**: All trips published by any verified organiser appear in the public Explore Trips directory (`#/explore-trips`) for travelers to browse, filter by budget/destination, and request to join.
- **Traveler Dashboard Separation**: Travelers clearly differentiate between confirmed trips in **My Trips** and submitted applications in **My Requests**.

### 5. 🧮 Deterministic Travel Algorithms
1. **Greedy Debt Simplification ($O(N \log N)$)**:
   - Computes net creditor/debtor balances across group expenses and greedily cancels circular debts into the minimum possible transactions ($\le N - 1$).
2. **Missed-Activity Recovery Engine**:
   - Detects schedule gaps when an activity is flagged as missed and proposes conflict-free rescheduling slots.
3. **Consensus Availability Matcher**:
   - Evaluates multi-member calendar intersections to rank optimal travel windows with the highest attendance consensus.
4. **Trip Readiness Checklist (5-Pillar Score)**:
   - Dynamic composite preparedness gauge evaluating itinerary coverage, packing progress, confirmed bookings, emergency contacts, and member confirmations.
5. **What-If Trip Simulator (`TripScenario`)**:
   - Isolated sandbox to evaluate budget and schedule impacts of itinerary changes before committing to live plans.
6. **Mystery Miles Expedition Module**:
   - Blind booking adventures with clue progression, hidden destination secrets, and synchronised reveals.

---

## 🛠️ Technology Stack

| Layer | Technologies & Implementations |
|---|---|
| **Frontend** | Vanilla JavaScript (Modular SPA Architecture), HTML5, CSS3 Custom Properties (Deep Navy `#0f172a`, Primary Teal `#0d9488`, Vibrant Orange `#f59e0b`), Chart.js 4 (Analytics), Leaflet OSM (Maps) |
| **Backend** | Node.js (v20+ LTS), Express.js 4 RESTful API, Socket.IO (Real-Time Events) |
| **Database** | MongoDB with Mongoose 8 ODM (Resilient dual-connection: MongoDB Atlas primary + embedded `MongoMemoryServer` fallback) |
| **Edge / Serverless** | Cloudflare Worker (`src/worker.js`) with isolated MongoDB connection pooling and static edge asset delivery |
| **Authentication** | JSON Web Tokens (JWT) + salted `bcryptjs` password hashing; Role-Based Access Control (`user`, `organiser`, `admin`) |
| **Testing** | Comprehensive Automated Master Suite (14 unit, integration, and end-to-end suites with 100% pass rate) |

---

## 📁 Project Directory Structure

```text
journeyhub/
├── package.json                      # Metadata, scripts, dependencies
├── server.js                         # Express REST API & Socket.IO server entry
├── README.md                         # Project documentation and specifications
├── public/                           # Client-side Single Page Application (SPA)
│   ├── index.html                    # Application HTML shell
│   ├── css/
│   │   ├── variables.css             # Color palette tokens, fonts, spacing
│   │   ├── layout.css                # Header, sidebar, responsive shell
│   │   ├── components.css            # Modals, cards, badges, toast notifications
│   │   └── pages.css                 # Page-specific views and dashboard grids
│   └── js/
│       ├── app.js                    # SPA bootstrap & lifecycle
│       ├── api.js                    # Centralized fetch wrapper with JWT injection
│       ├── router.js                 # Client-side hash routing (#/login, #/explore-trips, etc.)
│       ├── state.js                  # Reactive state management
│       ├── utils/
│       │   └── destinationImages.js  # Client destination photo resolver & error handler
│       ├── components/               # Navbar, sidebar, modal, and toast managers
│       └── pages/                    # 18 Modular Page Controllers:
│           ├── loginPage.js          # Dual login (Email OR Mobile + Password)
│           ├── registerPage.js       # Direct registration without OTP
│           ├── exploreTripsPage.js   # Public trip directory with search & filters
│           ├── createTripPage.js     # Trip creator with live image preview
│           ├── dashboardPage.js      # Traveler dashboard & enrolled trips
│           ├── tripDetailsPage.js    # Trip workspace, readiness checklist & itinerary
│           ├── organiserTripsPage.js # Organiser trip workspace & publish toggles
│           ├── myRequestsPage.js     # Traveler join request tracking
│           ├── requestsPage.js       # Organiser Join Requests portal (Accept/Reject/Delete)
│           ├── expensesPage.js       # Expense logging & category doughnut charts
│           ├── settlementsPage.js    # Minimized debt settlement matrix
│           ├── itineraryPage.js      # Day-wise itinerary & conflict detector
│           ├── packingPage.js        # Packing checklist with essential presets
│           ├── bookingsPage.js       # Travel documents & voucher storage
│           ├── scenariosPage.js      # What-If simulator sandbox
│           ├── mysteryTripsPage.js   # Mystery Miles blind booking expeditions
│           ├── travelDiaryPage.js    # Memory archive & photo journal
│           └── profileSetupPage.js   # Traveler profile & avatar customization
└── src/                              # Backend Source Code
    ├── worker.js                     # Cloudflare Worker serverless edge entry point
    ├── config/
    │   └── db.js                     # MongoDB Atlas connection manager with memory fallback
    ├── models/                       # Mongoose Data Schemas:
    │   ├── User.js                   # Traveler/organiser accounts, hashed passwords, preferences
    │   ├── Trip.js                   # Trip entities, publication sync, destination image pre-save
    │   ├── TripMember.js             # Memberships, roles (owner, editor, viewer), status
    │   ├── JoinRequest.js            # User join requests, seats requested, organiser scoping
    │   ├── Destination.js            # Indian destination catalog & imagery
    │   ├── ItineraryActivity.js      # Scheduled activities, timeslots, missed state
    │   ├── Expense.js                # Expense expenditures & split allocations
    │   ├── ExpenseSettlement.js      # Debt transactions and payment records
    │   ├── PackingItem.js            # Collaborative packing items
    │   ├── Vote.js                   # Member polls & group decisions
    │   ├── ChangeRequest.js          # Audit-trailed itinerary change requests
    │   ├── Notification.js           # Traveler alerts & system notifications
    │   ├── TravelDiaryEntry.js       # Personal journal entries & memories
    │   ├── TripScenario.js           # What-If simulation engine state
    │   └── BookingDocument.js        # Vouchers, tickets, hotel confirmations
    ├── middleware/
    │   ├── auth.js                   # JWT authentication & user identification
    │   ├── tripAuth.js               # Role authorization (owner, editor, viewer)
    │   └── errorHandler.js           # Central error formatting & translation
    ├── controllers/                  # Express REST Route Handlers (17 controllers)
    ├── routes/                       # Express REST API Endpoints mounted at /api/*
    ├── utils/
    │   ├── destinationImages.js      # Central destination image resolver catalog
    │   ├── debtSimplifier.js         # Greedy debt minimization algorithm ($O(N \log N)$)
    │   ├── conflictDetector.js       # Schedule overlap detection & recovery slot search
    │   ├── availabilityMatcher.js    # Member availability intersection evaluator
    │   └── seedData.js               # Database seeding script for catalog & trips
    └── tests/                        # Automated Verification Test Suites:
        ├── runAllTests.js            # Master test runner executing all suites
        ├── destinationImages.test.js # Destination photo matching & safe fallback tests
        ├── noOtpAuthAndLoginTests.js # Direct registration & dual-login test suite
        ├── bugs123EndToEnd.test.js   # Bugs 1, 2, 3 end-to-end integration verification
        ├── publishedTripsVisibility.test.js # Published trips visibility test suite
        ├── joinRequestVisibilityAndSync.test.js # Join requests sync & scoping tests
        ├── myTripsAndDetailsNav.test.js # Navigation & trip detail loading tests
        ├── debtSimplifier.test.js    # Debt minimization unit tests
        ├── conflictDetector.test.js  # Schedule conflict detector unit tests
        ├── availabilityMatcher.test.js # Group availability unit tests
        └── api.test.js               # Full REST API integration tests
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas connection string (if omitted, JourneyHub automatically boots an in-memory database daemon for immediate evaluation).

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/dhanushkumarbs/journeyhub.git
cd journeyhub
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development

# MongoDB Connection String (Leave blank for automatic in-memory MongoDB)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/journeyhub

# JWT Authentication Secret
JWT_SECRET=journeyhub_super_secure_capstone_jwt_secret_key_2026
JWT_EXPIRES_IN=7d

# Predefined Organiser Passwords (Used for initial seed verification)
ORGANISER_SAI_PASSWORD=Organiser@Sai2026
ORGANISER_DHANUSH_PASSWORD=Organiser@Dhanush2026
ORGANISER_DIVYA_PASSWORD=Organiser@Divya2026
```

### 3. Seed Organiser Accounts & Sample Trips
Seed or verify the predefined organiser accounts and Indian destinations catalog:
```bash
npm run seed:organisers
npm run seed
```

### 4. Start the Application
```bash
node server.js
```
Open your browser and navigate to: **`http://localhost:5000`**

---

## 🔑 Predefined Accounts & Role Permissions

The system includes pre-seeded accounts configured with the `organiser` role:

| Name | Login Identifier (Email or Mobile) | Role | Password |
|---|---|---|---|
| **Dhanush** | `dhanush@journeyhub.dev` or `+91 9876543210` | Organiser | `Organiser@Dhanush2026` |
| **Sai** | `sai@journeyhub.dev` or `+91 9876543211` | Organiser | `Organiser@Sai2026` |
| **Divya** | `divya@journeyhub.dev` or `+91 9876543212` | Organiser | `Organiser@Divya2026` |

* **Organiser Privileges**: Create trips, publish/unpublish trips, review and accept/reject traveler join requests, manage itineraries, and create Mystery Miles expeditions.
* **Traveler Privileges**: Browse published trips, submit join requests, track request statuses, log shared expenses, view debt settlement matrices, and participate in collaborative packing and voting.

---

## 🧪 Testing & Verification Instructions

JourneyHub includes an exhaustive automated test suite validating all algorithms, authentication paths, edge cases, and end-to-end user flows.

To run the complete test suite:
```bash
node src/tests/runAllTests.js
```
*(or `npm test` on systems where script execution is enabled)*

### Automated Test Suites:
1. **Debt Simplifier Tests**: Validates greedy balance minimization, verifying that circular multi-member debts reduce down to minimum transactions ($\le N - 1$).
2. **Conflict Detector Tests**: Verifies activity interval overlaps, boundary touching conditions, and gap slot calculation for missed activities.
3. **Availability Matcher Tests**: Asserts correct member calendar intersection scoring with 100% consensus ranking.
4. **Direct Registration & Dual-Login Tests**: Tests registering without OTP, email + password login, mobile number + password login, invalid credentials rejection, and duplicate account prevention.
5. **Destination Images & Fallback Tests**: Asserts that 5+ distinct destinations (Ooty, Goa, Manali, Munnar, Jaipur) resolve to 5 distinct authentic images, generic placeholders are upgraded, custom URLs are preserved, and client error handling prevents infinite loops.
6. **Bugs 1, 2, and 3 End-to-End Tests**:
   - **Bug 1**: Validates user join requests saved in MongoDB and routed to the correct organiser.
   - **Bug 2**: Validates organiser Accept (seat decrement), Reject, individual Delete, cross-organiser security isolation (HTTP 403), and Clear All scoping.
   - **Bug 3**: Validates trip publication status synchronisation and immediate visibility in user-side Explore Trips listings.
7. **Role-Based & Special Feature Tests**: Validates organiser access controls, Mystery Miles secrecy encryption, and destination catalog wishlists.

---

## 📡 RESTful API Reference

### Authentication & User Management
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new account (Name, Email, Mobile, Password) without OTP | Public |
| `POST` | `/api/auth/login` | Authenticate using Email OR Mobile Number + Password | Public |
| `GET` | `/api/auth/me` | Fetch authenticated traveler profile and preferences | Authenticated |
| `PUT` | `/api/auth/profile` | Update profile, avatar, home city, emergency contacts | Authenticated |
| `PUT` | `/api/auth/change-password` | Update account password with current password verification | Authenticated |

### Trips & Discoverability
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/trips?explore=true` | Fetch all published trips across all organisers for Explore page | Public / Authenticated |
| `GET` | `/api/trips` | Fetch trips joined by or belonging to the authenticated user | Authenticated |
| `GET` | `/api/trips/:tripId` | Fetch trip details with dynamic 5-pillar Readiness Score | Authenticated |
| `POST` | `/api/trips` | Create a new trip with destination image auto-resolution | Organiser |
| `PUT` | `/api/trips/:tripId` | Update trip details, itinerary, or cover image | Trip Owner / Editor |
| `PATCH` | `/api/trips/:tripId/publish` | Toggle trip publication state (`Published` / `Draft`) | Trip Owner |
| `DELETE` | `/api/trips/:tripId` | Delete trip and cascade delete related sub-documents | Trip Owner |

### Join Requests & Organiser Portal
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/join-requests` | Submit request to join a trip (with seat count & message) | Traveler |
| `GET` | `/api/join-requests/my-requests` | Fetch authenticated user's submitted join requests | Authenticated |
| `GET` | `/api/join-requests/organiser` | Fetch pending/reviewed requests for the organiser | Organiser |
| `PATCH` | `/api/join-requests/:requestId/status` | Accept or reject a join request (updates seat count) | Trip Organiser |
| `DELETE` | `/api/join-requests/:requestId` | Delete a single join request from database | Trip Organiser |
| `DELETE` | `/api/join-requests/clear-all` | Clear all requests scoped to the authenticated organiser | Trip Organiser |

### Expenses & Debt Settlement
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/trips/:tripId/expenses` | Get trip expenditures, split breakdown, category stats | Trip Members |
| `POST` | `/api/trips/:tripId/expenses` | Add shared expense with equal or custom allocation | Trip Members |
| `DELETE` | `/api/trips/:tripId/expenses/:expenseId` | Remove expense entry and recalculate balances | Trip Owner / Payer |
| `GET` | `/api/trips/:tripId/settlements` | Fetch greedily minimized debt matrix ($O(N \log N)$) | Trip Members |
| `POST` | `/api/trips/:tripId/settlements` | Record debt settlement payment between members | Trip Members |

### Itinerary & Recovery Engine
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/trips/:tripId/itinerary` | Get day-wise activities and schedule overlap warnings | Trip Members |
| `POST` | `/api/trips/:tripId/itinerary` | Schedule activity with interval conflict detection | Trip Owner / Editor |
| `POST` | `/api/trips/:tripId/itinerary/:id/missed` | Flag activity as missed and search for recovery slots | Trip Owner / Editor |
| `POST` | `/api/trips/:tripId/itinerary/:id/reschedule` | Reschedule activity into approved conflict-free gap | Trip Owner / Editor |

---

## 🎨 UI/UX Design System

- **Palette**: Deep Navy (`#0f172a`), Dark Slate (`#1e293b`), Primary Teal (`#0d9488`), Vibrant Orange (`#f59e0b`).
- **Typography**: Inter (Body, data tables, and input forms), Plus Jakarta Sans (Headings and metrics).
- **Responsive Layout**: Fluid breakpoints covering Mobile Handhelds ($< 768\text{px}$), Tablets ($768\text{px} - 1023\text{px}$), and Desktop Displays ($\ge 1024\text{px}$).
- **Feedback & Accessibility**: Contextual toasts, non-blocking asynchronous modal dialogs, accessible keyboard focus trap, and keyboard Escape listeners.

---

## 📜 Academic Integrity Note

**JourneyHub** was developed entirely with deterministic software engineering, relational document schemas, and mathematical graph and interval algorithms. It contains **no third-party AI/ML services, OpenAI/Gemini wrappers, or generative black boxes**, fulfilling all academic criteria and evaluation requirements for an **MCA Capstone Project**.

---

## 📄 License

This project is licensed under the ISC License. Designed and developed by **JourneyHub Team**.
