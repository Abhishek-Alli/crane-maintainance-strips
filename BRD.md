# Business Requirements Document (BRD)
## Crane Maintenance & HBM Checksheet Management System

---

| Field           | Details                                                        |
|-----------------|----------------------------------------------------------------|
| Document Title  | BRD – Crane Maintenance & HBM Checksheet Management System     |
| Prepared By     | Abhishek Alli (Developer / Maintainer)                         |
| Prepared For    | Director, Management                                           |
| Date            | 25 April 2026                                                  |
| Version         | 1.0                                                            |
| Status          | Final – Submitted for Review & Approval                        |

---

## 1. Business Problem / Need

The plant's crane maintenance and Hot Bar Mill (HBM) equipment health activities were entirely paper-based. Shift engineers and technicians filled physical checksheets for each machine every shift and submitted them manually. This created serious operational problems:

- **No real-time visibility** — Management could not see machine or crane status without physically collecting paper sheets from the shop floor.
- **Data loss & illegibility** — Paper records were misplaced, damaged, or unreadable; audit trails were impossible.
- **No alerts on failures** — A NOT OK status on a machine item was never escalated instantly; issues sat unreported until the next physical review.
- **Manual report effort** — Monthly maintenance tracking and report generation required hours of manual compilation.
- **No accountability** — There was no way to confirm which operator filled a checksheet, on which shift, or whether it was filled at all.
- **Scattered fabrication records** — Fabrication job tracking had no centralised system; updates were verbal or on whiteboards.

**Solution Delivered:** A web-based, role-controlled Crane Maintenance and HBM Checksheet Management System that digitises all checksheets, enforces shift-wise accountability, sends instant Telegram notifications on NOT OK items, and gives management a live dashboard and downloadable reports — all accessible from any browser on the plant network.

---

## 2. Project Objectives

1. Replace all paper-based HBM and crane maintenance checksheets with digital forms accessible from any plant browser.
2. Enforce role-based access so each user (HBM operator, crane maintenance staff, admin) sees only what is relevant to their work.
3. Automatically notify the maintenance team via Telegram whenever a NOT OK status or critical parameter is recorded.
4. Give management real-time visibility through a live dashboard showing crane schedules, inspection history, and HBM submission status.
5. Enable admin users to create/manage accounts, configure notification recipients, and access all modules.
6. Maintain a complete, tamper-evident digital audit trail for all inspections and checksheets.
7. Support report download (PDF / print view) for regulatory and internal reporting.

---

## 3. Project Scope

### In Scope

| Module                        | Features Included                                                                          |
|-------------------------------|--------------------------------------------------------------------------------------------|
| Crane Maintenance Module      | Crane inspection forms, dashboard, maintenance calendar, department-wise scheduling, reschedule, download/report |
| HBM Checksheet Module         | 15 shift-wise digital checksheet types — Form, View, History, Download for each            |
| Admin Module                  | User management, role assignment, Telegram recipient configuration, full system access      |
| Notification System           | Telegram alerts on NOT OK items and critical readings; resend button on any record          |
| Fabrication Report Module     | Fabrication job tracking and status reporting                                               |

### Out of Scope

| Excluded Item                                                         |
|-----------------------------------------------------------------------|
| SAP / ERP integration                                                 |
| Mobile native app (iOS / Android) — browser only                     |
| AI/ML-based automated preventive maintenance scheduling               |
| PLC / SCADA system integration                                        |
| Payroll, HR, or inventory management features                        |

---

## 4. Key Stakeholders

| Stakeholder           | Department          | Role                                         |
|-----------------------|---------------------|----------------------------------------------|
| Director              | Management          | Decision Maker / Final Approver              |
| Shift In-charge       | Production / HBM    | Primary User — HBM checksheet submission     |
| Crane Operator / Tech | Crane Maintenance   | Primary User — Crane inspection submission   |
| Maintenance Manager   | Maintenance         | Data Reviewer / Telegram alert recipient     |
| Admin User            | IT / Management     | System Administrator — full access           |
| Abhishek Alli         | IT                  | Developer & Maintainer                       |

---

## 5. Functional Requirements — By Module

---

### MODULE 1 — Crane Maintenance Module

