# AluminumManager - Inventory and Sales Management System

## Overview

AluminumManager is a comprehensive web application designed for aluminum profile businesses to manage inventory, sales, invoicing, and client relationships. The system provides a modern interface for tracking products, generating invoices and quotations, managing client data, and analyzing business performance through detailed reports and dashboards.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### January 26, 2026 - Delivery Planning Enhancements and UI Improvements
- **Feature**: Google Maps Route Generator for Delivery Planning
  - "Generate Route" button added next to print button on delivery planning page
  - Creates multi-point route link from selected delivery addresses
  - Popup dialog shows generated link with:
    - Copy to clipboard button
    - "Buka di Google Maps" button to open in new tab
  - Supports both coordinate-based links and address-based links
  - Deduplicates destinations when multiple delivery notes go to same address
- **UI**: Invoice form column width adjustments
  - Product column: Widened to 40% with min-width 220px for longer product names
  - Unit column: Narrowed from 100px to 65px
  - Total column: Widened from 120px to 150px with whitespace-nowrap
  - Column now shows Total (subtotal + tax) instead of just Subtotal

### January 26, 2026 - Performance Optimization
- **Performance**: Optimized delivery notes list query
  - Replaced N+1 query pattern with single JOIN query in `getDeliveryNotesWithDetails`
  - Previously made 3+ database calls per delivery note (invoice, client, item count)
  - Now uses single query with JOINs and subquery for item count
  - Significantly faster page load for Delivery Notes list
- **Verified**: All database indexes already in place for frequently queried columns
- **Verified**: TanStack Query cache already optimized with `staleTime: Infinity`

### January 25, 2026 - Delivery Notes Management and Planning
- **Feature**: Implemented comprehensive delivery note management with status tracking
  - New "Surat Jalan" menu in sidebar navigation
  - Delivery notes list page showing pending/delivered/cancelled counts
  - Search and filter by status (pending, delivered, cancelled)
  - Mark single or multiple delivery notes as "done" (delivered)
  - Display client info, delivery address (including alternate delivery address)
- **Feature**: Delivery Planning List Generator
  - Select pending delivery notes for batch delivery planning
  - Preview grouped by client and destination address
  - Items grouped by category (prioritizing Glass and ACP categories)
  - Print A4 format delivery planning list with:
    - Client list with addresses
    - Categorized items per client
    - Checkboxes for tracking
    - Category summary totals
- **API Updates**: 
  - GET /api/stores/:storeId/delivery-notes - List all delivery notes with status filter
  - PATCH /api/delivery-notes/:id/status - Update delivery note status

### January 25, 2026 - Alternate Delivery Address Support
- **Feature**: Added alternate delivery address fields to invoices
  - deliveryAddress and deliveryAddressLink fields for optional different delivery locations
  - Shown in invoice form, detail view, print templates, and PDF output
  - Google Maps link support for delivery addresses

