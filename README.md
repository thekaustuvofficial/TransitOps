<p align="center">
  <img src="./assets/logo.png" alt="TransitOps Logo" width="800"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/Express-Backend-000000?logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/PostgreSQL-Schema-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"/>
</p>

# TransitOps: Smart Transport Operations Platform

*An end-to-end transport operations platform built to digitize and streamline fleet management, routing, and expense tracking.*

---

## Table of Contents
- [Workspace Structure](#workspace-structure)
- [Overview](#overview)
- [User Roles (RBAC)](#user-roles-rbac)
- [Smart Business Rules (Automated)](#smart-business-rules-automated)
- [Key Features Implemented](#key-features-implemented)
- [System Architecture](#system-architecture)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [License](#license)

---

## Workspace Structure
```
TransitOps/
├── frontend/             <-- React + Vite + Tailwind CSS v4 + TypeScript lives here
│   ├── src/              <-- Application code, types, state-machine DB, components, pages
│   ├── public/           <-- Static assets
│   ├── package.json      <-- Dependencies (lucide-react, recharts, tailwind, etc.)
│   └── vite.config.ts    <-- Vite build setup
├── backend/              <-- Express JSON API, seeded data, Odoo bundle, and Postgres schema draft
│   ├── db.json          <-- Local demo database / API snapshot
│   ├── server.js        <-- Express seed server used by the frontend
│   └── schema.sql       <-- Postgres enums, constraints, and FK draft
└── README.md             <-- Master documentation
```

---

## Overview
Many logistics companies still rely on spreadsheets and manual logbooks, leading to scheduling conflicts, missed maintenance, and poor operational visibility. **TransitOps** is a centralized platform designed to manage the complete lifecycle of transport operations—from vehicle registration and driver management to dispatching, maintenance, fuel logging, and analytics.

**Hackathon Note:** This system was conceptualized, built, and verified within an 8-hour development window as a premium operations portal.

---

## User Roles (RBAC)
TransitOps implements strict **Role-Based Access Control (RBAC)**. Sidebars and screen views hide or show based on permissions:
*   **Fleet Manager:** Full access to Fleet Registry and Maintenance logs. Restricted from direct Dispatching and Fuel expenses.
*   **Dispatcher:** Full access to Trip Dispatcher. View-only access to Fleet and Maintenance. Restricted from other logs.
*   **Safety Officer:** Full access to Drivers registry. View-only access to Trips. Restricted from editing fleet/finance records.
*   **Financial Analyst:** Full access to Fuel & Expenses. View-only access to Fleet, Maintenance, and Reports. Restricted from dispatch/driver registries.

*Demo Override:* A header dropdown allows developers and judges to change active roles on-the-fly to test RBAC and RLS-like enforcement live.

---

## Smart Business Rules (Automated)
To prevent operational mistakes, TransitOps implements a state machine governed by 9 non-negotiable rules:
1.  **Unique Reg No:** Every vehicle registration plate is strictly unique.
2.  **Dispatch Status Restriction:** "Retired" or "In Shop" vehicles cannot be dispatched.
3.  **Driver Compliance:** Drivers with expired licenses or "Suspended" status cannot be assigned.
4.  **Single Active Trip:** Vehicles or drivers already active "On Trip" are locked from new dispatches.
5.  **Load Limits:** Cargo weight cannot exceed the assigned vehicle's maximum capacity (checked dynamically).
6.  **Dispatch State Shift:** Dispatching a trip auto-flips both driver & vehicle status to `On Trip`.
7.  **Completed State Shift:** Completing a trip updates odometer mileage, logs fuel, and resets driver/vehicle status to `Available`.
8.  **Cancellation Restoration:** Cancelling a dispatched trip restores the driver and vehicle to `Available`.
9.  **Maintenance Isolation:** Logging vehicle maintenance sets the vehicle status to `In Shop`. Closing the service restores it to `Available` (unless Retired).

---

## Key Features Implemented
*   **Live Dashboard & KPIs:** Fleet Utilization %, Active/Available Vehicles, In Maintenance count, Active/Pending Trips, and Drivers On Duty.
*   **Smart Dispatch Assist:** Allocation forms auto-filter dropdowns to show only eligible vehicles (matching capacity limits) and active drivers. Includes validation block banners.
*   **Live Activity Feed:** Real-time audit log widget showing system transitions in real time.
*   **License Expiry Countdowns:** Badges showing remaining valid days for driver licenses (Red for Expired/Critical (<30d), Amber (<90d)).
*   **Maintenance Due Indicators:** Flagging vehicles with warning badges if they exceed 10,000 km since their last service.
*   **Cost Anomaly Highlights:** Flags vehicles spending 25% above the fleet average cost.
*   **Compliance & Proximity Fields:** Vehicles and drivers track insurance expiry and current location for dispatch matching and safety review.
*   **CSV Data Export:** Client-side CSV download of vehicle ROI ledger.
*   **Pre-seeded Demo Dataset:** Coherent dataset utilizing Gujarat registrations, INR currency, and regional route paths (Ahmedabad/Gandhinagar).
*   **Vibrant Dark UI:** Modern theme utilizing curated harmonious palettes (green, amber, blue, red) and micro-animations.

---

## System Architecture

<p align="center">
  <img src="./assets/system-architecture.png" alt="System Architecture Diagram" width="800"/>
</p>

<details>
<summary><strong>TransitOps System Architecture Overview</strong></summary>

**Frontend Client (React + Vite + TypeScript + Tailwind v4)**

* **User Interface:** A fast, responsive, dark-themed portal tailored for logistics operations.
* **Role-Based Access Control (RBAC):** Automatically hides or shows specific modules based on the user's role (e.g., Financial Analyst vs. Dispatcher).
* **Client-Side Validation:** Instantly checks business rules (like vehicle load limits and driver availability) in the browser before sending data to the server.

**Backend & Database (Supabase + PostgreSQL Draft)**

* **Authentication:** Manages secure user logins and issues role-based access tokens.
* **Relational Database:** The schema draft stores Vehicles, Drivers, Trips, Maintenance, Fuel, Expenses, and Activity.
* **Strict Constraints:** Unique plate/license constraints, enum-based statuses, and safe `SET NULL` trip foreign keys are defined in the schema draft.
* **Operational Scope:** Hackathon reporting keeps operational cost to **Fuel + Maintenance** only; trip expenses remain a separate ledger.

</details>

---

## Screenshots

<p align="center">
  <img src="./assets/screenshot-dashboard.png" alt="Dashboard Screenshot" width="800"/>
  <br/>
  <em>Live Dashboard & KPIs</em>
</p>

<p align="center">
  <img src="./assets/screenshot-dispatch.png" alt="Dispatch Screenshot" width="800"/>
  <br/>
  <em>Smart Dispatch Assist</em>
</p>

<p align="center">
  <img src="./assets/screenshot-fleet.png" alt="Fleet Registry Screenshot" width="800"/>
  <br/>
  <em>Fleet Registry & Maintenance Tracking</em>
</p>

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Run
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

---

## License
This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

---
*Developed for modern logistics.*