**Module Purpose:**
Digitalise all crane inspection and maintenance activities. Operators fill shift-wise inspection forms for each crane; supervisors track completion on a maintenance calendar; management views live dashboard statistics and downloads reports.

**Module Features:**

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| CM-01 | Crane Inspection Form | Section-wise OK / NOT OK status entry for each crane. NOT OK items require mandatory Remark and Action Taken fields before submission. Telegram alert is fired automatically on any NOT OK item. | High |
| CM-02 | Inspection History | Date-filtered list of all submitted crane inspections. Each record shows crane name, date, submitted by, and alert status (has issues / all OK). | High |
| CM-03 | Inspection Detail View | Drill-down view of any inspection record — shows all sections and items with OK/NOT OK status, remarks, and action taken. Summary bar shows total items, OK count, and issue count. | High |
| CM-04 | Maintenance Calendar | Monthly visual calendar showing department-wise crane maintenance windows. Each day is colour-coded by assigned department. Displays pending, completed, missed, and rescheduled status per department. | High |
| CM-05 | Department Progress View | Per-department maintenance progress tracker — total cranes, completed, pending, missed, rescheduled counts for the selected month. | High |
| CM-06 | Crane Status List | List view of all cranes with current maintenance status within the active maintenance window. | High |
| CM-07 | Reschedule Panel | Admin/supervisor can reschedule a crane's maintenance to a different date within or outside the current window, with reason logging. | Medium |
| CM-08 | Download / Report | Print or download any inspection record for physical filing or regulatory submission. | Medium |
| CM-09 | Dashboard — Crane Stats | Weekly and monthly inspection counts, NOT OK alert summary, and recent submission feed visible on the main dashboard. | High |
| CM-10 | Telegram Alert on Inspection | When an inspection is submitted with one or more NOT OK items, an automatic Telegram message is sent to all subscribed recipients with crane name, items flagged, remarks, and action taken. | High |

**Crane Module — In Scope:**
- Inspection forms for all cranes across all departments and sheds
- Maintenance calendar with department rotation schedule
- Reschedule with reason tracking
- Dashboard stats and Telegram notifications

**Crane Module — Out of Scope:**
- Spare parts inventory linked to inspection findings
- Auto work-order generation from NOT OK items

---

### MODULE 2 — HBM Checksheet Module

**Module Purpose:**
Digitalise all Hot Bar Mill (HBM) shift-wise equipment health checksheets. Each checksheet type covers a specific machine or area of the rolling mill. Operators fill checksheets every shift; history is searchable; every submission is stored with full audit trail.

**Common Features Across All Checksheets:**
- **Form** — Structured block/section/item layout; OK / NOT OK toggle per item; NOT OK shows Remark + Action Taken fields; header captures date, time, shift, and filled-by.
- **History** — Date-filtered list of all submitted logs for that checksheet type.
- **View** — Full detail view of any individual submission.
- **Download** — Printable / downloadable version of any submission.
- **Telegram Notification** — Auto-alert on any NOT OK item or out-of-range parameter reading.
- **Resend Telegram** — Button on any record to manually resend the Telegram notification.

**Checksheet Types:**