### January 22, 2026 - Global Tax Rate and Faktur Pajak Support
- **Feature**: Implemented global tax rate settings with Indonesian faktur pajak support
  - Added `defaultTaxRate` field to users table (default 11% for Indonesia's PPN)
  - Settings General page now includes tax rate configuration
  - Added `useFakturPajak` toggle to Invoice, Quotation, and Purchase Order forms
  - When Faktur Pajak is ON: Prices are displayed split into DPP (Dasar Pengenaan Pajak) + PPN
  - When Faktur Pajak is OFF: Full price shown without tax separation
  - Tax-inclusive pricing model: stored prices include tax, split only for display when needed
  - Tax calculation formula: DPP = fullPrice / (1 + taxRate/100)
  - Updated PDF generator and print templates to show DPP + PPN when faktur pajak is active
- **Schema Updates**: Added `useFakturPajak` and `taxRate` fields to invoices, quotations, and purchase orders tables

### December 12, 2025 - UI Simplification
- **Navigation**: Moved Categories from sidebar into Settings page as a new "Categories" tab
  - Removed standalone Categories page and route
  - Categories management now accessible via Settings > Categories tab
  - Full CRUD functionality preserved (add, edit, delete categories)
- **Clients List**: Removed email column and widened Client # column for cleaner display

### November 23, 2025 - Invoice Payment Tracking
- **Feature**: Implemented comprehensive invoice payment tracking system
  - Added invoice_payments database table with payment date, type, amount, notes, and reference fields
  - Backend: Implemented nested REST API routes (/api/invoices/:invoiceId/payments) for payment CRUD operations
  - UI: Added Payments tab to invoice form using shadcn Tabs component
  - Payment management includes add, edit, and delete functionality via dialog interface
  - Supports multiple payment types: Cash, Check, Card, Bank Transfer, and Other
  - TanStack Query integration with proper cache invalidation for real-time updates
  - Payment tab shows count badge when payments exist and is disabled for unsaved invoices

### October 29, 2025 - Security Improvements and Bug Fixes
- **Security**: Fixed critical privilege escalation vulnerability in user update endpoints
  - Added three safe update schemas: updateUserProfileSchema, updateUserCompanySchema, updateUserPaymentSchema
  - All user update endpoints now use field whitelisting to prevent role/password modification
  - Password changes only allowed through dedicated endpoint with current password verification
- **API**: Added current user endpoints for easier client-side integration
  - GET /api/user - Get current user's complete profile
  - PUT /api/user - Update profile (fullName, email, phone, address only)
  - PUT /api/user/company - Update company details (whitelisted fields)
  - PUT /api/user/payment - Update payment settings (placeholder)
  - PUT /api/user/password - Change password with verification
- **Bug Fix**: Fixed quotation to invoice conversion error (variable name conflict)
- **UI Fix**: Removed nested anchor tag warning in dashboard InvoiceStatusChart component

### October 29, 2025 - Company Information Consolidation
- Consolidated company information from Print Settings into General Settings (Company tab)
- Company information now stored in users table: companyName, companyTagline, companyAddress, companyPhone, companyEmail, taxNumber, logoUrl
- Print Settings now contains only print-specific preferences: paperSize, showTax, showDiscount, showPONumber, defaultNotes, accentColor
- Added logo upload functionality using Replit's Object Storage with presigned URLs
- Updated General Settings Company tab to include all company fields with image uploader
- Simplified Print Settings page to focus on print preferences only

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type-safe component development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Custom component library built on Radix UI primitives with Tailwind CSS for styling
- **Form Handling**: React Hook Form with Zod validation for robust form management
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the entire stack
- **Authentication**: Passport.js with local strategy and session-based authentication
- **API Design**: RESTful API endpoints with structured error handling
- **File Processing**: Support for CSV/Excel import/export operations

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon Database serverless hosting
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Session Storage**: PostgreSQL-backed session store using connect-pg-simple

### Core Business Entities
- **Users**: Authentication and role-based access control
- **Stores**: Multi-location support for business operations
- **Clients**: Customer relationship management with contact details
- **Products**: Inventory management with categorization and pricing
- **Product Batches**: Detailed inventory tracking with batch-level information
- **Invoices/Quotations**: Sales document generation with PDF export capability
- **Transactions**: Financial tracking for income and expense management
- **Categories**: Product organization and classification system

### Key Design Patterns
- **Shared Schema**: Common TypeScript types and Zod schemas shared between frontend and backend
- **Transaction Support**: Database transactions for data consistency
- **Query Optimization**: Efficient data fetching with proper indexing and relationships
- **Type Safety**: End-to-end TypeScript for compile-time error detection
- **Component Architecture**: Reusable UI components with consistent design patterns

### Security Features
- **Password Hashing**: SHA-256 password encryption
- **Session Management**: Secure session handling with configurable cookies
- **Input Validation**: Comprehensive request validation using Zod schemas
- **CORS Protection**: Proper cross-origin request handling

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for production data storage
- **Drizzle ORM**: Type-safe database query builder and migration tool

### UI Libraries
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography
- **Recharts**: Data visualization library for charts and graphs

### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit environment optimization
- **ESBuild**: Fast bundling for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration

### File Processing
- **jsPDF**: PDF generation for invoices and reports
- **XLSX**: Excel file processing for data import/export
- **CSV Parser/Writer**: CSV file handling for bulk operations

### Form and Validation
- **React Hook Form**: Performant form handling with minimal re-renders
- **Zod**: Schema validation for both client and server-side validation
- **Hookform Resolvers**: Integration between React Hook Form and Zod

### Date and Formatting
- **date-fns**: Date manipulation and formatting utilities
- **class-variance-authority**: Type-safe CSS class generation
- **clsx**: Conditional CSS class utility