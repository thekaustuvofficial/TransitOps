<p align="center">
  <img src="./assets/logo.png" alt="TransitOps Logo" width="220"/>
</p>

# TransitOps: Smart Transport Operations Platform

*An end-to-end transport operations platform built to digitize and streamline fleet management, routing, and expense tracking.*

---

## Workspace Structure
```
TransitOps/
├── frontend/             <-- React + Vite + Tailwind CSS v4 + TypeScript lives here
│   ├── src/              <-- Application code, types, state-machine DB, components, pages
│   ├── public/           <-- Static assets
│   ├── package.json      <-- Dependencies (lucide-react, recharts, tailwind, etc.)
│   └── vite.config.ts    <-- Vite build setup
├── backend/              <-- Docker Compose & Odoo plugins (currently empty/stub)
│   └── .gitkeep
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
*   **CSV Data Export:** Client-side CSV download of complete vehicle ROI ledger.
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

**Backend & Database (Supabase + PostgreSQL)**

* **Authentication:** Manages secure user logins and issues role-based access tokens.
* **Relational Database:** The central PostgreSQL hub storing all structured data for Vehicles, Drivers, Trips, Maintenance, and Expenses.
* **Row Level Security (RLS):** Acts as a strict backend firewall, blocking unauthorized data edits based on user roles, even if frontend restrictions are bypassed.
* **Real-Time Updates:** Uses WebSockets to stream live data changes, ensuring the dashboard, activity feeds, and fleet statuses update instantly without refreshing the page.

</details>

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
*Developed for modern logistics.*