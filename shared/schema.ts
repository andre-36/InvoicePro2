import { pgTable, serial, varchar, text, timestamp, numeric, integer, pgEnum, boolean, date, foreignKey, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue', 'cancelled']);
export const quotationStatusEnum = pgEnum('quotation_status', ['draft', 'sent', 'accepted', 'rejected', 'expired']);
export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', ['draft', 'sent', 'received', 'partial', 'cancelled']);
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);
export const paperSizeEnum = pgEnum('paper_size', ['a4', 'prs']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 100 }).notNull(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  companyName: varchar("company_name", { length: 200 }),
  companyTagline: varchar("company_tagline", { length: 200 }),
  companyAddress: text("company_address"),
  companyPhone: varchar("company_phone", { length: 100 }),
  companyEmail: varchar("company_email", { length: 100 }),
  taxNumber: varchar("tax_number", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  logoUrl: varchar("logo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Stores table
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Clients/customers table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  clientNumber: varchar("client_number", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  addressLink: varchar("address_link", { length: 500 }),
  taxNumber: varchar("tax_number", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    storeIdIdx: index("clients_store_id_idx").on(table.storeId),
    emailIdx: index("clients_email_idx").on(table.email),
    clientNumberIdx: uniqueIndex("clients_client_number_idx").on(table.clientNumber)
  };
});

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  supplierNumber: varchar("supplier_number", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  taxNumber: varchar("tax_number", { length: 50 }),
  contactPerson: varchar("contact_person", { length: 100 }),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    storeIdIdx: index("suppliers_store_id_idx").on(table.storeId),
    emailIdx: index("suppliers_email_idx").on(table.email),
    supplierNumberIdx: uniqueIndex("suppliers_supplier_number_idx").on(table.supplierNumber)
  };
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  sku: varchar("sku", { length: 50 }).notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),
  unit: varchar("unit", { length: 20 }).default("piece").notNull(), // piece, meter, kg, etc.
  currentSellingPrice: numeric("current_selling_price", { precision: 15, scale: 2 }),
  costPrice: numeric("cost_price", { precision: 15, scale: 2 }),
  lowestPrice: numeric("lowest_price", { precision: 15, scale: 2 }),
  minStock: integer("min_stock").default(0),
  weight: numeric("weight", { precision: 10, scale: 2 }),
  dimensions: varchar("dimensions", { length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    skuIdx: index("products_sku_idx").on(table.sku),
    categoryIdIdx: index("products_category_id_idx").on(table.categoryId),
    nameIdx: index("products_name_idx").on(table.name) 
  };
});

// Product batches table
export const productBatches = pgTable("product_batches", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  batchNumber: varchar("batch_number", { length: 50 }).notNull(),
  purchaseDate: date("purchase_date").notNull(),
  expiryDate: date("expiry_date"),
  capitalCost: numeric("capital_cost", { precision: 15, scale: 2 }).notNull(), // Per unit capital cost
  initialQuantity: numeric("initial_quantity", { precision: 15, scale: 2 }).notNull(),
  remainingQuantity: numeric("remaining_quantity", { precision: 15, scale: 2 }).notNull(),
  supplierName: varchar("supplier_name", { length: 100 }),
  supplierInvoice: varchar("supplier_invoice", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    productIdIdx: index("product_batches_product_id_idx").on(table.productId),
    storeIdIdx: index("product_batches_store_id_idx").on(table.storeId),
    batchNumberIdx: index("product_batches_batch_number_idx").on(table.batchNumber)
  };
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  clientId: integer("client_id").references(() => clients.id),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 15, scale: 2 }).default("0"),
  shipping: numeric("shipping", { precision: 15, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  totalProfit: numeric("total_profit", { precision: 15, scale: 2 }).default("0"),
  termsAndConditions: text("terms_and_conditions"),
  paperSize: paperSizeEnum("paper_size").default("a4"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    storeIdIdx: index("invoices_store_id_idx").on(table.storeId),
    clientIdIdx: index("invoices_client_id_idx").on(table.clientId),
    statusIdx: index("invoices_status_idx").on(table.status),
    issueDateIdx: index("invoices_issue_date_idx").on(table.issueDate)
  };
});

// Invoice items table
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 15, scale: 2 }).default("0"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  profit: numeric("profit", { precision: 15, scale: 2 }).default("0"), // Calculated profit for this item
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    invoiceIdIdx: index("invoice_items_invoice_id_idx").on(table.invoiceId),
    productIdIdx: index("invoice_items_product_id_idx").on(table.productId)
  };
});

