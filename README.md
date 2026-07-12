# TransitOps: Smart Transport Operations Platform

*An end-to-end transport operations platform built to digitize and streamline fleet management, routing, and expense tracking.*

---

## Overview
Many logistics companies still rely on spreadsheets and manual logbooks, leading to scheduling conflicts, missed maintenance, and poor operational visibility[cite: 2]. **TransitOps** is a centralized platform designed to manage the complete lifecycle of transport operations—from vehicle registration and driver management to dispatching, maintenance, fuel logging, and analytics[cite: 2]. 

**Hackathon Note:** This minimum viable product (MVP) was conceptualized and built within an 8-hour development window[cite: 2].

## User Roles
TransitOps supports Role-Based Access Control (RBAC) tailored to standard fleet operations[cite: 2]:
*   **Fleet Manager:** Oversees fleet assets, maintenance, vehicle lifecycles, and overall efficiency[cite: 2].
*   **Driver (Dispatcher):** Creates trips, assigns vehicles and drivers, and monitors active deliveries[cite: 2].
*   **Safety Officer:** Ensures driver compliance, tracks license validities, and monitors safety scores[cite: 2].
*   **Financial Analyst:** Reviews operational expenses, fuel consumption, maintenance costs, and profitability[cite: 2].

## Key Features
*   **Secure Authentication:** Role-Based Access Control (RBAC) ensuring data privacy and system integrity[cite: 2].
*   **Live Dashboard:** Key Performance Indicators (KPIs) for Active Vehicles, Fleet Utilization (%), Drivers On Duty, and trip statuses[cite: 2].
*   **Vehicle Registry:** Master list of vehicles tracking capacity, odometer readings, and lifecycle status (Available, On Trip, In Shop, Retired)[cite: 2].
*   **Driver Management:** Profiles with license tracking, expiry monitoring, safety scores, and real-time availability[cite: 2].
*   **Trip Management:** End-to-end trip lifecycle tracking (Draft → Dispatched → Completed/Cancelled)[cite: 2].
*   **Maintenance Logs:** Automated status handling[cite: 2]. Sending a vehicle to the shop instantly removes it from the dispatch pool[cite: 2].
*   **Fuel & Expense Tracking:** Log volume, cost, tolls, and maintenance to compute total operational costs per vehicle[cite: 2].
*   **Reports & Analytics:** Insights on Fuel Efficiency, Fleet Utilization, and Vehicle Return on Investment (ROI)[cite: 2].

## Smart Business Rules (Automated)
To prevent operational errors, TransitOps enforces strict business logic:
1.  **Unique Identification:** Every vehicle registration number is strictly unique[cite: 2].
2.  **Dispatch Validation:** Cargo weight cannot exceed the assigned vehicle's maximum load capacity[cite: 2].
3.  **Availability Checks:** 
    *   "Retired" or "In Shop" vehicles cannot be dispatched[cite: 2].
    *   Drivers with expired licenses or a "Suspended" status cannot be assigned to trips[cite: 2].
    *   Vehicles or drivers currently "On Trip" are locked from new assignments[cite: 2].
4.  **Automated Status Transitions:**
    *   Dispatching a trip → Vehicle and Driver become `On Trip`[cite: 2].
    *   Completing or Canceling a trip → Vehicle and Driver return to `Available`[cite: 2].
    *   Opening a maintenance log → Vehicle becomes `In Shop`[cite: 2].

## Example Workflow
1.  **Registration:** Register a vehicle (e.g., *Van-05*, 500kg capacity) and register a driver (e.g., *Alex*)[cite: 2].
2.  **Trip Creation:** Create a trip requiring 450kg of cargo space[cite: 2].
3.  **System Validation:** The system confirms 450kg ≤ 500kg and verifies the driver's license is active[cite: 2].
4.  **Dispatch:** Both the vehicle and driver are automatically marked as `On Trip`[cite: 2].
5.  **Completion:** Enter final odometer readings and fuel used; statuses return to `Available`[cite: 2].
6.  **Maintenance:** Log an oil change; the vehicle status updates to `In Shop` and is hidden from dispatchers[cite: 2]. Operational costs are updated dynamically[cite: 2].

## Design & Mockups
*   **Architecture Mockup:** [View Excalidraw Concept](https://link.excalidraw.com/I/65VNwvy7c4X/1FHGDNgD2td)[cite: 2]

## Future Roadmap
- [ ] Interactive Charts & Visual Analytics[cite: 2]
- [ ] PDF Export for Trip & Expense Reports[cite: 2]
- [ ] Automated Email Reminders for Expiring Licenses[cite: 2]
- [ ] Vehicle Document Management[cite: 2]
- [ ] Dark Mode User Interface[cite: 2]

---
*Developed for modern logistics.*
