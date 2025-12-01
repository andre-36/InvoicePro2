import { eq, and, desc, gte, lt, sql, isNull, inArray, count } from "drizzle-orm";
import { db, withTransaction } from "./db";
import {
  users, clients, suppliers, products, productBatches, invoices, invoiceItems, 
  invoiceItemBatches, invoicePayments, quotations, quotationItems, transactions, stores,
  settings, categories, importExportLogs, purchaseOrders, purchaseOrderItems, printSettings,
  paymentTypes, paymentTerms, productUnits,
  type User, type InsertUser, type Store, type InsertStore,
  type Client, type InsertClient, type Supplier, type InsertSupplier,
  type Product, type InsertProduct,
  type ProductBatch, type InsertProductBatch, type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem, type InvoiceItemBatch, type InsertInvoiceItemBatch,
  type InvoicePayment, type InsertInvoicePayment,
  type Quotation, type InsertQuotation, type QuotationItem, type InsertQuotationItem,
  type PurchaseOrder, type InsertPurchaseOrder, type PurchaseOrderItem, type InsertPurchaseOrderItem,
  type Transaction, type InsertTransaction, type Category, type InsertCategory,
  type Setting, type InsertSetting, type ImportExportLog, type InsertImportExportLog,
  type PrintSettings, type InsertPrintSettings,
  type PaymentType, type InsertPaymentType, type PaymentTerm, type InsertPaymentTerm,
  type ProductUnit, type InsertProductUnit
} from "../shared/schema";

import session from "express-session";
import connectPg from "connect-pg-simple";

// Define the IStorage interface for all database operations
export interface IStorage {
  // Session store for Express
  sessionStore: session.Store;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Store methods
  getStore(id: number): Promise<Store | undefined>;
  getStores(): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, store: Partial<InsertStore>): Promise<Store>;
  deleteStore(id: number): Promise<void>;

  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  getClients(storeId: number): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;
  getClientStats(clientId: number): Promise<ClientStats>;
  getClientMonthlyPurchases(clientId: number): Promise<ClientMonthlyPurchase[]>;

  // Supplier methods
  getSupplier(id: number): Promise<Supplier | undefined>;
  getSuppliers(storeId: number): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: number): Promise<void>;

  // Category methods
  getCategory(id: number): Promise<Category | undefined>;
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Product methods
  getProduct(id: number): Promise<Product | undefined>;
  getProducts(storeId?: number): Promise<Product[]>;
  getProductsWithLowStock(storeId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Product dashboard methods
  getProductStats(productId: number): Promise<ProductStats>;
  getProductSalesHistory(productId: number): Promise<ProductSalesHistory[]>;
  getProductPurchaseHistory(productId: number): Promise<ProductPurchaseHistory[]>;

  // Product batch methods
  getProductBatch(id: number): Promise<ProductBatch | undefined>;
  getProductBatches(productId: number, storeId: number): Promise<ProductBatch[]>;
  createProductBatch(batch: InsertProductBatch): Promise<ProductBatch>;
  updateProductBatch(id: number, batch: Partial<InsertProductBatch>): Promise<ProductBatch>;
  deleteProductBatch(id: number): Promise<void>;

  // Invoice methods
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceWithItems(id: number): Promise<{ invoice: Invoice, items: InvoiceItem[], client?: Client } | undefined>;
  getInvoices(storeId: number): Promise<(Invoice & { clientName: string | null })[]>;
  getRecentInvoices(storeId: number, limit: number): Promise<Invoice[]>;
  getOpenInvoices(storeId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice, items: Array<InsertInvoiceItem & { productId: number, quantity: number | string }>): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;

  // Invoice payment methods
  getInvoicePayment(paymentId: number): Promise<InvoicePayment | undefined>;
  getInvoicePayments(invoiceId: number): Promise<InvoicePayment[]>;
  createInvoicePayment(payment: InsertInvoicePayment): Promise<InvoicePayment>;
  updateInvoicePayment(id: number, payment: Partial<InsertInvoicePayment>): Promise<InvoicePayment>;
  deleteInvoicePayment(id: number): Promise<void>;

  // Quotation methods
  getQuotation(id: number): Promise<Quotation | undefined>;
  getQuotationWithItems(id: number): Promise<{ quotation: Quotation, items: QuotationItem[], client?: Client } | undefined>;
  getQuotations(storeId: number): Promise<(Quotation & { clientName: string | null })[]>;
  createQuotation(quotation: InsertQuotation, items: InsertQuotationItem[]): Promise<Quotation>;
  updateQuotation(id: number, quotation: Partial<InsertQuotation>): Promise<Quotation>;
  convertQuotationToInvoice(id: number): Promise<Invoice>;
  deleteQuotation(id: number): Promise<void>;

  // Purchase Order methods
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
  getPurchaseOrderWithItems(id: number): Promise<{ purchaseOrder: PurchaseOrder, items: PurchaseOrderItem[] } | undefined>;
  getPurchaseOrders(storeId: number): Promise<PurchaseOrder[]>;
  createPurchaseOrder(purchaseOrder: InsertPurchaseOrder, items: Array<InsertPurchaseOrderItem & { productId: number, quantity: number | string }>): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, purchaseOrder: Partial<InsertPurchaseOrder>, items: Array<InsertPurchaseOrderItem & { id?: number, productId: number, quantity: number | string }>): Promise<PurchaseOrder>;
  updatePurchaseOrderStatus(id: number, status: string, deliveredDate?: Date): Promise<PurchaseOrder>;
  receivePurchaseOrderItems(purchaseOrderId: number, items: Array<{ itemId: number, quantityReceived: number }>): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: number): Promise<void>;

  // Preview number generation methods
  getNextInvoiceNumber(issueDate?: Date): Promise<string>;
  getNextQuotationNumber(): Promise<string>;
  getNextPurchaseOrderNumber(orderDate?: Date): Promise<string>;
  getNextClientNumber(): Promise<string>;

  // Transaction methods
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(storeId: number): Promise<Transaction[]>;
  getTransactionsByType(storeId: number, type: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;

  // Settings methods
  getSetting(storeId: number, key: string): Promise<Setting | undefined>;
  getSettings(storeId: number): Promise<Setting[]>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  deleteSetting(id: number): Promise<void>;

  // Print Settings methods
  getPrintSettings(storeId: number): Promise<PrintSettings | undefined>;
  createPrintSettings(settings: InsertPrintSettings): Promise<PrintSettings>;
  updatePrintSettings(storeId: number, settings: Partial<InsertPrintSettings>): Promise<PrintSettings>;

  // Payment Types methods
  getPaymentTypes(storeId: number): Promise<PaymentType[]>;
  getPaymentType(id: number): Promise<PaymentType | undefined>;
  createPaymentType(paymentType: InsertPaymentType): Promise<PaymentType>;
  updatePaymentType(id: number, paymentType: Partial<InsertPaymentType>): Promise<PaymentType>;
  deletePaymentType(id: number): Promise<void>;

  // Payment Terms methods
  getPaymentTerms(storeId: number): Promise<PaymentTerm[]>;
  getPaymentTerm(id: number): Promise<PaymentTerm | undefined>;
  createPaymentTerm(paymentTerm: InsertPaymentTerm): Promise<PaymentTerm>;
  updatePaymentTerm(id: number, paymentTerm: Partial<InsertPaymentTerm>): Promise<PaymentTerm>;
  deletePaymentTerm(id: number): Promise<void>;

  // Product Units methods
  getProductUnits(productId: number): Promise<ProductUnit[]>;
  getProductUnit(id: number): Promise<ProductUnit | undefined>;
  createProductUnit(unitData: InsertProductUnit): Promise<ProductUnit>;
  updateProductUnit(id: number, unitData: Partial<InsertProductUnit>): Promise<ProductUnit>;
  deleteProductUnit(id: number): Promise<void>;

  // Import/Export methods
  createImportExportLog(log: InsertImportExportLog): Promise<ImportExportLog>;
  getImportExportLogs(userId: number): Promise<ImportExportLog[]>;

  // Dashboard metrics
  getDashboardStats(storeId: number): Promise<DashboardStats>;
  getTopClients(storeId: number, limit: number): Promise<ClientWithSalesStats[]>;
  getInvoiceStatusSummary(storeId: number): Promise<InvoiceStatusSummary>;
  getProductSalesByCategory(storeId: number): Promise<CategorySalesData[]>;
  getRevenueData(storeId: number, start: Date, end: Date): Promise<RevenueData>;
  getProductPerformance(storeId: number, limit: number): Promise<ProductPerformanceStats[]>;
  getInventoryValueStats(storeId: number): Promise<InventoryValueStats>;
  getBatchProfitabilityAnalysis(storeId: number, productId?: number): Promise<BatchProfitabilityData[]>;
  getFinancialReport(storeId: number, dateRange: string): Promise<any>;
  getCashFlowReport(storeId: number, dateRange: string): Promise<any>;
}

