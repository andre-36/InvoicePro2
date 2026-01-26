import { eq, and, desc, gte, lt, sql, isNull, inArray, count } from "drizzle-orm";
import { db, withTransaction } from "./db";
import {
  users, clients, suppliers, products, productBatches, productBundleComponents, productUnits,
  invoices, invoiceItems, invoiceItemBatches, invoicePayments, quotations, quotationItems, 
  transactions, stores, settings, categories, importExportLogs, purchaseOrders, purchaseOrderItems, 
  printSettings, paymentTypes, paymentTermsConfig, deliveryNotes, deliveryNoteItems,
  cashAccounts, accountTransfers, goodsReceipts, goodsReceiptItems, goodsReceiptPayments,
  returns, returnItems, creditNoteUsages,

  type User, type InsertUser, type Store, type InsertStore,
  type Client, type InsertClient, type Supplier, type InsertSupplier,
  type Product, type InsertProduct,
  type ProductBundleComponent, type InsertProductBundleComponent,
  type ProductUnit, type InsertProductUnit,
  type ProductBatch, type InsertProductBatch, type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem, type InvoiceItemBatch, type InsertInvoiceItemBatch,
  type InvoicePayment, type InsertInvoicePayment,
  type DeliveryNote, type InsertDeliveryNote, type DeliveryNoteItem, type InsertDeliveryNoteItem,
  type Quotation, type InsertQuotation, type QuotationItem, type InsertQuotationItem,
  type PurchaseOrder, type InsertPurchaseOrder, type PurchaseOrderItem, type InsertPurchaseOrderItem,
  type Transaction, type InsertTransaction, type Category, type InsertCategory,
  type Setting, type InsertSetting, type ImportExportLog, type InsertImportExportLog,
  type PrintSettings, type InsertPrintSettings,
  type PaymentType, type InsertPaymentType, type PaymentTerm, type InsertPaymentTerm,
  type CashAccount, type InsertCashAccount, type AccountTransfer, type InsertAccountTransfer,
  type GoodsReceipt, type InsertGoodsReceipt, type GoodsReceiptItem, type InsertGoodsReceiptItem,
  type GoodsReceiptPayment, type InsertGoodsReceiptPayment,
  type Return, type InsertReturn, type ReturnItem, type InsertReturnItem,
  type CreditNoteUsage, type InsertCreditNoteUsage
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
  getProductBySku(sku: string): Promise<Product | undefined>;
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

  // Product bundle component methods
  getBundleComponents(bundleProductId: number): Promise<(ProductBundleComponent & { componentProduct: Product })[]>;
  setBundleComponents(bundleProductId: number, components: { componentProductId: number; quantity: number | string }[]): Promise<ProductBundleComponent[]>;
  getBundleStock(bundleProductId: number, storeId: number): Promise<number>;

  // Product unit methods
  getProductUnits(productId: number): Promise<ProductUnit[]>;
  getProductUnit(id: number): Promise<ProductUnit | undefined>;
  setProductUnits(productId: number, units: InsertProductUnit[]): Promise<ProductUnit[]>;
  deleteProductUnit(id: number): Promise<void>;

  // Invoice methods
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceWithItems(id: number): Promise<{ invoice: Invoice, items: InvoiceItem[], client?: Client } | undefined>;
  getInvoices(storeId: number): Promise<(Invoice & { clientName: string | null })[]>;
  getInvoicesByClient(clientId: number): Promise<Invoice[]>;
  getRecentInvoices(storeId: number, limit: number): Promise<Invoice[]>;
  getOpenInvoices(storeId: number): Promise<Invoice[]>;
  getReturnableInvoices(storeId: number): Promise<(Invoice & { clientName: string | null; lastPaymentDate: Date | null })[]>;
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

  // Delivery note methods
  getDeliveryNote(id: number): Promise<DeliveryNote | undefined>;
  getDeliveryNoteWithItems(id: number): Promise<{ deliveryNote: DeliveryNote, items: (DeliveryNoteItem & { invoiceItem: InvoiceItem & { product: Product } })[] } | undefined>;
  getDeliveryNotesByInvoice(invoiceId: number): Promise<DeliveryNote[]>;
  getDeliveryNotes(storeId: number): Promise<DeliveryNote[]>;
  getDeliveryNotesWithDetails(storeId: number, status?: string): Promise<(DeliveryNote & { invoice: Invoice & { client: Client | null }, itemCount: number })[]>;
  getInvoiceDeliveryStatus(invoiceId: number): Promise<{ orderedItems: { invoiceItemId: number; description: string; quantity: number; delivered: number; remaining: number }[]; fullyDelivered: boolean }>;
  createDeliveryNote(deliveryNote: InsertDeliveryNote, items: InsertDeliveryNoteItem[]): Promise<DeliveryNote>;
  updateDeliveryNote(id: number, deliveryNote: Partial<InsertDeliveryNote>): Promise<DeliveryNote>;
  deleteDeliveryNote(id: number): Promise<void>;
  getNextDeliveryNoteNumber(deliveryDate?: Date): Promise<string>;

  // Quotation methods
  getQuotation(id: number): Promise<Quotation | undefined>;
  getQuotationWithItems(id: number): Promise<{ quotation: Quotation, items: QuotationItem[], client?: Client } | undefined>;
  getQuotations(storeId: number): Promise<(Quotation & { clientName: string | null })[]>;
  createQuotation(quotation: InsertQuotation, items: InsertQuotationItem[]): Promise<Quotation>;
  updateQuotation(id: number, quotation: Partial<InsertQuotation>, items?: InsertQuotationItem[]): Promise<Quotation>;
  patchQuotation(id: number, data: { status?: string; rejectionReason?: string }): Promise<Quotation>;
  convertQuotationToInvoice(id: number): Promise<Invoice>;
  deleteQuotation(id: number): Promise<void>;

  // Purchase Order methods
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
  getPurchaseOrderWithItems(id: number): Promise<{ purchaseOrder: PurchaseOrder, items: PurchaseOrderItem[] } | undefined>;
  getPurchaseOrders(storeId: number): Promise<PurchaseOrder[]>;
  getPendingPOQuantityByProduct(storeId: number): Promise<Map<number, number>>;
  getReceivedQuantitiesForPO(purchaseOrderId: number): Promise<Map<number, string>>;
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
  getNextSupplierNumber(): Promise<string>;

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
  getPaymentTypeByName(storeId: number, name: string): Promise<PaymentType | undefined>;
  createPaymentType(paymentType: InsertPaymentType): Promise<PaymentType>;
  updatePaymentType(id: number, paymentType: Partial<InsertPaymentType>): Promise<PaymentType>;
  deletePaymentType(id: number): Promise<void>;

  // Payment Terms methods
  getPaymentTerms(storeId: number): Promise<PaymentTerm[]>;
  getPaymentTerm(id: number): Promise<PaymentTerm | undefined>;
  createPaymentTerm(paymentTerm: InsertPaymentTerm): Promise<PaymentTerm>;
  updatePaymentTerm(id: number, paymentTerm: Partial<InsertPaymentTerm>): Promise<PaymentTerm>;
  deletePaymentTerm(id: number): Promise<void>;

  // Cash Account methods
  getCashAccounts(storeId: number): Promise<CashAccount[]>;
  getCashAccount(id: number): Promise<CashAccount | undefined>;
  getCashAccountWithBalance(id: number): Promise<CashAccountWithBalance | undefined>;
  getCashAccountsWithBalance(storeId: number): Promise<CashAccountWithBalance[]>;
  createCashAccount(account: InsertCashAccount): Promise<CashAccount>;
  updateCashAccount(id: number, account: Partial<InsertCashAccount>): Promise<CashAccount>;
  deleteCashAccount(id: number): Promise<void>;

  // Account Transfer methods
  getAccountTransfers(storeId: number): Promise<AccountTransfer[]>;
  getAccountTransfer(id: number): Promise<AccountTransfer | undefined>;
  createAccountTransfer(transfer: InsertAccountTransfer): Promise<AccountTransfer>;
  updateAccountTransfer(id: number, transfer: Partial<InsertAccountTransfer>): Promise<AccountTransfer>;
  deleteAccountTransfer(id: number): Promise<void>;

  // Import/Export methods
  createImportExportLog(log: InsertImportExportLog): Promise<ImportExportLog>;
  getImportExportLogs(userId: number): Promise<ImportExportLog[]>;

  // Goods Receipt methods
  getGoodsReceipt(id: number): Promise<GoodsReceipt | undefined>;
  getGoodsReceiptWithItems(id: number): Promise<{ goodsReceipt: GoodsReceipt, items: GoodsReceiptItem[], payments: GoodsReceiptPayment[] } | undefined>;
  getGoodsReceipts(storeId: number): Promise<GoodsReceipt[]>;
  getGoodsReceiptsWithPendingReturns(storeId: number): Promise<GoodsReceipt[]>;
  createGoodsReceipt(goodsReceipt: InsertGoodsReceipt, items: Array<InsertGoodsReceiptItem & { productId: number }>): Promise<GoodsReceipt>;
  updateGoodsReceipt(id: number, goodsReceipt: Partial<InsertGoodsReceipt>, items?: Array<InsertGoodsReceiptItem & { id?: number, productId: number }>): Promise<GoodsReceipt>;
  updateGoodsReceiptStatus(id: number, status: string): Promise<GoodsReceipt>;
  deleteGoodsReceipt(id: number): Promise<void>;
  getNextGoodsReceiptNumber(receiptDate?: Date): Promise<string>;

  // Goods Receipt Item methods
  updateGoodsReceiptItem(id: number, item: Partial<InsertGoodsReceiptItem>): Promise<GoodsReceiptItem>;

  // Goods Receipt Payment methods
  getGoodsReceiptPayment(paymentId: number): Promise<GoodsReceiptPayment | undefined>;
  getGoodsReceiptPayments(goodsReceiptId: number): Promise<GoodsReceiptPayment[]>;
  createGoodsReceiptPayment(payment: InsertGoodsReceiptPayment): Promise<GoodsReceiptPayment>;
  updateGoodsReceiptPayment(id: number, payment: Partial<InsertGoodsReceiptPayment>): Promise<GoodsReceiptPayment>;
  deleteGoodsReceiptPayment(id: number): Promise<void>;

  // Returns/Credit Note methods
  getReturn(id: number): Promise<Return | undefined>;
  getReturnWithItems(id: number): Promise<{ return: Return, items: (ReturnItem & { invoiceItem: InvoiceItem & { product: Product } })[], usages: CreditNoteUsage[], invoice: Invoice, client: Client } | undefined>;
  getReturns(storeId: number): Promise<Return[]>;
  getReturnsWithDetails(storeId: number): Promise<(Return & { invoice: Invoice, client: Client })[]>;
  getClientCreditNotes(clientId: number): Promise<(Return & { remainingBalance: number })[]>;
  createReturn(returnData: InsertReturn, items: InsertReturnItem[]): Promise<Return>;
  updateReturn(id: number, returnData: Partial<InsertReturn>, items?: InsertReturnItem[]): Promise<Return>;
  updateReturnStatus(id: number, status: string): Promise<Return>;
  deleteReturn(id: number): Promise<void>;
  getNextReturnNumber(returnDate?: Date): Promise<string>;

  // Credit Note Usage methods
  getCreditNoteUsages(returnId: number): Promise<CreditNoteUsage[]>;
  createCreditNoteUsage(usage: InsertCreditNoteUsage): Promise<CreditNoteUsage>;
  applyCreditNoteToPayment(returnId: number, invoicePaymentId: number, amount: number): Promise<CreditNoteUsage>;
  convertCreditNoteToRefund(returnId: number, amount: number): Promise<CreditNoteUsage>;

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

export type CashAccountWithBalance = CashAccount & {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalTransfersIn: number;
  totalTransfersOut: number;
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
  columnKey: string,
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
            [columnKey]: uniqueNumber
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
    return createWithSimpleSequentialNumber<Client>(clients, clients.clientNumber, "clientNumber", "C", client);
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
    return createWithSimpleSequentialNumber<Supplier>(suppliers, suppliers.supplierNumber, "supplierNumber", "S", supplier);
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
    const query = db.select().from(products);

    // If storeId is provided, we filter only products that have batches in the specified store
    if (storeId) {
      const productsInStore = await db.execute(sql`
        SELECT DISTINCT p.*
        FROM ${products} p
        JOIN ${productBatches} pb ON p.id = pb.product_id
        WHERE pb.store_id = ${storeId}
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

  // Product bundle component methods
  async getBundleComponents(bundleProductId: number): Promise<(ProductBundleComponent & { componentProduct: Product })[]> {
    const components = await db
      .select()
      .from(productBundleComponents)
      .where(eq(productBundleComponents.bundleProductId, bundleProductId));
    
    // Fetch component products
    const result: (ProductBundleComponent & { componentProduct: Product })[] = [];
    for (const component of components) {
      const [componentProduct] = await db
        .select()
        .from(products)
        .where(eq(products.id, component.componentProductId));
      if (componentProduct) {
        result.push({ ...component, componentProduct });
      }
    }
    return result;
  }

  async setBundleComponents(bundleProductId: number, components: { componentProductId: number; quantity: number | string }[]): Promise<ProductBundleComponent[]> {
    // Delete existing components
    await db.delete(productBundleComponents).where(eq(productBundleComponents.bundleProductId, bundleProductId));
    
    if (components.length === 0) {
      return [];
    }
    
    // Insert new components
    const newComponents = await db
      .insert(productBundleComponents)
      .values(
        components.map(c => ({
          bundleProductId,
          componentProductId: c.componentProductId,
          quantity: String(c.quantity)
        }))
      )
      .returning();
    
    return newComponents;
  }

  async getBundleStock(bundleProductId: number, storeId: number): Promise<number> {
    // Get bundle components
    const components = await db
      .select()
      .from(productBundleComponents)
      .where(eq(productBundleComponents.bundleProductId, bundleProductId));
    
    if (components.length === 0) {
      return 0;
    }
    
    // Calculate minimum number of bundles that can be formed
    let minBundles = Infinity;
    
    for (const component of components) {
      // Get total stock for this component product in the store
      const batches = await db
        .select({ remainingQuantity: productBatches.remainingQuantity })
        .from(productBatches)
        .where(
          and(
            eq(productBatches.productId, component.componentProductId),
            eq(productBatches.storeId, storeId)
          )
        );
      
      const totalStock = batches.reduce((sum, b) => sum + parseFloat(b.remainingQuantity || '0'), 0);
      const requiredQty = parseFloat(component.quantity);
      const possibleBundles = Math.floor(totalStock / requiredQty);
      
      minBundles = Math.min(minBundles, possibleBundles);
    }
    
    return minBundles === Infinity ? 0 : minBundles;
  }

  // Product unit methods
  async getProductUnits(productId: number): Promise<ProductUnit[]> {
    return db
      .select()
      .from(productUnits)
      .where(eq(productUnits.productId, productId))
      .orderBy(productUnits.conversionFactor);
  }

  async getProductUnit(id: number): Promise<ProductUnit | undefined> {
    const [unit] = await db.select().from(productUnits).where(eq(productUnits.id, id));
    return unit;
  }

  async setProductUnits(productId: number, units: InsertProductUnit[]): Promise<ProductUnit[]> {
    // Delete existing units for this product
    await db.delete(productUnits).where(eq(productUnits.productId, productId));
    
    if (units.length === 0) {
      return [];
    }
    
    // Insert new units
    const newUnits = await db
      .insert(productUnits)
      .values(units.map(u => ({ ...u, productId })))
      .returning();
    
    return newUnits;
  }

  async deleteProductUnit(id: number): Promise<void> {
    await db.delete(productUnits).where(eq(productUnits.id, id));
  }

  // Helper method to check and update overdue status automatically
  private async checkAndUpdateOverdueStatus(invoice: Invoice): Promise<Invoice> {
    // Only check for invoices that are not already paid, void, overdue, or draft
    if (invoice.status === 'paid' || invoice.status === 'void' || invoice.status === 'overdue' || invoice.status === 'draft') {
      return invoice;
    }
    
    // Skip if no due date is set
    if (!invoice.dueDate) {
      return invoice;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(invoice.dueDate);
    // Skip if invalid date
    if (isNaN(dueDate.getTime())) {
      return invoice;
    }
    dueDate.setHours(0, 0, 0, 0);
    
    // If due date has passed, update to overdue
    if (dueDate < today) {
      const [updatedInvoice] = await db
        .update(invoices)
        .set({ status: 'overdue', updatedAt: new Date() })
        .where(eq(invoices.id, invoice.id))
        .returning();
      return updatedInvoice;
    }
    
    return invoice;
  }

  // Invoice methods
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return undefined;
    return this.checkAndUpdateOverdueStatus(invoice);
  }

  async getInvoiceWithItems(id: number): Promise<{ invoice: Invoice; items: InvoiceItem[]; client?: Client } | undefined> {
    let [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));

    if (!invoice) {
      return undefined;
    }

    // Check and update overdue status
    invoice = await this.checkAndUpdateOverdueStatus(invoice);

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
      .orderBy(desc(invoices.id));

    // Check and update overdue status for applicable invoices
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const updatedResults = await Promise.all(
      results.map(async (invoice) => {
        // Only check for invoices that are sent or pending (not paid, void, overdue, or draft)
        if (invoice.status === 'sent' || invoice.status === 'pending') {
          // Skip if no due date is set
          if (!invoice.dueDate) {
            return invoice;
          }
          
          const dueDate = new Date(invoice.dueDate);
          // Skip if invalid date
          if (isNaN(dueDate.getTime())) {
            return invoice;
          }
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDate < today) {
            // Update status to overdue
            await db
              .update(invoices)
              .set({ status: 'overdue', updatedAt: new Date() })
              .where(eq(invoices.id, invoice.id));
            return { ...invoice, status: 'overdue' as const };
          }
        }
        return invoice;
      })
    );

    return updatedResults;
  }

  async getInvoicesByClient(clientId: number): Promise<Invoice[]> {
    const results = await db
      .select()
      .from(invoices)
      .where(eq(invoices.clientId, clientId))
      .orderBy(desc(invoices.issueDate));
    
    return Promise.all(results.map(inv => this.checkAndUpdateOverdueStatus(inv)));
  }

  async getRecentInvoices(storeId: number, limit: number): Promise<Invoice[]> {
    const results = await db
      .select()
      .from(invoices)
      .where(eq(invoices.storeId, storeId))
      .orderBy(desc(invoices.issueDate))
      .limit(limit);
    
    // Apply overdue check
    return Promise.all(results.map(inv => this.checkAndUpdateOverdueStatus(inv)));
  }

  async getOpenInvoices(storeId: number): Promise<Invoice[]> {
    // Include 'pending' in the query since those could become overdue
    const results = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.storeId, storeId),
          inArray(invoices.status, ["draft", "sent", "pending", "overdue"])
        )
      )
      .orderBy(desc(invoices.issueDate));
    
    // Apply overdue check
    return Promise.all(results.map(inv => this.checkAndUpdateOverdueStatus(inv)));
  }

  async getReturnableInvoices(storeId: number): Promise<(Invoice & { clientName: string | null; lastPaymentDate: Date | null })[]> {
    // Get paid invoices where the last payment was within 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // First, get all paid invoices with their last payment date
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
        clientName: clients.name,
        lastPaymentDate: sql<Date>`(SELECT MAX(payment_date) FROM invoice_payments WHERE invoice_id = ${invoices.id})`.as('lastPaymentDate')
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(
        and(
          eq(invoices.storeId, storeId),
          eq(invoices.status, 'paid')
        )
      )
      .orderBy(desc(invoices.id));
    
    // Filter to only include invoices with last payment within 7 days
    return results.filter(inv => {
      if (!inv.lastPaymentDate) return false;
      const paymentDate = new Date(inv.lastPaymentDate);
      return paymentDate >= sevenDaysAgo;
    }) as (Invoice & { clientName: string | null; lastPaymentDate: Date | null })[];
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

  // Delivery note methods
  async getDeliveryNote(id: number): Promise<DeliveryNote | undefined> {
    const [deliveryNote] = await db.select().from(deliveryNotes).where(eq(deliveryNotes.id, id));
    return deliveryNote;
  }

  async getDeliveryNoteWithItems(id: number): Promise<{ deliveryNote: DeliveryNote, items: (DeliveryNoteItem & { invoiceItem: InvoiceItem & { product: Product } })[] } | undefined> {
    const [deliveryNote] = await db.select().from(deliveryNotes).where(eq(deliveryNotes.id, id));
    if (!deliveryNote) {
      return undefined;
    }

    const rawItems = await db
      .select()
      .from(deliveryNoteItems)
      .innerJoin(invoiceItems, eq(deliveryNoteItems.invoiceItemId, invoiceItems.id))
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .where(eq(deliveryNoteItems.deliveryNoteId, id));

    const items = rawItems.map(row => ({
      ...row.delivery_note_items,
      invoiceItem: {
        ...row.invoice_items,
        product: row.products
      }
    })) as (DeliveryNoteItem & { invoiceItem: InvoiceItem & { product: Product } })[];

    return { deliveryNote, items };
  }

  async getDeliveryNotesByInvoice(invoiceId: number): Promise<DeliveryNote[]> {
    return db
      .select()
      .from(deliveryNotes)
      .where(eq(deliveryNotes.invoiceId, invoiceId))
      .orderBy(desc(deliveryNotes.deliveryDate));
  }

  async getDeliveryNotes(storeId: number): Promise<DeliveryNote[]> {
    return db
      .select()
      .from(deliveryNotes)
      .where(eq(deliveryNotes.storeId, storeId))
      .orderBy(desc(deliveryNotes.deliveryDate));
  }

  async getDeliveryNotesWithDetails(storeId: number, status?: string): Promise<(DeliveryNote & { invoice: Invoice & { client: Client | null }, itemCount: number })[]> {
    const conditions = [eq(deliveryNotes.storeId, storeId)];
    if (status) {
      conditions.push(eq(deliveryNotes.status, status as "pending" | "delivered" | "cancelled"));
    }
    
    // Use a single query with JOINs and subquery for item count to avoid N+1
    const results = await db
      .select({
        // Delivery note fields
        id: deliveryNotes.id,
        storeId: deliveryNotes.storeId,
        invoiceId: deliveryNotes.invoiceId,
        deliveryNumber: deliveryNotes.deliveryNumber,
        deliveryDate: deliveryNotes.deliveryDate,
        deliveryType: deliveryNotes.deliveryType,
        status: deliveryNotes.status,
        vehicleInfo: deliveryNotes.vehicleInfo,
        driverName: deliveryNotes.driverName,
        recipientName: deliveryNotes.recipientName,
        notes: deliveryNotes.notes,
        createdAt: deliveryNotes.createdAt,
        updatedAt: deliveryNotes.updatedAt,
        // Invoice fields
        invoiceStoreId: invoices.storeId,
        invoiceNumber: invoices.invoiceNumber,
        invoiceClientId: invoices.clientId,
        invoiceIssueDate: invoices.issueDate,
        invoiceDueDate: invoices.dueDate,
        invoiceStatus: invoices.status,
        invoiceSubtotal: invoices.subtotal,
        invoiceTaxRate: invoices.taxRate,
        invoiceTaxAmount: invoices.taxAmount,
        invoiceDiscount: invoices.discount,
        invoiceShipping: invoices.shipping,
        invoiceTotalAmount: invoices.totalAmount,
        invoiceTotalProfit: invoices.totalProfit,
        invoiceTermsAndConditions: invoices.termsAndConditions,
        invoicePaperSize: invoices.paperSize,
        invoiceNotes: invoices.notes,
        invoiceCreatedAt: invoices.createdAt,
        invoiceUpdatedAt: invoices.updatedAt,
        invoiceDeliveryAddress: invoices.deliveryAddress,
        invoiceDeliveryAddressLink: invoices.deliveryAddressLink,
        invoicePaymentTerms: invoices.paymentTerms,
        invoiceUseFakturPajak: invoices.useFakturPajak,
        invoiceDeliveryType: invoices.deliveryType,
        // Client fields
        clientId: clients.id,
        clientName: clients.name,
        clientEmail: clients.email,
        clientPhone: clients.phone,
        clientAddress: clients.address,
        clientAddressLink: clients.addressLink,
        clientNumber: clients.clientNumber,
        clientTaxNumber: clients.taxNumber,
        clientNotes: clients.notes,
        clientStoreId: clients.storeId,
        clientCreatedAt: clients.createdAt,
        clientUpdatedAt: clients.updatedAt,
        // Item count via subquery
        itemCount: sql<number>`(SELECT COUNT(*) FROM delivery_note_items WHERE delivery_note_id = ${deliveryNotes.id})`.as('itemCount')
      })
      .from(deliveryNotes)
      .innerJoin(invoices, eq(deliveryNotes.invoiceId, invoices.id))
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(deliveryNotes.deliveryDate));
    
    // Transform the flat results back into nested structure
    return results.map(row => ({
      id: row.id,
      storeId: row.storeId,
      invoiceId: row.invoiceId,
      deliveryNumber: row.deliveryNumber,
      deliveryDate: row.deliveryDate,
      deliveryType: row.deliveryType,
      status: row.status,
      vehicleInfo: row.vehicleInfo,
      driverName: row.driverName,
      recipientName: row.recipientName,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      invoice: {
        id: row.invoiceId,
        storeId: row.invoiceStoreId,
        invoiceNumber: row.invoiceNumber,
        clientId: row.invoiceClientId,
        issueDate: row.invoiceIssueDate,
        dueDate: row.invoiceDueDate,
        status: row.invoiceStatus,
        subtotal: row.invoiceSubtotal,
        taxRate: row.invoiceTaxRate,
        taxAmount: row.invoiceTaxAmount,
        discount: row.invoiceDiscount,
        shipping: row.invoiceShipping,
        totalAmount: row.invoiceTotalAmount,
        totalProfit: row.invoiceTotalProfit,
        termsAndConditions: row.invoiceTermsAndConditions,
        paperSize: row.invoicePaperSize,
        notes: row.invoiceNotes,
        createdAt: row.invoiceCreatedAt,
        updatedAt: row.invoiceUpdatedAt,
        deliveryAddress: row.invoiceDeliveryAddress,
        deliveryAddressLink: row.invoiceDeliveryAddressLink,
        paymentTerms: row.invoicePaymentTerms,
        useFakturPajak: row.invoiceUseFakturPajak,
        deliveryType: row.invoiceDeliveryType,
        client: row.clientId ? {
          id: row.clientId,
          storeId: row.clientStoreId!,
          clientNumber: row.clientNumber!,
          name: row.clientName!,
          email: row.clientEmail,
          phone: row.clientPhone,
          address: row.clientAddress,
          addressLink: row.clientAddressLink,
          taxNumber: row.clientTaxNumber,
          notes: row.clientNotes,
          createdAt: row.clientCreatedAt!,
          updatedAt: row.clientUpdatedAt!
        } : null
      },
      itemCount: Number(row.itemCount || 0)
    }));
  }

  async getInvoiceDeliveryStatus(invoiceId: number): Promise<{ orderedItems: { invoiceItemId: number; description: string; quantity: number; delivered: number; remaining: number }[]; fullyDelivered: boolean }> {
    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    const deliveredAmounts = await db
      .select({
        invoiceItemId: deliveryNoteItems.invoiceItemId,
        totalDelivered: sql<string>`SUM(${deliveryNoteItems.deliveredQuantity})`
      })
      .from(deliveryNoteItems)
      .innerJoin(deliveryNotes, eq(deliveryNoteItems.deliveryNoteId, deliveryNotes.id))
      .where(and(
        eq(deliveryNotes.invoiceId, invoiceId),
        inArray(deliveryNotes.status, ['pending', 'delivered'])
      ))
      .groupBy(deliveryNoteItems.invoiceItemId);

    const deliveredMap = new Map(deliveredAmounts.map(d => [d.invoiceItemId, parseFloat(d.totalDelivered || '0')]));

    const orderedItems = items.map(item => {
      const quantity = parseFloat(item.quantity);
      const delivered = deliveredMap.get(item.id) || 0;
      return {
        invoiceItemId: item.id,
        description: item.description,
        quantity,
        delivered,
        remaining: quantity - delivered
      };
    });

    const fullyDelivered = orderedItems.every(item => item.remaining <= 0);

    return { orderedItems, fullyDelivered };
  }

  async createDeliveryNote(deliveryNoteData: InsertDeliveryNote, items: InsertDeliveryNoteItem[]): Promise<DeliveryNote> {
    return withTransaction(async (tx) => {
      // Lock the invoice row to prevent concurrent delivery note creation
      const invoiceResult = await tx.execute(
        sql`SELECT * FROM invoices WHERE id = ${deliveryNoteData.invoiceId} FOR UPDATE`
      );
      
      const invoice = (invoiceResult as any)[0];
      if (!invoice) {
        throw new Error(`Invoice with ID ${deliveryNoteData.invoiceId} not found`);
      }

      // Get all existing delivery numbers for this invoice
      const existingDNs = await tx
        .select({ deliveryNumber: deliveryNotes.deliveryNumber })
        .from(deliveryNotes)
        .where(eq(deliveryNotes.invoiceId, deliveryNoteData.invoiceId));
      
      // Parse sequences and find max in JavaScript
      let maxSeq = 0;
      for (const dn of existingDNs) {
        const match = dn.deliveryNumber.match(/-(\d+)$/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
      const sequence = maxSeq + 1;
      
      // Generate DN number: DN-{invoice_number_without_prefix}-{sequence}
      // e.g., INV-2601-0003 -> DN-2601-0003-1
      const invoiceNumberPart = invoice.invoice_number.replace(/^INV-/, '');
      const deliveryNumber = `DN-${invoiceNumberPart}-${sequence}`;

      const [newDeliveryNote] = await tx
        .insert(deliveryNotes)
        .values({
          ...deliveryNoteData,
          deliveryNumber
        })
        .returning();

      if (items.length > 0) {
        await tx
          .insert(deliveryNoteItems)
          .values(items.map(item => ({
            ...item,
            deliveryNoteId: newDeliveryNote.id
          })));
      }

      return newDeliveryNote;
    });
  }

  async updateDeliveryNote(id: number, deliveryNoteData: Partial<InsertDeliveryNote>): Promise<DeliveryNote> {
    const [updatedDeliveryNote] = await db
      .update(deliveryNotes)
      .set({ ...deliveryNoteData, updatedAt: new Date() })
      .where(eq(deliveryNotes.id, id))
      .returning();

    if (!updatedDeliveryNote) {
      throw new Error(`Delivery note with ID ${id} not found`);
    }

    return updatedDeliveryNote;
  }

  async deleteDeliveryNote(id: number): Promise<void> {
    await db.delete(deliveryNotes).where(eq(deliveryNotes.id, id));
  }

  async getNextDeliveryNoteNumber(deliveryDate?: Date): Promise<string> {
    const date = deliveryDate || new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const yearMonth = year + month;
    return generateNextNumber("DN", yearMonth, deliveryNotes, deliveryNotes.deliveryNumber, db);
  }

  // Goods Receipt methods
  async getGoodsReceipt(id: number): Promise<GoodsReceipt | undefined> {
    const [receipt] = await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, id));
    return receipt;
  }

  async getGoodsReceiptWithItems(id: number): Promise<{ goodsReceipt: GoodsReceipt, items: GoodsReceiptItem[], payments: GoodsReceiptPayment[] } | undefined> {
    const [goodsReceipt] = await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, id));
    if (!goodsReceipt) return undefined;

    const items = await db.select().from(goodsReceiptItems).where(eq(goodsReceiptItems.goodsReceiptId, id)).orderBy(goodsReceiptItems.id);
    const payments = await db.select().from(goodsReceiptPayments).where(eq(goodsReceiptPayments.goodsReceiptId, id)).orderBy(desc(goodsReceiptPayments.paymentDate));

    return { goodsReceipt, items, payments };
  }

  async getGoodsReceipts(storeId: number): Promise<GoodsReceipt[]> {
    return db.select().from(goodsReceipts).where(eq(goodsReceipts.storeId, storeId)).orderBy(desc(goodsReceipts.receiptDate));
  }

  async getGoodsReceiptsWithPendingReturns(storeId: number): Promise<GoodsReceipt[]> {
    return db.select().from(goodsReceipts).where(and(eq(goodsReceipts.storeId, storeId), eq(goodsReceipts.hasReturns, true))).orderBy(desc(goodsReceipts.receiptDate));
  }

  async createGoodsReceipt(goodsReceiptData: InsertGoodsReceipt, items: Array<InsertGoodsReceiptItem & { productId: number }>): Promise<GoodsReceipt> {
    return withTransaction(async (tx) => {
      const receiptNumber = await this.getNextGoodsReceiptNumber(goodsReceiptData.receiptDate ? new Date(goodsReceiptData.receiptDate) : undefined);

      const [newReceipt] = await tx.insert(goodsReceipts).values({
        ...goodsReceiptData,
        receiptNumber
      }).returning();

      if (items && items.length > 0) {
        const hasReturns = items.some(item => parseFloat(String(item.returnQuantity || 0)) > 0);
        
        for (const item of items) {
          await tx.insert(goodsReceiptItems).values({
            ...item,
            goodsReceiptId: newReceipt.id
          });
        }

        if (hasReturns) {
          await tx.update(goodsReceipts).set({ hasReturns: true }).where(eq(goodsReceipts.id, newReceipt.id));
        }
      }

      return newReceipt;
    });
  }

  async updateGoodsReceipt(id: number, goodsReceiptData: Partial<InsertGoodsReceipt>, items?: Array<InsertGoodsReceiptItem & { id?: number, productId: number }>): Promise<GoodsReceipt> {
    return withTransaction(async (tx) => {
      const [updatedReceipt] = await tx.update(goodsReceipts)
        .set({ ...goodsReceiptData, updatedAt: new Date() })
        .where(eq(goodsReceipts.id, id))
        .returning();

      if (!updatedReceipt) {
        throw new Error(`Goods Receipt with ID ${id} not found`);
      }

      if (items) {
        await tx.delete(goodsReceiptItems).where(eq(goodsReceiptItems.goodsReceiptId, id));

        const hasReturns = items.some(item => parseFloat(String(item.returnQuantity || 0)) > 0);

        for (const item of items) {
          const { id: itemId, ...itemData } = item;
          await tx.insert(goodsReceiptItems).values({
            ...itemData,
            goodsReceiptId: id
          });
        }

        await tx.update(goodsReceipts).set({ hasReturns }).where(eq(goodsReceipts.id, id));
      }

      return updatedReceipt;
    });
  }

  async updateGoodsReceiptStatus(id: number, status: string): Promise<GoodsReceipt> {
    const [updatedReceipt] = await db.update(goodsReceipts)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(goodsReceipts.id, id))
      .returning();

    if (!updatedReceipt) {
      throw new Error(`Goods Receipt with ID ${id} not found`);
    }

    return updatedReceipt;
  }

  async deleteGoodsReceipt(id: number): Promise<void> {
    await db.delete(goodsReceipts).where(eq(goodsReceipts.id, id));
  }

  async getNextGoodsReceiptNumber(receiptDate?: Date): Promise<string> {
    const date = receiptDate || new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const yearMonth = year + month;
    return generateNextNumber("GR", yearMonth, goodsReceipts, goodsReceipts.receiptNumber, db);
  }

  async updateGoodsReceiptItem(id: number, itemData: Partial<InsertGoodsReceiptItem>): Promise<GoodsReceiptItem> {
    return withTransaction(async (tx) => {
      const [updatedItem] = await tx.update(goodsReceiptItems)
        .set({ ...itemData, updatedAt: new Date() })
        .where(eq(goodsReceiptItems.id, id))
        .returning();

      if (!updatedItem) {
        throw new Error(`Goods Receipt Item with ID ${id} not found`);
      }

      const receiptItems = await tx.select().from(goodsReceiptItems).where(eq(goodsReceiptItems.goodsReceiptId, updatedItem.goodsReceiptId));
      const hasReturns = receiptItems.some(item => parseFloat(String(item.returnQuantity || 0)) > 0 && item.returnStatus !== 'returned');

      await tx.update(goodsReceipts).set({ hasReturns }).where(eq(goodsReceipts.id, updatedItem.goodsReceiptId));

      return updatedItem;
    });
  }

  async getGoodsReceiptPayment(paymentId: number): Promise<GoodsReceiptPayment | undefined> {
    const [payment] = await db.select().from(goodsReceiptPayments).where(eq(goodsReceiptPayments.id, paymentId));
    return payment;
  }

  async getGoodsReceiptPayments(goodsReceiptId: number): Promise<GoodsReceiptPayment[]> {
    return db.select().from(goodsReceiptPayments).where(eq(goodsReceiptPayments.goodsReceiptId, goodsReceiptId)).orderBy(desc(goodsReceiptPayments.paymentDate));
  }

  async createGoodsReceiptPayment(payment: InsertGoodsReceiptPayment): Promise<GoodsReceiptPayment> {
    return withTransaction(async (tx) => {
      const [newPayment] = await tx.insert(goodsReceiptPayments).values(payment).returning();

      const allPayments = await tx.select().from(goodsReceiptPayments).where(eq(goodsReceiptPayments.goodsReceiptId, payment.goodsReceiptId));
      const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

      const [receipt] = await tx.select().from(goodsReceipts).where(eq(goodsReceipts.id, payment.goodsReceiptId));
      const totalAmount = parseFloat(String(receipt.totalAmount));

      let newStatus = receipt.status;
      if (totalPaid >= totalAmount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial_paid';
      }

      await tx.update(goodsReceipts).set({ amountPaid: String(totalPaid), status: newStatus, updatedAt: new Date() }).where(eq(goodsReceipts.id, payment.goodsReceiptId));

      return newPayment;
    });
  }

  async updateGoodsReceiptPayment(id: number, paymentData: Partial<InsertGoodsReceiptPayment>): Promise<GoodsReceiptPayment> {
    return withTransaction(async (tx) => {
      const [updatedPayment] = await tx.update(goodsReceiptPayments)
        .set({ ...paymentData, updatedAt: new Date() })
        .where(eq(goodsReceiptPayments.id, id))
        .returning();

      if (!updatedPayment) {
        throw new Error(`Goods Receipt Payment with ID ${id} not found`);
      }

      const allPayments = await tx.select().from(goodsReceiptPayments).where(eq(goodsReceiptPayments.goodsReceiptId, updatedPayment.goodsReceiptId));
      const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

      const [receipt] = await tx.select().from(goodsReceipts).where(eq(goodsReceipts.id, updatedPayment.goodsReceiptId));
      const totalAmount = parseFloat(String(receipt.totalAmount));

      let newStatus = receipt.status;
      if (receipt.status !== 'draft' && receipt.status !== 'cancelled') {
        if (totalPaid >= totalAmount) {
          newStatus = 'paid';
        } else if (totalPaid > 0) {
          newStatus = 'partial_paid';
        } else {
          newStatus = 'confirmed';
        }
      }

      await tx.update(goodsReceipts).set({ amountPaid: String(totalPaid), status: newStatus, updatedAt: new Date() }).where(eq(goodsReceipts.id, updatedPayment.goodsReceiptId));

      return updatedPayment;
    });
  }

  async deleteGoodsReceiptPayment(id: number): Promise<void> {
    await withTransaction(async (tx) => {
      const [payment] = await tx.select().from(goodsReceiptPayments).where(eq(goodsReceiptPayments.id, id));
      if (!payment) return;

      await tx.delete(goodsReceiptPayments).where(eq(goodsReceiptPayments.id, id));

      const allPayments = await tx.select().from(goodsReceiptPayments).where(eq(goodsReceiptPayments.goodsReceiptId, payment.goodsReceiptId));
      const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

      const [receipt] = await tx.select().from(goodsReceipts).where(eq(goodsReceipts.id, payment.goodsReceiptId));
      const totalAmount = parseFloat(String(receipt.totalAmount));

      let newStatus = receipt.status;
      if (receipt.status !== 'draft' && receipt.status !== 'cancelled') {
        if (totalPaid >= totalAmount) {
          newStatus = 'paid';
        } else if (totalPaid > 0) {
          newStatus = 'partial_paid';
        } else {
          newStatus = 'confirmed';
        }
      }

      await tx.update(goodsReceipts).set({ amountPaid: String(totalPaid), status: newStatus, updatedAt: new Date() }).where(eq(goodsReceipts.id, payment.goodsReceiptId));
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

  async updateQuotation(id: number, quotationData: Partial<InsertQuotation>, items?: InsertQuotationItem[]): Promise<Quotation> {
    return withTransaction(async (tx) => {
      // Update quotation data
      const [updatedQuotation] = await tx
        .update(quotations)
        .set({ ...quotationData, updatedAt: new Date() })
        .where(eq(quotations.id, id))
        .returning();
      
      // If items are provided, update them
      if (items && items.length > 0) {
        // Delete existing items
        await tx
          .delete(quotationItems)
          .where(eq(quotationItems.quotationId, id));
        
        // Insert new items
        for (const item of items) {
          await tx
            .insert(quotationItems)
            .values({
              ...item,
              quotationId: id
            });
        }
      }
      
      return updatedQuotation;
    });
  }

  async patchQuotation(id: number, data: { status?: string; rejectionReason?: string }): Promise<Quotation> {
    const [updatedQuotation] = await db
      .update(quotations)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(quotations.id, id))
      .returning();
    
    if (!updatedQuotation) {
      throw new Error(`Quotation with ID ${id} not found`);
    }
    
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
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const yearMonth = year + month;

      const invoiceNumber = await generateNextNumber("INV", yearMonth, invoices, invoices.invoiceNumber, tx);

      // Create a new invoice based on the quotation
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          storeId: quotation.storeId,
          invoiceNumber,
          clientId: quotation.clientId,
          issueDate: issueDate.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
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

      // Update the quotation to mark it as converted (only set convertedToInvoiceId, not status)
      await tx
        .update(quotations)
        .set({ 
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

  async getPendingPOQuantityByProduct(storeId: number): Promise<Map<number, number>> {
    const result = new Map<number, number>();
    
    const activePOs = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.storeId, storeId),
          inArray(purchaseOrders.status, ['pending', 'partial'])
        )
      );
    
    for (const po of activePOs) {
      const items = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, po.id));
      
      for (const item of items) {
        const quantity = parseFloat(item.quantity.toString()) || 0;
        const received = parseFloat(item.receivedQuantity?.toString() || '0') || 0;
        const pending = quantity - received;
        
        if (pending > 0) {
          const current = result.get(item.productId) || 0;
          result.set(item.productId, current + pending);
        }
      }
    }
    
    return result;
  }

  async getReceivedQuantitiesForPO(purchaseOrderId: number): Promise<Map<number, string>> {
    const result = new Map<number, string>();
    
    // Get all goods receipt items linked to this purchase order
    const items = await db
      .select({
        productId: goodsReceiptItems.productId,
        quantity: goodsReceiptItems.quantity,
      })
      .from(goodsReceiptItems)
      .where(eq(goodsReceiptItems.purchaseOrderId, purchaseOrderId));
    
    // Accumulate quantities by productId
    for (const item of items) {
      const qty = parseFloat(item.quantity.toString()) || 0;
      const current = parseFloat(result.get(item.productId) || '0');
      result.set(item.productId, (current + qty).toString());
    }
    
    return result;
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

  async getPaymentTypeByName(storeId: number, name: string): Promise<PaymentType | undefined> {
    const [paymentType] = await db
      .select()
      .from(paymentTypes)
      .where(and(eq(paymentTypes.storeId, storeId), eq(paymentTypes.name, name)));
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
      .from(paymentTermsConfig)
      .where(eq(paymentTermsConfig.storeId, storeId))
      .orderBy(paymentTermsConfig.days);
  }

  async getPaymentTerm(id: number): Promise<PaymentTerm | undefined> {
    const [paymentTerm] = await db
      .select()
      .from(paymentTermsConfig)
      .where(eq(paymentTermsConfig.id, id));
    return paymentTerm;
  }

  async createPaymentTerm(paymentTermData: InsertPaymentTerm): Promise<PaymentTerm> {
    const [newPaymentTerm] = await db
      .insert(paymentTermsConfig)
      .values(paymentTermData)
      .returning();
    return newPaymentTerm;
  }

  async updatePaymentTerm(id: number, paymentTermData: Partial<InsertPaymentTerm>): Promise<PaymentTerm> {
    const [updatedPaymentTerm] = await db
      .update(paymentTermsConfig)
      .set({ ...paymentTermData, updatedAt: new Date() })
      .where(eq(paymentTermsConfig.id, id))
      .returning();
    return updatedPaymentTerm;
  }

  async deletePaymentTerm(id: number): Promise<void> {
    await db.delete(paymentTermsConfig).where(eq(paymentTermsConfig.id, id));
  }

  // Cash Account methods
  async getCashAccounts(storeId: number): Promise<CashAccount[]> {
    return db
      .select()
      .from(cashAccounts)
      .where(eq(cashAccounts.storeId, storeId))
      .orderBy(cashAccounts.name);
  }

  async getCashAccount(id: number): Promise<CashAccount | undefined> {
    const [account] = await db
      .select()
      .from(cashAccounts)
      .where(eq(cashAccounts.id, id));
    return account;
  }

  async getCashAccountWithBalance(id: number): Promise<CashAccountWithBalance | undefined> {
    const account = await this.getCashAccount(id);
    if (!account) return undefined;

    // Get total income for this account
    const incomeResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as total
      FROM ${transactions}
      WHERE account_id = ${id} AND type = 'income'
    `);
    const totalIncome = parseFloat(incomeResult[0]?.total || '0');

    // Get total expenses for this account
    const expenseResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as total
      FROM ${transactions}
      WHERE account_id = ${id} AND type = 'expense'
    `);
    const totalExpense = parseFloat(expenseResult[0]?.total || '0');

    // Get total transfers in
    const transfersInResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as total
      FROM ${accountTransfers}
      WHERE to_account_id = ${id}
    `);
    const totalTransfersIn = parseFloat(transfersInResult[0]?.total || '0');

    // Get total transfers out
    const transfersOutResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as total
      FROM ${accountTransfers}
      WHERE from_account_id = ${id}
    `);
    const totalTransfersOut = parseFloat(transfersOutResult[0]?.total || '0');

    const initialBalance = parseFloat(account.initialBalance || '0');
    const currentBalance = initialBalance + totalIncome - totalExpense + totalTransfersIn - totalTransfersOut;

    return {
      ...account,
      currentBalance,
      totalIncome,
      totalExpense,
      totalTransfersIn,
      totalTransfersOut
    };
  }

  async getCashAccountsWithBalance(storeId: number): Promise<CashAccountWithBalance[]> {
    const accounts = await this.getCashAccounts(storeId);
    const accountsWithBalance: CashAccountWithBalance[] = [];

    for (const account of accounts) {
      const withBalance = await this.getCashAccountWithBalance(account.id);
      if (withBalance) {
        accountsWithBalance.push(withBalance);
      }
    }

    return accountsWithBalance;
  }

  async createCashAccount(account: InsertCashAccount): Promise<CashAccount> {
    const [newAccount] = await db
      .insert(cashAccounts)
      .values(account)
      .returning();
    return newAccount;
  }

  async updateCashAccount(id: number, account: Partial<InsertCashAccount>): Promise<CashAccount> {
    const [updatedAccount] = await db
      .update(cashAccounts)
      .set({ ...account, updatedAt: new Date() })
      .where(eq(cashAccounts.id, id))
      .returning();
    return updatedAccount;
  }

  async deleteCashAccount(id: number): Promise<void> {
    await db.delete(cashAccounts).where(eq(cashAccounts.id, id));
  }

  // Account Transfer methods
  async getAccountTransfers(storeId: number): Promise<AccountTransfer[]> {
    return db
      .select()
      .from(accountTransfers)
      .where(eq(accountTransfers.storeId, storeId))
      .orderBy(desc(accountTransfers.date));
  }

  async getAccountTransfer(id: number): Promise<AccountTransfer | undefined> {
    const [transfer] = await db
      .select()
      .from(accountTransfers)
      .where(eq(accountTransfers.id, id));
    return transfer;
  }

  async createAccountTransfer(transfer: InsertAccountTransfer): Promise<AccountTransfer> {
    const [newTransfer] = await db
      .insert(accountTransfers)
      .values(transfer)
      .returning();
    return newTransfer;
  }

  async updateAccountTransfer(id: number, transfer: Partial<InsertAccountTransfer>): Promise<AccountTransfer> {
    const [updatedTransfer] = await db
      .update(accountTransfers)
      .set({ ...transfer, updatedAt: new Date() })
      .where(eq(accountTransfers.id, id))
      .returning();
    return updatedTransfer;
  }

  async deleteAccountTransfer(id: number): Promise<void> {
    await db.delete(accountTransfers).where(eq(accountTransfers.id, id));
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
    startOfWeek.setDate(today.getDay()); // Sunday of current week
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Format dates as strings for PostgreSQL
    const startOfDayStr = startOfDay.toISOString().split('T')[0];
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

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

    // Calculate open invoices (excluding paid and cancelled)
    const openInvoicesResult = await db.execute(sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount::numeric), 0) as value
      FROM ${invoices}
      WHERE store_id = ${storeId} AND status IN ('draft', 'sent', 'overdue')
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
        AND issue_date >= ${startOfDayStr}
    `);

    const salesThisWeekResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${invoices}
      WHERE store_id = ${storeId} 
        AND status = 'paid'
        AND issue_date >= ${startOfWeekStr}
    `);

    const salesThisMonthResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${invoices}
      WHERE store_id = ${storeId} 
        AND status = 'paid'
        AND issue_date >= ${startOfMonthStr}
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

  async getInvoiceStatusSummary(storeId: number): Promise<InvoiceStatusSummary> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'paid') as paid,
        COUNT(*) FILTER (WHERE status IN ('sent', 'draft')) as pending,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
        COUNT(*) as total
      FROM ${invoices}
      WHERE store_id = ${storeId}
    `);

    const row = result[0];
    return {
      paid: parseInt(row.paid || '0'),
      pending: parseInt(row.pending || '0'),
      overdue: parseInt(row.overdue || '0'),
      total: parseInt(row.total || '0')
    };
  }

  async getProductSalesByCategory(storeId: number): Promise<CategorySalesData[]> {
    const result = await db.execute(sql`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        COALESCE(SUM(ii.total_amount::numeric), 0) as total_revenue,
        COALESCE(SUM(ii.quantity::numeric), 0) as total_quantity,
        COUNT(DISTINCT p.id) as product_count
      FROM ${categories} c
      INNER JOIN ${products} p ON c.id = p.category_id
      INNER JOIN ${invoiceItems} ii ON p.id = ii.product_id
      INNER JOIN ${invoices} i ON ii.invoice_id = i.id
      WHERE i.store_id = ${storeId} AND i.status = 'paid'
      GROUP BY c.id, c.name
      HAVING COALESCE(SUM(ii.total_amount::numeric), 0) > 0

      UNION ALL

      SELECT 
        NULL as category_id,
        'Uncategorized' as category_name,
        COALESCE(SUM(ii.total_amount::numeric), 0) as total_revenue,
        COALESCE(SUM(ii.quantity::numeric), 0) as total_quantity,
        COUNT(DISTINCT p.id) as product_count
      FROM ${products} p
      INNER JOIN ${invoiceItems} ii ON p.id = ii.product_id
      INNER JOIN ${invoices} i ON ii.invoice_id = i.id
      WHERE p.category_id IS NULL AND i.store_id = ${storeId} AND i.status = 'paid'
      GROUP BY p.category_id
      HAVING COALESCE(SUM(ii.total_amount::numeric), 0) > 0

      ORDER BY total_revenue DESC
    `);

    return result.map(row => ({
      categoryId: row.category_id ? parseInt(row.category_id as string) : null,
      categoryName: row.category_name as string,
      totalRevenue: parseFloat(row.total_revenue as string || '0'),
      totalQuantity: parseFloat(row.total_quantity as string || '0'),
      productCount: parseInt(row.product_count as string || '0')
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

    // Format dates as strings for PostgreSQL
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // Get revenue data
    const revenueResult = await db.execute(sql`
      SELECT 
        DATE(date) as date,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount::numeric ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount::numeric ELSE 0 END), 0) as expenses
      FROM ${transactions}
      WHERE 
        store_id = ${storeId} AND
        date >= ${startStr} AND
        date <= ${endStr}
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

  async getFinancialReport(storeId: number, dateRange: string): Promise<any> {
    const { startDate, endDate } = this.getDateRangeFromString(dateRange);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Get sales revenue from paid invoices
    const salesRevenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_amount::numeric), 0) as sales_revenue
      FROM ${invoices}
      WHERE store_id = ${storeId} 
        AND status = 'paid'
        AND issue_date >= ${startStr}
        AND issue_date <= ${endStr}
    `);

    // Get other income from transactions
    const otherIncomeResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as other_income
      FROM ${transactions}
      WHERE store_id = ${storeId}
        AND type = 'income'
        AND category != 'Sales'
        AND date >= ${startStr}
        AND date <= ${endStr}
    `);

    // Get total COGS from invoices
    const cogsResult = await db.execute(sql`
      SELECT 
        COALESCE(SUM(iib.quantity::numeric * iib.capital_cost::numeric), 0) as total_cogs
      FROM ${invoiceItemBatches} iib
      JOIN ${invoiceItems} ii ON iib.invoice_item_id = ii.id
      JOIN ${invoices} i ON ii.invoice_id = i.id
      WHERE i.store_id = ${storeId}
        AND i.status = 'paid'
        AND i.issue_date >= ${startStr}
        AND i.issue_date <= ${endStr}
    `);

    // Get inventory values
    const inventoryResult = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN pb.purchase_date < ${startStr} THEN pb.remaining_quantity::numeric * pb.capital_cost::numeric ELSE 0 END), 0) as beginning_inventory,
        COALESCE(SUM(pb.remaining_quantity::numeric * pb.capital_cost::numeric), 0) as ending_inventory,
        COALESCE(SUM(CASE WHEN pb.purchase_date >= ${startStr} AND pb.purchase_date <= ${endStr} THEN pb.initial_quantity::numeric * pb.capital_cost::numeric ELSE 0 END), 0) as purchases
      FROM ${productBatches} pb
      WHERE pb.store_id = ${storeId}
    `);

    // Get operating expenses
    const operatingExpensesResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as operating_expenses
      FROM ${transactions}
      WHERE store_id = ${storeId}
        AND type = 'expense'
        AND date >= ${startStr}
        AND date <= ${endStr}
    `);

    const salesRevenue = parseFloat(salesRevenueResult[0]?.sales_revenue || '0');
    const otherIncome = parseFloat(otherIncomeResult[0]?.other_income || '0');
    const totalRevenue = salesRevenue + otherIncome;

    const beginningInventory = parseFloat(inventoryResult[0]?.beginning_inventory || '0');
    const purchases = parseFloat(inventoryResult[0]?.purchases || '0');
    const endingInventory = parseFloat(inventoryResult[0]?.ending_inventory || '0');
    const totalCOGS = parseFloat(cogsResult[0]?.total_cogs || '0');

    const operatingExpenses = parseFloat(operatingExpensesResult[0]?.operating_expenses || '0');
    const otherExpenses = 0; // Can be expanded later

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - operatingExpenses - otherExpenses;

    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      revenue: {
        salesRevenue,
        otherIncome,
        totalRevenue
      },
      cogs: {
        beginningInventory,
        purchases,
        endingInventory,
        totalCOGS
      },
      expenses: {
        operatingExpenses,
        otherExpenses,
        totalExpenses: operatingExpenses + otherExpenses
      },
      profit: {
        grossProfit,
        netProfit,
        grossProfitMargin,
        netProfitMargin
      }
    };
  }

  async getCashFlowReport(storeId: number, dateRange: string): Promise<any> {
    const { startDate, endDate } = this.getDateRangeFromString(dateRange);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Operating activities - cash from sales
    const cashFromSalesResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_amount::numeric), 0) as cash_from_sales
      FROM ${invoices}
      WHERE store_id = ${storeId}
        AND status = 'paid'
        AND issue_date >= ${startStr}
        AND issue_date <= ${endStr}
    `);

    // Cash paid to suppliers (from purchase orders)
    const cashToSuppliersResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_amount::numeric), 0) as cash_to_suppliers
      FROM ${purchaseOrders}
      WHERE store_id = ${storeId}
        AND status IN ('received', 'partial')
        AND order_date >= ${startStr}
        AND order_date <= ${endStr}
    `);

    // Cash paid for expenses
    const cashForExpensesResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as cash_for_expenses
      FROM ${transactions}
      WHERE store_id = ${storeId}
        AND type = 'expense'
        AND date >= ${startStr}
        AND date <= ${endStr}
    `);

    // Equipment purchases (if tracked in transactions)
    const equipmentResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as equipment_purchases
      FROM ${transactions}
      WHERE store_id = ${storeId}
        AND type = 'expense'
        AND category = 'Equipment'
        AND date >= ${startStr}
        AND date <= ${endStr}
    `);

    // Owner investment (if tracked)
    const ownerInvestmentResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as owner_investment
      FROM ${transactions}
      WHERE store_id = ${storeId}
        AND type = 'income'
        AND category = 'Owner Investment'
        AND date >= ${startStr}
        AND date <= ${endStr}
    `);

    const cashFromSales = parseFloat(cashFromSalesResult[0]?.cash_from_sales || '0');
    const cashPaidToSuppliers = parseFloat(cashToSuppliersResult[0]?.cash_to_suppliers || '0');
    const cashPaidForExpenses = parseFloat(cashForExpensesResult[0]?.cash_for_expenses || '0');
    const equipmentPurchases = parseFloat(equipmentResult[0]?.equipment_purchases || '0');
    const ownerInvestment = parseFloat(ownerInvestmentResult[0]?.owner_investment || '0');

    const netOperatingCashFlow = cashFromSales - cashPaidToSuppliers - cashPaidForExpenses;
    const netInvestingCashFlow = -equipmentPurchases;
    const netFinancingCashFlow = ownerInvestment;
    const netCashFlow = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

    // Calculate beginning cash (simplified - would need a proper cash account)
    const beginningCash = 0; // This should be tracked separately
    const endingCash = beginningCash + netCashFlow;

    return {
      operating: {
        cashFromSales,
        cashPaidToSuppliers,
        cashPaidForExpenses,
        netOperatingCashFlow
      },
      investing: {
        equipmentPurchases,
        netInvestingCashFlow
      },
      financing: {
        ownerInvestment,
        netFinancingCashFlow
      },
      netCashFlow,
      beginningCash,
      endingCash
    };
  }

  private getDateRangeFromString(dateRange: string): { startDate: Date; endDate: Date } {
    const today = new Date();
    let endDate = new Date(today);
    let startDate = new Date(today);

    // Handle custom date range format: "custom:YYYY-MM-DD:YYYY-MM-DD"
    if (dateRange.startsWith('custom:')) {
      const parts = dateRange.split(':');
      if (parts.length === 3) {
        startDate = new Date(parts[1]);
        endDate = new Date(parts[2]);
        return { startDate, endDate };
      }
    }

    switch (dateRange) {
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate.setDate(0); // Last day of previous month
        break;
      case 'this_quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'this_year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    return { startDate, endDate };
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
  async getNextClientNumber(): Promise<string> {
    try {
      return withTransaction(async (tx) => {
        return await generateSimpleSequentialNumber("C", clients, clients.clientNumber, tx);
      });
    } catch (error) {
      console.error('Error in getNextClientNumber:', error);
      throw error;
    }
  }

  async getNextSupplierNumber(): Promise<string> {
    try {
      return withTransaction(async (tx) => {
        return await generateSimpleSequentialNumber("S", suppliers, suppliers.supplierNumber, tx);
      });
    } catch (error) {
      console.error('Error in getNextSupplierNumber:', error);
      throw error;
    }
  }

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

  async getNextPurchaseOrderNumber(orderDate?: Date): Promise<string> {
    try {
      const currentDate = orderDate || new Date();
      const year = currentDate.getFullYear().toString().slice(-2);
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const yearMonth = year + month;

      console.log('Generating purchase order number for yearMonth:', yearMonth);

      return withTransaction(async (tx) => {
        return await generateNextNumber("PO", yearMonth, purchaseOrders, purchaseOrders.purchaseOrderNumber, tx);
      });
    } catch (error) {
      console.error('Error in getNextPurchaseOrderNumber:', error);
      throw error;
    }
  }

  // Returns/Credit Note methods
  async getReturn(id: number): Promise<Return | undefined> {
    const [result] = await db.select().from(returns).where(eq(returns.id, id));
    return result;
  }

  async getReturnWithItems(id: number): Promise<{ return: Return, items: (ReturnItem & { invoiceItem: InvoiceItem & { product: Product } })[], usages: CreditNoteUsage[], invoice: Invoice, client: Client } | undefined> {
    const [returnData] = await db.select().from(returns).where(eq(returns.id, id));
    if (!returnData) return undefined;

    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, returnData.invoiceId));
    if (!invoice) return undefined;

    const [client] = await db.select().from(clients).where(eq(clients.id, returnData.clientId));
    if (!client) return undefined;

    const rawItems = await db
      .select()
      .from(returnItems)
      .innerJoin(invoiceItems, eq(returnItems.invoiceItemId, invoiceItems.id))
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .where(eq(returnItems.returnId, id));

    const items = rawItems.map(row => ({
      ...row.return_items,
      invoiceItem: {
        ...row.invoice_items,
        product: row.products
      }
    }));

    const usages = await db.select().from(creditNoteUsages).where(eq(creditNoteUsages.returnId, id)).orderBy(desc(creditNoteUsages.usedAt));

    return { return: returnData, items, usages, invoice, client };
  }

  async getReturns(storeId: number): Promise<Return[]> {
    return db.select().from(returns).where(eq(returns.storeId, storeId)).orderBy(desc(returns.returnDate));
  }

  async getReturnsWithDetails(storeId: number): Promise<(Return & { invoice: Invoice, client: Client })[]> {
    const results = await db
      .select()
      .from(returns)
      .innerJoin(invoices, eq(returns.invoiceId, invoices.id))
      .innerJoin(clients, eq(returns.clientId, clients.id))
      .where(eq(returns.storeId, storeId))
      .orderBy(desc(returns.returnDate));

    return results.map(row => ({
      ...row.returns,
      invoice: row.invoices,
      client: row.clients
    }));
  }

  async getClientCreditNotes(clientId: number): Promise<(Return & { remainingBalance: number })[]> {
    const creditNotes = await db
      .select()
      .from(returns)
      .where(and(
        eq(returns.clientId, clientId),
        eq(returns.returnType, 'credit_note'),
        eq(returns.status, 'completed')
      ))
      .orderBy(desc(returns.returnDate));

    return creditNotes.map(cn => ({
      ...cn,
      remainingBalance: Number(cn.totalAmount) - Number(cn.usedAmount)
    })).filter(cn => cn.remainingBalance > 0);
  }

  async createReturn(returnData: InsertReturn, items: InsertReturnItem[]): Promise<Return> {
    return withTransaction(async (tx) => {
      const [newReturn] = await tx.insert(returns).values(returnData).returning();
      
      if (items.length > 0) {
        await tx.insert(returnItems).values(
          items.map(item => ({
            ...item,
            returnId: newReturn.id
          }))
        );
      }

      return newReturn;
    });
  }

  async updateReturn(id: number, returnData: Partial<InsertReturn>, items?: InsertReturnItem[]): Promise<Return> {
    return withTransaction(async (tx) => {
      // Check if return has usages - if so, only allow updating notes
      const [existingReturn] = await tx.select().from(returns).where(eq(returns.id, id));
      if (!existingReturn) {
        throw new Error("Return not found");
      }
      
      const hasUsages = parseFloat(existingReturn.usedAmount || '0') > 0;
      
      if (hasUsages) {
        // Only allow updating notes if there are usages
        const [updated] = await tx
          .update(returns)
          .set({ notes: returnData.notes, updatedAt: new Date() })
          .where(eq(returns.id, id))
          .returning();
        return updated;
      }
      
      // Full update allowed if no usages
      const [updated] = await tx
        .update(returns)
        .set({ ...returnData, updatedAt: new Date() })
        .where(eq(returns.id, id))
        .returning();
      
      // Update items if provided
      if (items && items.length > 0) {
        await tx.delete(returnItems).where(eq(returnItems.returnId, id));
        await tx.insert(returnItems).values(
          items.map(item => ({
            ...item,
            returnId: id
          }))
        );
        
        // Recalculate total amount
        const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.subtotal as string), 0);
        await tx.update(returns).set({ totalAmount: totalAmount.toString() }).where(eq(returns.id, id));
      }
      
      const [finalReturn] = await tx.select().from(returns).where(eq(returns.id, id));
      return finalReturn;
    });
  }

  async updateReturnStatus(id: number, status: string): Promise<Return> {
    const [updated] = await db
      .update(returns)
      .set({ status: status as "pending" | "completed" | "cancelled", updatedAt: new Date() })
      .where(eq(returns.id, id))
      .returning();
    return updated;
  }

  async deleteReturn(id: number): Promise<void> {
    // Check if return has usages before deleting
    const [existingReturn] = await db.select().from(returns).where(eq(returns.id, id));
    if (existingReturn && parseFloat(existingReturn.usedAmount || '0') > 0) {
      throw new Error("Cannot delete return with existing usages");
    }
    
    await db.delete(returnItems).where(eq(returnItems.returnId, id));
    await db.delete(creditNoteUsages).where(eq(creditNoteUsages.returnId, id));
    await db.delete(returns).where(eq(returns.id, id));
  }

  async getNextReturnNumber(returnDate?: Date): Promise<string> {
    try {
      const currentDate = returnDate || new Date();
      const year = currentDate.getFullYear().toString().slice(-2);
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const yearMonth = year + month;

      return withTransaction(async (tx) => {
        return await generateNextNumber("RTN", yearMonth, returns, returns.returnNumber, tx);
      });
    } catch (error) {
      console.error('Error in getNextReturnNumber:', error);
      throw error;
    }
  }

  // Credit Note Usage methods
  async getCreditNoteUsages(returnId: number): Promise<CreditNoteUsage[]> {
    return db.select().from(creditNoteUsages).where(eq(creditNoteUsages.returnId, returnId)).orderBy(desc(creditNoteUsages.usedAt));
  }

  async createCreditNoteUsage(usage: InsertCreditNoteUsage): Promise<CreditNoteUsage> {
    const [newUsage] = await db.insert(creditNoteUsages).values(usage).returning();
    return newUsage;
  }

  async applyCreditNoteToPayment(returnId: number, invoicePaymentId: number, amount: number): Promise<CreditNoteUsage> {
    return withTransaction(async (tx) => {
      // Create the usage record
      const [usage] = await tx.insert(creditNoteUsages).values({
        returnId,
        invoicePaymentId,
        amount: amount.toString(),
        usageType: 'payment',
        notes: 'Applied to invoice payment'
      }).returning();

      // Update the return's used amount
      await tx
        .update(returns)
        .set({ 
          usedAmount: sql`${returns.usedAmount} + ${amount}`,
          updatedAt: new Date()
        })
        .where(eq(returns.id, returnId));

      // Check if credit note is fully used and auto-complete it
      const [updated] = await tx.select().from(returns).where(eq(returns.id, returnId));
      if (updated && parseFloat(updated.usedAmount || '0') >= parseFloat(updated.totalAmount || '0')) {
        await tx.update(returns).set({ status: 'completed', updatedAt: new Date() }).where(eq(returns.id, returnId));
      }

      return usage;
    });
  }

  async convertCreditNoteToRefund(returnId: number, amount: number): Promise<CreditNoteUsage> {
    return withTransaction(async (tx) => {
      // Create the usage record for refund conversion
      const [usage] = await tx.insert(creditNoteUsages).values({
        returnId,
        invoicePaymentId: null,
        amount: amount.toString(),
        usageType: 'refund',
        notes: 'Converted to cash refund'
      }).returning();

      // Update the return's used amount
      await tx
        .update(returns)
        .set({ 
          usedAmount: sql`${returns.usedAmount} + ${amount}`,
          updatedAt: new Date()
        })
        .where(eq(returns.id, returnId));

      // Check if credit note is fully used and auto-complete it
      const [updated] = await tx.select().from(returns).where(eq(returns.id, returnId));
      if (updated && parseFloat(updated.usedAmount || '0') >= parseFloat(updated.totalAmount || '0')) {
        await tx.update(returns).set({ status: 'completed', updatedAt: new Date() }).where(eq(returns.id, returnId));
      }

      return usage;
    });
  }
}

// Create and export the storage instance
export const storage = new DatabaseStorage();