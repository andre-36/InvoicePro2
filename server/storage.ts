import {
  clients, Client, InsertClient,
  invoices, Invoice, InsertInvoice,
  invoiceItems, InvoiceItem, InsertInvoiceItem,
  products, Product, InsertProduct,
  transactions, Transaction, InsertTransaction,
  users, User, InsertUser,
  InvoiceWithItems, ClientWithInvoices,
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  getClients(userId: number): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;
  
  // Product methods
  getProduct(id: number): Promise<Product | undefined>;
  getProducts(userId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  
  // Invoice methods
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceWithItems(id: number): Promise<InvoiceWithItems | undefined>;
  getInvoices(userId: number): Promise<Invoice[]>;
  getRecentInvoices(userId: number, limit: number): Promise<Invoice[]>;
  getOpenInvoices(userId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;
  
  // Invoice Item methods
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: number, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem>;
  deleteInvoiceItem(id: number): Promise<void>;
  deleteInvoiceItems(invoiceId: number): Promise<void>;
  
  // Transaction methods
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(userId: number): Promise<Transaction[]>;
  getTransactionsByType(userId: number, type: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;
  
  // Dashboard metrics
  getDashboardStats(userId: number): Promise<DashboardStats>;
  getTopClients(userId: number, limit: number): Promise<ClientWithInvoiceSummary[]>;
  getRevenueOverview(userId: number, months: number): Promise<RevenueData>;
  getInvoiceStatusSummary(userId: number): Promise<InvoiceStatusSummary>;
}

export type DashboardStats = {
  totalIncome: number;
  totalExpenses: number;
  openInvoices: {
    count: number;
    value: number;
  };
  totalClients: number;
};

export type ClientWithInvoiceSummary = {
  id: number;
  name: string;
  email: string;
  totalValue: number;
  invoiceCount: number;
  initials: string;
};

export type RevenueData = {
  labels: string[];
  income: number[];
  expenses: number[];
};

export type InvoiceStatusSummary = {
  paid: number;
  pending: number;
  overdue: number;
  total: number;
};

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private products: Map<number, Product>;
  private invoices: Map<number, Invoice>;
  private invoiceItems: Map<number, InvoiceItem>;
  private transactions: Map<number, Transaction>;
  private currentUserId: number;
  private currentClientId: number;
  private currentProductId: number;
  private currentInvoiceId: number;
  private currentInvoiceItemId: number;
  private currentTransactionId: number;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.products = new Map();
    this.invoices = new Map();
    this.invoiceItems = new Map();
    this.transactions = new Map();
    this.currentUserId = 1;
    this.currentClientId = 1;
    this.currentProductId = 1;
    this.currentInvoiceId = 1;
    this.currentInvoiceItemId = 1;
    this.currentTransactionId = 1;
    
    // Create default user
    this.createUser({
      username: "admin",
      password: "password",
      fullName: "Sarah Johnson",
      email: "sarah@example.com",
      companyName: "InvoiceHub",
      address: "123 Main St, City, Country",
      phone: "123-456-7890",
      logoUrl: null
    });
    
    // Setup demo data
    this.setupDemoData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getClients(userId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId
    );
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    const id = this.currentClientId++;
    const newClient: Client = { ...client, id };
    this.clients.set(id, newClient);
    return newClient;
  }
  
  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client> {
    const client = this.clients.get(id);
    if (!client) {
      throw new Error(`Client with id ${id} not found`);
    }
    
    const updatedClient = { ...client, ...updates };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  
  async deleteClient(id: number): Promise<void> {
    this.clients.delete(id);
  }
  
  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }
  
  async getProducts(userId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.userId === userId
    );
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const newProduct: Product = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }
  
  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const product = this.products.get(id);
    if (!product) {
      throw new Error(`Product with id ${id} not found`);
    }
    
    const updatedProduct = { ...product, ...updates };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<void> {
    this.products.delete(id);
  }
  
  // Invoice methods
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }
  
  async getInvoiceWithItems(id: number): Promise<InvoiceWithItems | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const items = await this.getInvoiceItems(id);
    const client = await this.getClient(invoice.clientId);
    
    if (!client) return undefined;
    
    return { ...invoice, items, client };
  }
  
  async getInvoices(userId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (invoice) => invoice.userId === userId
    );
  }
  
  async getRecentInvoices(userId: number, limit: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter(invoice => invoice.userId === userId)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, limit);
  }
  
  async getOpenInvoices(userId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (invoice) => invoice.userId === userId && 
        (invoice.status === 'sent' || invoice.status === 'overdue')
    );
  }
  
  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<Invoice> {
    const id = this.currentInvoiceId++;
    const newInvoice: Invoice = { ...invoice, id };
    this.invoices.set(id, newInvoice);
    
    // Create invoice items
    for (const item of items) {
      await this.createInvoiceItem({ ...item, invoiceId: id });
    }
    
    return newInvoice;
  }
  
  async updateInvoice(id: number, updates: Partial<InsertInvoice>): Promise<Invoice> {
    const invoice = this.invoices.get(id);
    if (!invoice) {
      throw new Error(`Invoice with id ${id} not found`);
    }
    
    const updatedInvoice = { ...invoice, ...updates };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }
  
  async updateInvoiceStatus(id: number, status: string): Promise<Invoice> {
    return this.updateInvoice(id, { status: status as any });
  }
  
  async deleteInvoice(id: number): Promise<void> {
    await this.deleteInvoiceItems(id);
    this.invoices.delete(id);
  }
  
  // Invoice Item methods
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return Array.from(this.invoiceItems.values()).filter(
      (item) => item.invoiceId === invoiceId
    );
  }
  
  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = this.currentInvoiceItemId++;
    const newItem: InvoiceItem = { ...item, id };
    this.invoiceItems.set(id, newItem);
    return newItem;
  }
  
  async updateInvoiceItem(id: number, updates: Partial<InsertInvoiceItem>): Promise<InvoiceItem> {
    const item = this.invoiceItems.get(id);
    if (!item) {
      throw new Error(`Invoice item with id ${id} not found`);
    }
    
    const updatedItem = { ...item, ...updates };
    this.invoiceItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deleteInvoiceItem(id: number): Promise<void> {
    this.invoiceItems.delete(id);
  }
  
  async deleteInvoiceItems(invoiceId: number): Promise<void> {
    const items = await this.getInvoiceItems(invoiceId);
    for (const item of items) {
      await this.deleteInvoiceItem(item.id);
    }
  }
  
  // Transaction methods
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId
    );
  }
  
  async getTransactionsByType(userId: number, type: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId && transaction.type === type
    );
  }
  
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const newTransaction: Transaction = { ...transaction, id };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }
  
  async updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }
    
    const updatedTransaction = { ...transaction, ...updates };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
  
  async deleteTransaction(id: number): Promise<void> {
    this.transactions.delete(id);
  }
  
  // Dashboard metrics
  async getDashboardStats(userId: number): Promise<DashboardStats> {
    const incomeTransactions = await this.getTransactionsByType(userId, 'income');
    const expenseTransactions = await this.getTransactionsByType(userId, 'expense');
    const openInvoices = await this.getOpenInvoices(userId);
    const clients = await this.getClients(userId);
    
    const totalIncome = incomeTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount), 0
    );
    
    const totalExpenses = expenseTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount), 0
    );
    
    const openInvoicesValue = openInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.total), 0
    );
    
    return {
      totalIncome,
      totalExpenses,
      openInvoices: {
        count: openInvoices.length,
        value: openInvoicesValue
      },
      totalClients: clients.length
    };
  }
  
  async getTopClients(userId: number, limit: number): Promise<ClientWithInvoiceSummary[]> {
    const clients = await this.getClients(userId);
    const allInvoices = await this.getInvoices(userId);
    
    const clientSummaries = await Promise.all(
      clients.map(async (client) => {
        const clientInvoices = allInvoices.filter(invoice => invoice.clientId === client.id);
        const totalValue = clientInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
        const initials = client.name.split(' ')
          .map(word => word.charAt(0).toUpperCase())
          .slice(0, 2)
          .join('');
        
        return {
          id: client.id,
          name: client.name,
          email: client.email,
          totalValue,
          invoiceCount: clientInvoices.length,
          initials
        };
      })
    );
    
    // Sort by total value and take the top ones
    return clientSummaries
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);
  }
  
  async getRevenueOverview(userId: number, months: number = 6): Promise<RevenueData> {
    const now = new Date();
    const labels: string[] = [];
    const income: number[] = Array(months).fill(0);
    const expenses: number[] = Array(months).fill(0);
    
    // Generate labels for the last 'months' months
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i);
      labels.push(d.toLocaleString('default', { month: 'short' }));
    }
    
    const transactions = await this.getTransactions(userId);
    
    // Group transactions by month
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthIndex = date.getMonth();
      const yearMonthKey = `${date.getFullYear()}-${monthIndex}`;
      const currentYearMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
      
      // Calculate how many months ago this transaction was
      let monthsAgo = 0;
      if (yearMonthKey === currentYearMonthKey) {
        monthsAgo = 0;
      } else {
        const yearDiff = now.getFullYear() - date.getFullYear();
        monthsAgo = yearDiff * 12 + (now.getMonth() - monthIndex);
      }
      
      // Only include transactions within the last 'months' months
      if (monthsAgo < months) {
        const amount = Number(transaction.amount);
        const index = months - 1 - monthsAgo;
        
        if (transaction.type === 'income') {
          income[index] += amount;
        } else {
          expenses[index] += amount;
        }
      }
    });
    
    return { labels, income, expenses };
  }
  
  async getInvoiceStatusSummary(userId: number): Promise<InvoiceStatusSummary> {
    const allInvoices = await this.getInvoices(userId);
    
    const paid = allInvoices.filter(invoice => invoice.status === 'paid').length;
    const pending = allInvoices.filter(invoice => invoice.status === 'sent').length;
    const overdue = allInvoices.filter(invoice => invoice.status === 'overdue').length;
    const total = allInvoices.length;
    
    return { paid, pending, overdue, total };
  }
  
  // Helper method to setup demo data
  private async setupDemoData() {
    const userId = 1;
    
    // Create demo clients
    const acmeClient = await this.createClient({
      userId,
      name: "Acme Corporation",
      email: "contact@acme.com",
      phone: "123-456-7890",
      address: "123 Acme St, Anytown, USA",
      taxNumber: "ACM-12345",
      notes: "Important client"
    });
    
    const starkClient = await this.createClient({
      userId,
      name: "Stark Industries",
      email: "billing@stark.com",
      phone: "987-654-3210",
      address: "890 Innovation Dr, Tech City, USA",
      taxNumber: "STARK-54321",
      notes: "Regular client"
    });
    
    const globexClient = await this.createClient({
      userId,
      name: "Globex Industries",
      email: "accounting@globex.com",
      phone: "555-123-4567",
      address: "456 Global Ave, Metro City, USA",
      taxNumber: "GLO-67890",
      notes: ""
    });
    
    const wayneClient = await this.createClient({
      userId,
      name: "Wayne Enterprises",
      email: "finance@wayne.com",
      phone: "555-987-6543",
      address: "1 Wayne Tower, Gotham City, USA",
      taxNumber: "WAY-13579",
      notes: "VIP client"
    });
    
    const umbrellaClient = await this.createClient({
      userId,
      name: "Umbrella Corp",
      email: "payments@umbrella.com",
      phone: "555-246-8101",
      address: "789 Research Blvd, Raccoon City, USA",
      taxNumber: "UMB-24680",
      notes: ""
    });
    
    // Create demo products
    const product1 = await this.createProduct({
      userId,
      name: "Web Development",
      description: "Full website development services",
      price: "1200",
      taxRate: "0"
    });
    
    const product2 = await this.createProduct({
      userId,
      name: "Logo Design",
      description: "Professional logo design",
      price: "500",
      taxRate: "0"
    });
    
    const product3 = await this.createProduct({
      userId,
      name: "SEO Services",
      description: "Search engine optimization",
      price: "800",
      taxRate: "0"
    });
    
    // Create demo invoices
    // Invoice 1
    const invoice1 = await this.createInvoice({
      userId,
      invoiceNumber: "INV-2023-0045",
      clientId: acmeClient.id,
      issueDate: new Date("2023-08-18"),
      dueDate: new Date("2023-09-17"),
      status: "paid",
      subtotal: "2850",
      tax: "0",
      discount: "0",
      total: "2850",
      notes: "Thank you for your business!"
    }, [
      {
        invoiceId: 0, // Will be set by createInvoiceItem
        description: "Web Development",
        quantity: "1",
        price: "2000",
        taxRate: "0",
        subtotal: "2000",
        tax: "0",
        total: "2000",
        productId: product1.id
      },
      {
        invoiceId: 0, // Will be set by createInvoiceItem
        description: "Logo Design",
        quantity: "1",
        price: "850",
        taxRate: "0",
        subtotal: "850",
        tax: "0",
        total: "850",
        productId: product2.id
      }
    ]);
    
    // Invoice 2
    const invoice2 = await this.createInvoice({
      userId,
      invoiceNumber: "INV-2023-0044",
      clientId: globexClient.id,
      issueDate: new Date("2023-08-15"),
      dueDate: new Date("2023-09-14"),
      status: "sent",
      subtotal: "1200",
      tax: "0",
      discount: "0",
      total: "1200",
      notes: ""
    }, [
      {
        invoiceId: 0, // Will be set by createInvoiceItem
        description: "Web Development",
        quantity: "1",
        price: "1200",
        taxRate: "0",
        subtotal: "1200",
        tax: "0",
        total: "1200",
        productId: product1.id
      }
    ]);
    
    // Invoice 3
    const invoice3 = await this.createInvoice({
      userId,
      invoiceNumber: "INV-2023-0043",
      clientId: starkClient.id,
      issueDate: new Date("2023-08-12"),
      dueDate: new Date("2023-09-11"),
      status: "paid",
      subtotal: "3450",
      tax: "0",
      discount: "0",
      total: "3450",
      notes: ""
    }, [
      {
        invoiceId: 0, // Will be set by createInvoiceItem
        description: "Web Development",
        quantity: "1",
        price: "1200",
        taxRate: "0",
        subtotal: "1200",
        tax: "0",
        total: "1200",
        productId: product1.id
      },
      {
        invoiceId: 0, // Will be set by createInvoiceItem
        description: "SEO Services",
        quantity: "2",
        price: "800",
        taxRate: "0",
        subtotal: "1600",
        tax: "0",
        total: "1600",
        productId: product3.id
      },
      {
        invoiceId: 0, // Will be set by createInvoiceItem
        description: "Logo Design",
        quantity: "1.3",
        price: "500",
        taxRate: "0",
        subtotal: "650",
        tax: "0",
        total: "650",
        productId: product2.id
      }
    ]);
    
    // Invoice 4
    const invoice4 = await this.createInvoice({
      userId,
      invoiceNumber: "INV-2023-0042",
      clientId: wayneClient.id,
      issueDate: new Date("2023-08-10"),
      dueDate: new Date("2023-09-09"),
      status: "overdue",
      subtotal: "1800",
      tax: "0",
      discount: "0",
      total: "1800",
      notes: ""
    }, [
      {
        invoiceId: 0, // Will be set by createInvoiceItem
        description: "SEO Services",
        quantity: "2",
        price: "800",
        taxRate: "0",
        subtotal: "1600",
        tax: "0",
        total: "1600",
        productId: product3.id
      },
      {
        invoiceId: 0, // Will be set by createInvoiceItem
        description: "Content Updates",
        quantity: "1",
        price: "200",
        taxRate: "0",
        subtotal: "200",
        tax: "0",
        total: "200",
        productId: null
      }
    ]);
    
    // Invoice 5
    const invoice5 = await this.createInvoice({
      userId,
      invoiceNumber: "INV-2023-0041",
      clientId: umbrellaClient.id,
      issueDate: new Date("2023-08-08"),
      dueDate: new Date("2023-09-07"),
      status: "paid",
      subtotal: "2100",
      tax: "0",
      discount: "0",
      total: "2100",
      notes: ""
    }, [
      {
        invoiceId: 0, // Will be set by createInvoiceItem
        description: "Web Development",
        quantity: "1",
        price: "1200",
        taxRate: "0",
        subtotal: "1200",
        tax: "0",
        total: "1200",
        productId: product1.id
      },
      {
        invoiceId: 0, // Will be set by createInvoiceItem
        description: "Logo Design",
        quantity: "1",
        price: "500",
        taxRate: "0",
        subtotal: "500",
        tax: "0",
        total: "500",
        productId: product2.id
      },
      {
        invoiceId: 0, // Will be set by createInvoiceItem
        description: "Hosting Setup",
        quantity: "1",
        price: "400",
        taxRate: "0",
        subtotal: "400",
        tax: "0",
        total: "400",
        productId: null
      }
    ]);
    
    // Create transactions for paid invoices
    await this.createTransaction({
      userId,
      date: new Date("2023-08-19"),
      description: `Payment for invoice ${invoice1.invoiceNumber}`,
      amount: "2850",
      type: "income",
      invoiceId: invoice1.id,
      category: "Sales"
    });
    
    await this.createTransaction({
      userId,
      date: new Date("2023-08-13"),
      description: `Payment for invoice ${invoice3.invoiceNumber}`,
      amount: "3450",
      type: "income",
      invoiceId: invoice3.id,
      category: "Sales"
    });
    
    await this.createTransaction({
      userId,
      date: new Date("2023-08-09"),
      description: `Payment for invoice ${invoice5.invoiceNumber}`,
      amount: "2100",
      type: "income",
      invoiceId: invoice5.id,
      category: "Sales"
    });
    
    // Create expense transactions
    await this.createTransaction({
      userId,
      date: new Date("2023-08-05"),
      description: "Office Rent",
      amount: "1500",
      type: "expense",
      invoiceId: null,
      category: "Rent"
    });
    
    await this.createTransaction({
      userId,
      date: new Date("2023-08-07"),
      description: "Software Subscriptions",
      amount: "120",
      type: "expense",
      invoiceId: null,
      category: "Software"
    });
    
    await this.createTransaction({
      userId,
      date: new Date("2023-08-12"),
      description: "Utilities",
      amount: "200",
      type: "expense",
      invoiceId: null,
      category: "Utilities"
    });
    
    await this.createTransaction({
      userId,
      date: new Date("2023-08-15"),
      description: "Office Supplies",
      amount: "85",
      type: "expense",
      invoiceId: null,
      category: "Supplies"
    });
    
    // Create additional income transactions
    await this.createTransaction({
      userId,
      date: new Date("2023-07-25"),
      description: "Consulting Services",
      amount: "1200",
      type: "income",
      invoiceId: null,
      category: "Consulting"
    });
    
    await this.createTransaction({
      userId,
      date: new Date("2023-07-15"),
      description: "Training Session",
      amount: "800",
      type: "income",
      invoiceId: null,
      category: "Training"
    });
    
    // Create additional expense transactions for previous months
    await this.createTransaction({
      userId,
      date: new Date("2023-07-05"),
      description: "Office Rent",
      amount: "1500",
      type: "expense",
      invoiceId: null,
      category: "Rent"
    });
    
    await this.createTransaction({
      userId,
      date: new Date("2023-07-07"),
      description: "Software Subscriptions",
      amount: "120",
      type: "expense",
      invoiceId: null,
      category: "Software"
    });
    
    await this.createTransaction({
      userId,
      date: new Date("2023-06-05"),
      description: "Office Rent",
      amount: "1500",
      type: "expense",
      invoiceId: null,
      category: "Rent"
    });
    
    await this.createTransaction({
      userId,
      date: new Date("2023-06-12"),
      description: "Marketing Campaign",
      amount: "500",
      type: "expense",
      invoiceId: null,
      category: "Marketing"
    });
  }
}

export const storage = new MemStorage();
