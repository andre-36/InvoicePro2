import { eq, and, desc, gte, lt, sql, isNull, inArray } from "drizzle-orm";
import { db, withTransaction } from "./db";
import {
  users, clients, products, productBatches, invoices, invoiceItems, 
  invoiceItemBatches, quotations, quotationItems, transactions, stores,
  settings, categories, importExportLogs,
  
  type User, type InsertUser, type Store, type InsertStore,
  type Client, type InsertClient, type Product, type InsertProduct,
  type ProductBatch, type InsertProductBatch, type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem, type InvoiceItemBatch, type InsertInvoiceItemBatch,
  type Quotation, type InsertQuotation, type QuotationItem, type InsertQuotationItem,
  type Transaction, type InsertTransaction, type Category, type InsertCategory,
  type Setting, type InsertSetting, type ImportExportLog, type InsertImportExportLog
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
  
  // Product batch methods
  getProductBatch(id: number): Promise<ProductBatch | undefined>;
  getProductBatches(productId: number, storeId: number): Promise<ProductBatch[]>;
  createProductBatch(batch: InsertProductBatch): Promise<ProductBatch>;
  updateProductBatch(id: number, batch: Partial<InsertProductBatch>): Promise<ProductBatch>;
  deleteProductBatch(id: number): Promise<void>;
  
  // Invoice methods
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceWithItems(id: number): Promise<{ invoice: Invoice, items: InvoiceItem[], client?: Client } | undefined>;
  getInvoices(storeId: number): Promise<Invoice[]>;
  getRecentInvoices(storeId: number, limit: number): Promise<Invoice[]>;
  getOpenInvoices(storeId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice, items: Array<InsertInvoiceItem & { productId: number, quantity: number | string }>): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;
  
  // Quotation methods
  getQuotation(id: number): Promise<Quotation | undefined>;
  getQuotationWithItems(id: number): Promise<{ quotation: Quotation, items: QuotationItem[], client?: Client } | undefined>;
  getQuotations(storeId: number): Promise<Quotation[]>;
  createQuotation(quotation: InsertQuotation, items: InsertQuotationItem[]): Promise<Quotation>;
  updateQuotation(id: number, quotation: Partial<InsertQuotation>): Promise<Quotation>;
  convertQuotationToInvoice(id: number): Promise<Invoice>;
  deleteQuotation(id: number): Promise<void>;
  
  // Preview number generation methods
  getNextInvoiceNumber(issueDate?: Date): Promise<string>;
  getNextQuotationNumber(): Promise<string>;
  
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
  
  // Import/Export methods
  createImportExportLog(log: InsertImportExportLog): Promise<ImportExportLog>;
  getImportExportLogs(userId: number): Promise<ImportExportLog[]>;
  
  // Dashboard metrics
  getDashboardStats(storeId: number): Promise<DashboardStats>;
  getTopClients(storeId: number, limit: number): Promise<ClientWithSalesStats[]>;
  getRevenueData(storeId: number, start: Date, end: Date): Promise<RevenueData>;
  getProductPerformance(storeId: number, limit: number): Promise<ProductPerformanceStats[]>;
  getInventoryValueStats(storeId: number): Promise<InventoryValueStats>;
  getBatchProfitabilityAnalysis(storeId: number, productId?: number): Promise<BatchProfitabilityData[]>;
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
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }
  
  async getClients(storeId: number): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.storeId, storeId)).orderBy(clients.name);
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    return createWithUniqueNumber<Client>(clients, clients.clientNumber, "CL", client);
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
  
  async getInvoices(storeId: number): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.storeId, storeId))
      .orderBy(desc(invoices.issueDate));
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
      
      // Update the invoice with the total profit
      if (invoiceData.status !== 'draft') {
        await tx
          .update(invoices)
          .set({ totalProfit: totalProfit.toString() })
          .where(eq(invoices.id, newInvoice.id));
        
        // Create a transaction record for this invoice
        await tx
          .insert(transactions)
          .values({
            storeId: invoiceData.storeId,
            type: 'income',
            date: invoiceData.issueDate,
            amount: invoiceData.totalAmount,
            description: `Invoice #${invoiceData.invoiceNumber}`,
            invoiceId: newInvoice.id,
            referenceNumber: invoiceData.invoiceNumber,
          });
      }
      
      // Return the invoice with the updated total profit
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
  
  async getQuotations(storeId: number): Promise<Quotation[]> {
    return db
      .select()
      .from(quotations)
      .where(eq(quotations.storeId, storeId))
      .orderBy(desc(quotations.issueDate));
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
      
      const quotationItems = await tx
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
      for (const item of quotationItems) {
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
  
  // Import/Export methods
  async createImportExportLog(logData: InsertImportExportLog): Promise<ImportExportLog> {
    const [newLog] = await db
      .insert(importExportLogs)
      .values(logData)
      .returning();
    return newLog;
  }
  
  async getImportExportLogs(userId: number): Promise<ImportExportLog[]> {
    return db
      .select()
      .from(importExportLogs)
      .where(eq(importExportLogs.userId, userId))
      .orderBy(desc(importExportLogs.completedAt));
  }
  
  // Dashboard metrics
  async getDashboardStats(storeId: number): Promise<DashboardStats> {
    // Get current date
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday of current week
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate total revenue and expenses
    const revenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as total
      FROM ${transactions}
      WHERE store_id = ${storeId} AND type = 'income'
    `);
    
    const expensesResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as total
      FROM ${transactions}
      WHERE store_id = ${storeId} AND type = 'expense'
    `);
    
    // Calculate open invoices
    const openInvoicesResult = await db.execute(sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount::numeric), 0) as value
      FROM ${invoices}
      WHERE store_id = ${storeId} AND status IN ('sent', 'overdue')
    `);
    
    // Count clients
    const clientsResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${clients}
      WHERE store_id = ${storeId}
    `);
    
    // Count products
    const productsResult = await db.execute(sql`
      SELECT COUNT(DISTINCT p.id) as count
      FROM ${products} p
      JOIN ${productBatches} pb ON p.id = pb.product_id
      WHERE pb.store_id = ${storeId} AND p.is_active = true
    `);
    
    // Count products with low stock
    const lowStockResult = await db.execute(sql`
      SELECT COUNT(DISTINCT p.id) as count
      FROM ${products} p
      JOIN ${productBatches} pb ON p.id = pb.product_id
      WHERE pb.store_id = ${storeId} AND p.is_active = true
      GROUP BY p.id
      HAVING SUM(pb.remaining_quantity::numeric) <= p.min_stock
    `);
    
    // Count sales by periods
    const salesTodayResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${invoices}
      WHERE store_id = ${storeId} 
        AND status = 'paid'
        AND issue_date >= ${startOfDay}
    `);
    
    const salesThisWeekResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${invoices}
      WHERE store_id = ${storeId} 
        AND status = 'paid'
        AND issue_date >= ${startOfWeek}
    `);
    
    const salesThisMonthResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${invoices}
      WHERE store_id = ${storeId} 
        AND status = 'paid'
        AND issue_date >= ${startOfMonth}
    `);
    
    // Calculate total profit
    const profitResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_profit::numeric), 0) as total
      FROM ${invoices}
      WHERE store_id = ${storeId} AND status = 'paid'
    `);
    
    return {
      totalRevenue: parseFloat(revenueResult[0]?.total || '0'),
      totalExpenses: parseFloat(expensesResult[0]?.total || '0'),
      totalProfit: parseFloat(profitResult[0]?.total || '0'),
      openInvoices: {
        count: parseInt(openInvoicesResult[0]?.count || '0'),
        value: parseFloat(openInvoicesResult[0]?.value || '0')
      },
      totalClients: parseInt(clientsResult[0]?.count || '0'),
      productsCount: parseInt(productsResult[0]?.count || '0'),
      lowStockCount: parseInt(lowStockResult[0]?.count || '0'),
      salesCount: {
        today: parseInt(salesTodayResult[0]?.count || '0'),
        thisWeek: parseInt(salesThisWeekResult[0]?.count || '0'),
        thisMonth: parseInt(salesThisMonthResult[0]?.count || '0')
      }
    };
  }
  
  async getTopClients(storeId: number, limit: number): Promise<ClientWithSalesStats[]> {
    const result = await db.execute(sql`
      WITH client_stats AS (
        SELECT 
          c.id,
          c.name,
          c.email,
          COUNT(DISTINCT i.id) as invoice_count,
          COALESCE(SUM(i.total_amount::numeric), 0) as total_spent,
          MAX(i.issue_date) as last_purchase_date
        FROM ${clients} c
        LEFT JOIN ${invoices} i ON c.id = i.client_id AND i.status = 'paid'
        WHERE c.store_id = ${storeId}
        GROUP BY c.id, c.name, c.email
      )
      SELECT 
        id,
        name,
        email,
        invoice_count,
        total_spent,
        CASE 
          WHEN invoice_count > 0 THEN total_spent / invoice_count 
          ELSE 0 
        END as average_spend,
        last_purchase_date
      FROM client_stats
      ORDER BY total_spent DESC
      LIMIT ${limit}
    `);
    
    return result.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      invoiceCount: parseInt(row.invoice_count || '0'),
      totalSpent: parseFloat(row.total_spent || '0'),
      averageSpend: parseFloat(row.average_spend || '0'),
      lastPurchaseDate: row.last_purchase_date
    }));
  }
  
  async getRevenueData(storeId: number, start: Date, end: Date): Promise<RevenueData> {
    // Generate series of dates between start and end
    const dateList = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      dateList.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Format dates for display
    const dateLabels = dateList.map(date => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${day}/${month}`;
    });
    
    // Get revenue data
    const revenueResult = await db.execute(sql`
      SELECT 
        DATE(date) as date,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount::numeric ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount::numeric ELSE 0 END), 0) as expenses
      FROM ${transactions}
      WHERE 
        store_id = ${storeId} AND
        date >= ${start} AND
        date <= ${end}
      GROUP BY DATE(date)
      ORDER BY DATE(date)
    `);
    
    // Initialize data arrays
    const revenueData = Array(dateList.length).fill(0);
    const expenseData = Array(dateList.length).fill(0);
    const profitData = Array(dateList.length).fill(0);
    
    // Populate data arrays from query results
    revenueResult.forEach(row => {
      const rowDate = new Date(row.date);
      const index = dateList.findIndex(date => 
        date.getDate() === rowDate.getDate() &&
        date.getMonth() === rowDate.getMonth() &&
        date.getFullYear() === rowDate.getFullYear()
      );
      
      if (index !== -1) {
        revenueData[index] = parseFloat(row.income || '0');
        expenseData[index] = parseFloat(row.expenses || '0');
        profitData[index] = revenueData[index] - expenseData[index];
      }
    });
    
    return {
      dates: dateLabels,
      revenue: revenueData,
      expenses: expenseData,
      profit: profitData
    };
  }
  
  async getProductPerformance(storeId: number, limit: number): Promise<ProductPerformanceStats[]> {
    const result = await db.execute(sql`
      WITH product_sales AS (
        SELECT 
          p.id,
          p.name,
          p.sku,
          SUM(ii.quantity::numeric) as total_sold,
          SUM(ii.total_amount::numeric) as total_revenue,
          SUM(ii.profit::numeric) as total_profit
        FROM ${products} p
        JOIN ${invoiceItems} ii ON p.id = ii.product_id
        JOIN ${invoices} i ON ii.invoice_id = i.id
        WHERE i.store_id = ${storeId} AND i.status = 'paid'
        GROUP BY p.id, p.name, p.sku
      )
      SELECT 
        id,
        name,
        sku,
        total_sold,
        total_revenue,
        total_profit,
        CASE 
          WHEN total_revenue > 0 THEN (total_profit / total_revenue) * 100 
          ELSE 0 
        END as profit_margin
      FROM product_sales
      ORDER BY total_profit DESC
      LIMIT ${limit}
    `);
    
    return result.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      totalSold: parseFloat(row.total_sold || '0'),
      totalRevenue: parseFloat(row.total_revenue || '0'),
      totalProfit: parseFloat(row.total_profit || '0'),
      profitMargin: parseFloat(row.profit_margin || '0')
    }));
  }
  
  async getInventoryValueStats(storeId: number): Promise<InventoryValueStats> {
    // Get inventory summary stats
    const summaryResult = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT p.id) as total_items,
        COUNT(pb.id) as batches_count,
        COALESCE(SUM(pb.remaining_quantity::numeric * pb.capital_cost::numeric), 0) as total_value,
        CASE 
          WHEN SUM(pb.remaining_quantity::numeric) > 0 
          THEN SUM(pb.remaining_quantity::numeric * pb.capital_cost::numeric) / SUM(pb.remaining_quantity::numeric)
          ELSE 0 
        END as average_cost
      FROM ${productBatches} pb
      JOIN ${products} p ON pb.product_id = p.id
      WHERE pb.store_id = ${storeId} AND pb.remaining_quantity::numeric > 0
    `);
    
    // Get value by category
    const categoryResult = await db.execute(sql`
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category,
        COALESCE(SUM(pb.remaining_quantity::numeric * pb.capital_cost::numeric), 0) as value
      FROM ${productBatches} pb
      JOIN ${products} p ON pb.product_id = p.id
      LEFT JOIN ${categories} c ON p.category_id = c.id
      WHERE pb.store_id = ${storeId} AND pb.remaining_quantity::numeric > 0
      GROUP BY c.name
      ORDER BY value DESC
    `);
    
    return {
      totalItems: parseInt(summaryResult[0]?.total_items || '0'),
      totalValue: parseFloat(summaryResult[0]?.total_value || '0'),
      batchesCount: parseInt(summaryResult[0]?.batches_count || '0'),
      averageCost: parseFloat(summaryResult[0]?.average_cost || '0'),
      valueByCategory: categoryResult.map(row => ({
        category: row.category,
        value: parseFloat(row.value || '0')
      }))
    };
  }
  
  async getBatchProfitabilityAnalysis(storeId: number, productId?: number): Promise<BatchProfitabilityData[]> {
    // Generate SQL for optionally filtering by product ID
    const productFilter = productId 
      ? sql`AND pb.product_id = ${productId}` 
      : sql``;
    
    const result = await db.execute(sql`
      WITH batch_sales AS (
        SELECT 
          iib.batch_id,
          SUM(iib.quantity::numeric) as sold_quantity,
          SUM(ii.unit_price::numeric * iib.quantity::numeric) as sales_value,
          SUM(iib.capital_cost::numeric * iib.quantity::numeric) as cost_value
        FROM ${invoiceItemBatches} iib
        JOIN ${invoiceItems} ii ON iib.invoice_item_id = ii.id
        JOIN ${invoices} i ON ii.invoice_id = i.id
        WHERE i.store_id = ${storeId} AND i.status = 'paid'
        GROUP BY iib.batch_id
      )
      SELECT 
        p.id as product_id,
        p.name as product_name,
        pb.batch_number,
        pb.capital_cost,
        pb.purchase_date,
        COALESCE(bs.sold_quantity, 0) as sold_quantity,
        CASE 
          WHEN COALESCE(bs.sold_quantity, 0) > 0 
          THEN bs.sales_value / bs.sold_quantity 
          ELSE 0 
        END as avg_selling_price,
        CASE 
          WHEN COALESCE(bs.cost_value, 0) > 0 
          THEN (bs.sales_value - bs.cost_value) / bs.cost_value * 100
          ELSE 0 
        END as profit_margin,
        COALESCE(bs.sales_value - bs.cost_value, 0) as total_profit
      FROM ${productBatches} pb
      JOIN ${products} p ON pb.product_id = p.id
      LEFT JOIN batch_sales bs ON pb.id = bs.batch_id
      WHERE pb.store_id = ${storeId} ${productFilter}
      ORDER BY 
        CASE WHEN ${productId ? true : false} THEN pb.purchase_date ELSE p.name END,
        CASE WHEN ${productId ? true : false} THEN NULL ELSE p.name END,
        pb.purchase_date DESC
    `);
    
    return result.map(row => ({
      productId: row.product_id,
      productName: row.product_name,
      batchNumber: row.batch_number,
      capitalCost: parseFloat(row.capital_cost || '0'),
      avgSellingPrice: parseFloat(row.avg_selling_price || '0'),
      profitMargin: parseFloat(row.profit_margin || '0'),
      soldQuantity: parseFloat(row.sold_quantity || '0'),
      totalProfit: parseFloat(row.total_profit || '0'),
      purchaseDate: new Date(row.purchase_date)
    }));
  }

  // Preview number generation methods
  async getNextInvoiceNumber(issueDate: Date = new Date()): Promise<string> {
    try {
      const year = issueDate.getFullYear().toString().slice(-2);
      const month = (issueDate.getMonth() + 1).toString().padStart(2, '0');
      const yearMonth = year + month;
      
      console.log('Generating invoice number for yearMonth:', yearMonth);
      
      return withTransaction(async (tx) => {
        return await generateNextNumber("INV", yearMonth, invoices, invoices.invoiceNumber, tx);
      });
    } catch (error) {
      console.error('Error in getNextInvoiceNumber:', error);
      throw error;
    }
  }

  async getNextQuotationNumber(): Promise<string> {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear().toString().slice(-2);
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const yearMonth = year + month;
      
      console.log('Generating quotation number for yearMonth:', yearMonth);
      
      return withTransaction(async (tx) => {
        return await generateNextNumber("QUO", yearMonth, quotations, quotations.quotationNumber, tx);
      });
    } catch (error) {
      console.error('Error in getNextQuotationNumber:', error);
      throw error;
    }
  }
}

// Create and export the storage instance
export const storage = new DatabaseStorage();