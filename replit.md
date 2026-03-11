# AluminumManager - Inventory and Sales Management System

## Overview
AluminumManager is a comprehensive web application designed for aluminum profile businesses. Its primary purpose is to streamline inventory, sales, invoicing, and client relationship management. Key capabilities include tracking products, generating invoices and quotations, managing client data, and providing business performance analysis through reports and dashboards. The project aims to offer a modern, efficient solution to enhance operational control and decision-making for businesses in the aluminum sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, utilizing Wouter for routing and TanStack Query for server state management and caching. The UI is developed with a custom component library based on Radix UI primitives and styled using Tailwind CSS. Form handling is managed by React Hook Form with Zod validation, and Vite is used as the build tool for fast development and optimized production builds.

### Backend Architecture
The backend is powered by Node.js with the Express.js framework, written entirely in TypeScript. It features RESTful API endpoints with structured error handling and uses Passport.js for authentication with a local strategy and session-based authentication. The system supports CSV/Excel import/export operations.

### Database Layer
The application uses PostgreSQL, hosted on Neon Database for serverless hosting. Drizzle ORM is employed for type-safe database operations and migrations via Drizzle Kit. Session storage is managed using a PostgreSQL-backed session store with `connect-pg-simple`.

### Core Business Entities
Key entities include Users (for authentication and access control), Stores (for multi-location support), Clients (CRM), Products (inventory and pricing), Product Batches (detailed inventory tracking), Invoices/Quotations (sales document generation), Transactions (financial tracking), and Categories (product classification).

### Key Design Patterns
The architecture emphasizes shared TypeScript types and Zod schemas between frontend and backend for consistency. It incorporates database transactions for data integrity, query optimization with proper indexing, and end-to-end type safety. A reusable component architecture ensures consistent UI design.

**Multi-Branch (Multi-Store) Architecture**: A React Context (`StoreContext` at `client/src/lib/store-context.tsx`) provides `currentStoreId` globally. Staff users are automatically locked to their assigned store on login. Owner users can switch branches via a sidebar dropdown. All pages, components, forms, and API calls dynamically use `currentStoreId` — no hardcoded store IDs remain in the frontend codebase.

### Security Features
Security measures include SHA-256 password hashing, secure session management, comprehensive input validation using Zod schemas, and proper CORS protection.

### UI/UX Decisions
The system incorporates features like dynamic form adjustments for pricing (e.g., return forms with flexible pricing), detailed dashboards for product and sales overview, and integrated mapping functionalities for delivery planning (Google Maps route generation). UI elements are designed for clarity, such as adjusted column widths in forms for better readability and consolidated settings pages for improved navigation. Print templates and PDF outputs are standardized, supporting features like alternate delivery addresses and tax rate configurations (e.g., Faktur Pajak).

### Technical Implementations
Features include comprehensive delivery note management with status tracking, batch delivery planning with categorized item grouping, and enhanced purchase order functionalities such as prepaid PO tracking with payment management and duplicate item warnings. Global tax rate settings are implemented with specific regional tax support.

### Feature Specifications
- **Inventory & Sales**: Tracking products, managing batches, generating invoices and quotations with PDF export.
- **Client Management**: Maintaining client details, including alternate delivery addresses.
- **Purchase Orders**: Prepaid PO functionality with payment tracking, pending PO overview, and item-based views.
- **Delivery Management**: Delivery note lifecycle management, status tracking, batch delivery planning, and Google Maps route generation.
- **Financials**: Invoice payment tracking, integrated tax rate management (e.g., Faktur Pajak support), and transaction management.
- **Reporting**: Dashboards and detailed reports for business performance analysis.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database query builder.

### UI Libraries
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Recharts**: Data visualization library.

### Development Tools
- **Vite**: Build tool.
- **ESBuild**: Fast bundling.
- **PostCSS**: CSS processing.

### File Processing
- **jsPDF**: PDF generation.
- **XLSX**: Excel file processing.
- **CSV Parser/Writer**: CSV file handling.

### Form and Validation
- **React Hook Form**: Form handling.
- **Zod**: Schema validation.
- **Hookform Resolvers**: Zod integration for React Hook Form.

### Utilities
- **date-fns**: Date manipulation utilities.
- **class-variance-authority**: Type-safe CSS class generation.
- **clsx**: Conditional CSS class utility.

## Critical Business Logic — Stock Management

### Delivery Note Stock Flow (post-fix)
Stock is ONLY deducted via `allocateStockOnDelivery` when delivery note status changes to `delivered`. Creating a delivery note (pending status) does NOT deduct stock. Cancelling a pending delivery note requires no stock restoration. Cancelling a delivered note calls `reverseDeliveryNoteStock` which only reverses if `profit != null` (set by allocateStockOnDelivery).

### Stock Reservation
`reserveStockForInvoice` is called when invoice status becomes `paid` for delivery/combination type. `deductStockForSelfPickup` is called for self_pickup. `getProductReservedQuantity` SQL query excludes cancelled delivery notes from the "already delivered" count to prevent over-counting available stock.

### Return Stock Flow (post-fix)
`createBatchesForReturn` creates a new `productBatches` row with:
- `batchNumber` = return number (e.g., `RTN-2603-0001`)
- `capitalCost` = capitalCost from most recent existing batch for the product
- `initialQuantity` / `remainingQuantity` = quantity returned to stock
Called when return status changes to `completed`.

### Key Bugs Fixed (March 2026)
1. **Double stock deduction**: Removed duplicate FIFO block from `createDeliveryNote` — stock now only deducted via `allocateStockOnDelivery`
2. **Return batch field names**: Fixed `createBatchesForReturn` to use correct schema fields (`batchNumber`, `capitalCost`, `initialQuantity` instead of `batchReference`, `cost`, `quantity`)
3. **Return cost lookup**: Fixed to use `capitalCost` from existing batches instead of non-existent `baseCost`/`cost` fields
4. **Reserved quantity SQL**: Added filter to exclude cancelled delivery notes from delivered quantity subqueries in `getProductReservedQuantity` and `getProductReservations`
5. **"Failed to fetch" on invoice create/edit**: Root cause was `process.exit(1)` in `server/vite.ts` Vite customLogger.error. When Vite triggered its error logger (for any reason during dev), the entire Node.js process would silently exit, dropping all in-flight POST/PUT requests. Browser received "Failed to fetch". Fixed by removing `process.exit(1)` from the Vite custom logger. Also removed `throw err` from the global Express error handler in `server/index.ts` to prevent Express from crashing on errors.