// Invoice item batches (tracks which batches were used for an invoice item)
export const invoiceItemBatches = pgTable("invoice_item_batches", {
  id: serial("id").primaryKey(),
  invoiceItemId: integer("invoice_item_id").references(() => invoiceItems.id, { onDelete: 'cascade' }).notNull(),
  batchId: integer("batch_id").references(() => productBatches.id).notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).notNull(),
  capitalCost: numeric("capital_cost", { precision: 15, scale: 2 }).notNull(), // Historical capital cost at time of sale
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    invoiceItemIdIdx: index("invoice_item_batches_invoice_item_id_idx").on(table.invoiceItemId),
    batchIdIdx: index("invoice_item_batches_batch_id_idx").on(table.batchId)
  };
});

// Invoice payments table
export const invoicePayments = pgTable("invoice_payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentType: varchar("payment_type", { length: 50 }).notNull(), // Cash, Check, Card, Bank Transfer, etc.
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    invoiceIdIdx: index("invoice_payments_invoice_id_idx").on(table.invoiceId),
    paymentDateIdx: index("invoice_payments_payment_date_idx").on(table.paymentDate)
  };
});

// Quotations table
export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  quotationNumber: varchar("quotation_number", { length: 50 }).notNull().unique(),
  clientId: integer("client_id").references(() => clients.id),
  issueDate: date("issue_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  status: quotationStatusEnum("status").default("draft").notNull(),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 15, scale: 2 }).default("0"),
  shipping: numeric("shipping", { precision: 15, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  convertedToInvoiceId: integer("converted_to_invoice_id").references(() => invoices.id),
  termsAndConditions: text("terms_and_conditions"),
  paperSize: paperSizeEnum("paper_size").default("a4"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    storeIdIdx: index("quotations_store_id_idx").on(table.storeId),
    clientIdIdx: index("quotations_client_id_idx").on(table.clientId),
    statusIdx: index("quotations_status_idx").on(table.status),
    issueDateIdx: index("quotations_issue_date_idx").on(table.issueDate)
  };
});

// Quotation items table
export const quotationItems = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").references(() => quotations.id, { onDelete: 'cascade' }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 15, scale: 2 }).default("0"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    quotationIdIdx: index("quotation_items_quotation_id_idx").on(table.quotationId),
    productIdIdx: index("quotation_items_product_id_idx").on(table.productId)
  };
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  date: date("date").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  referenceNumber: varchar("reference_number", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    storeIdIdx: index("transactions_store_id_idx").on(table.storeId),
    typeIdx: index("transactions_type_idx").on(table.type),
    dateIdx: index("transactions_date_idx").on(table.date),
    invoiceIdIdx: index("transactions_invoice_id_idx").on(table.invoiceId)
  };
});

// Purchase Orders table
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  purchaseOrderNumber: varchar("purchase_order_number", { length: 50 }).notNull().unique(),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  supplierName: varchar("supplier_name", { length: 100 }).notNull(),
  supplierEmail: varchar("supplier_email", { length: 100 }),
  supplierPhone: varchar("supplier_phone", { length: 50 }),
  supplierAddress: text("supplier_address"),
  orderDate: date("order_date").notNull(),
  expectedDeliveryDate: date("expected_delivery_date"),
  deliveredDate: date("delivered_date"),
  status: purchaseOrderStatusEnum("status").default("draft").notNull(),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 15, scale: 2 }).default("0"),
  shipping: numeric("shipping", { precision: 15, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    storeIdIdx: index("purchase_orders_store_id_idx").on(table.storeId),
    supplierIdIdx: index("purchase_orders_supplier_id_idx").on(table.supplierId),
    statusIdx: index("purchase_orders_status_idx").on(table.status),
    orderDateIdx: index("purchase_orders_order_date_idx").on(table.orderDate),
    supplierNameIdx: index("purchase_orders_supplier_name_idx").on(table.supplierName)
  };
});

// Purchase Order Items table
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: 'cascade' }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).notNull(),
  receivedQuantity: numeric("received_quantity", { precision: 15, scale: 2 }).default("0"),
  unitCost: numeric("unit_cost", { precision: 15, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 15, scale: 2 }).default("0"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    purchaseOrderIdIdx: index("purchase_order_items_purchase_order_id_idx").on(table.purchaseOrderId),
    productIdIdx: index("purchase_order_items_product_id_idx").on(table.productId)
  };
});

// Settings table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    storeKeyIdx: uniqueIndex("settings_store_key_idx").on(table.storeId, table.key)
  };
});

// Print Settings table - only print-specific preferences
export const printSettings = pgTable("print_settings", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull().unique(),
  showTax: boolean("show_tax").default(true).notNull(),
  showDiscount: boolean("show_discount").default(true).notNull(),
  showPONumber: boolean("show_po_number").default(true).notNull(),
  defaultNotes: text("default_notes").default("Items checked and verified upon delivery. Items cannot be returned."),
  accentColor: varchar("accent_color", { length: 20 }).default("#000000"),
  paperSize: paperSizeEnum("paper_size").default("prs").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Payment Types table
export const paymentTypes = pgTable("payment_types", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    storeIdIdx: index("payment_types_store_id_idx").on(table.storeId)
  };
});