| # | Checksheet Name | Machine / Area Covered | Priority |
|---|-----------------|------------------------|----------|
| HBM-01 | DC Motor Checksheet | Roughing Motor + Stand C1 to C15 DC motors — motor condition, bearing, temperature, airflow checks | High |
| HBM-02 | Rolling Stand Checksheet | Roughing Stand + C1–C14 rolling stands — mechanical condition, lubrication, guide alignment | High |
| HBM-03 | Mill Mechanical Checksheet | 5 sections: Shear, Pinch Roll, Looper, Quenching Box, Shifter — mechanical health per section | High |
| HBM-04 | Cooling Bed Checksheet | Cooling bed equipment health — chain, drive, alignment, motor condition | High |
| HBM-05 | Pump House Checksheet | Pump house equipment — pump health, valve condition, pressure readings | High |
| HBM-06 | Bar Bundle Area Checksheet | Bar bundle handling area — equipment and safety condition checks | High |
| HBM-07 | Before Rolling Checksheet | Pre-rolling start checklist — all critical checks before rolling begins each shift | High |
| HBM-08 | Pump Parameters Checksheet | Numerical pump parameter readings (pressure, flow, temperature) with range validation | High |
| HBM-09 | Water Parameters Checksheet | Water quality parameter readings — pH, turbidity, conductivity, temperature | High |
| HBM-10 | pH Maintenance Checksheet | pH dosing and maintenance log — chemical dosing records, pH levels across points | High |
| HBM-11 | Transformer Checksheet | Transformer health checks — oil level, temperature, connections, earthing, cooling fans | High |
| HBM-12 | Oil Level Checksheet | Oil level readings across all gearboxes and lubrication points in the mill | High |
| HBM-13 | DC Motor Airflow Checksheet | Airflow readings for DC motors — per-stand airflow values with acceptable range check | High |
| HBM-14 | Roughing GB Temperature Checksheet | Gearbox temperature readings for Roughing Stand — per-point temperature logging | High |
| HBM-15 | Future Checksheet Types | System is designed for easy addition of new checksheet types without codebase refactoring | Medium |

**HBM Module — In Scope:**
- All 14 active checksheet types (Form + View + History + Download)
- Shift-wise submission with filled-by audit trail
- Telegram notifications per checksheet type with individual subscription lists
- HBM Dashboard — central navigation panel for all checksheets

**HBM Module — Out of Scope:**
- Automated trend analysis or charts on parameter readings
- Predictive alerts based on historical readings

---

### MODULE 3 — Admin Module

**Module Purpose:**
Give the system administrator full control over user management, access permissions, notification configuration, and system-wide data access. Admin users can access both the Crane Maintenance Module and the HBM Checksheet Module in addition to admin-only features.

**Admin Module Features:**

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| AD-01 | Create User | Admin creates new user accounts with username, password, role (ADMIN / OPERATOR), and user type (CRANE_MAINTENANCE / HBM_CHECKSHEETS / ADMIN). New users can log in immediately. | High |
| AD-02 | Manage Users | View all users, activate or deactivate accounts, update user details. Deactivated users cannot log in. | High |
| AD-03 | Role & User Type Assignment | Assign user_type to control which module a user can access: CRANE_MAINTENANCE sees crane module only; HBM_CHECKSHEETS sees HBM module only; ADMIN sees everything. | High |
| AD-04 | HBM Module Permissions | Granular permission control — enable or disable specific HBM checksheet types for specific users. A user can be restricted to only certain checksheets within the HBM module. | High |
| AD-05 | Crane Module Permissions | Control which crane-related actions a user can perform within the crane maintenance module. | High |
| AD-06 | Telegram Recipient Management | Add, remove, or update Telegram chat IDs that receive notifications. Configure subscriptions per module or per checksheet type. | High |
| AD-07 | Telegram Settings Page | Full Telegram configuration UI — manage bot token, global recipients, and per-checksheet subscriber lists. | Medium |
| AD-08 | Full System Access | Admin can view, submit, and download any record across all modules — crane inspections and all HBM checksheets. | High |
| AD-09 | Inspection Config Management | Admin can configure inspection sections and items for crane inspection forms — add, edit, or deactivate inspection items. | Medium |
| AD-10 | Sub-Department Management | Create and manage sub-departments used in crane inspection routing and user assignment. | Medium |

**Admin Module — In Scope:**
- Full user lifecycle management (create, activate, deactivate)
- Granular module and checksheet-level permission control
- Telegram notification configuration (global and per-checksheet)
- Access to all records across all modules

**Admin Module — Out of Scope:**
- Multi-tenant or multi-plant admin (single plant only)
- SSO / Active Directory integration

---

## 6. Non-Functional Requirements

| Requirement  | Details                                                                                  |
|--------------|------------------------------------------------------------------------------------------|
| Performance  | Page load time < 3 seconds on plant LAN; form submission response < 2 seconds           |
| Security     | Role-based access control; bcrypt-hashed passwords; JWT session tokens; HTTPS on server  |
| Availability | 99% uptime during working hours (6 AM – 10 PM); hosted on plant server                  |
| Compatibility| Fully functional on Chrome, Firefox, and Edge (desktop); responsive layout               |
| Data Backup  | Daily automated PostgreSQL database backup on server                                     |
| Scalability  | New checksheet types added by following established module pattern — no core refactoring  |
| Audit Trail  | Every submission stores: filled_by (user FK), log_date, log_time, shift, created_at      |