// Types for dashboard metrics
export type DashboardStats = {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  openInvoices: {
    count: number;
    value: number;
  };
  totalClients: number;
  productsCount: number;
  lowStockCount: number;
  salesCount: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
};

export type ClientWithSalesStats = {
  id: number;
  name: string;
  email: string;
  invoiceCount: number;
  totalSpent: number;
  averageSpend: number;
  lastPurchaseDate: Date | null;
};

export type InvoiceStatusSummary = {
  paid: number;
  pending: number;
  overdue: number;
  total: number;
};

export type CategorySalesData = {
  categoryId: number | null;
  categoryName: string;
  totalRevenue: number;
  totalQuantity: number;
  productCount: number;
};

export type RevenueData = {
  dates: string[];
  revenue: number[];
  expenses: number[];
  profit: number[];
};

export type ProductPerformanceStats = {
  id: number;
  name: string;
  sku: string;
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
};

export type InventoryValueStats = {
  totalItems: number;
  totalValue: number;
  batchesCount: number;
  averageCost: number;
  valueByCategory: Array<{ category: string; value: number }>;
};

export type BatchProfitabilityData = {
  productId: number;
  productName: string;
  batchNumber: string;
  capitalCost: number;
  avgSellingPrice: number;
  profitMargin: number;
  soldQuantity: number;
  totalProfit: number;
  purchaseDate: Date;
};

// Product dashboard types
export type ProductStats = {
  totalSales: number;
  totalRevenue: string;
  totalPurchases: number;
  totalCost: string;
  currentStock: number;
  averageSellingPrice: string;
  averageCost: string;
  profitMargin: string;
};

// Client dashboard types
export type ClientStats = {
  totalPurchases: number;
  unpaidInvoicesCount: number;
  lastPurchaseDate: string | null;
};

export type ClientMonthlyPurchase = {
  month: string;
  totalAmount: number;
  invoiceCount: number;
};

export type ProductSalesHistory = {
  id: number;
  invoiceNumber: string;
  clientName: string;
  quantity: number;
  unitPrice: string;
  total: string;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
};

export type ProductPurchaseHistory = {
  id: number;
  purchaseOrderNumber: string;
  supplierName: string;
  quantity: number;
  unitCost: string;
  total: string;
  date: string;
  status: 'received' | 'pending' | 'cancelled';
};

// Helper function to generate unique numbers with retry logic for concurrency
async function generateNextNumber(prefix: string, yearMonth: string, table: any, column: any, tx: any): Promise<string> {
  // Find the highest number for this year-month using the transaction
  const yearMonthPrefix = `${prefix}-${yearMonth}-`;
  const result = await tx
    .select({ number: column })
    .from(table)
    .where(sql`${column} LIKE ${yearMonthPrefix + '%'}`)
    .orderBy(sql`${column} DESC`)
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].number) {
    const lastNumber = result[0].number;
    const parts = lastNumber.split('-');
    if (parts.length >= 3 && parts[2]) {
      const numericPart = parseInt(parts[2], 10);
      if (!isNaN(numericPart)) {
        nextNumber = numericPart + 1;
      }
    }
  }

  return `${prefix}-${yearMonth}-${nextNumber.toString().padStart(4, '0')}`;
}

// Helper function for simple sequential numbering (like C-00001)
async function generateSimpleSequentialNumber(prefix: string, table: any, column: any, tx: any): Promise<string> {
  // Find the highest number with this prefix
  const prefixPattern = `${prefix}-%`;
  const result = await tx
    .select({ number: column })
    .from(table)
    .where(sql`${column} LIKE ${prefixPattern}`)
    .orderBy(sql`${column} DESC`)
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].number) {
    const lastNumber = result[0].number;
    const parts = lastNumber.split('-');
    if (parts.length >= 2 && parts[1]) {
      const numericPart = parseInt(parts[1], 10);
      if (!isNaN(numericPart)) {
        nextNumber = numericPart + 1;
      }
    }
  }

  return `${prefix}-${nextNumber.toString().padStart(5, '0')}`;
}

// Helper function to safely create records with unique number generation and retry logic
async function createWithUniqueNumber<T>(
  table: any,
  column: any,
  prefix: string,
  data: any,
  dateField?: string,
  maxRetries: number = 5
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(async (tx) => {
        // Get year and month from date field or current date
        const date = dateField && data[dateField] ? 
          new Date(data[dateField]) : 
          new Date();
        const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Get month with leading zero
        const yearMonth = year + month;

        const uniqueNumber = await generateNextNumber(prefix, yearMonth, table, column, tx);

        const [newRecord] = await tx
          .insert(table)
          .values({
            ...data,
            [column.name]: uniqueNumber
          })
          .returning();

        return newRecord;
      });
    } catch (error: any) {
      // Check if this is a unique constraint violation
      if (error?.code === '23505' && error?.detail?.includes(column.name)) {
        if (attempt === maxRetries) {
          throw new Error(`Failed to create record with unique ${prefix} number after ${maxRetries} attempts due to concurrency conflicts`);
        }
        // Wait with exponential backoff before retry
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
        continue;
      }
      // For other errors, don't retry
      throw error;
    }
  }

  throw new Error(`Failed to create record with unique ${prefix} number`);
}