// Payment Terms table
export const paymentTerms = pgTable("payment_terms", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  days: integer("days").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    storeIdIdx: index("payment_terms_store_id_idx").on(table.storeId)
  };
});

// Import/Export Logs
export const importExportLogs = pgTable("import_export_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // import or export
  entityType: varchar("entity_type", { length: 50 }).notNull(), // products, clients, etc.
  filename: varchar("filename", { length: 255 }).notNull(),
  recordCount: integer("record_count").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // completed, failed, partial
  errorDetails: text("error_details"),
  completedAt: timestamp("completed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Define the insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });

// Define safe update schemas for user endpoints
export const updateUserProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(100).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
});

export const updateUserCompanySchema = z.object({
  companyName: z.string().max(200).optional(),
  companyTagline: z.string().max(200).optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().max(100).optional(),
  companyEmail: z.string().email().max(100).optional().or(z.literal("")),
  taxNumber: z.string().max(50).optional(),
  logoUrl: z.string().max(500).optional(),
});

export const updateUserPaymentSchema = z.object({
  // Payment-related fields can be added here as needed
  // For now, this is a placeholder schema
});
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, clientNumber: true, createdAt: true, updatedAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, supplierNumber: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductBatchSchema = createInsertSchema(productBatches).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, invoiceNumber: true, createdAt: true, updatedAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoicePaymentSchema = createInsertSchema(invoicePayments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceItemBatchSchema = createInsertSchema(invoiceItemBatches).omit({ id: true, createdAt: true });
export const insertQuotationSchema = createInsertSchema(quotations).omit({ id: true, quotationNumber: true, createdAt: true, updatedAt: true });
export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, purchaseOrderNumber: true, createdAt: true, updatedAt: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPrintSettingsSchema = createInsertSchema(printSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertImportExportLogSchema = createInsertSchema(importExportLogs).omit({ id: true, createdAt: true });
export const insertPaymentTypeSchema = createInsertSchema(paymentTypes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentTermSchema = createInsertSchema(paymentTerms).omit({ id: true, createdAt: true, updatedAt: true });

// Define types for TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductBatch = typeof productBatches.$inferSelect;
export type InsertProductBatch = z.infer<typeof insertProductBatchSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type InsertInvoicePayment = z.infer<typeof insertInvoicePaymentSchema>;

export type InvoiceItemBatch = typeof invoiceItemBatches.$inferSelect;
export type InsertInvoiceItemBatch = z.infer<typeof insertInvoiceItemBatchSchema>;

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;

export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type PrintSettings = typeof printSettings.$inferSelect;
export type InsertPrintSettings = z.infer<typeof insertPrintSettingsSchema>;

export type PaymentType = typeof paymentTypes.$inferSelect;
export type InsertPaymentType = z.infer<typeof insertPaymentTypeSchema>;

export type PaymentTerm = typeof paymentTerms.$inferSelect;
export type InsertPaymentTerm = z.infer<typeof insertPaymentTermSchema>;

export type ImportExportLog = typeof importExportLogs.$inferSelect;
export type InsertImportExportLog = z.infer<typeof insertImportExportLogSchema>;

// Custom relation types
export type ProductWithBatches = Product & { batches: ProductBatch[] };
export type InvoiceWithItems = Invoice & { items: InvoiceItem[], client: Client };
export type QuotationWithItems = Quotation & { items: QuotationItem[], client: Client };
export type PurchaseOrderWithItems = PurchaseOrder & { items: PurchaseOrderItem[] };
export type InvoiceItemWithProduct = InvoiceItem & { product: Product };
export type QuotationItemWithProduct = QuotationItem & { product: Product };
export type PurchaseOrderItemWithProduct = PurchaseOrderItem & { product: Product };

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginData = z.infer<typeof loginSchema>;

// Define relations for easier querying
import { relations } from "drizzle-orm";

export const storesRelations = relations(stores, ({ many }) => ({
  clients: many(clients),
  products: many(productBatches),
  invoices: many(invoices),
  quotations: many(quotations),
  purchaseOrders: many(purchaseOrders)
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  store: one(stores, { fields: [clients.storeId], references: [stores.id] }),
  invoices: many(invoices),
  quotations: many(quotations)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  batches: many(productBatches),
  invoiceItems: many(invoiceItems),
  quotationItems: many(quotationItems)
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  store: one(stores, { fields: [invoices.storeId], references: [stores.id] }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  items: many(invoiceItems),
  payments: many(invoicePayments),
  transactions: many(transactions)
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one, many }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceItems.productId], references: [products.id] }),
  batches: many(invoiceItemBatches)
}));

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, { fields: [invoicePayments.invoiceId], references: [invoices.id] })
}));