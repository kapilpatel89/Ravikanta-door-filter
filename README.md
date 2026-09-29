# Ravikanta Doors - Production Order Slip Printing & Management System

> **A factory-grade web application for industrial door and frame order processing, multi-department classification, standardized A4 production slip printing, and production reporting.**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Complete Project Structure](#complete-project-structure)
- [System Architecture & Execution Modes](#system-architecture--execution-modes)
- [Core Features & Application Views](#core-features--application-views)
  - [1. Orders Overview Dashboard](#1-orders-overview-dashboard)
  - [2. 1-by-1 Item Categorizer Wizard](#2-1-by-1-item-categorizer-wizard)
  - [3. Department-wise A4 Order Slips (Print View)](#3-department-wise-a4-order-slips-print-view)
  - [4. Factory Production Report](#4-factory-production-report)
- [Slip Specifications & Print Design Standards](#slip-specifications--print-design-standards)
- [Data Storage & JSON Schemas](#data-storage--json-schemas)
- [Getting Started & Installation](#getting-started--installation)
  - [One-Click Launch (Silent Server + Browser)](#one-click-launch-silent-server--browser)
  - [Manual Command-Line Execution](#manual-command-line-execution)
  - [Standalone Offline Mode](#standalone-offline-mode)
- [Backup & Version History](#backup--version-history)
- [Company Information](#company-information)

---

## 🏭 Overview

**Ravikanta Doors** operates a specialized wood and composite door manufacturing facility. When factory orders arrive from dealers, contractors, and timber merchants, each order frequently contains a heterogeneous mix of doors (Flush Doors, Teak Doors, Laminate Doors, Membrane Doors, Veneer Doors) and composite structural elements (WPC Frames) across varying dimensions, thicknesses, and finishes.

This application solves three core factory challenges:
1. **Departmental Separation**: Factory floor machines and presses operate as independent departments (e.g., Laminate Door Press, Teak Polish, Frame Milling). Orders must be segmented item-by-item so each department receives only the work assigned to it.
2. **Cross-Department Coordination**: If a client's order has 10 Laminate Doors and 2 WPC Frames, the press operator needs to know that frames are being manufactured concurrently in another department for the same client.
3. **Standardized Industrial Print Slips**: Generating crisp, high-contrast, multi-page A4 slips with exact 7-column factory dimensions, bright black borders that never drop across page breaks, and zero bottom cutoffs.

---

## 📂 Complete Project Structure

```
Ravikanta Door filter/
│
├── index.html                   # Master single-page application (SPA) layout and view containers
├── api.php                      # Lightweight PHP backend REST API for filesystem persistence
├── start_app.vbs                # Silent launcher: starts PHP background server & opens browser
├── start_server.bat             # Batch script to run local PHP server on port 8000
├── stop_server.bat              # Batch script to cleanly terminate background PHP processes
├── Start App.lnk                # Windows desktop shortcut for one-click application start
├── README.md                    # Complete project documentation and architectural specifications
├── .gitignore                   # Git exclusion rules for OS and archive files
│
├── css/
│   └── styles.css               # Complete stylesheet: UI theme, responsive controls, & A4 print CSS
│
├── js/
│   ├── app.js                   # Main application controller: state, categorizer wizard, sorting, slips
│   └── default_data.js          # Offline fallback dataset and bootstrap seed data
│
├── data/
│   ├── orders.json              # Active imported production orders repository
│   ├── categories.json          # Master list of production departments / categories
│   ├── categorized_orders.json  # Current item-to-department assignment mappings
│   ├── company.json             # Factory branding, address, GSTIN, phone, and slip headers
│   └── sample_orders.json       # Reference factory orders dataset for quick testing and resets
│
└── working Version 1/           # Safe local snapshot backup of stable Version 1 codebase
    ├── index.html
    ├── api.php
    ├── start_app.vbs
    ├── start_server.bat
    ├── stop_server.bat
    ├── Start App.lnk
    ├── css/
    │   └── styles.css
    ├── js/
    │   ├── app.js
    │   └── default_data.js
    └── data/
        ├── orders.json
        ├── categories.json
        ├── categorized_orders.json
        ├── company.json
        └── sample_orders.json
```

### Detailed Component Roles

| File / Folder | Role & Functionality |
| :--- | :--- |
| `index.html` | Defines the four primary application views (`#view-orders`, `#view-wizard`, `#view-print`, `#view-production-report`), modals, navigation header, department filter pills, and date selectors. |
| `js/app.js` | Core business logic engine containing: state management (`state`), dual-mode API synchronization, 1-by-1 wizard progression, cross-department dependency tracking, trailing digit sorting (ASC/DESC), and A4 slip HTML generators. |
| `js/default_data.js` | Built-in offline data source attached to `window.DEFAULT_DATA`, ensuring the app operates seamlessly on standalone machines without a local web server. |
| `css/styles.css` | Comprehensive styling system featuring bright black text (`#000000`), custom scrollbars, modal overlays, print media query (`@media print`), page break constraints (`break-inside: avoid`), and exact table cell widths. |
| `api.php` | Provides endpoints (`GET`/`POST`) for `/api/orders`, `/api/categories`, `/api/categorized`, and `/api/company` using local JSON files with error-handling and CORS headers. |
| `start_app.vbs` | Visual Basic script executed silently (`WScript.Shell.Run ..., 0, False`) to prevent flashing black command prompts when starting the PHP server and launching the default browser. |
| `data/` | Persistent JSON storage directory utilized by `api.php` to maintain live order states across machine restarts. |
| `working Version 1/` | Unmodified reference backup of the initial operational deployment. |

---

## ⚙️ System Architecture & Execution Modes

The application features a **Dual-Mode Hybrid Architecture**:

```
+-----------------------------------------------------------------------------------+
|                                Browser Frontend                                   |
|                (index.html + css/styles.css + js/app.js)                          |
+----------------------------------------+------------------------------------------+
                                         |
               +-------------------------+-------------------------+
               | Protocol Detection: window.location.protocol     |
               |                                                   |
     [ http:// or https:// ]                             [ file:/// ]
               |                                                   |
               v                                                   v
+-------------------------------+               +-----------------------------------+
|        Mode 1: PHP API        |               |      Mode 2: Standalone Local     |
|   - api.php (Port 8000)       |               |   - window.localStorage           |
|   - Persists to /data/*.json  |               |   - Seed: js/default_data.js      |
|   - Multi-device ready        |               |   - Zero dependencies required    |
+-------------------------------+               +-----------------------------------+
```

1. **Server Mode (Default)**:
   - Run via `start_app.vbs` or `start_server.bat`.
   - Uses PHP's built-in web server (`php -S 0.0.0.0:8000`).
   - Requests read and write directly to `data/*.json`.
2. **Offline Standalone Mode (`file:///`)**:
   - Double-clicking `index.html` directly in any web browser activates offline mode.
   - Automatically falls back to `localStorage` and `js/default_data.js` without throwing network errors.

---

## 🚀 Core Features & Application Views

### 1. Orders Overview Dashboard
- **Live Metrics**: Displays total orders count, total door quantity, total frame count, and unique client parties.
- **Order Cards**: Displays each order's details, order number (e.g., `RKD-22092026-135`), party name, phone, dimensions, and individual door items with design numbers and thicknesses.
- **Import / Export**: Supports importing raw order JSON data, exporting current state, or resetting to default factory sample data.

### 2. 1-by-1 Item Categorizer Wizard
- **Item-by-Item Sequencing**: Cycles sequentially through every door and frame item across all imported orders.
- **Top Assigned Counters**: Real-time counter buttons at the top of the wizard showing active door counts per department (e.g., `LAMINATE DOOR (14)`, `WPC FRAME (4)`).
- **One-Click Classification**: Click a department button or press hotkeys to assign the current item and automatically advance to the next item.
- **Cross-Department Context**: Detects and displays siblings from the same order so operators have immediate visibility into split production.

### 3. Department-wise A4 Order Slips (Print View)
- **Reference Image Layout**: Built to match factory floor order slip specifications:
  - **Header**: Company name, address, GSTIN, phone, department badge, and dynamic date selector (defaulting to current date).
  - **Party & Order Header**: Spanning header row across each order group displaying client name and order number.
  - **7-Column Production Table**:
    1. `NO.` — Running line-item sequence number.
    2. `ORDER NO.` — Order identifier.
    3. `DESIGN` — Design number (e.g., `JR-23`, `AK-01`, or `—`).
    4. `SIZE` — Clean dimensions (e.g., `81X32`, `78X36`).
    5. `QTY` — Line item quantity with bold high-contrast emphasis.
    6. `FLUSH DOOR TYPE` — Full flush door specification (e.g., `GHANA TEAK DOOR`, `PINE FRAME -DC(INSIDE HW)`, `HARDWOOD`, `WPC FRAME`).
    7. `COUSTAM` — Custom notes, special instructions, and cross-department notes.
  - **Order Separation**: Visual spacing (`order-gap-row`) between completed orders and new client orders.
  - **Total Rows**: Circled quantity summary per department and grand total line items.
- **Department Quick Filters**: Filter slips by individual department (e.g., Laminate Door, Ghana Teak, WPC Frame) or view all departments in one continuous batch.
- **Print Controls**: Print active slip or batch print all department slips.

### 4. Factory Production Report
- **Consolidated Master List**: Gathers all orders and items across the factory into a unified production report.
- **ASC / DESC Last Digits Sorting**:
  - Sorts orders based exclusively on their trailing digits (e.g., `134`, `135`, `136`).
  - Supports ascending order (`0 → 9`) and descending order (`9 → 0`).
- **Trailing Digits Filter**:
  - Filter by specific trailing digits string (e.g., typing `35` matches order `135`).
  - Numerical range filter (e.g., from `130` to `140`).
- **Department Sub-Filter**: Filter production reports for a specific department or include all departments.
- **Zero Bottom Cutoffs**: Sized and padded specifically for A4 portrait paper with clean page-break rules.

---

## 🖨️ Slip Specifications & Print Design Standards

The print engine enforces strict industrial formatting in `css/styles.css`:

```css
@page {
  size: A4 portrait;
  margin: 6mm 6mm 6mm 6mm;
}
```

- **Bright Black Text (`#000000`)**: Eliminates faded greys for high visibility under factory lighting and thermal printing.
- **Preserved Borders Across Pages**:
  - Configured with `border-collapse: separate` and `border-spacing: 0`.
  - Every `<th>` and `<td>` has explicit `border-left` and `border-bottom` (with `border-right` on last column), preventing missing lines during multi-page print runs.
- **Orphan & Cutoff Prevention**:
  - `page-break-inside: avoid` and `break-inside: avoid` on all rows.
  - Header repetition using `display: table-header-group` on `<thead>`.

---

## 📊 Data Storage & JSON Schemas

### Sample Order Structure (`data/orders.json`)
```json
{
  "id": "RKD-22092026-135",
  "orderNumber": "RKD-22092026-135",
  "partyName": "JALARAM TIMBER ~ (H)",
  "partyMobile": "9900534151",
  "totalDoors": 10,
  "doors": [
    {
      "id": "door-1790079251585",
      "quantity": 10,
      "dimensions": "78\" × 36\"",
      "thickness": "30 MM",
      "designNo": "JR-23",
      "flushDoorType": "GHANA TEAK DOOR",
      "doorType": "-",
      "notes": ""
    }
  ],
  "wpcFrames": []
}
```

### Categorization State (`data/categorized_orders.json`)
```json
{
  "assignments": {
    "RKD-22092026-135_door_0": "cat_laminate",
    "RKD-22092026-136_frame_0": "cat_wpc"
  },
  "updatedAt": "2026-09-29T20:00:00.000Z"
}
```

---

## 💻 Getting Started & Installation

### Prerequisites
- **Web Browser**: Google Chrome, Microsoft Edge, or Mozilla Firefox.
- **PHP**: (Optional, recommended for persistent multi-device server mode) PHP 7.4+ or 8.x.

### Execution Options

#### Option A: One-Click Launch (Recommended)
1. Double-click **`Start App.lnk`** on your desktop, or run **`start_app.vbs`**.
2. A background PHP server starts silently without CMD windows, and the application opens automatically at `http://localhost:8000`.
3. To stop the server when done, double-click **`stop_server.bat`**.

#### Option B: Manual Command-Line Execution
```powershell
# In PowerShell or Command Prompt
cd "e:\Ravikanta Door filter"
php -S 0.0.0.0:8000
```
Open `http://localhost:8000` in your web browser.

#### Option C: Standalone Offline Mode (Zero Setup)
Double-click **`index.html`** directly in File Explorer. The application runs immediately in offline mode using `localStorage`.

---

## 🛡️ Backup & Version History

- **Working Version 1**: Located in `working Version 1/`. This directory contains an untouched local backup of the first complete production version.

---

## 🏢 Company Information

- **Company**: Ravikanta Doors
- **Tagline**: Quality Door Manufacturing
- **Factory Address**: #76 Kattamnallur Village, Bidarahalli Hobli, Bangalore East Taluk - 560049
- **Contact**: +91 8884782543
- **GSTIN**: 29AADFO4662K1ZU
