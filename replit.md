# AluminumManager - Inventory and Sales Management System

## Overview

AluminumManager is a comprehensive web application designed for aluminum profile businesses to manage inventory, sales, invoicing, and client relationships. The system provides a modern interface for tracking products, generating invoices and quotations, managing client data, and analyzing business performance through detailed reports and dashboards.

## User Preferences

Preferred communication style: Simple, everyday language.

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