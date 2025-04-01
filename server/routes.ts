import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertClientSchema, 
  insertInvoiceSchema, 
  insertInvoiceItemSchema,
  insertProductSchema,
  insertTransactionSchema,
  loginSchema
} from "@shared/schema";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session
  const MemoryStoreSession = MemoryStore(session);
  
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "invoicehub-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      },
      store: new MemoryStoreSession({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
    })
  );
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure Passport
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        
        // In a real app, you would hash passwords and compare hashes
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password" });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );
  
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  
  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };
  
  // Authentication routes
  app.post("/api/login", (req, res, next) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      passport.authenticate("local", (err: Error, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info.message });
        }
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.json({ 
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email
          });
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });
  
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/user", requireAuth, (req, res) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      companyName: user.companyName,
      address: user.address,
      phone: user.phone,
      logoUrl: user.logoUrl
    });
  });
  
  // Dashboard routes
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching dashboard statistics" });
    }
  });
  
  app.get("/api/dashboard/top-clients", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const limit = parseInt(req.query.limit as string || "5");
      const clients = await storage.getTopClients(userId, limit);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error fetching top clients" });
    }
  });
  
  app.get("/api/dashboard/revenue-overview", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const months = parseInt(req.query.months as string || "8");
      const data = await storage.getRevenueOverview(userId, months);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Error fetching revenue overview" });
    }
  });
  
  app.get("/api/dashboard/invoice-status", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const data = await storage.getInvoiceStatusSummary(userId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invoice status summary" });
    }
  });
  
  app.get("/api/dashboard/recent-invoices", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const limit = parseInt(req.query.limit as string || "5");
      
      const invoices = await storage.getRecentInvoices(userId, limit);
      
      // Get client names for each invoice
      const invoicesWithClientName = await Promise.all(
        invoices.map(async (invoice) => {
          const client = await storage.getClient(invoice.clientId);
          return {
            ...invoice,
            clientName: client?.name || "Unknown Client"
          };
        })
      );
      
      res.json(invoicesWithClientName);
    } catch (error) {
      res.status(500).json({ message: "Error fetching recent invoices" });
    }
  });
  
  // Client routes
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const clients = await storage.getClients(userId);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clients" });
    }
  });
  
  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const userId = (req.user as any).id;
      if (client.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to client" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Error fetching client" });
    }
  });
  
  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const clientData = insertClientSchema.parse({
        ...req.body,
        userId
      });
      
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Error creating client" });
    }
  });
  
  app.put("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const userId = (req.user as any).id;
      if (client.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to client" });
      }
      
      const updates = insertClientSchema.partial().parse(req.body);
      const updatedClient = await storage.updateClient(id, updates);
      
      res.json(updatedClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Error updating client" });
    }
  });
  
  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const userId = (req.user as any).id;
      if (client.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to client" });
      }
      
      await storage.deleteClient(id);
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting client" });
    }
  });
  
  // Product routes
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const products = await storage.getProducts(userId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching products" });
    }
  });
  
  app.get("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const userId = (req.user as any).id;
      if (product.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to product" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Error fetching product" });
    }
  });
  
  app.post("/api/products", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const productData = insertProductSchema.parse({
        ...req.body,
        userId
      });
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Error creating product" });
    }
  });
  
  app.put("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const userId = (req.user as any).id;
      if (product.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to product" });
      }
      
      const updates = insertProductSchema.partial().parse(req.body);
      const updatedProduct = await storage.updateProduct(id, updates);
      
      res.json(updatedProduct);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Error updating product" });
    }
  });
  
  app.delete("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const userId = (req.user as any).id;
      if (product.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to product" });
      }
      
      await storage.deleteProduct(id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting product" });
    }
  });
  
  // Invoice routes
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const invoices = await storage.getInvoices(userId);
      
      // Get client names for each invoice
      const invoicesWithClientName = await Promise.all(
        invoices.map(async (invoice) => {
          const client = await storage.getClient(invoice.clientId);
          return {
            ...invoice,
            clientName: client?.name || "Unknown Client"
          };
        })
      );
      
      res.json(invoicesWithClientName);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invoices" });
    }
  });
  
  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoiceWithItems(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const userId = (req.user as any).id;
      if (invoice.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to invoice" });
      }
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invoice" });
    }
  });
  
  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { invoice: invoiceData, items: itemsData } = req.body;
      
      // Validate invoice data
      const invoice = insertInvoiceSchema.parse({
        ...invoiceData,
        userId
      });
      
      // Validate invoice items
      const validatedItems = itemsData.map((item: any) => 
        insertInvoiceItemSchema.omit({ invoiceId: true }).parse(item)
      );
      
      // Create invoice with items
      const createdInvoice = await storage.createInvoice(invoice, validatedItems);
      res.status(201).json(createdInvoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Error creating invoice" });
    }
  });
  
  app.put("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const userId = (req.user as any).id;
      if (invoice.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to invoice" });
      }
      
      const { invoice: invoiceData, items: itemsData } = req.body;
      
      // Validate invoice updates
      const updates = insertInvoiceSchema.partial().parse(invoiceData);
      
      // Update invoice
      const updatedInvoice = await storage.updateInvoice(id, updates);
      
      // If items are provided, update them
      if (itemsData && Array.isArray(itemsData)) {
        // Delete old items
        await storage.deleteInvoiceItems(id);
        
        // Add new items
        const validatedItems = itemsData.map((item: any) => 
          insertInvoiceItemSchema.parse({
            ...item,
            invoiceId: id
          })
        );
        
        for (const item of validatedItems) {
          await storage.createInvoiceItem(item);
        }
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Error updating invoice" });
    }
  });
  
  app.patch("/api/invoices/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const userId = (req.user as any).id;
      if (invoice.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to invoice" });
      }
      
      const { status } = req.body;
      
      if (!status || !["draft", "sent", "paid", "overdue", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedInvoice = await storage.updateInvoiceStatus(id, status);
      
      // If status is changed to paid, create a transaction record
      if (status === "paid" && invoice.status !== "paid") {
        await storage.createTransaction({
          userId,
          date: new Date(),
          description: `Payment for invoice ${invoice.invoiceNumber}`,
          amount: invoice.total,
          type: "income",
          invoiceId: id,
          category: "Sales"
        });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      res.status(500).json({ message: "Error updating invoice status" });
    }
  });
  
  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const userId = (req.user as any).id;
      if (invoice.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to invoice" });
      }
      
      await storage.deleteInvoice(id);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting invoice" });
    }
  });
  
  // Transaction routes
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const type = req.query.type as string | undefined;
      
      let transactions;
      if (type && (type === "income" || type === "expense")) {
        transactions = await storage.getTransactionsByType(userId, type);
      } else {
        transactions = await storage.getTransactions(userId);
      }
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });
  
  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        userId
      });
      
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Error creating transaction" });
    }
  });
  
  app.put("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      const userId = (req.user as any).id;
      if (transaction.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to transaction" });
      }
      
      const updates = insertTransactionSchema.partial().parse(req.body);
      const updatedTransaction = await storage.updateTransaction(id, updates);
      
      res.json(updatedTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Error updating transaction" });
    }
  });
  
  app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      const userId = (req.user as any).id;
      if (transaction.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to transaction" });
      }
      
      await storage.deleteTransaction(id);
      res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting transaction" });
    }
  });
  
  // Initialize the HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