// Helper function for simple sequential numbering with retry logic  
async function createWithSimpleSequentialNumber<T>(
  table: any,
  column: any,
  prefix: string,
  data: any,
  maxRetries: number = 5
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(async (tx) => {
        const uniqueNumber = await generateSimpleSequentialNumber(prefix, table, column, tx);

        const [newRecord] = await tx
          .insert(table)
          .values({
            ...data,
            clientNumber: uniqueNumber
          })
          .returning();

        return newRecord;
      });
    } catch (error: any) {
      // Check if this is a unique constraint violation
      if (error?.code === '23505' && error?.detail?.includes(column.name)) {
        if (attempt === maxRetries) {
          throw new Error(`Failed to create record with unique ${prefix} number after ${maxRetries} attempts due to concurrency conflicts`);
        }
        // Wait with exponential backoff before retry
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
        continue;
      }
      // For other errors, don't retry
      throw error;
    }
  }

  throw new Error(`Failed to create record with unique ${prefix} number`);
}

export class DatabaseStorage implements IStorage {
  // Session store for PostgreSQL
  sessionStore: session.Store;

  constructor() {
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Store methods
  async getStore(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async getStores(): Promise<Store[]> {
    return db.select().from(stores).orderBy(stores.name);
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [newStore] = await db.insert(stores).values(store).returning();
    return newStore;
  }

  async updateStore(id: number, storeData: Partial<InsertStore>): Promise<Store> {
    const [updatedStore] = await db
      .update(stores)
      .set({ ...storeData, updatedAt: new Date() })
      .where(eq(stores.id, id))
      .returning();
    return updatedStore;
  }

  async deleteStore(id: number): Promise<void> {
    await db.delete(stores).where(eq(stores.id, id));
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    return client;
  }

  async getClients(storeId: number): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.storeId, storeId)).orderBy(clients.name);
  }

  async createClient(client: InsertClient): Promise<Client> {
    return createWithSimpleSequentialNumber<Client>(clients, clients.clientNumber, "C", client);
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...clientData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async getClientStats(clientId: number): Promise<ClientStats> {
    const results = await db
      .select({
        totalPurchases: count(invoices.id),
        unpaidInvoicesCount: sql<number>`COUNT(CASE WHEN ${invoices.status} != 'paid' THEN 1 END)::int`,
        lastPurchaseDate: sql<string>`MAX(${invoices.issueDate})::text`,
      })
      .from(invoices)
      .where(eq(invoices.clientId, clientId));

    const result = results[0];

    return {
      totalPurchases: Number(result?.totalPurchases || 0),
      unpaidInvoicesCount: Number(result?.unpaidInvoicesCount || 0),
      lastPurchaseDate: result?.lastPurchaseDate || null,
    };
  }

  async getClientMonthlyPurchases(clientId: number): Promise<ClientMonthlyPurchase[]> {
    const results = await db.execute(sql`
      WITH cleaned_invoices AS (
        SELECT 
          ${invoices.issueDate}::date as issue_date,
          NULLIF(REGEXP_REPLACE(${invoices.totalAmount}, '[^0-9.]', '', 'g'), '') as clean_amount
        FROM ${invoices}
        WHERE ${invoices.clientId} = ${clientId}
      )
      SELECT 
        TO_CHAR(issue_date, 'Mon YYYY') as month,
        TO_CHAR(issue_date, 'YYYY-MM') as "sortKey",
        COALESCE(
          SUM(
            CASE 
              WHEN clean_amount IS NOT NULL THEN clean_amount::numeric
              ELSE 0
            END
          ), 0
        )::text as "totalAmount",
        COUNT(*)::int as "invoiceCount"
      FROM cleaned_invoices
      GROUP BY TO_CHAR(issue_date, 'YYYY-MM'), TO_CHAR(issue_date, 'Mon YYYY')
      ORDER BY TO_CHAR(issue_date, 'YYYY-MM')
    `);

    const rows = results.rows as Array<{
      month: string;
      sortKey: string;
      totalAmount: string;
      invoiceCount: number;
    }>;

    return rows
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(r => ({
        month: r.month,
        totalAmount: parseFloat(r.totalAmount) || 0,
        invoiceCount: Number(r.invoiceCount || 0),
      }));
  }

  // Supplier methods
  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async getSuppliers(storeId: number): Promise<Supplier[]> {
    return db.select().from(suppliers).where(eq(suppliers.storeId, storeId)).orderBy(suppliers.name);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    return createWithSimpleSequentialNumber<Supplier>(suppliers, suppliers.supplierNumber, "S", supplier);
  }

  async updateSupplier(id: number, supplierData: Partial<InsertSupplier>): Promise<Supplier> {
    const [updatedSupplier] = await db
      .update(suppliers)
      .set({ ...supplierData, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  // Category methods
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...categoryData, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product;
  }

  async getProducts(storeId?: number): Promise<Product[]> {
    const query = db.select().from(products).where(eq(products.isActive, true));

    // If storeId is provided, we filter only products that have batches in the specified store
    if (storeId) {
      const productsInStore = await db.execute(sql`
        SELECT DISTINCT p.*
        FROM ${products} p
        JOIN ${productBatches} pb ON p.id = pb.product_id
        WHERE pb.store_id = ${storeId} AND p.is_active = true
        ORDER BY p.name
      `);
      return productsInStore;
    }

    return query.orderBy(products.name);
  }

  async getProductsWithLowStock(storeId: number): Promise<Product[]> {
    const lowStockProducts = await db.execute(sql`
      SELECT p.*, 
             SUM(pb.remaining_quantity) as total_quantity
      FROM ${products} p
      JOIN ${productBatches} pb ON p.id = pb.product_id
      WHERE pb.store_id = ${storeId} AND p.is_active = true
      GROUP BY p.id
      HAVING SUM(pb.remaining_quantity) <= p.min_stock
      ORDER BY p.name
    `);
    return lowStockProducts;
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(productData).returning();
    return newProduct;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Product dashboard methods
  async getProductStats(productId: number): Promise<ProductStats> {
    // Get current stock from product batches
    const stockResult = await db.execute(sql`
      SELECT COALESCE(SUM(remaining_quantity), 0) as current_stock
      FROM ${productBatches}
      WHERE product_id = ${productId}
    `);
    const currentStock = parseInt(stockResult[0]?.current_stock?.toString() || '0');

    // Get sales statistics from invoice items
    const salesResult = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CAST(ii.quantity AS DECIMAL)), 0) as total_sales,
        COALESCE(SUM(CAST(ii.total_amount AS DECIMAL)), 0) as total_revenue,
        COALESCE(AVG(CAST(ii.unit_price AS DECIMAL)), 0) as avg_price,
        COUNT(*) as sales_count
      FROM ${invoiceItems} ii
      JOIN ${invoices} i ON ii.invoice_id = i.id
      WHERE ii.product_id = ${productId} AND i.status != 'draft'
    `);

    const totalSales = parseInt(salesResult[0]?.total_sales?.toString() || '0');
    const totalRevenue = salesResult[0]?.total_revenue?.toString() || '0';
    const avgPrice = salesResult[0]?.avg_price?.toString() || '0';

    // Calculate average cost from product batches
    const costResult = await db.execute(sql`
      SELECT COALESCE(AVG(CAST(capital_cost AS DECIMAL)), 0) as avg_cost
      FROM ${productBatches}
      WHERE product_id = ${productId}
    `);
    const avgCost = costResult[0]?.avg_cost?.toString() || '0';

    // Calculate profit margin
    const avgPriceNum = parseFloat(avgPrice);
    const avgCostNum = parseFloat(avgCost);
    const profitMargin = avgPriceNum > 0 ? (((avgPriceNum - avgCostNum) / avgPriceNum) * 100).toFixed(2) + '%' : '0%';

    return {
      totalSales,
      totalRevenue,
      totalPurchases: 0, // TODO: Implement when purchase orders are added
      totalCost: '0',
      currentStock,
      averageSellingPrice: avgPrice,
      averageCost: avgCost,
      profitMargin
    };
  }

  async getProductSalesHistory(productId: number): Promise<ProductSalesHistory[]> {
    const salesHistory = await db.execute(sql`
      SELECT 
        ii.id,
        i.invoice_number,
        c.name as client_name,
        CAST(ii.quantity AS DECIMAL) as quantity,
        ii.unit_price,
        ii.total_amount,
        i.issue_date as date,
        i.status
      FROM ${invoiceItems} ii
      JOIN ${invoices} i ON ii.invoice_id = i.id
      LEFT JOIN ${clients} c ON i.client_id = c.id
      WHERE ii.product_id = ${productId} AND i.status != 'draft'
      ORDER BY i.issue_date DESC
    `);

    return salesHistory.map((row: any) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      clientName: row.client_name || 'Unknown Client',
      quantity: parseInt(row.quantity?.toString() || '0'),
      unitPrice: row.unit_price || '0',
      total: row.total_amount || '0',
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
      status: row.status || 'pending'
    }));
  }

  async getProductPurchaseHistory(productId: number): Promise<ProductPurchaseHistory[]> {
    // For now, return empty array since purchase orders are not implemented yet
    // TODO: Implement when purchase orders feature is added
    return [];
  }

  // Product batch methods
  async getProductBatch(id: number): Promise<ProductBatch | undefined> {
    const [batch] = await db.select().from(productBatches).where(eq(productBatches.id, id));
    return batch;
  }

  async getProductBatches(productId: number, storeId: number): Promise<ProductBatch[]> {
    return db
      .select()
      .from(productBatches)
      .where(
        and(
          eq(productBatches.productId, productId),
          eq(productBatches.storeId, storeId)
        )
      )
      .orderBy(productBatches.purchaseDate);
  }

  async createProductBatch(batchData: InsertProductBatch): Promise<ProductBatch> {
    const [newBatch] = await db.insert(productBatches).values(batchData).returning();
    return newBatch;
  }

  async updateProductBatch(id: number, batchData: Partial<InsertProductBatch>): Promise<ProductBatch> {
    const [updatedBatch] = await db
      .update(productBatches)
      .set({ ...batchData, updatedAt: new Date() })
      .where(eq(productBatches.id, id))
      .returning();
    return updatedBatch;
  }

  async deleteProductBatch(id: number): Promise<void> {
    await db.delete(productBatches).where(eq(productBatches.id, id));
  }

  // Invoice methods
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoiceWithItems(id: number): Promise<{ invoice: Invoice; items: InvoiceItem[]; client?: Client } | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));

    if (!invoice) {
      return undefined;
    }

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id))
      .orderBy(invoiceItems.id);

    let client;
    if (invoice.clientId) {
      [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
    }

    return { invoice, items, client };
  }

  async getInvoices(storeId: number): Promise<(Invoice & { clientName: string | null })[]> {
    const results = await db
      .select({
        id: invoices.id,
        storeId: invoices.storeId,
        invoiceNumber: invoices.invoiceNumber,
        clientId: invoices.clientId,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        subtotal: invoices.subtotal,
        taxRate: invoices.taxRate,
        taxAmount: invoices.taxAmount,
        discount: invoices.discount,
        shipping: invoices.shipping,
        totalAmount: invoices.totalAmount,
        totalProfit: invoices.totalProfit,
        termsAndConditions: invoices.termsAndConditions,
        paperSize: invoices.paperSize,
        notes: invoices.notes,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
        clientName: clients.name
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.storeId, storeId))
      .orderBy(desc(invoices.issueDate));

    return results;
  }

  async getRecentInvoices(storeId: number, limit: number): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.storeId, storeId))
      .orderBy(desc(invoices.issueDate))
      .limit(limit);
  }

  async getOpenInvoices(storeId: number): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.storeId, storeId),
          inArray(invoices.status, ["draft", "sent", "overdue"])
        )
      )
      .orderBy(desc(invoices.issueDate));
  }

  async createInvoice(invoiceData: InsertInvoice, items: Array<InsertInvoiceItem & { productId: number; quantity: number | string }>): Promise<Invoice> {
    // Use the safe number generation for the base invoice, then process items
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await withTransaction(async (tx) => {
          // Get year and month from issue date or current date
          const issueDate = invoiceData.issueDate ? new Date(invoiceData.issueDate) : new Date();
          const year = issueDate.getFullYear().toString().slice(-2); // Get last 2 digits of year
          const month = (issueDate.getMonth() + 1).toString().padStart(2, '0'); // Get month with leading zero
          const yearMonth = year + month;

          const invoiceNumber = await generateNextNumber("INV", yearMonth, invoices, invoices.invoiceNumber, tx);

          // Create the invoice with auto-generated number
          const [newInvoice] = await tx
            .insert(invoices)
            .values({
              ...invoiceData,
              invoiceNumber
            })
            .returning();

      // Calculate total profit for the invoice
      let totalProfit = 0;

      // Process each item to allocate batches and calculate profits
      for (const item of items) {
        const productId = item.productId;
        const quantityNeeded = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;

        // Create the invoice item
        const [newItem] = await tx
          .insert(invoiceItems)
          .values({
            ...item,
            invoiceId: newInvoice.id,
            quantity: quantityNeeded.toString()
          })
          .returning();

        // If this is a real invoice (not draft), allocate from batches and calculate profit
        if (invoiceData.status !== 'draft') {
          // Get available batches for this product, ordered by purchase date (FIFO)
          const availableBatches = await tx
            .select()
            .from(productBatches)
            .where(
              and(
                eq(productBatches.productId, productId),
                eq(productBatches.storeId, invoiceData.storeId),
                gte(productBatches.remainingQuantity, 0)
              )
            )
            .orderBy(productBatches.purchaseDate);

          let remainingQuantity = quantityNeeded;
          let itemProfit = 0;

          // Allocate from each batch until we've fulfilled the quantity
          for (const batch of availableBatches) {
            if (remainingQuantity <= 0) break;

            // Calculate how much we can take from this batch
            const quantityFromBatch = Math.min(
              remainingQuantity,
              parseFloat(batch.remainingQuantity.toString())
            );

            if (quantityFromBatch <= 0) continue;

            // Update the batch's remaining quantity
            await tx
              .update(productBatches)
              .set({ 
                remainingQuantity: (parseFloat(batch.remainingQuantity.toString()) - quantityFromBatch).toString(),
                updatedAt: new Date()
              })
              .where(eq(productBatches.id, batch.id));

            // Record which batch was used for this item
            const batchCost = parseFloat(batch.capitalCost.toString());
            await tx
              .insert(invoiceItemBatches)
              .values({
                invoiceItemId: newItem.id,
                batchId: batch.id,
                quantity: quantityFromBatch.toString(),
                capitalCost: batch.capitalCost
              });

            // Calculate profit for this portion of the item
            const sellingPrice = parseFloat(item.unitPrice.toString());
            const batchProfit = (sellingPrice - batchCost) * quantityFromBatch;
            itemProfit += batchProfit;

            // Reduce the remaining quantity needed
            remainingQuantity -= quantityFromBatch;
          }

          // Update the item with its profit
          await tx
            .update(invoiceItems)
            .set({ profit: itemProfit.toString() })
            .where(eq(invoiceItems.id, newItem.id));

          totalProfit += itemProfit;
        }
      }

      // Calculate invoice totals from items
      let invoiceSubtotal = 0;
      let invoiceTaxAmount = 0;

      for (const item of items) {
        invoiceSubtotal += parseFloat(item.subtotal.toString());
        invoiceTaxAmount += parseFloat(item.taxAmount?.toString() || "0");
      }

      const discount = parseFloat(invoiceData.discount?.toString() || "0");
      const invoiceTotalAmount = invoiceSubtotal + invoiceTaxAmount - discount;

      // Update the invoice with calculated totals and total profit
      if (invoiceData.status !== 'draft') {
        await tx
          .update(invoices)
          .set({ 
            subtotal: invoiceSubtotal.toString(),
            taxAmount: invoiceTaxAmount.toString(),
            totalAmount: invoiceTotalAmount.toString(),
            totalProfit: totalProfit.toString(),
            updatedAt: new Date()
          })
          .where(eq(invoices.id, newInvoice.id));

        // Create a transaction record for this invoice
        await tx
          .insert(transactions)
          .values({
            storeId: invoiceData.storeId,
            type: 'income',
            date: invoiceData.issueDate,
            amount: invoiceTotalAmount.toString(),
            description: `Invoice #${invoiceNumber}`,
            invoiceId: newInvoice.id,
            referenceNumber: invoiceNumber,
          });
      } else {
        // For draft invoices, still update the totals
        await tx
          .update(invoices)
          .set({ 
            subtotal: invoiceSubtotal.toString(),
            taxAmount: invoiceTaxAmount.toString(),
            totalAmount: invoiceTotalAmount.toString(),
            updatedAt: new Date()
          })
          .where(eq(invoices.id, newInvoice.id));
      }

      // Return the invoice with the updated totals
      const [updatedInvoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, newInvoice.id));

      return updatedInvoice;
        });
      } catch (error: any) {
        // Check if this is a unique constraint violation
        if (error?.code === '23505' && error?.detail?.includes('invoiceNumber')) {
          if (attempt === maxRetries) {
            throw new Error(`Failed to create invoice with unique number after ${maxRetries} attempts due to concurrency conflicts`);
          }
          // Wait with exponential backoff before retry
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
          continue;
        }
        // For other errors, don't retry
        throw error;
      }
    }

    throw new Error(`Failed to create invoice with unique number`);
  }

  async updateInvoice(id: number, invoiceData: Partial<InsertInvoice>): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ ...invoiceData, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id));

    if (!invoice) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    // If changing from draft to another status, we need to allocate batches and calculate profits
    if (invoice.status === 'draft' && status !== 'draft') {
      return withTransaction(async (tx) => {
        // Get all items for this invoice
        const items = await tx
          .select()
          .from(invoiceItems)
          .where(eq(invoiceItems.invoiceId, id));

        let totalProfit = 0;

        // Process each item to allocate batches and calculate profits
        for (const item of items) {
          const quantityNeeded = parseFloat(item.quantity.toString());

          // Get available batches for this product, ordered by purchase date (FIFO)
          const availableBatches = await tx
            .select()
            .from(productBatches)
            .where(
              and(
                eq(productBatches.productId, item.productId),
                eq(productBatches.storeId, invoice.storeId),
                gte(productBatches.remainingQuantity, 0)
              )
            )
            .orderBy(productBatches.purchaseDate);

          let remainingQuantity = quantityNeeded;
          let itemProfit = 0;

          // Allocate from each batch until we've fulfilled the quantity
          for (const batch of availableBatches) {
            if (remainingQuantity <= 0) break;

            // Calculate how much we can take from this batch
            const quantityFromBatch = Math.min(
              remainingQuantity,
              parseFloat(batch.remainingQuantity.toString())
            );

            if (quantityFromBatch <= 0) continue;

            // Update the batch's remaining quantity
            await tx
              .update(productBatches)
              .set({ 
                remainingQuantity: (parseFloat(batch.remainingQuantity.toString()) - quantityFromBatch).toString(),
                updatedAt: new Date()
              })
              .where(eq(productBatches.id, batch.id));

            // Record which batch was used for this item
            const batchCost = parseFloat(batch.capitalCost.toString());
            await tx
              .insert(invoiceItemBatches)
              .values({
                invoiceItemId: item.id,
                batchId: batch.id,
                quantity: quantityFromBatch.toString(),
                capitalCost: batch.capitalCost
              });

            // Calculate profit for this portion of the item
            const sellingPrice = parseFloat(item.unitPrice.toString());
            const batchProfit = (sellingPrice - batchCost) * quantityFromBatch;
            itemProfit += batchProfit;

            // Reduce the remaining quantity needed
            remainingQuantity -= quantityFromBatch;
          }

          // Update the item with its profit
          await tx
            .update(invoiceItems)
            .set({ profit: itemProfit.toString() })
            .where(eq(invoiceItems.id, item.id));

          totalProfit += itemProfit;
        }

        // Update the invoice with its new status and total profit
        const [updatedInvoice] = await tx
          .update(invoices)
          .set({ 
            status: status as any, 
            totalProfit: totalProfit.toString(),
            updatedAt: new Date()
          })
          .where(eq(invoices.id, id))
          .returning();

        // Create a transaction record for this invoice if not exist yet
        const [existingTransaction] = await tx
          .select()
          .from(transactions)
          .where(eq(transactions.invoiceId, id));

        if (!existingTransaction) {
          await tx
            .insert(transactions)
            .values({
              storeId: invoice.storeId,
              type: 'income',
              date: invoice.issueDate,
              amount: invoice.totalAmount,
              description: `Invoice #${invoice.invoiceNumber}`,
              invoiceId: invoice.id,
              referenceNumber: invoice.invoiceNumber,
            });
        }

        return updatedInvoice;
      });
    } else {
      // Simple status update
      const [updatedInvoice] = await db
        .update(invoices)
        .set({ 
          status: status as any,
          updatedAt: new Date()
        })
        .where(eq(invoices.id, id))
        .returning();

      return updatedInvoice;
    }
  }

  async deleteInvoice(id: number): Promise<void> {
    return withTransaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, id));

      if (!invoice) {
        throw new Error(`Invoice with ID ${id} not found`);
      }

      // If the invoice is not a draft, we need to restore quantities to batches
      if (invoice.status !== 'draft') {
        // Get all invoice item batch allocations
        const allocations = await tx
          .select()
          .from(invoiceItemBatches)
          .innerJoin(
            invoiceItems,
            eq(invoiceItemBatches.invoiceItemId, invoiceItems.id)
          )
          .where(eq(invoiceItems.invoiceId, id));

        // Restore quantities to each batch
        for (const allocation of allocations) {
          await tx
            .update(productBatches)
            .set({
              remainingQuantity: sql`${productBatches.remainingQuantity} + ${allocation.quantity}`,
              updatedAt: new Date()
            })
            .where(eq(productBatches.id, allocation.batchId));
        }

        // Delete transaction record for this invoice
        await tx
          .delete(transactions)
          .where(eq(transactions.invoiceId, id));
      }

      // Delete invoice items and their batch allocations (cascading)
      await tx
        .delete(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id));

      // Delete the invoice
      await tx
        .delete(invoices)
        .where(eq(invoices.id, id));
    });
  }

  // Invoice payment methods
  async getInvoicePayment(paymentId: number): Promise<InvoicePayment | undefined> {
    const [payment] = await db
      .select()
      .from(invoicePayments)
      .where(eq(invoicePayments.id, paymentId));
    return payment;
  }

  async getInvoicePayments(invoiceId: number): Promise<InvoicePayment[]> {
    const payments = await db
      .select()
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoiceId))
      .orderBy(desc(invoicePayments.paymentDate));

    return payments;
  }

  async createInvoicePayment(payment: InsertInvoicePayment): Promise<InvoicePayment> {
    const [newPayment] = await db
      .insert(invoicePayments)
      .values(payment)
      .returning();

    return newPayment;
  }

  async updateInvoicePayment(id: number, payment: Partial<InsertInvoicePayment>): Promise<InvoicePayment> {
    const [updatedPayment] = await db
      .update(invoicePayments)
      .set({ ...payment, updatedAt: new Date() })
      .where(eq(invoicePayments.id, id))
      .returning();

    if (!updatedPayment) {
      throw new Error(`Invoice payment with ID ${id} not found`);
    }

    return updatedPayment;
  }

  async deleteInvoicePayment(id: number): Promise<void> {
    await db
      .delete(invoicePayments)
      .where(eq(invoicePayments.id, id));
  }

  // Quotation methods
  async getQuotation(id: number): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quotation;
  }

  async getQuotationWithItems(id: number): Promise<{ quotation: Quotation; items: QuotationItem[]; client?: Client } | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));

    if (!quotation) {
      return undefined;
    }

    const items = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, id))
      .orderBy(quotationItems.id);

    let client;
    if (quotation.clientId) {
      [client] = await db.select().from(clients).where(eq(clients.id, quotation.clientId));
    }

    return { quotation, items, client };
  }

  async getQuotations(storeId: number): Promise<(Quotation & { clientName: string | null })[]> {
    const results = await db
      .select({
        id: quotations.id,
        storeId: quotations.storeId,
        quotationNumber: quotations.quotationNumber,
        clientId: quotations.clientId,
        issueDate: quotations.issueDate,
        expiryDate: quotations.expiryDate,
        status: quotations.status,
        subtotal: quotations.subtotal,
        taxRate: quotations.taxRate,
        taxAmount: quotations.taxAmount,
        discount: quotations.discount,
        shipping: quotations.shipping,
        totalAmount: quotations.totalAmount,
        termsAndConditions: quotations.termsAndConditions,
        paperSize: quotations.paperSize,
        notes: quotations.notes,
        convertedToInvoiceId: quotations.convertedToInvoiceId,
        createdAt: quotations.createdAt,
        updatedAt: quotations.updatedAt,
        clientName: clients.name
      })
      .from(quotations)
      .leftJoin(clients, eq(quotations.clientId, clients.id))
      .where(eq(quotations.storeId, storeId))
      .orderBy(desc(quotations.issueDate));

    return results;
  }

  async createQuotation(quotationData: InsertQuotation, items: InsertQuotationItem[]): Promise<Quotation> {
    return withTransaction(async (tx) => {
      // Generate unique quotation number with YYMM format
      const currentDate = new Date();
      const year = currentDate.getFullYear().toString().slice(-2); // Get last 2 digits of year
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Get month with leading zero
      const yearMonth = year + month;
      const quotationNumber = await generateNextNumber("QUO", yearMonth, quotations, quotations.quotationNumber, tx);

      // Create the quotation
      const [newQuotation] = await tx
        .insert(quotations)
        .values({
          ...quotationData,
          quotationNumber
        })
        .returning();

      // Create all quotation items
      for (const item of items) {
        await tx
          .insert(quotationItems)
          .values({
            ...item,
            quotationId: newQuotation.id
          });
      }

      return newQuotation;
    });
  }

  async updateQuotation(id: number, quotationData: Partial<InsertQuotation>): Promise<Quotation> {
    const [updatedQuotation] = await db
      .update(quotations)
      .set({ ...quotationData, updatedAt: new Date() })
      .where(eq(quotations.id, id))
      .returning();
    return updatedQuotation;
  }

  async convertQuotationToInvoice(id: number): Promise<Invoice> {
    return withTransaction(async (tx) => {
      // Get the quotation with its items
      const [quotation] = await tx
        .select()
        .from(quotations)
        .where(eq(quotations.id, id));

      if (!quotation) {
        throw new Error(`Quotation with ID ${id} not found`);
      }

      const items = await tx
        .select()
        .from(quotationItems)
        .where(eq(quotationItems.quotationId, id));

      // Generate a unique invoice number using the standard generation function
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const yearMonth = year + month;

      const invoiceNumber = await generateNextNumber("INV", yearMonth, invoices, invoices.invoiceNumber, tx);

      // Create a new invoice based on the quotation
      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          storeId: quotation.storeId,
          invoiceNumber,
          clientId: quotation.clientId,
          issueDate: new Date(),
          dueDate: new Date(today.setDate(today.getDate() + 30)), // 30 days from now
          status: 'draft',
          subtotal: quotation.subtotal,
          taxRate: quotation.taxRate,
          taxAmount: quotation.taxAmount,
          discount: quotation.discount,
          totalAmount: quotation.totalAmount,
          paperSize: quotation.paperSize,
          notes: quotation.notes,
        })
        .returning();

      // Copy all items from quotation to invoice
      for (const item of items) {
        await tx
          .insert(invoiceItems)
          .values({
            invoiceId: newInvoice.id,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            discount: item.discount,
            subtotal: item.subtotal,
            totalAmount: item.totalAmount,
          });
      }

      // Update the quotation to mark it as converted
      await tx
        .update(quotations)
        .set({ 
          status: 'accepted',
          convertedToInvoiceId: newInvoice.id,
          updatedAt: new Date()
        })
        .where(eq(quotations.id, id));

      return newInvoice;
    });
  }

  async deleteQuotation(id: number): Promise<void> {
    return withTransaction(async (tx) => {
      // Delete quotation items (cascading)
      await tx
        .delete(quotationItems)
        .where(eq(quotationItems.quotationId, id));

      // Delete the quotation
      await tx
        .delete(quotations)
        .where(eq(quotations.id, id));
    });
  }

  // Purchase Order methods
  async getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined> {
    const [purchaseOrder] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return purchaseOrder;
  }

  async getPurchaseOrderWithItems(id: number): Promise<{ purchaseOrder: PurchaseOrder, items: PurchaseOrderItem[] } | undefined> {
    const [purchaseOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));

    if (!purchaseOrder) {
      return undefined;
    }

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id))
      .orderBy(purchaseOrderItems.id);

    return { purchaseOrder, items };
  }

  async getPurchaseOrders(storeId: number): Promise<PurchaseOrder[]> {
    return db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.storeId, storeId))
      .orderBy(desc(purchaseOrders.orderDate));
  }

  async createPurchaseOrder(purchaseOrderData: InsertPurchaseOrder, items: Array<InsertPurchaseOrderItem & { productId: number, quantity: number | string }>): Promise<PurchaseOrder> {
    return withTransaction(async (tx) => {
      // Generate purchase order number using the standard generation function
      const orderDate = purchaseOrderData.orderDate ? new Date(purchaseOrderData.orderDate) : new Date();
      const year = orderDate.getFullYear().toString().slice(-2);
      const month = (orderDate.getMonth() + 1).toString().padStart(2, '0');
      const yearMonth = year + month;

      const purchaseOrderNumber = await generateNextNumber("PO", yearMonth, purchaseOrders, purchaseOrders.purchaseOrderNumber, tx);

      // Create purchase order
      const [newPurchaseOrder] = await tx
        .insert(purchaseOrders)
        .values({
          ...purchaseOrderData,
          purchaseOrderNumber
        })
        .returning();

      // Create purchase order items
      for (const item of items) {
        await tx
          .insert(purchaseOrderItems)
          .values({
            ...item,
            purchaseOrderId: newPurchaseOrder.id,
            quantity: item.quantity.toString(),
            unitCost: item.unitCost.toString(),
            subtotal: item.subtotal.toString(),
            totalAmount: item.totalAmount.toString(),
            taxRate: item.taxRate?.toString() || '0',
            taxAmount: item.taxAmount?.toString() || '0',
            discount: item.discount?.toString() || '0'
          });
      }

      return newPurchaseOrder;
    });
  }

  async updatePurchaseOrder(id: number, purchaseOrderData: Partial<InsertPurchaseOrder>, items: Array<InsertPurchaseOrderItem & { id?: number, productId: number, quantity: number | string }>): Promise<PurchaseOrder> {
    return withTransaction(async (tx) => {
      // Update purchase order
      const [updatedPurchaseOrder] = await tx
        .update(purchaseOrders)
        .set({ ...purchaseOrderData, updatedAt: new Date() })
        .where(eq(purchaseOrders.id, id))
        .returning();

      // Delete existing items
      await tx
        .delete(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, id));

      // Create new items
      for (const item of items) {
        await tx
          .insert(purchaseOrderItems)
          .values({
            ...item,
            purchaseOrderId: id,
            quantity: item.quantity.toString(),
            unitCost: item.unitCost.toString(),
            subtotal: item.subtotal.toString(),
            totalAmount: item.totalAmount.toString(),
            taxRate: item.taxRate?.toString() || '0',
            taxAmount: item.taxAmount?.toString() || '0',
            discount: item.discount?.toString() || '0'
          });
      }

      return updatedPurchaseOrder;
    });
  }

  async updatePurchaseOrderStatus(id: number, status: string, deliveredDate?: Date): Promise<PurchaseOrder> {
    const updateData: any = {
      status: status as any,
      updatedAt: new Date()
    };

    if (deliveredDate) {
      updateData.deliveredDate = deliveredDate;
    }

    const [updatedPurchaseOrder] = await db
      .update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.id, id))
      .returning();

    return updatedPurchaseOrder;
  }

  async receivePurchaseOrderItems(purchaseOrderId: number, items: Array<{ itemId: number, quantityReceived: number }>): Promise<PurchaseOrder> {
    return withTransaction(async (tx) => {
      // Get the purchase order
      const [purchaseOrder] = await tx
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, purchaseOrderId));

      if (!purchaseOrder) {
        throw new Error(`Purchase order with ID ${purchaseOrderId} not found`);
      }

      let allItemsFullyReceived = true;

      // Process each item
      for (const item of items) {
        // Get the current purchase order item
        const [poItem] = await tx
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.id, item.itemId));

        if (!poItem) {
          throw new Error(`Purchase order item with ID ${item.itemId} not found`);
        }

        // Calculate new received quantity
        const currentReceived = parseFloat(poItem.receivedQuantity || '0');
        const newReceivedQuantity = currentReceived + item.quantityReceived;
        const totalOrdered = parseFloat(poItem.quantity);

        // Prevent receiving more than ordered
        if (newReceivedQuantity > totalOrdered) {
          throw new Error(`Cannot receive ${item.quantityReceived} items. Maximum remaining: ${totalOrdered - currentReceived}`);
        }

        // Update the purchase order item with new received quantity
        await tx
          .update(purchaseOrderItems)
          .set({ 
            receivedQuantity: newReceivedQuantity.toString(),
            updatedAt: new Date()
          })
          .where(eq(purchaseOrderItems.id, item.itemId));

        // Create or update product batch to add inventory
        if (item.quantityReceived > 0) {
          // Find existing batch or create a new one
          const batchReference = `PO-${purchaseOrder.purchaseOrderNumber}-${poItem.id}`;
          const batchDescription = `Received from PO ${purchaseOrder.purchaseOrderNumber} - ${poItem.description}`;

          // Try to find existing batch for this PO item
          const [existingBatch] = await tx
            .select()
            .from(productBatches)
            .where(eq(productBatches.batchNumber, batchReference))
            .limit(1);

          if (existingBatch) {
            // Update existing batch
            const newQuantity = parseFloat(existingBatch.totalQuantity) + item.quantityReceived;
            const newRemainingQuantity = parseFloat(existingBatch.remainingQuantity) + item.quantityReceived;

            await tx
              .update(productBatches)
              .set({
                totalQuantity: newQuantity.toString(),
                remainingQuantity: newRemainingQuantity.toString(),
                updatedAt: new Date()
              })
              .where(eq(productBatches.id, existingBatch.id));
          } else {
            // Create new batch
            await tx
              .insert(productBatches)
              .values({
                productId: poItem.productId,
                batchNumber: batchReference,
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                totalQuantity: item.quantityReceived.toString(),
                remainingQuantity: item.quantityReceived.toString(),
                costPrice: poItem.unitCost,
                notes: batchDescription
              });
          }
        }

        // Check if this item is fully received
        if (newReceivedQuantity < totalOrdered) {
          allItemsFullyReceived = false;
        }
      }

      // Determine new purchase order status
      let newStatus: string;
      if (allItemsFullyReceived) {
        // Check if ALL items in the PO are fully received
        const allItems = await tx
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));

        const allFullyReceived = allItems.every(item => 
          parseFloat(item.receivedQuantity || '0') >= parseFloat(item.quantity)
        );

        newStatus = allFullyReceived ? 'received' : 'partial';
      } else {
        newStatus = 'partial';
      }

      // Update purchase order status and delivered date if fully received
      const updateData: any = {
        status: newStatus as any,
        updatedAt: new Date()
      };

      if (newStatus === 'received') {
        updateData.deliveredDate = new Date();
      }

      const [updatedPurchaseOrder] = await tx
        .update(purchaseOrders)
        .set(updateData)
        .where(eq(purchaseOrders.id, purchaseOrderId))
        .returning();

      return updatedPurchaseOrder;
    });
  }

  async deletePurchaseOrder(id: number): Promise<void> {
    return withTransaction(async (tx) => {
      // Delete purchase order items (cascading)
      await tx
        .delete(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, id));

      // Delete the purchase order
      await tx
        .delete(purchaseOrders)
        .where(eq(purchaseOrders.id, id));
    });
  }

  // Transaction methods
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async getTransactions(storeId: number): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.storeId, storeId))
      .orderBy(desc(transactions.date));
  }

  async getTransactionsByType(storeId: number, type: string): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.storeId, storeId),
          eq(transactions.type, type as any)
        )
      )
      .orderBy(desc(transactions.date));
  }

  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transactionData)
      .returning();
    return newTransaction;
  }

  async updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set({ ...transactionData, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  // Settings methods
  async getSetting(storeId: number, key: string): Promise<Setting | undefined> {
    const [setting] = await db
      .select()
      .from(settings)
      .where(
        and(
          eq(settings.storeId, storeId),
          eq(settings.key, key)
        )
      );
    return setting;
  }

  async getSettings(storeId: number): Promise<Setting[]> {
    return db
      .select()
      .from(settings)
      .where(eq(settings.storeId, storeId));
  }

  async setSetting(settingData: InsertSetting): Promise<Setting> {
    // Check if setting exists
    const [existingSetting] = await db
      .select()
      .from(settings)
      .where(
        and(
          eq(settings.storeId, settingData.storeId),
          eq(settings.key, settingData.key)
        )
      );

    if (existingSetting) {
      // Update existing setting
      const [updatedSetting] = await db
        .update(settings)
        .set({ 
          value: settingData.value,
          updatedAt: new Date()
        })
        .where(eq(settings.id, existingSetting.id))
        .returning();
      return updatedSetting;
    } else {
      // Create new setting
      const [newSetting] = await db
        .insert(settings)
        .values(settingData)
        .returning();
      return newSetting;
    }
  }

  async deleteSetting(id: number): Promise<void> {
    await db.delete(settings).where(eq(settings.id, id));
  }

  // Print Settings methods
  async getPrintSettings(storeId: number): Promise<PrintSettings | undefined> {
    const [printSetting] = await db
      .select()
      .from(printSettings)
      .where(eq(printSettings.storeId, storeId));
    return printSetting;
  }

  async createPrintSettings(settingsData: InsertPrintSettings): Promise<PrintSettings> {
    const [newSettings] = await db
      .insert(printSettings)
      .values(settingsData)
      .returning();
    return newSettings;
  }

  async updatePrintSettings(storeId: number, settingsData: Partial<InsertPrintSettings>): Promise<PrintSettings> {
    const [updatedSettings] = await db
      .update(printSettings)
      .set({ ...settingsData, updatedAt: new Date() })
      .where(eq(printSettings.storeId, storeId))
      .returning();
    return updatedSettings;
  }

  // Payment Types methods
  async getPaymentTypes(storeId: number): Promise<PaymentType[]> {
    return db
      .select()
      .from(paymentTypes)
      .where(eq(paymentTypes.storeId, storeId))
      .orderBy(paymentTypes.name);
  }

  async getPaymentType(id: number): Promise<PaymentType | undefined> {
    const [paymentType] = await db
      .select()
      .from(paymentTypes)
      .where(eq(paymentTypes.id, id));
    return paymentType;
  }

  async createPaymentType(paymentTypeData: InsertPaymentType): Promise<PaymentType> {
    const [newPaymentType] = await db
      .insert(paymentTypes)
      .values(paymentTypeData)
      .returning();
    return newPaymentType;
  }

  async updatePaymentType(id: number, paymentTypeData: Partial<InsertPaymentType>): Promise<PaymentType> {
    const [updatedPaymentType] = await db
      .update(paymentTypes)
      .set({ ...paymentTypeData, updatedAt: new Date() })
      .where(eq(paymentTypes.id, id))
      .returning();
    return updatedPaymentType;
  }

  async deletePaymentType(id: number): Promise<void> {
    await db.delete(paymentTypes).where(eq(paymentTypes.id, id));
  }

  // Payment Terms methods
  async getPaymentTerms(storeId: number): Promise<PaymentTerm[]> {
    return db
      .select()
      .from(paymentTerms)
      .where(eq(paymentTerms.storeId, storeId))
      .orderBy(paymentTerms.days);
  }

  async getPaymentTerm(id: number): Promise<PaymentTerm | undefined> {
    const [paymentTerm] = await db
      .select()
      .from(paymentTerms)
      .where(eq(paymentTerms.id, id));
    return paymentTerm;
  }

  async createPaymentTerm(paymentTermData: InsertPaymentTerm): Promise<PaymentTerm> {
    const [newPaymentTerm] = await db
      .insert(paymentTerms)
      .values(paymentTermData)
      .returning();
    return newPaymentTerm;
  }

  async updatePaymentTerm(id: number, paymentTermData: Partial<InsertPaymentTerm>): Promise<PaymentTerm> {
    const [updatedPaymentTerm] = await db
      .update(paymentTerms)
      .set({ ...paymentTermData, updatedAt: new Date() })
      .where(eq(paymentTerms.id, id))
      .returning();
    return updatedPaymentTerm;
  }

  async deletePaymentTerm(id: number): Promise<void> {
    await db.delete(paymentTerms).where(eq(paymentTerms.id, id));
  }

  // Product Units methods
  async getProductUnits(productId: number): Promise<ProductUnit[]> {
    return await db
      .select()
      .from(productUnits)
      .where(eq(productUnits.productId, productId))
      .orderBy(productUnits.isBaseUnit, productUnits.unitName);
  }

  async getProductUnit(id: number): Promise<ProductUnit | undefined> {
    const [unit] = await db
      .select()
      .from(productUnits)
      .where(eq(productUnits.id, id))
      .limit(1);
    return unit;
  }

  async createProductUnit(unitData: InsertProductUnit): Promise<ProductUnit> {
    const [newUnit] = await db.insert(productUnits).values(unitData).returning();
    return newUnit;
  }

  async updateProductUnit(id: number, unitData: Partial<InsertProductUnit>): Promise<ProductUnit> {
    const [updatedUnit] = await db
      .update(productUnits)
      .set({ ...unitData, updatedAt: new Date() })
      .where(eq(productUnits.id, id))
      .returning();
    return updatedUnit;
  }

  async deleteProductUnit(id: number): Promise<void> {
    await db.delete(productUnits).where(eq(productUnits.id, id));
  }
}

// Create and export the storage instance
export const storage = new DatabaseStorage();