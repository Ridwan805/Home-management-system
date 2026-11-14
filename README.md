# 🏡 DwellSync - Home Management System

A comprehensive, full-stack property and residential management platform designed to streamline operations between **Property Owners**, **Tenants**, **Security Guards**, and **System Administrators**.

---

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Key Features & Implemented Work](#key-features--implemented-work)
  - [1. Authentication & Security](#1-authentication--security)
  - [2. Interactive Maps & Geolocation](#2-interactive-maps--geolocation)
  - [3. Property & Listing Management](#3-property--listing-management)
  - [4. Role-Based Dashboards](#4-role-based-dashboards)
  - [5. Payments & Billing (Stripe)](#5-payments--billing-stripe)
  - [6. Maintenance & Emergency Services](#6-maintenance--emergency-services)
  - [7. Parcel & Visitor Gate Logs](#7-parcel--visitor-gate-logs)
  - [8. UI/UX Modernization & Refactoring](#8-uiux-modernization--refactoring)
  - [9. Deployment & Backend Stability](#9-deployment--backend-stability)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started (Local Development)](#getting-started-local-development)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables (.env)](#environment-variables-env)
  - [Running the App](#running-the-app)
- [Recent Commits & Updates Summary](#recent-commits--updates-summary)

---

## 🌟 Project Overview

**DwellSync** replaces manual residential management with a centralized digital ecosystem:
- **Tenants** can search rentals, view properties on live interactive maps, submit maintenance requests, pay rent and utility bills via Stripe, track parcels, and view emergency contacts.
- **Owners** can create and manage property listings, set geo-locations, monitor tenants, review maintenance reports, track rental income, and hire security guards.
- **Security Guards** can log visitors at entry gates, log delivered parcels for residents, apply for guard openings, and view payouts.
- **Administrators** have complete oversight over users, building summaries, revenue, and system-wide activity logs.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Routing**: React Router DOM v7
- **Maps & Geolocation**: Leaflet & React-Leaflet, OpenStreetMap, Nominatim Geocoding API
- **Icons & UI**: React Icons, React Toastify, custom modern CSS variables
- **HTTP Client**: Axios

### Backend
- **Runtime & Framework**: Node.js & Express.js
- **Database & ODM**: MongoDB Atlas with Mongoose (Geospatial 2dsphere indexing)
- **Authentication**: JWT (JSON Web Tokens), Bcryptjs password hashing
- **Media Storage**: Cloudinary & Multer Cloudinary Storage
- **Payments**: Stripe API & Webhooks
- **PDF Generation**: PDFKit & jsPDF
- **Task Scheduling**: Node-Cron (automated rent balance & ledger updates)

---

## 🚀 Key Features & Implemented Work

### 1. Authentication & Security
- **Multi-Role Registration & Login**: Separate user roles with dedicated permissions (`Admin`, `Owner`, `Tenant`, `Security Guard`).
- **JWT Middleware**: Secure token-based API authentication and authorization guards.
- **Autofill Compliance**: Added HTML5 standard `autoComplete` attributes on forms to eliminate browser autofill console warnings and improve user convenience.
- **Password Recovery**: Secure forgot/reset password flow.

### 2. Interactive Maps & Geolocation
- **OpenStreetMap & Leaflet Integration**: Replaced external heavy map APIs with a lightweight, open-source solution using `react-leaflet`.
- **`LocationPickerMap`**:
  - Interactive click-to-pin coordinate picker for listing creation.
  - Live address search and autocomplete via the OpenStreetMap Nominatim reverse geocoding API.
  - Dynamic coordinate sync (latitude/longitude) directly into property records.
- **`LocationViewerMap`**:
  - Embedded read-only map on property detail pages showing precise location markers.
- **MongoDB Geospatial Index Fix**:
  - Configured sparse `2dsphere` coordinates indexing in Mongoose to prevent errors when properties have null or partial location data.

### 3. Property & Listing Management
- **Listing Creation & Editing**: Multi-step property creation form with bedroom, bathroom, square footage, amenities, pricing, and dynamic photo upload.
- **Cloudinary Integration**: Automatic image upload, thumbnail optimization, and CDN delivery for property photos and user avatars.
- **Advanced Search & Filtering**: Client-side and server-side filtering by property category, location, rent budget, and availability.
- **Ownership Transfer**: Dedicated workflow for transferring property management to another owner.

### 4. Role-Based Dashboards
- **Owner Dashboard**:
  - Quick KPI stats (total properties, occupancy rate, total rent collected, pending maintenance).
  - Modernized sidebar navigation with responsive layout.
  - Listing management drawer and maintenance report resolution actions.
- **Tenant Dashboard**:
  - View current tenancy details, monthly dues, and payment history.
  - Submit maintenance requests with description and urgency.
  - Track parcel delivery status in real-time.
- **Security Guard Dashboard**:
  - Gate logging tool for recording incoming visitors and check-outs.
  - Delivery package intake log with recipient tenant assignment.
  - Application portal for assigned residential posts.
- **Admin Dashboard**:
  - System-wide building summaries, user ledgers, and property status reviews.

### 5. Payments & Billing (Stripe)
- **Stripe Checkout Integration**: Seamless card payments for rent, invoices, and security personnel fees.
- **Dynamic Origin Redirects**:
  - Implemented dynamic `originUrl` resolution in controllers (`stripe.controller.js`, `invoice.controller.js`, `securityGuardPayment.controller.js`).
  - Solved redirect loops where production payments erroneously redirected to `localhost:5173`.
- **Invoice & PDF Receipts**: Downloadable PDF receipts generated on demand for completed payments.

### 6. Maintenance & Emergency Services
- **Maintenance Report Ticketing**: Tenants report issues with categories (plumbing, electrical, structural, etc.), track progress (`Pending`, `In Progress`, `Resolved`).
- **Quick Dial Directory**: Fast-access one-click directory for emergency contacts, building managers, fire service, and local police.

### 7. Parcel & Visitor Gate Logs
- **Parcel Intake**: Security guards log packages with carrier name, tracking ID, and tenant unit; tenants can view their delivered parcels.
- **Visitor Logs**: Record visitor name, host tenant, purpose of visit, entry timestamp, and exit timestamp.

### 8. UI/UX Modernization & Refactoring
- **Modernized Styling**: Clean, unified design tokens, improved dark/light card contrasts, smooth hover transitions, and badge indicators.
- **Responsive Layouts**: Fixed mobile breakpoints across Owner, Tenant, and Security Guard dashboard sidebars.
- **Codebase Clean-Up**:
  - Removed deprecated and unused legacy files (`NearbyAmenities.jsx`, `UpdateExistingJob.jsx`, `TenantInfo.jsx`, `MapShareService.js`).
  - Cleaned up redundant CSS files and consolidated utility rules into `index.css`.

### 9. Deployment & Backend Stability
- **Cloud Deployment**: Backend hosted on Render (`dewllsync-backend`), frontend built with Vite and deployed on Vercel.
- **Resilience Fixes**:
  - Fixed duplicate Mongoose schema indexes preventing startup crashes.
  - Resolved missing production dependencies in `package.json` (`axios`, `bcryptjs`).
  - Configured CORS and Local Network Access headers to resolve Chrome security warnings during API calls.

---

## 📁 Project Directory Structure

```text
Home-management-system/
├── package.json               # Root scripts and workspace dependencies
├── DEPLOYMENT_GUIDE.md        # Deployment instructions & Stripe redirect setup
├── README.md                  # Project overview and teammate documentation
│
├── Server/                    # Backend Express & MongoDB Application
│   ├── config/                # Cloudinary and database configuration
│   ├── controllers/           # Route handler controllers (auth, properties, stripe, etc.)
│   ├── middleware/            # JWT authentication and role validation
│   ├── models/                # Mongoose database models (User, Property, Payment, etc.)
│   ├── routes/                # Express API endpoints
│   ├── services/              # Cron jobs and helper utilities
│   ├── index.js               # Express application entry point
│   └── package.json           # Backend dependencies and scripts
│
└── vite-project/              # Frontend React 19 Application
    ├── src/
    │   ├── assets/            # Static assets and images
    │   ├── components/        # Shared components (Navbar, Footer, LocationPickerMap, etc.)
    │   ├── config/            # Frontend API URL configuration
    │   ├── Dashboard/         # Role-specific portals:
    │   │   ├── AdminDashboard/
    │   │   ├── OwnerProfile/
    │   │   ├── SecurityGuardDashboard/
    │   │   └── TenantDashboard/
    │   ├── HomePage/          # Landing page and search discovery
    │   ├── Login_and_Register/# Auth forms
    │   ├── App.jsx            # Main route declarations
    │   └── main.jsx           # React app mount
    ├── vite.config.js         # Vite bundler configuration
    └── package.json           # Frontend dependencies
```

---

## 💻 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)
- [Stripe Account](https://stripe.com/) (for payment testing keys)
- [Cloudinary Account](https://cloudinary.com/) (for property media uploads)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ridwan805/Home-management-system.git
   cd Home-management-system
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```
   *(Or run `npm install` inside both `/Server` and `/vite-project` folders separately).*

---

### Environment Variables (.env)

#### 1. Backend (`Server/.env`):
Create a `.env` file in the `Server/` directory:
```env
PORT=5000
MONGO_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/home_management?retryWrites=true&w=majority
JWT_SECRET=your_jwt_super_secret_key

# Frontend URLs for CORS and Redirects
FRONTEND_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173

# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary Keys
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### 2. Frontend (`vite-project/.env`):
Create a `.env` file in the `vite-project/` directory:
```env
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

### Running the App

1. **Start the Backend server:**
   ```bash
   cd Server
   npm run dev
   ```
   *Runs on `http://localhost:5000`*

2. **Start the Frontend development server:**
   ```bash
   cd ../vite-project
   npm run dev
   ```
   *Runs on `http://localhost:5173`*

3. **Verify Production Build:**
   ```bash
   cd vite-project
   npm run build
   ```

---

## 📝 Recent Commits & Updates Summary

- **`c20a9cf2`**: Refactored dashboard styling across Owner, Tenant, and Security Guard views; modernized `CreateListingForm` and `LocationPickerMap`; purged dead legacy files.
- **`5d921ddb`**: Fixed Mongoose geospatial indexing to sparse numeric coordinates to handle listings without fixed coordinates gracefully.
- **`b741d63a`**: Replaced external map dependencies with React-Leaflet & OpenStreetMap interactive location picker and viewer.
- **`8f423c04`**: Added standard `autoComplete` attributes across authentication forms.
- **`482b65ae`**: Enhanced backend deployment fallback logic on Render (`dewllsync-backend`).
- **`4537262b`**: Resolved Local Network Access browser warnings and hardened featured property endpoints against network latency.
- **`13cbb6e5`**: Fixed duplicate schema indexes in Mongoose models.
- **`0af27f7d` - `da0b96a4`**: Overhauled invoice generation, parcel logging, and Stripe payment redirection.

---

### 🤝 Contributing
When pushing new changes:
1. Ensure `npm run build` in `vite-project` passes with 0 errors.
2. Do not commit local `.env` or credential files.
3. Keep commit messages descriptive and concise.
