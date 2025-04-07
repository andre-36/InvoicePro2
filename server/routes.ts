import express, { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { createHash } from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { Server } from "http";
import { env } from "./env";
import {
  insertUserSchema,
  insertStoreSchema,
  insertClientSchema,
  insertCategorySchema,
  insertProductSchema,
  insertProductBatchSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertQuotationSchema,
  insertQuotationItemSchema,
  insertTransactionSchema,
  insertSettingSchema,
  loginSchema
} from "../shared/schema";
// Import InvoiceItem type from schema
import { type InvoiceItem } from "../shared/schema";

// Simple password hashing function
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Helper function for validating request body
function validateRequestBody<T extends z.ZodTypeAny>(
  schema: T,
  req: Request,
  res: Response
): z.infer<T> | null {
  try {
    return schema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Invalid request data",
        details: error.errors
      });
    } else {
      res.status(500).json({ error: "Server error during validation" });
    }
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration with PostgreSQL store
  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: storage.sessionStore,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true,
        secure: env.NODE_ENV === "production"
      }
    })
  );

  // Passport configuration
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const hashedPassword = hashPassword(password);
        if (user.password !== hashedPassword) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
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
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: "Authentication required" });
  };

  // Auth routes
  app.post("/api/auth/login", (req, res, next) => {
    const validatedData = validateRequestBody(loginSchema, req, res);
    if (!validatedData) return;
    
    passport.authenticate("local", (err: Error, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info.message });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({ 
          id: user.id, 
          username: user.username, 
          fullName: user.fullName,
          role: user.role
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      res.json({ 
        id: user.id, 
        username: user.username, 
        fullName: user.fullName,
        role: user.role
      });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertUserSchema, req, res);
      if (!validatedData) return;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Hash the password
      const hashedPassword = hashPassword(validatedData.password);
      
      // Create the user
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });
      
      // Automatically log in the newly registered user
      req.logIn(newUser, (err) => {
        if (err) {
          return res.status(500).json({ error: "Authentication error" });
        }
        return res.status(201).json({ 
          id: newUser.id, 
          username: newUser.username, 
          fullName: newUser.fullName,
          role: newUser.role
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Server error during registration" });
    }
  });

  // User routes
  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Exclude password and sensitive data
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Only allow users to update their own profile or admins to update anyone
      if (userId !== currentUser.id && currentUser.role !== 'admin') {
        return res.status(403).json({ error: "Permission denied" });
      }
      
      const validatedData = validateRequestBody(
        insertUserSchema.partial().omit({ password: true }), 
        req, 
        res
      );
      if (!validatedData) return;
      
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      // Exclude password and sensitive data
      const { password, ...userData } = updatedUser;
      res.json(userData);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/users/:id/password", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Only allow users to change their own password or admins to change anyone's
      if (userId !== currentUser.id && currentUser.role !== 'admin') {
        return res.status(403).json({ error: "Permission denied" });
      }
      
      const schema = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(6, "New password must be at least 6 characters")
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      // Verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const hashedCurrentPassword = hashPassword(validatedData.currentPassword);
      if (user.password !== hashedCurrentPassword && currentUser.role !== 'admin') {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      // Update password
      const hashedNewPassword = hashPassword(validatedData.newPassword);
      await storage.updateUser(userId, { password: hashedNewPassword });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Store routes
  app.get("/api/stores", requireAuth, async (req, res) => {
    try {
      const stores = await storage.getStores();
      res.json(stores);
    } catch (error) {
      console.error("Error getting stores:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:id", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      const store = await storage.getStore(storeId);
      
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      
      res.json(store);
    } catch (error) {
      console.error("Error getting store:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/stores", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertStoreSchema, req, res);
      if (!validatedData) return;
      
      const newStore = await storage.createStore(validatedData);
      res.status(201).json(newStore);
    } catch (error) {
      console.error("Error creating store:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/stores/:id", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertStoreSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedStore = await storage.updateStore(storeId, validatedData);
      res.json(updatedStore);
    } catch (error) {
      console.error("Error updating store:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/stores/:id", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Only admins can delete stores
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ error: "Permission denied" });
      }
      
      await storage.deleteStore(storeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting store:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Client routes
  app.get("/api/stores/:storeId/clients", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const clients = await storage.getClients(storeId);
      res.json(clients);
    } catch (error) {
      console.error("Error getting clients:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error getting client:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertClientSchema, req, res);
      if (!validatedData) return;
      
      const newClient = await storage.createClient(validatedData);
      res.status(201).json(newClient);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertClientSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedClient = await storage.updateClient(clientId, validatedData);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      await storage.deleteClient(clientId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Category routes
  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error getting categories:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await storage.getCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      console.error("Error getting category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertCategorySchema, req, res);
      if (!validatedData) return;
      
      const newCategory = await storage.createCategory(validatedData);
      res.status(201).json(newCategory);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertCategorySchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedCategory = await storage.updateCategory(categoryId, validatedData);
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      await storage.deleteCategory(categoryId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Product routes
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;
      const products = await storage.getProducts(storeId);
      res.json(products);
    } catch (error) {
      console.error("Error getting products:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/products/lowstock", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const products = await storage.getProductsWithLowStock(storeId);
      res.json(products);
    } catch (error) {
      console.error("Error getting low stock products:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error getting product:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/products", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertProductSchema, req, res);
      if (!validatedData) return;
      
      const newProduct = await storage.createProduct(validatedData);
      res.status(201).json(newProduct);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertProductSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedProduct = await storage.updateProduct(productId, validatedData);
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      await storage.deleteProduct(productId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Product Batches routes
  app.get("/api/products/:productId/stores/:storeId/batches", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const storeId = parseInt(req.params.storeId);
      const batches = await storage.getProductBatches(productId, storeId);
      res.json(batches);
    } catch (error) {
      console.error("Error getting product batches:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/batches/:id", requireAuth, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const batch = await storage.getProductBatch(batchId);
      
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      res.json(batch);
    } catch (error) {
      console.error("Error getting batch:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/batches", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertProductBatchSchema, req, res);
      if (!validatedData) return;
      
      const newBatch = await storage.createProductBatch(validatedData);
      res.status(201).json(newBatch);
    } catch (error) {
      console.error("Error creating batch:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/batches/:id", requireAuth, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertProductBatchSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedBatch = await storage.updateProductBatch(batchId, validatedData);
      res.json(updatedBatch);
    } catch (error) {
      console.error("Error updating batch:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/batches/:id", requireAuth, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      await storage.deleteProductBatch(batchId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting batch:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Invoice routes
  app.get("/api/stores/:storeId/invoices", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const invoices = await storage.getInvoices(storeId);
      res.json(invoices);
    } catch (error) {
      console.error("Error getting invoices:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/invoices/recent", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const invoices = await storage.getRecentInvoices(storeId, limit);
      res.json(invoices);
    } catch (error) {
      console.error("Error getting recent invoices:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/invoices/open", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const invoices = await storage.getOpenInvoices(storeId);
      res.json(invoices);
    } catch (error) {
      console.error("Error getting open invoices:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoiceWithItems(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error getting invoice:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        invoice: insertInvoiceSchema,
        items: z.array(
          z.object({
            description: z.string(),
            productId: z.number(),
            quantity: z.union([z.string(), z.number()]),
            unitPrice: z.union([z.string(), z.number()]),
            taxRate: z.union([z.string(), z.number()]).optional(),
            taxAmount: z.union([z.string(), z.number()]).optional(),
            discount: z.union([z.string(), z.number()]).optional(),
            subtotal: z.union([z.string(), z.number()]),
            totalAmount: z.union([z.string(), z.number()])
          })
        )
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const newInvoice = await storage.createInvoice(
        validatedData.invoice,
        validatedData.items
      );
      
      res.status(201).json(newInvoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertInvoiceSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, validatedData);
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/invoices/:id/status", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const schema = z.object({
        status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"])
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const updatedInvoice = await storage.updateInvoiceStatus(invoiceId, validatedData.status);
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      await storage.deleteInvoice(invoiceId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Quotation routes
  app.get("/api/stores/:storeId/quotations", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const quotations = await storage.getQuotations(storeId);
      res.json(quotations);
    } catch (error) {
      console.error("Error getting quotations:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/quotations/:id", requireAuth, async (req, res) => {
    try {
      const quotationId = parseInt(req.params.id);
      const quotation = await storage.getQuotationWithItems(quotationId);
      
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      
      res.json(quotation);
    } catch (error) {
      console.error("Error getting quotation:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/quotations", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        quotation: insertQuotationSchema,
        items: z.array(
          z.object({
            description: z.string(),
            productId: z.number(),
            quantity: z.union([z.string(), z.number()]),
            unitPrice: z.union([z.string(), z.number()]),
            taxRate: z.union([z.string(), z.number()]).optional(),
            taxAmount: z.union([z.string(), z.number()]).optional(),
            discount: z.union([z.string(), z.number()]).optional(),
            subtotal: z.union([z.string(), z.number()]),
            totalAmount: z.union([z.string(), z.number()])
          })
        )
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const newQuotation = await storage.createQuotation(
        validatedData.quotation,
        validatedData.items
      );
      
      res.status(201).json(newQuotation);
    } catch (error) {
      console.error("Error creating quotation:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/quotations/:id", requireAuth, async (req, res) => {
    try {
      const quotationId = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertQuotationSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedQuotation = await storage.updateQuotation(quotationId, validatedData);
      res.json(updatedQuotation);
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/quotations/:id/convert", requireAuth, async (req, res) => {
    try {
      const quotationId = parseInt(req.params.id);
      const newInvoice = await storage.convertQuotationToInvoice(quotationId);
      res.json(newInvoice);
    } catch (error) {
      console.error("Error converting quotation to invoice:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/quotations/:id", requireAuth, async (req, res) => {
    try {
      const quotationId = parseInt(req.params.id);
      await storage.deleteQuotation(quotationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quotation:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Transaction routes
  app.get("/api/stores/:storeId/transactions", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const type = req.query.type as string | undefined;
      
      let transactions;
      if (type) {
        transactions = await storage.getTransactionsByType(storeId, type);
      } else {
        transactions = await storage.getTransactions(storeId);
      }
      
      res.json(transactions);
    } catch (error) {
      console.error("Error getting transactions:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      console.error("Error getting transaction:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertTransactionSchema, req, res);
      if (!validatedData) return;
      
      const newTransaction = await storage.createTransaction(validatedData);
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertTransactionSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedTransaction = await storage.updateTransaction(transactionId, validatedData);
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      await storage.deleteTransaction(transactionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Settings routes
  app.get("/api/stores/:storeId/settings", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const settings = await storage.getSettings(storeId);
      
      // Convert to key-value object for easier frontend consumption
      const settingsObject = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);
      
      res.json(settingsObject);
    } catch (error) {
      console.error("Error getting settings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/settings/:key", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const key = req.params.key;
      const setting = await storage.getSetting(storeId, key);
      
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      
      res.json({ key: setting.key, value: setting.value });
    } catch (error) {
      console.error("Error getting setting:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/stores/:storeId/settings", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const schema = z.object({
        key: z.string().min(1, "Key is required"),
        value: z.string().min(1, "Value is required")
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const setting = await storage.setSetting({
        storeId,
        key: validatedData.key,
        value: validatedData.value
      });
      
      res.status(201).json(setting);
    } catch (error) {
      console.error("Error setting setting:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/settings/:id", requireAuth, async (req, res) => {
    try {
      const settingId = parseInt(req.params.id);
      await storage.deleteSetting(settingId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting setting:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Dashboard metrics routes
  app.get("/api/stores/:storeId/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const stats = await storage.getDashboardStats(storeId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/dashboard/topclients", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const clients = await storage.getTopClients(storeId, limit);
      res.json(clients);
    } catch (error) {
      console.error("Error getting top clients:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/dashboard/revenue", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      
      // Parse date range from query params or use defaults (last 30 days)
      const endDate = req.query.end ? new Date(req.query.end as string) : new Date();
      const startDate = req.query.start 
        ? new Date(req.query.start as string)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      const revenueData = await storage.getRevenueData(storeId, startDate, endDate);
      res.json(revenueData);
    } catch (error) {
      console.error("Error getting revenue data:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/dashboard/products/performance", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const performance = await storage.getProductPerformance(storeId, limit);
      res.json(performance);
    } catch (error) {
      console.error("Error getting product performance:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/dashboard/inventory/value", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const stats = await storage.getInventoryValueStats(storeId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting inventory value stats:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/dashboard/batches/profitability", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      const data = await storage.getBatchProfitabilityAnalysis(storeId, productId);
      res.json(data);
    } catch (error) {
      console.error("Error getting batch profitability analysis:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Server error" });
  });

  // Start the server
  return app.listen(env.PORT, env.HOST, () => {
    console.log(`Server listening on http://${env.HOST}:${env.PORT}`);
  });
}