---

## 7. Constraints

- **Budget:** In-house development; no third-party paid licenses or SaaS subscriptions.
- **Timeline:** System developed and deployed progressively alongside ongoing plant operations.
- **Resources:** Single developer (Abhishek Alli) building and maintaining the system.
- **Technology:** Stack is fixed — React + Node.js + PostgreSQL; no new frameworks to be introduced.
- **Network:** Accessible on plant intranet; internet access is limited on some shop-floor devices.

---

## 8. Technology Stack

| Layer          | Technology                                               |
|----------------|----------------------------------------------------------|
| Frontend       | React 18, Tailwind CSS, React Router DOM v6, Axios, date-fns |
| Backend        | Node.js, Express 4, pg (PostgreSQL connection pool)      |
| Database       | PostgreSQL (Supabase / plant server) — 30+ tables        |
| Authentication | JSON Web Tokens (JWT), bcrypt password hashing           |
| Notifications  | Telegram Bot API (node-telegram-bot-api)                 |
| Hosting        | Plant internal server + Supabase cloud database          |

---

## 9. Estimated Effort & Value

| Item                            | Estimated Effort   | Value / Benefit                                        |
|---------------------------------|--------------------|--------------------------------------------------------|
| Requirement Gathering           | 10 man-hours       | Clear scope; no rework from misunderstood requirements |
| Database Design (30+ tables)    | 15 man-hours       | Scalable schema supporting all modules and future growth |
| Crane Module Backend            | 25 man-hours       | Full REST API for cranes, inspections, calendar, schedule |
| HBM Module Backend              | 40 man-hours       | 14 checksheet controllers + notification integration   |
| Admin Module Backend            | 15 man-hours       | User management, permissions, Telegram config APIs     |
| Crane Module Frontend           | 35 man-hours       | Inspection form, calendar, dashboard, download         |
| HBM Module Frontend             | 60 man-hours       | 14 × (Form + View + History) = 42+ components         |
| Admin Module Frontend           | 15 man-hours       | User management UI, Telegram settings UI               |
| Integration & Testing           | 20 man-hours       | End-to-end verified data flow from form → DB → Telegram |
| Deployment                      | 5 man-hours        | Live system on plant network                           |
| Training                        | 4 hours            | Operators self-sufficient within one shift             |
| **Total**                       | **~244 man-hours** | Eliminates 100% paper checksheets; zero data loss      |

**Key Business Value:**
- Estimated **4–6 hours/day** of paper handling and manual data entry eliminated.
- Telegram alerts cut fault response time from hours to minutes.
- Management gets real-time visibility with zero additional effort.

---

## 10. Project Milestone & Timeline

| # | Milestone / Phase                   | Start Date | End Date   | Status          | Remarks                               |
|---|-------------------------------------|------------|------------|-----------------|---------------------------------------|
| 1 | Requirement Gathering               | 01/10/2025 | 07/10/2025 | ✅ Done         |                                       |
| 2 | BRD Preparation & Approval          | 08/10/2025 | 10/10/2025 | ✅ Done         |                                       |
| 3 | Database Design                     | 10/10/2025 | 15/10/2025 | ✅ Done         | 30+ migration files created           |
| 4 | Crane Module — Backend & Frontend   | 15/10/2025 | 30/11/2025 | ✅ Done         | Inspection, calendar, dashboard live  |
| 5 | HBM Module — Backend & Frontend     | 01/11/2025 | 30/03/2026 | ✅ Done         | All 14 checksheet types live          |
| 6 | Admin Module — Backend & Frontend   | 01/12/2025 | 15/12/2025 | ✅ Done         | User management + Telegram config     |
| 7 | Telegram Notification System        | 15/11/2025 | 20/11/2025 | ✅ Done         | Per-module subscription system live   |
| 8 | Integration & Testing               | 01/03/2026 | 30/03/2026 | ✅ Done         | All modules tested on plant network   |
| 9 | User Acceptance Testing (UAT)       | 01/04/2026 | 15/04/2026 | ✅ Done         | Sign-off by shift in-charges          |
| 10| Deployment / Go-Live                | 16/04/2026 | 20/04/2026 | ✅ Live         | Accessible on plant intranet          |
| 11| Post-Launch Support & Enhancements  | 21/04/2026 | Ongoing    | 🔄 In Progress  | Roughing GB Temp added 25/04/2026     |

