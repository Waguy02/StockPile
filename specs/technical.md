# Technical Specifications - StockPILE

## 1. Executive Summary
This document outlines the technical implementation strategy for StockPILE, a cross-platform inventory and sales management system. The solution will leverage a **Single Codebase** approach to deploy to Web, Desktop, and Mobile environments, ensuring consistency and maintainability.

## 2. Technical Architecture

### 2.1 High-Level Architecture
- **Architecture Pattern**: Client-Server with "Local-First" data caching.
- **Frontend Core**: Single Page Application (SPA) built with React.
- **Database & Backend**: Serverless architecture using Supabase (PostgreSQL + Edge Functions).
- **Distribution**:
  - **Desktop**: Electron (wrapping the SPA).
  - **Mobile**: Capacitor (wrapping the SPA).

```mermaid
graph TD
    User[User] --> ClientApp[StockPILE Client App]
    subgraph "Client Side (React)"
        ClientApp --> UI[UI Components (shadcn/ui)]
        ClientApp --> State[State Management (TanStack Query)]
        State --> Cache[Local Persistence (AsyncStorage/IndexedDB)]
        State --> API[API Client]
    end
    
    subgraph "Wrappers"
        Desktop[Electron (Desktop)]
        Mobile[Capacitor (iOS/Android)]
    end
    
    subgraph "Backend (Supabase)"
        API --> Functions[Edge Functions (Hono)]
        Functions --> DB[(PostgreSQL Database)]
        API --> Auth[Supabase Auth]
    end

    ClientApp --- Desktop
    ClientApp --- Mobile
```

## 3. Technology Stack Recommendation

### 3.1 Frontend (Core)
*Rationale: Leverage existing design artifacts and ensure strict type safety.*
- **Framework**: **React 18+**
- **Language**: **TypeScript** (Strict mode enabled)
- **Build Tool**: **Vite** (Fast HMR and efficient bundling)
- **Styling**: **Tailwind CSS** (Utility-first CSS)
- **Component Library**: **shadcn/ui** (Radix UI based, headless, highly customizable, already in design).
- **Icons**: Lucide React.

### 3.2 State Management & Caching
*Rationale: The requirement for "local cache" best served by a dedicated query manager.*
- **Server State**: **TanStack Query (React Query v5)**.
  - Handles fetching, caching, synchronizing and updating server state.
  - **Persistence**: `persistQueryClient` with `idb-keyval` (IndexedDB) for robust offline-capable caching.
- **Client State**: **Zustand** (Lightweight global state for UI preferences, session data).

### 3.3 Desktop Platform (Embedded Webapp)
*Rationale: Maturity and hardware access.*
- **Technology**: **Electron**.
- **Reasoning**:
  - Full access to file system and Node.js APIs (crucial for future integrations like thermal printers, barcode scanners).
  - Robust auto-update mechanisms (electron-updater).
  - Battle-tested for "Embedded Webapps".

### 3.4 Mobile Platform
*Rationale: Code reuse.*
- **Technology**: **Capacitor** (by Ionic).
- **Reasoning**:
  - Allows wrapping the existing React web application into a native binary.
  - Access to native device features (Camera for barcode scanning, Filesystem).
  - Shares the exact same business logic and UI code as the Desktop/Web versions.

### 3.5 Backend Service
*Rationale: Rapid development and scalable relational data.*
- **Platform**: **Supabase**.
- **Database**: PostgreSQL.
- **API Logic**: Supabase Edge Functions (Deno/Node) running **Hono** framework (as seen in design prototypes).
- **Authentication**: Supabase Auth (Email/Password, Social logins).

---

## 4. Implementation Details

### 4.1 Database Schema (Proposed)
Based on `functional.md`, the SQL schema should support these core entities:

*   **product_categories**: `id, name, slug, parent_id`
*   **products**: `id, category_id, name, description, sku, min_stock_level, image_url`
*   **providers**: `id, name, contact_info, address`
*   **product_batches** (Inventory): `id, product_id, provider_id, quantity, cost_price, entry_date, batch_number`
*   **customers**: `id, name, contact_details`
*   **sales**: `id, customer_id, manager_id, total_amount, status (pending/paid), created_at`
*   **sale_items**: `id, sale_id, batch_id, quantity, unit_price`
*   **transactions** (Finance): `id, type (income/expense), amount, reference_id (sale_id/po_id), manager_id`

### 4.2 Caching Strategy (The "Local Cache")
To fulfill the requirement of maintaining a local cache:

1.  **Stale-While-Revalidate**: The app will display cached data immediately upon load while fetching fresh data in the background.
2.  **Persistence Layer**: All API responses (Inventory, History, Partners) will be persisted to **IndexedDB** on Desktop/Web and **Capacitor Storage/SQLite** on Mobile.
3.  **Optimistic Updates**: UI will update immediately upon user action (e.g., "Add to Cart", "Complete Sale"), queuing the API request. If the network is unavailable, requests are queued (using a distinct offline mutation queue, e.g., TanStack Query's offline mutation features).

### 4.3 Mobile & Desktop Specifics
- **Responsive Design**: The usage of Tailwind CSS ensures the UI adapts to Phone, Tablet, and Desktop screens fluidly.
- **Mobile Navigation**: Use a Bottom Navigation Bar on Mobile vs Sidebar on Desktop (handled via CSS media queries or `react-responsive`).

## 5. Development Phases

1.  **Phase 1: Foundation**: Setup Monorepo or robust Git structure. Initialize Supabase project. Define SQL Schema.
2.  **Phase 2: Core Web/Desktop**: Implement Inventory and Purchase modules. Wrap with Electron.
3.  **Phase 3: Sales & Mobile**: Implement Sales interface (touch compliant). Wrap with Capacitor.
4.  **Phase 4: Finance & Sync**: Implement Finance dashboard. Harden offline caching and sync logic.

## 6. Security Toolkit
- **Row Level Security (RLS)**: Strictly enabled on Supabase.
  - *Managers* can read/write inventory.
  - *Admins* can view Finance.
- **Environment Variables**: API Keys stored securely in Electron standard storage and Capacitor Secure Storage.