---

## 11. Project Status Report

| Field                 | Details                                                      |
|-----------------------|--------------------------------------------------------------|
| Overall Completion    | ~95%                                                         |
| Current Phase         | Post-launch support and incremental checksheet additions     |
| Revised Deadline      | N/A — System is live; enhancements are ongoing              |

### Work Completed — Crane Maintenance Module
- ✅ Crane Inspection Form (section-wise OK / NOT OK with remarks and action taken)
- ✅ Inspection History with date filter and drill-down detail view
- ✅ Maintenance Calendar with department-wise colour-coded schedule
- ✅ Department Progress tracker (completed / pending / missed / rescheduled)
- ✅ Crane Status List within active maintenance window
- ✅ Reschedule Panel with reason logging
- ✅ Telegram alert on every NOT OK inspection submission
- ✅ Dashboard — weekly and monthly crane inspection stats

### Work Completed — HBM Checksheet Module
- ✅ HBM Dashboard — central navigation for all checksheets
- ✅ DC Motor Checksheet (Form, View, History, Download)
- ✅ Rolling Stand Checksheet (Form, View, History, Download)
- ✅ Mill Mechanical Checksheet (Form, View, History, Download)
- ✅ Cooling Bed Checksheet (Form, View, History, Download)
- ✅ Pump House Checksheet (Form, View, History, Download)
- ✅ Bar Bundle Area Checksheet (Form, View, History, Download)
- ✅ Before Rolling Checksheet (Form, View, History, Download)
- ✅ Pump Parameters Checksheet (Form, View, History, Download)
- ✅ Water Parameters Checksheet (Form, View, History, Download)
- ✅ pH Maintenance Checksheet (Form, View, History, Download)
- ✅ Transformer Checksheet (Form, View, History, Download)
- ✅ Oil Level Checksheet (Form, View, History, Download)
- ✅ DC Motor Airflow Checksheet (Form, View, History, Download)
- ✅ Roughing GB Temperature Checksheet (Form, View, History, Download) — Added 25/04/2026

### Work Completed — Admin Module
- ✅ Create User with role and user_type assignment
- ✅ Activate / Deactivate user accounts
- ✅ HBM module permission control per user (checksheet-level)
- ✅ Crane module permission control per user
- ✅ Telegram recipient management (add/remove/update)
- ✅ Per-checksheet Telegram subscription configuration
- ✅ Resend Telegram notification on any submitted record

### Work Remaining
- ⏳ Any additional checksheet types requested by operations team
- ⏳ Fine-tuning of Telegram alert thresholds for parameter checksheets
- ⏳ Long-term data archiving strategy

### Current Challenges / Blockers
- Server-side SSL certificate renewal for HTTPS needs to be scheduled.
- Some older shop-floor devices use outdated browsers — Chrome and Edge are confirmed working; Internet Explorer is not supported.

---

## 12. Attachments & References

| Attachment                   | Status    | Location / Path                                              |
|------------------------------|-----------|--------------------------------------------------------------|
| Full BRD Document            | Attached  | `BRD.md` — project root directory                           |
| Database Schema              | Available | `backend/migrations/000_complete_schema.sql` + 001 to 030   |
| Source Code Repository       | Internal  | `C:\Users\abhis\Desktop\HOSTED-WORKING WEBSITES\crane-maintainance` |
| Frontend Components          | Available | `frontend/src/components/` — 60+ React components           |
| Backend Controllers & Routes | Available | `backend/controllers/` and `backend/routes/`                 |
| Deployment Guide             | Available | On request from developer                                    |

---

*Document prepared by: Abhishek Alli | Date: 25 April 2026*
*Submitted to: Director, Management*
