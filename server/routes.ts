import express, { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { createHash } from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { Server } from "http";
import { env } from "./env";
import * as XLSX from "xlsx";
import * as csvWriter from "csv-writer";
import {
  insertUserSchema,
  insertStoreSchema,
  insertClientSchema,
  insertSupplierSchema,
  insertCategorySchema,
  insertInflowCategorySchema,
  insertOutflowCategorySchema,
  insertProductSchema,
  insertProductBatchSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertInvoicePaymentSchema,
  insertDeliveryNoteSchema,
  insertDeliveryNoteItemSchema,
  insertQuotationSchema,
  insertQuotationItemSchema,
  insertTransactionSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
  insertPurchaseOrderPaymentSchema,
  insertSettingSchema,
  insertPrintSettingsSchema,
  insertPaymentTypeSchema,
  insertPaymentTermSchema,
  insertCashAccountSchema,
  insertAccountTransferSchema,
  insertGoodsReceiptSchema,
  insertGoodsReceiptItemSchema,
  insertGoodsReceiptPaymentSchema,
  insertStockAdjustmentSchema,
  loginSchema,
  updateUserProfileSchema,
  updateUserCompanySchema,
  updateUserPaymentSchema
} from "../shared/schema";
// Import InvoiceItem type from schema
import { type InvoiceItem } from "../shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

// Helper function to parse date range string
function parseDateRange(dateRange: string): { startDate: Date; endDate: Date } {
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
      
      // Use safe update schema to prevent privilege escalation
      const validatedData = validateRequestBody(
        updateUserProfileSchema, 
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

  // Current user routes (without ID in URL)
  app.get("/api/user", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const user = await storage.getUser(currentUser.id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Exclude password
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error) {
      console.error("Error getting current user:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/user", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const validatedData = validateRequestBody(
        updateUserProfileSchema, 
        req, 
        res
      );
      if (!validatedData) return;
      
      const updatedUser = await storage.updateUser(currentUser.id, validatedData);
      
      // Exclude password
      const { password, ...userData } = updatedUser;
      res.json(userData);
    } catch (error) {
      console.error("Error updating current user:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/user/company", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const validatedData = validateRequestBody(
        updateUserCompanySchema,
        req,
        res
      );
      if (!validatedData) return;
      
      const updatedUser = await storage.updateUser(currentUser.id, validatedData);
      
      // Exclude password
      const { password, ...userData } = updatedUser;
      res.json(userData);
    } catch (error) {
      console.error("Error updating company details:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/user/payment", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const validatedData = validateRequestBody(
        updateUserPaymentSchema,
        req,
        res
      );
      if (!validatedData) return;
      
      const updatedUser = await storage.updateUser(currentUser.id, validatedData);
      
      // Exclude password
      const { password, ...userData } = updatedUser;
      res.json(userData);
    } catch (error) {
      console.error("Error updating payment settings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/user/password", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password are required" });
      }
      
      // Verify current password
      const user = await storage.getUser(currentUser.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const hashedCurrentPassword = hashPassword(currentPassword);
      if (user.password !== hashedCurrentPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      // Update password
      const hashedNewPassword = hashPassword(newPassword);
      await storage.updateUser(currentUser.id, { password: hashedNewPassword });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating password:", error);
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
  // Get next client number preview - MUST be before /:id route
  app.get("/api/clients/next-number", requireAuth, async (req, res) => {
    try {
      const nextNumber = await storage.getNextClientNumber();
      res.json({ clientNumber: nextNumber });
    } catch (error) {
      console.error("Error getting next client number:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      // Default to store 1 for general client listing
      const clients = await storage.getClients(1);
      res.json(clients);
    } catch (error) {
      console.error("Error getting clients:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

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

  app.get("/api/clients/:id/stats", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const stats = await storage.getClientStats(clientId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting client stats:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/clients/:id/monthly-purchases", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const monthlyPurchases = await storage.getClientMonthlyPurchases(clientId);
      res.json(monthlyPurchases);
    } catch (error) {
      console.error("Error getting client monthly purchases:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/clients/:id/invoices", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const clientInvoices = await storage.getInvoicesByClient(clientId);
      res.json(clientInvoices);
    } catch (error) {
      console.error("Error getting client invoices:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertClientSchema, req, res);
      if (!validatedData) return;
      
      // Add default storeId if not provided
      const clientData = {
        ...validatedData,
        storeId: validatedData.storeId || 1
      };
      
      const newClient = await storage.createClient(clientData);
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

  // Supplier routes
  app.get("/api/suppliers/next-number", requireAuth, async (req, res) => {
    try {
      const nextNumber = await storage.getNextSupplierNumber();
      res.json({ supplierNumber: nextNumber });
    } catch (error) {
      console.error("Error generating supplier number:", error);
      res.status(500).json({ error: "Failed to generate supplier number" });
    }
  });

  app.get("/api/suppliers", requireAuth, async (req, res) => {
    try {
      // Default to store 1 for general supplier listing
      const suppliers = await storage.getSuppliers(1);
      res.json(suppliers);
    } catch (error) {
      console.error("Error getting suppliers:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/suppliers", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const suppliers = await storage.getSuppliers(storeId);
      res.json(suppliers);
    } catch (error) {
      console.error("Error getting suppliers:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const supplier = await storage.getSupplier(supplierId);
      
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error("Error getting supplier:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertSupplierSchema, req, res);
      if (!validatedData) return;
      
      // Add default storeId if not provided
      const supplierData = {
        ...validatedData,
        storeId: validatedData.storeId || 1
      };
      
      const newSupplier = await storage.createSupplier(supplierData);
      res.status(201).json(newSupplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertSupplierSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedSupplier = await storage.updateSupplier(supplierId, validatedData);
      res.json(updatedSupplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      await storage.deleteSupplier(supplierId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting supplier:", error);
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
      
      // Check for duplicate SKU
      if (validatedData.sku) {
        const existingProduct = await storage.getProductBySku(validatedData.sku);
        if (existingProduct) {
          res.status(409).json({ error: "A product with this SKU/Code already exists" });
          return;
        }
      }
      
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
      
      // Check for duplicate SKU (excluding current product)
      if (validatedData.sku) {
        const existingProduct = await storage.getProductBySku(validatedData.sku);
        if (existingProduct && existingProduct.id !== productId) {
          res.status(409).json({ error: "A product with this SKU/Code already exists" });
          return;
        }
      }
      
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

  // Product dashboard stats endpoint
  app.get("/api/products/:id/stats", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const stats = await storage.getProductStats(productId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting product stats:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Product sales history endpoint
  app.get("/api/products/:id/sales", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const salesHistory = await storage.getProductSalesHistory(productId);
      res.json(salesHistory);
    } catch (error) {
      console.error("Error getting product sales history:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Product purchase history endpoint  
  app.get("/api/products/:id/purchases", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const purchaseHistory = await storage.getProductPurchaseHistory(productId);
      res.json(purchaseHistory);
    } catch (error) {
      console.error("Error getting product purchase history:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Product available quantity (stock - reserved)
  app.get("/api/products/:id/availability", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const storeId = parseInt(req.query.storeId as string);
      if (!storeId) {
        return res.status(400).json({ error: "storeId is required" });
      }
      const availability = await storage.getProductAvailableQuantity(productId, storeId);
      res.json(availability);
    } catch (error) {
      console.error("Error getting product availability:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Product reservations list (for product detail page)
  app.get("/api/products/:id/reservations", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const storeId = parseInt(req.query.storeId as string) || 1;
      const reservations = await storage.getProductReservations(productId, storeId);
      res.json(reservations);
    } catch (error) {
      console.error("Error getting product reservations:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Product pending purchase orders (for product dashboard)
  app.get("/api/products/:id/pending-pos", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const storeId = parseInt(req.query.storeId as string) || 1;
      const pendingPOs = await storage.getProductPendingPOs(productId, storeId);
      res.json(pendingPOs);
    } catch (error) {
      console.error("Error getting product pending POs:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // All pending PO items list (for PO list "By Item" view)
  app.get("/api/purchase-orders/pending-items", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.query.storeId as string) || 1;
      const pendingItems = await storage.getPendingPOItemsList(storeId);
      res.json(pendingItems);
    } catch (error) {
      console.error("Error getting pending PO items:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Product bundle component routes
  app.get("/api/products/:id/bundle-components", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const components = await storage.getBundleComponents(productId);
      res.json(components);
    } catch (error) {
      console.error("Error getting bundle components:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/products/:id/bundle-components", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const componentsSchema = z.array(z.object({
        componentProductId: z.number(),
        quantity: z.union([z.number(), z.string()])
      }));
      
      const validatedData = validateRequestBody(componentsSchema, req, res);
      if (!validatedData) return;
      
      const components = await storage.setBundleComponents(productId, validatedData);
      res.json(components);
    } catch (error) {
      console.error("Error setting bundle components:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/products/:id/bundle-stock/:storeId", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const storeId = parseInt(req.params.storeId);
      const stock = await storage.getBundleStock(productId, storeId);
      res.json({ stock });
    } catch (error) {
      console.error("Error getting bundle stock:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Product unit routes
  app.get("/api/products/:id/units", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const units = await storage.getProductUnits(productId);
      res.json(units);
    } catch (error) {
      console.error("Error getting product units:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/products/:id/units", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const unitsSchema = z.array(z.object({
        unitCode: z.string(),
        unitLabel: z.string(),
        conversionFactor: z.union([z.number(), z.string()]),
        price: z.union([z.number(), z.string()]).nullable().optional(),
        isDefault: z.boolean().optional()
      }));
      
      const validatedData = validateRequestBody(unitsSchema, req, res);
      if (!validatedData) return;
      
      // Convert to insert format
      const units = validatedData.map(u => ({
        productId,
        unitCode: u.unitCode,
        unitLabel: u.unitLabel,
        conversionFactor: String(u.conversionFactor),
        price: u.price ? String(u.price) : null,
        isDefault: u.isDefault || false
      }));
      
      const savedUnits = await storage.setProductUnits(productId, units);
      res.json(savedUnits);
    } catch (error) {
      console.error("Error setting product units:", error);
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
      const invoices = await storage.getInvoicesWithStatus(storeId);
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

  app.get("/api/stores/:storeId/invoices/returnable", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const invoices = await storage.getReturnableInvoices(storeId);
      res.json(invoices);
    } catch (error) {
      console.error("Error getting returnable invoices:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // General invoices endpoint
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      // Default to store 1 for general invoice listing
      const invoices = await storage.getInvoicesWithStatus(1);
      res.json(invoices);
    } catch (error) {
      console.error("Error getting invoices:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get next invoice number preview - MUST be before /:id route
  app.get("/api/invoices/next-number", requireAuth, async (req, res) => {
    try {
      const issueDate = req.query.issueDate ? new Date(req.query.issueDate as string) : new Date();
      const nextNumber = await storage.getNextInvoiceNumber(issueDate);
      res.json({ invoiceNumber: nextNumber });
    } catch (error) {
      console.error("Error getting next invoice number:", error);
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
      
      // Handle both nested { invoice: {...}, items: [...] } and flat structure
      const items = req.body.items;
      const rawInvoiceFields = req.body.invoice || (() => {
        const { items: _, ...rest } = req.body;
        return rest;
      })();
      
      // Remove fields that should never be updated via this endpoint
      const {
        invoiceNumber,  // Invoice number should never change
        id,             // ID is immutable
        createdAt,      // Created timestamp is immutable
        updatedAt,      // Updated timestamp is managed by backend
        storeId,        // Store ID should not change
        ...safeFields
      } = rawInvoiceFields;
      
      // Build the update object with only allowed fields and proper date conversion
      const invoiceFields: Record<string, any> = {};
      
      // Map frontend field names to backend field names
      if (safeFields.tax !== undefined && safeFields.taxAmount === undefined) {
        safeFields.taxAmount = safeFields.tax;
      }
      if (safeFields.total !== undefined && safeFields.totalAmount === undefined) {
        safeFields.totalAmount = safeFields.total;
      }
      
      // If useFakturPajak is enabled, recalculate tax from items or subtotal
      // Handle both boolean true and string "true" since form data may send it as string
      const useFakturPajak = safeFields.useFakturPajak === true || safeFields.useFakturPajak === 'true';
      if (useFakturPajak && items && Array.isArray(items) && items.length > 0) {
        const taxRate = parseFloat(safeFields.taxRate || '11') || 11;
        const taxMultiplier = 1 + (taxRate / 100);
        
        // Calculate total from items
        let itemsTotal = 0;
        items.forEach((item: any) => {
          const qty = parseFloat(item.quantity || '0');
          const price = parseFloat(item.unitPrice || item.price || '0');
          itemsTotal += qty * price;
        });
        
        // Calculate DPP (subtotal) and PPN (tax)
        const dpp = itemsTotal / taxMultiplier;
        const ppn = itemsTotal - dpp;
        const discount = parseFloat(safeFields.discount || '0');
        const shipping = parseFloat(safeFields.shipping || '0');
        const total = itemsTotal - discount + shipping;
        
        safeFields.subtotal = dpp.toFixed(2);
        safeFields.taxAmount = ppn.toFixed(2);
        safeFields.totalAmount = total.toFixed(2);
      }
      
      // Copy safe primitive fields
      const allowedFields = [
        'clientId', 'status', 'paymentTerms', 'subtotal', 'taxRate', 'taxAmount',
        'discount', 'shipping', 'totalAmount', 'amountPaid', 'notes', 'isVoided', 'voidReason',
        'useFakturPajak', 'fakturPajakNumber', 'deliveryAddress', 'deliveryAddressLink'
      ];
      
      for (const field of allowedFields) {
        if (safeFields[field] !== undefined) {
          // Skip empty string for enum fields (paymentTerms, status)
          if ((field === 'paymentTerms' || field === 'status') && safeFields[field] === '') {
            continue;
          }
          invoiceFields[field] = safeFields[field];
        }
      }
      
      // Convert date strings to proper format for database (YYYY-MM-DD for date type columns)
      if (safeFields.issueDate) {
        const d = new Date(safeFields.issueDate);
        invoiceFields.issueDate = d.toISOString().split('T')[0];
      }
      if (safeFields.dueDate) {
        const d = new Date(safeFields.dueDate);
        invoiceFields.dueDate = d.toISOString().split('T')[0];
      }
      
      let updatedInvoice;
      
      // If items are provided, use updateInvoiceWithItems
      if (items && Array.isArray(items) && items.length > 0) {
        updatedInvoice = await storage.updateInvoiceWithItems(invoiceId, invoiceFields, items);
      } else {
        // Otherwise just update invoice metadata
        const validatedData = validateRequestBody(insertInvoiceSchema.partial(), { body: invoiceFields } as any, res);
        if (!validatedData) return;
        updatedInvoice = await storage.updateInvoice(invoiceId, validatedData);
      }
      
      res.json(updatedInvoice);
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      res.status(400).json({ error: error.message || "Server error" });
    }
  });

  app.put("/api/invoices/:id/status", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const schema = z.object({
        status: z.enum(["draft", "sent", "paid", "overdue", "cancelled", "void"])
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

  // Void invoice endpoint (replaces delete - invoices should never be deleted, only voided)
  app.post("/api/invoices/:id/void", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      if (invoice.isVoided) {
        return res.status(400).json({ error: "Invoice is already voided" });
      }
      
      const updatedInvoice = await storage.voidInvoice(invoiceId);
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error voiding invoice:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Delete invoice endpoint - DISABLED for audit trail integrity
  // Invoices should never be deleted, only voided to maintain financial audit trail
  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    return res.status(403).json({ 
      error: "Invoice deletion is not allowed", 
      message: "Untuk mencegah kecurangan, invoice tidak dapat dihapus. Gunakan status 'Void' untuk membatalkan invoice." 
    });
  });

  // Invoice payment routes
  app.get("/api/invoices/:invoiceId/payments", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const payments = await storage.getInvoicePayments(invoiceId);
      res.json(payments);
    } catch (error) {
      console.error("Error getting invoice payments:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/invoices/:invoiceId/payments", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      
      // Validate the payment data
      const validatedData = validateRequestBody(insertInvoicePaymentSchema, req, res);
      if (!validatedData) return;

      // Handle creditNoteId from request body (not in schema validation)
      const creditNoteId = req.body.creditNoteId ? parseInt(req.body.creditNoteId) : null;
      
      // Ensure the invoiceId in the URL matches the one in the body
      const paymentData: any = {
        ...validatedData,
        invoiceId: invoiceId
      };
      
      // Add creditNoteId to payment if provided
      if (creditNoteId) {
        paymentData.creditNoteId = creditNoteId;
      }
      
      const newPayment = await storage.createInvoicePayment(paymentData);
      
      // Get the invoice to check if it's fully paid and get store/user info
      const invoice = await storage.getInvoice(invoiceId);
      if (invoice) {
        // Get all payments for this invoice including the new one
        const allPayments = await storage.getInvoicePayments(invoiceId);
        const totalPayments = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const invoiceTotal = parseFloat(invoice.totalAmount);
        
        // If fully paid, update invoice status to "paid" and reserve stock
        if (totalPayments >= invoiceTotal && invoice.status !== 'paid') {
          await storage.updateInvoice(invoiceId, { status: 'paid' });
          // Reserve stock for this invoice (prevents overselling)
          await storage.reserveStockForInvoice(invoiceId);
        }
        
        // If payment is using a credit note, deduct from credit note balance
        if (creditNoteId && validatedData.paymentType === 'Credit Note') {
          await storage.applyCreditNoteToPayment(
            creditNoteId, 
            newPayment.id, 
            parseFloat(validatedData.amount)
          );
        } else {
          // Only create transaction for non-credit-note payments (actual cash receipts)
          // Lookup payment type to get cash account and deduction percentage
          const paymentType = await storage.getPaymentTypeByName(invoice.storeId, validatedData.paymentType);
          
          // Calculate net amount after deduction
          const paymentAmount = parseFloat(validatedData.amount);
          let netAmount = paymentAmount;
          let deductionAmount = 0;
          
          if (paymentType?.deductionPercentage) {
            const deductionPct = parseFloat(paymentType.deductionPercentage);
            deductionAmount = paymentAmount * (deductionPct / 100);
            netAmount = paymentAmount - deductionAmount;
          }
          
          // Check if store has auto transaction setting for invoice payments
          const store = await storage.getStore(invoice.storeId);
          const inflowCategoryId = store?.invoicePaymentCategoryId;
          
          // Only create transaction if category is configured
          if (inflowCategoryId) {
            // Get category name
            const inflowCategory = await storage.getInflowCategory(inflowCategoryId);
            const categoryName = inflowCategory?.name || 'invoice_payment';
            
            // Get client name for description
            let clientName = '';
            if (invoice.clientId) {
              const client = await storage.getClient(invoice.clientId);
              clientName = client?.name || '';
            }
            
            // Create a transaction entry for this payment as income
            const transactionData: any = {
              storeId: invoice.storeId,
              type: 'income' as const,
              category: categoryName,
              amount: netAmount.toFixed(2),
              date: validatedData.paymentDate,
              description: deductionAmount > 0 
                ? `Payment for invoice ${invoice.invoiceNumber}${clientName ? ` - ${clientName}` : ''} (${validatedData.paymentType}, net after ${paymentType?.deductionPercentage}% fee)`
                : `Payment received for invoice ${invoice.invoiceNumber}${clientName ? ` - ${clientName}` : ''}`,
              referenceNumber: `Invoice #${invoice.invoiceNumber}`,
              invoicePaymentId: newPayment.id,
            };
            
            // Link to cash account if payment type has one
            if (paymentType?.cashAccountId) {
              transactionData.accountId = paymentType.cashAccountId;
            }
            
            console.log("Creating invoice payment transaction:", transactionData);
            await storage.createTransaction(transactionData);
          }
        }
      }
      
      res.status(201).json(newPayment);
    } catch (error) {
      console.error("Error creating invoice payment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/invoices/:invoiceId/payments/:paymentId", requireAuth, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.paymentId);
      
      // Validate the payment data
      const validatedData = validateRequestBody(insertInvoicePaymentSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedPayment = await storage.updateInvoicePayment(paymentId, validatedData);
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error updating invoice payment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/invoices/:invoiceId/payments/:paymentId", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const paymentId = parseInt(req.params.paymentId);
      
      // Get the payment details before deleting (to find matching transaction)
      const payment = await storage.getInvoicePayment(paymentId);
      
      // Delete the payment
      await storage.deleteInvoicePayment(paymentId);
      
      // Delete the corresponding transaction if it exists
      // Use the invoicePaymentId field to directly find the transaction
      await storage.deleteTransactionByInvoicePaymentId(paymentId);
      console.log(`Deleted transaction linked to invoice payment ${paymentId}`);
      
      // Get the invoice and recalculate if status needs updating
      const invoice = await storage.getInvoice(invoiceId);
      if (invoice) {
        // Get all remaining payments after deletion
        const allPayments = await storage.getInvoicePayments(invoiceId);
        const totalPayments = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const invoiceTotal = parseFloat(invoice.totalAmount);
        
        // If invoice was 'paid' but payments no longer cover full amount, revert to 'sent' and release reservations
        if (invoice.status === 'paid' && totalPayments < invoiceTotal) {
          await storage.updateInvoice(invoiceId, { status: 'sent' });
          // Release stock reservation since invoice is no longer fully paid
          await storage.releaseStockReservationForInvoice(invoiceId);
          console.log(`Invoice ${invoiceId} status changed from 'paid' to 'sent' (payments: ${totalPayments}, total: ${invoiceTotal})`);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invoice payment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Delivery note routes
  app.get("/api/stores/:storeId/delivery-notes", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const status = req.query.status as string | undefined;
      const deliveryNotes = await storage.getDeliveryNotesWithDetails(storeId, status);
      res.json(deliveryNotes);
    } catch (error) {
      console.error("Error getting delivery notes:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/delivery-notes/:id/status", requireAuth, async (req, res) => {
    try {
      const deliveryNoteId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['pending', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      // Get current status before update
      const currentNote = await storage.getDeliveryNote(deliveryNoteId);
      const previousStatus = currentNote?.status;
      
      const updatedDeliveryNote = await storage.updateDeliveryNote(deliveryNoteId, { status });
      
      // When status changes to 'delivered', allocate stock using FIFO and calculate profit
      if (status === 'delivered' && previousStatus !== 'delivered') {
        await storage.allocateStockOnDelivery(deliveryNoteId);
      }
      
      // When status changes from 'delivered' to 'cancelled', reverse the stock allocation
      if (status === 'cancelled' && previousStatus === 'delivered') {
        await storage.reverseDeliveryNoteStock(deliveryNoteId);
      }
      
      res.json(updatedDeliveryNote);
    } catch (error) {
      console.error("Error updating delivery note status:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/delivery-notes/:id/revert-to-pending", requireAuth, async (req, res) => {
    try {
      const deliveryNoteId = parseInt(req.params.id);
      const updatedDeliveryNote = await storage.revertDeliveryNoteToPending(deliveryNoteId);
      res.json(updatedDeliveryNote);
    } catch (error: any) {
      console.error("Error reverting delivery note to pending:", error);
      res.status(400).json({ error: error.message || "Server error" });
    }
  });

  app.put("/api/delivery-notes/:id/items", requireAuth, async (req, res) => {
    try {
      const deliveryNoteId = parseInt(req.params.id);
      const { items } = req.body;
      
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items array is required" });
      }
      
      // Validate each item in the array
      const validatedItems: { invoiceItemId: number; deliveredQuantity: number }[] = [];
      for (const item of items) {
        if (typeof item.invoiceItemId !== 'number' || isNaN(item.invoiceItemId)) {
          return res.status(400).json({ error: "Each item must have a valid invoiceItemId" });
        }
        if (typeof item.deliveredQuantity !== 'number' || isNaN(item.deliveredQuantity) || item.deliveredQuantity < 0) {
          return res.status(400).json({ error: "Each item must have a valid non-negative deliveredQuantity" });
        }
        validatedItems.push({
          invoiceItemId: item.invoiceItemId,
          deliveredQuantity: item.deliveredQuantity
        });
      }
      
      await storage.updateDeliveryNoteItems(deliveryNoteId, validatedItems);
      const updatedNote = await storage.getDeliveryNoteWithItems(deliveryNoteId);
      res.json(updatedNote);
    } catch (error: any) {
      console.error("Error updating delivery note items:", error);
      res.status(400).json({ error: error.message || "Server error" });
    }
  });

  app.get("/api/invoices/:invoiceId/delivery-notes", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const deliveryNotes = await storage.getDeliveryNotesByInvoice(invoiceId);
      res.json(deliveryNotes);
    } catch (error) {
      console.error("Error getting delivery notes:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/invoices/:invoiceId/delivery-status", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const deliveryStatus = await storage.getInvoiceDeliveryStatus(invoiceId);
      res.json(deliveryStatus);
    } catch (error) {
      console.error("Error getting delivery status:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/delivery-notes/next-number", requireAuth, async (req, res) => {
    try {
      const dateStr = req.query.date as string | undefined;
      const date = dateStr ? new Date(dateStr) : undefined;
      const nextNumber = await storage.getNextDeliveryNoteNumber(date);
      res.json({ deliveryNumber: nextNumber });
    } catch (error) {
      console.error("Error getting next delivery note number:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/delivery-notes/:id", requireAuth, async (req, res) => {
    try {
      const deliveryNoteId = parseInt(req.params.id);
      const deliveryNote = await storage.getDeliveryNoteWithItems(deliveryNoteId);
      
      if (!deliveryNote) {
        return res.status(404).json({ error: "Delivery note not found" });
      }
      
      res.json(deliveryNote);
    } catch (error) {
      console.error("Error getting delivery note:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/invoices/:invoiceId/delivery-notes", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      
      // Use a flexible schema that accepts string dates
      const schema = z.object({
        deliveryNote: z.object({
          storeId: z.number(),
          invoiceId: z.number().optional(),
          deliveryDate: z.string(),
          deliveryType: z.enum(['delivered', 'self_pickup']).optional().default('delivered'),
          status: z.enum(['pending', 'delivered', 'cancelled']).optional(),
          vehicleInfo: z.string().nullable().optional(),
          driverName: z.string().nullable().optional(),
          recipientName: z.string().nullable().optional(),
          notes: z.string().nullable().optional()
        }),
        items: z.array(
          z.object({
            invoiceItemId: z.number(),
            deliveredQuantity: z.union([z.string(), z.number()]),
            remarks: z.string().nullable().optional()
          })
        )
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      // Ensure invoiceId matches
      const deliveryNoteData = {
        ...validatedData.deliveryNote,
        invoiceId
      };
      
      // Convert items to proper format
      const items = validatedData.items.map(item => ({
        ...item,
        deliveredQuantity: item.deliveredQuantity.toString(),
        deliveryNoteId: 0 // Will be set by storage
      }));
      
      const newDeliveryNote = await storage.createDeliveryNote(deliveryNoteData, items);
      res.status(201).json(newDeliveryNote);
    } catch (error) {
      console.error("Error creating delivery note:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/delivery-notes/:id", requireAuth, async (req, res) => {
    try {
      const deliveryNoteId = parseInt(req.params.id);
      
      const validatedData = validateRequestBody(insertDeliveryNoteSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedDeliveryNote = await storage.updateDeliveryNote(deliveryNoteId, validatedData);
      res.json(updatedDeliveryNote);
    } catch (error) {
      console.error("Error updating delivery note:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/delivery-notes/:id", requireAuth, async (req, res) => {
    try {
      const deliveryNoteId = parseInt(req.params.id);
      await storage.deleteDeliveryNote(deliveryNoteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting delivery note:", error);
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

  // Get next quotation number preview - MUST be before /:id route  
  app.get("/api/quotations/next-number", requireAuth, async (req, res) => {
    try {
      const nextNumber = await storage.getNextQuotationNumber();
      res.json({ quotationNumber: nextNumber });
    } catch (error) {
      console.error("Error getting next quotation number:", error);
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
      const { quotation: quotationData, items } = req.body;
      
      // Map frontend field names to backend field names
      if (quotationData.tax !== undefined && quotationData.taxAmount === undefined) {
        quotationData.taxAmount = quotationData.tax;
      }
      if (quotationData.total !== undefined && quotationData.totalAmount === undefined) {
        quotationData.totalAmount = quotationData.total;
      }
      
      // If useFakturPajak is enabled, recalculate tax from items
      // Handle both boolean true and string "true" since form data may send it as string
      const useFakturPajakEnabled = quotationData.useFakturPajak === true || quotationData.useFakturPajak === 'true';
      if (useFakturPajakEnabled && items && Array.isArray(items) && items.length > 0) {
        const taxRate = parseFloat(quotationData.taxRate || '11') || 11;
        const taxMultiplier = 1 + (taxRate / 100);
        
        // Calculate total from items
        let itemsTotal = 0;
        items.forEach((item: any) => {
          const qty = parseFloat(item.quantity || '0');
          const price = parseFloat(item.unitPrice || item.price || '0');
          itemsTotal += qty * price;
        });
        
        // Calculate DPP (subtotal) and PPN (tax)
        const dpp = itemsTotal / taxMultiplier;
        const ppn = itemsTotal - dpp;
        const discount = parseFloat(quotationData.discount || '0');
        const shipping = parseFloat(quotationData.shipping || '0');
        const total = itemsTotal - discount + shipping;
        
        quotationData.subtotal = dpp.toFixed(2);
        quotationData.taxAmount = ppn.toFixed(2);
        quotationData.totalAmount = total.toFixed(2);
      }
      
      // Validate quotation data
      const validatedQuotation = insertQuotationSchema.partial().safeParse(quotationData);
      if (!validatedQuotation.success) {
        return res.status(400).json({ error: "Invalid quotation data", details: validatedQuotation.error });
      }
      
      // Prevent modification of quotation number to prevent fraud
      if ((validatedQuotation.data as any).quotationNumber !== undefined) {
        return res.status(400).json({ error: "Quotation number cannot be modified" });
      }
      
      const updatedQuotation = await storage.updateQuotation(quotationId, validatedQuotation.data, items);
      res.json(updatedQuotation);
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/quotations/:id", requireAuth, async (req, res) => {
    try {
      const quotationId = parseInt(req.params.id);
      
      const patchQuotationSchema = z.object({
        status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional(),
        rejectionReason: z.string().optional()
      }).refine((data) => {
        if (data.status === 'rejected' && (!data.rejectionReason || !data.rejectionReason.trim())) {
          return false;
        }
        return true;
      }, {
        message: "Rejection reason is required when rejecting a quotation"
      });
      
      const validatedData = patchQuotationSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ error: "Invalid request data", details: validatedData.error });
      }
      
      const { status, rejectionReason } = validatedData.data;
      
      const updateData: { status?: string; rejectionReason?: string } = {};
      if (status !== undefined) {
        updateData.status = status;
      }
      if (rejectionReason !== undefined) {
        updateData.rejectionReason = rejectionReason.trim();
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      
      const updatedQuotation = await storage.patchQuotation(quotationId, updateData);
      res.json(updatedQuotation);
    } catch (error) {
      console.error("Error patching quotation:", error);
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
      const dateRange = req.query.dateRange as string | undefined;
      
      let transactions;
      if (type) {
        transactions = await storage.getTransactionsByType(storeId, type);
      } else {
        transactions = await storage.getTransactions(storeId);
      }
      
      // Filter by date range if specified
      if (dateRange && transactions.length > 0) {
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        
        if (dateRange === 'this_month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (dateRange === 'last_month') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        } else if (dateRange === 'this_quarter') {
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        } else if (dateRange === 'this_year') {
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else if (dateRange.startsWith('custom:')) {
          const [, from, to] = dateRange.split(':');
          if (from && to) {
            startDate = new Date(from);
            endDate = new Date(to);
            endDate.setHours(23, 59, 59, 999);
          }
        }
        
        if (startDate && endDate) {
          transactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= startDate! && txDate <= endDate!;
          });
        }
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

  // Stock Adjustment routes
  app.get("/api/stores/:storeId/stock-adjustments", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const adjustments = await storage.getStockAdjustments(storeId);
      res.json(adjustments);
    } catch (error) {
      console.error("Error getting stock adjustments:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/products/:productId/stock-adjustments", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const storeId = parseInt(req.query.storeId as string) || 1;
      const adjustments = await storage.getStockAdjustmentsByProduct(productId, storeId);
      res.json(adjustments);
    } catch (error) {
      console.error("Error getting product stock adjustments:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stock-adjustments/:id", requireAuth, async (req, res) => {
    try {
      const adjustmentId = parseInt(req.params.id);
      const adjustment = await storage.getStockAdjustment(adjustmentId);
      
      if (!adjustment) {
        return res.status(404).json({ error: "Stock adjustment not found" });
      }
      
      res.json(adjustment);
    } catch (error) {
      console.error("Error getting stock adjustment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/stock-adjustments", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertStockAdjustmentSchema, req, res);
      if (!validatedData) return;
      
      const userId = (req.user as any)?.id;
      
      const adjustment = await storage.createStockAdjustment({
        ...validatedData,
        createdBy: userId || null
      });
      
      res.status(201).json(adjustment);
    } catch (error) {
      console.error("Error creating stock adjustment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/stock-adjustments/:id", requireAuth, async (req, res) => {
    try {
      const adjustmentId = parseInt(req.params.id);
      await storage.deleteStockAdjustment(adjustmentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting stock adjustment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Purchase Order routes
  app.get("/api/stores/:storeId/purchase-orders", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const purchaseOrders = await storage.getPurchaseOrders(storeId);
      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error getting purchase orders:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Fallback route without storeId - uses default store 1
  app.get("/api/purchase-orders", requireAuth, async (req, res) => {
    try {
      const purchaseOrders = await storage.getPurchaseOrdersWithItems(1);
      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error getting purchase orders:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get next purchase order number preview - MUST be before /:id route
  app.get("/api/purchase-orders/next-number", requireAuth, async (req, res) => {
    try {
      const orderDate = req.query.orderDate ? new Date(req.query.orderDate as string) : new Date();
      const nextNumber = await storage.getNextPurchaseOrderNumber(orderDate);
      res.json({ purchaseOrderNumber: nextNumber });
    } catch (error) {
      console.error("Error getting next purchase order number:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/purchase-orders/:id", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      const result = await storage.getPurchaseOrderWithItems(purchaseOrderId);
      
      if (!result) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      // Calculate received quantities from Goods Receipts for each PO item
      const receivedQuantitiesMap = await storage.getReceivedQuantitiesForPO(purchaseOrderId);
      
      // Update items with calculated received quantities
      const itemsWithReceivedQty = result.items.map(item => ({
        ...item,
        receivedQuantity: receivedQuantitiesMap.get(item.productId) || "0"
      }));
      
      // Return a flattened object with purchaseOrder fields and items array
      res.json({
        ...result.purchaseOrder,
        items: itemsWithReceivedQty
      });
    } catch (error) {
      console.error("Error getting purchase order:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/purchase-orders", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        purchaseOrder: insertPurchaseOrderSchema,
        items: z.array(
          z.object({
            description: z.string(),
            productId: z.number(),
            productUnitId: z.number().nullable().optional(),
            quantity: z.union([z.string(), z.number()]),
            baseQuantity: z.union([z.string(), z.number()]).nullable().optional(),
            unitCost: z.union([z.string(), z.number()]),
            baseCost: z.union([z.string(), z.number()]).nullable().optional(),
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
      
      const newPurchaseOrder = await storage.createPurchaseOrder(
        validatedData.purchaseOrder,
        validatedData.items
      );
      
      res.status(201).json(newPurchaseOrder);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/purchase-orders/:id", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      const schema = z.object({
        purchaseOrder: insertPurchaseOrderSchema.partial(),
        items: z.array(
          z.object({
            id: z.number().optional(),
            description: z.string(),
            productId: z.number().nullable(),
            productUnitId: z.number().nullable().optional(),
            quantity: z.union([z.string(), z.number()]),
            baseQuantity: z.union([z.string(), z.number()]).nullable().optional(),
            unitCost: z.union([z.string(), z.number()]),
            baseCost: z.union([z.string(), z.number()]).nullable().optional(),
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
      
      const updatedPurchaseOrder = await storage.updatePurchaseOrder(
        purchaseOrderId, 
        validatedData.purchaseOrder, 
        validatedData.items
      );
      
      res.json(updatedPurchaseOrder);
    } catch (error) {
      console.error("Error updating purchase order:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/purchase-orders/:id", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      await storage.deletePurchaseOrder(purchaseOrderId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/purchase-orders/:id/status", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      const schema = z.object({
        status: z.enum(['draft', 'sent', 'received', 'partial', 'cancelled']),
        deliveredDate: z.string().optional()
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const updatedPurchaseOrder = await storage.updatePurchaseOrderStatus(
        purchaseOrderId, 
        validatedData.status,
        validatedData.deliveredDate ? new Date(validatedData.deliveredDate) : undefined
      );
      
      res.json(updatedPurchaseOrder);
    } catch (error) {
      console.error("Error updating purchase order status:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Receive purchase order items route
  app.post("/api/purchase-orders/:id/receive", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      const schema = z.object({
        items: z.array(z.object({
          itemId: z.number(),
          quantityReceived: z.number().min(0, "Quantity must be positive")
        }))
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const result = await storage.receivePurchaseOrderItems(purchaseOrderId, validatedData.items);
      res.json(result);
    } catch (error) {
      console.error("Error receiving purchase order items:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Purchase Order Payment routes (for prepaid POs)
  app.get("/api/purchase-orders/:purchaseOrderId/payments", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.purchaseOrderId);
      const payments = await storage.getPurchaseOrderPayments(purchaseOrderId);
      res.json(payments);
    } catch (error) {
      console.error("Error getting purchase order payments:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/purchase-orders/:purchaseOrderId/paid-amount", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.purchaseOrderId);
      const paidAmount = await storage.getPurchaseOrderPaidAmount(purchaseOrderId);
      res.json({ paidAmount });
    } catch (error) {
      console.error("Error getting purchase order paid amount:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/purchase-orders/:purchaseOrderId/payments", requireAuth, async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.purchaseOrderId);
      
      const validatedData = validateRequestBody(insertPurchaseOrderPaymentSchema, req, res);
      if (!validatedData) return;

      const paymentData = {
        ...validatedData,
        purchaseOrderId: purchaseOrderId
      };
      
      const newPayment = await storage.createPurchaseOrderPayment(paymentData);
      res.status(201).json(newPayment);
    } catch (error) {
      console.error("Error creating purchase order payment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/purchase-orders/:purchaseOrderId/payments/:paymentId", requireAuth, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.paymentId);
      
      const validatedData = validateRequestBody(insertPurchaseOrderPaymentSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedPayment = await storage.updatePurchaseOrderPayment(paymentId, validatedData);
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error updating purchase order payment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/purchase-orders/:purchaseOrderId/payments/:paymentId", requireAuth, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.paymentId);
      await storage.deletePurchaseOrderPayment(paymentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting purchase order payment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Goods Receipt routes
  app.get("/api/stores/:storeId/goods-receipts", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const goodsReceipts = await storage.getGoodsReceipts(storeId);
      res.json(goodsReceipts);
    } catch (error) {
      console.error("Error getting goods receipts:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/goods-receipts/pending-returns", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const goodsReceipts = await storage.getGoodsReceiptsWithPendingReturns(storeId);
      res.json(goodsReceipts);
    } catch (error) {
      console.error("Error getting goods receipts with pending returns:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Fallback route without storeId - uses default store 1
  app.get("/api/goods-receipts", requireAuth, async (req, res) => {
    try {
      const goodsReceipts = await storage.getGoodsReceipts(1);
      res.json(goodsReceipts);
    } catch (error) {
      console.error("Error getting goods receipts:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/goods-receipts/next-number", requireAuth, async (req, res) => {
    try {
      const receiptDate = req.query.receiptDate ? new Date(req.query.receiptDate as string) : new Date();
      const nextNumber = await storage.getNextGoodsReceiptNumber(receiptDate);
      res.json({ receiptNumber: nextNumber });
    } catch (error) {
      console.error("Error getting next goods receipt number:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/goods-receipts/:id", requireAuth, async (req, res) => {
    try {
      const receiptId = parseInt(req.params.id);
      const goodsReceipt = await storage.getGoodsReceiptWithItems(receiptId);
      
      if (!goodsReceipt) {
        return res.status(404).json({ error: "Goods receipt not found" });
      }
      
      res.json(goodsReceipt);
    } catch (error) {
      console.error("Error getting goods receipt:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/goods-receipts", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        goodsReceipt: insertGoodsReceiptSchema,
        items: z.array(
          z.object({
            productId: z.number(),
            purchaseOrderId: z.number().nullable().optional(),
            purchaseOrderItemId: z.number().nullable().optional(),
            description: z.string(),
            quantity: z.union([z.string(), z.number()]),
            unitCost: z.union([z.string(), z.number()]),
            baseCost: z.union([z.string(), z.number()]).nullable().optional(),
            baseQuantity: z.union([z.string(), z.number()]).nullable().optional(),
            taxRate: z.union([z.string(), z.number()]).optional(),
            taxAmount: z.union([z.string(), z.number()]).optional(),
            discount: z.union([z.string(), z.number()]).optional(),
            subtotal: z.union([z.string(), z.number()]),
            totalAmount: z.union([z.string(), z.number()]),
            returnQuantity: z.union([z.string(), z.number()]).optional(),
            returnReason: z.string().optional(),
            returnStatus: z.enum(['none', 'pending', 'returned']).optional()
          })
        )
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const newGoodsReceipt = await storage.createGoodsReceipt(
        validatedData.goodsReceipt,
        validatedData.items
      );
      
      res.status(201).json(newGoodsReceipt);
    } catch (error) {
      console.error("Error creating goods receipt:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/goods-receipts/:id", requireAuth, async (req, res) => {
    try {
      const receiptId = parseInt(req.params.id);
      const schema = z.object({
        goodsReceipt: insertGoodsReceiptSchema.partial(),
        items: z.array(
          z.object({
            id: z.number().optional(),
            productId: z.number(),
            purchaseOrderId: z.number().nullable().optional(),
            purchaseOrderItemId: z.number().nullable().optional(),
            description: z.string(),
            quantity: z.union([z.string(), z.number()]),
            unitCost: z.union([z.string(), z.number()]),
            baseCost: z.union([z.string(), z.number()]).nullable().optional(),
            baseQuantity: z.union([z.string(), z.number()]).nullable().optional(),
            taxRate: z.union([z.string(), z.number()]).optional(),
            taxAmount: z.union([z.string(), z.number()]).optional(),
            discount: z.union([z.string(), z.number()]).optional(),
            subtotal: z.union([z.string(), z.number()]),
            totalAmount: z.union([z.string(), z.number()]),
            returnQuantity: z.union([z.string(), z.number()]).optional(),
            returnReason: z.string().optional(),
            returnStatus: z.enum(['none', 'pending', 'returned']).optional()
          })
        ).optional()
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const updatedGoodsReceipt = await storage.updateGoodsReceipt(
        receiptId, 
        validatedData.goodsReceipt, 
        validatedData.items
      );
      
      res.json(updatedGoodsReceipt);
    } catch (error) {
      console.error("Error updating goods receipt:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/goods-receipts/:id", requireAuth, async (req, res) => {
    try {
      const receiptId = parseInt(req.params.id);
      await storage.deleteGoodsReceipt(receiptId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting goods receipt:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/goods-receipts/:id/status", requireAuth, async (req, res) => {
    try {
      const receiptId = parseInt(req.params.id);
      const schema = z.object({
        status: z.enum(['draft', 'confirmed', 'partial_paid', 'paid', 'cancelled'])
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const updatedGoodsReceipt = await storage.updateGoodsReceiptStatus(
        receiptId, 
        validatedData.status
      );
      
      res.json(updatedGoodsReceipt);
    } catch (error) {
      console.error("Error updating goods receipt status:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Goods Receipt Item update (for return tracking)
  app.patch("/api/goods-receipt-items/:id", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const schema = z.object({
        returnQuantity: z.union([z.string(), z.number()]).optional(),
        returnReason: z.string().optional(),
        returnStatus: z.enum(['none', 'pending', 'returned']).optional(),
        returnedQuantity: z.union([z.string(), z.number()]).optional()
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const updatedItem = await storage.updateGoodsReceiptItem(itemId, validatedData);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating goods receipt item:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Goods Receipt Payment routes
  app.get("/api/goods-receipts/:goodsReceiptId/payments", requireAuth, async (req, res) => {
    try {
      const goodsReceiptId = parseInt(req.params.goodsReceiptId);
      const payments = await storage.getGoodsReceiptPayments(goodsReceiptId);
      res.json(payments);
    } catch (error) {
      console.error("Error getting goods receipt payments:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/goods-receipts/:goodsReceiptId/payments", requireAuth, async (req, res) => {
    try {
      const goodsReceiptId = parseInt(req.params.goodsReceiptId);
      const schema = z.object({
        paymentDate: z.string(),
        paymentType: z.string(),
        amount: z.union([z.string(), z.number()]),
        reference: z.string().optional(),
        notes: z.string().optional()
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const newPayment = await storage.createGoodsReceiptPayment({
        ...validatedData,
        goodsReceiptId
      });
      
      // Get goods receipt to find store and receipt number
      const goodsReceipt = await storage.getGoodsReceipt(goodsReceiptId);
      if (goodsReceipt) {
        // Check if store has auto transaction setting for goods receipt payments
        const store = await storage.getStore(goodsReceipt.storeId);
        const outflowCategoryId = store?.goodsReceiptPaymentCategoryId;
        
        if (outflowCategoryId) {
          // Get category name
          const outflowCategory = await storage.getOutflowCategory(outflowCategoryId);
          const categoryName = outflowCategory?.name || 'supplier_payment';
          
          // Get supplier name for description
          let supplierName = '';
          if (goodsReceipt.supplierId) {
            const supplier = await storage.getSupplier(goodsReceipt.supplierId);
            supplierName = supplier?.name || '';
          }
          
          // Create a transaction entry for this payment as expense
          const transactionData: any = {
            storeId: goodsReceipt.storeId,
            type: 'expense' as const,
            category: categoryName,
            amount: String(validatedData.amount),
            date: validatedData.paymentDate,
            description: `Payment for goods receipt ${goodsReceipt.receiptNumber}${supplierName ? ` - ${supplierName}` : ''}`,
            referenceNumber: `GR #${goodsReceipt.receiptNumber}`,
            goodsReceiptId: goodsReceiptId,
            goodsReceiptPaymentId: newPayment.id,
          };
          
          console.log("Creating goods receipt payment transaction:", transactionData);
          await storage.createTransaction(transactionData);
        }
      }
      
      res.status(201).json(newPayment);
    } catch (error) {
      console.error("Error creating goods receipt payment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/goods-receipts/:goodsReceiptId/payments/:paymentId", requireAuth, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.paymentId);
      const schema = z.object({
        paymentDate: z.string().optional(),
        paymentType: z.string().optional(),
        amount: z.union([z.string(), z.number()]).optional(),
        reference: z.string().optional(),
        notes: z.string().optional()
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const updatedPayment = await storage.updateGoodsReceiptPayment(paymentId, validatedData);
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error updating goods receipt payment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/goods-receipts/:goodsReceiptId/payments/:paymentId", requireAuth, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.paymentId);
      
      // Delete the corresponding transaction first
      await storage.deleteTransactionByGoodsReceiptPaymentId(paymentId);
      console.log(`Deleted transaction linked to goods receipt payment ${paymentId}`);
      
      await storage.deleteGoodsReceiptPayment(paymentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting goods receipt payment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Returns/Credit Note routes
  app.get("/api/stores/:storeId/returns", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const returns = await storage.getReturnsWithDetails(storeId);
      res.json(returns);
    } catch (error) {
      console.error("Error getting returns:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/returns/:id", requireAuth, async (req, res) => {
    try {
      const returnId = parseInt(req.params.id);
      const returnData = await storage.getReturnWithItems(returnId);
      
      if (!returnData) {
        return res.status(404).json({ error: "Return not found" });
      }
      
      res.json(returnData);
    } catch (error) {
      console.error("Error getting return:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/returns/:id/next-number", requireAuth, async (req, res) => {
    try {
      const dateParam = req.query.date as string;
      const date = dateParam ? new Date(dateParam) : undefined;
      const nextNumber = await storage.getNextReturnNumber(date);
      res.json({ returnNumber: nextNumber });
    } catch (error) {
      console.error("Error getting next return number:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/next-return-number", requireAuth, async (req, res) => {
    try {
      const dateParam = req.query.date as string;
      const date = dateParam ? new Date(dateParam) : undefined;
      const nextNumber = await storage.getNextReturnNumber(date);
      res.json({ returnNumber: nextNumber });
    } catch (error) {
      console.error("Error getting next return number:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/clients/:clientId/credit-notes", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const creditNotes = await storage.getClientCreditNotes(clientId);
      res.json(creditNotes);
    } catch (error) {
      console.error("Error getting client credit notes:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/stores/:storeId/returns", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const schema = z.object({
        returnNumber: z.string(),
        invoiceId: z.number(),
        clientId: z.number(),
        returnDate: z.string(),
        returnType: z.enum(['credit_note', 'refund']),
        totalAmount: z.union([z.string(), z.number()]),
        notes: z.string().optional(),
        items: z.array(z.object({
          invoiceItemId: z.number(),
          quantity: z.union([z.string(), z.number()]),
          price: z.union([z.string(), z.number()]),
          subtotal: z.union([z.string(), z.number()]),
          reason: z.string().optional()
        }))
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const { items, ...returnData } = validatedData;
      
      const newReturn = await storage.createReturn(
        {
          ...returnData,
          storeId,
          status: validatedData.returnType === 'refund' ? 'completed' : 'pending'
        },
        items
      );
      
      // If it's a refund, mark it as completed immediately
      if (validatedData.returnType === 'refund') {
        await storage.updateReturnStatus(newReturn.id, 'completed');
      }
      
      res.status(201).json(newReturn);
    } catch (error) {
      console.error("Error creating return:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/returns/:id/status", requireAuth, async (req, res) => {
    try {
      const returnId = parseInt(req.params.id);
      const schema = z.object({
        status: z.enum(['pending', 'completed', 'cancelled'])
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const updatedReturn = await storage.updateReturnStatus(returnId, validatedData.status);
      res.json(updatedReturn);
    } catch (error) {
      console.error("Error updating return status:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/returns/:id", requireAuth, async (req, res) => {
    try {
      const returnId = parseInt(req.params.id);
      const { notes, items } = req.body;
      const updatedReturn = await storage.updateReturn(returnId, { notes }, items);
      res.json(updatedReturn);
    } catch (error: any) {
      console.error("Error updating return:", error);
      res.status(400).json({ error: error.message || "Server error" });
    }
  });

  app.delete("/api/returns/:id", requireAuth, async (req, res) => {
    try {
      const returnId = parseInt(req.params.id);
      await storage.deleteReturn(returnId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting return:", error);
      if (error.message?.includes("Cannot delete")) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Server error" });
      }
    }
  });

  // Credit Note Usage routes
  app.get("/api/returns/:returnId/usages", requireAuth, async (req, res) => {
    try {
      const returnId = parseInt(req.params.returnId);
      const usages = await storage.getCreditNoteUsages(returnId);
      res.json(usages);
    } catch (error) {
      console.error("Error getting credit note usages:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/returns/:returnId/apply-to-payment", requireAuth, async (req, res) => {
    try {
      const returnId = parseInt(req.params.returnId);
      const schema = z.object({
        invoicePaymentId: z.number(),
        amount: z.union([z.string(), z.number()])
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const usage = await storage.applyCreditNoteToPayment(
        returnId,
        validatedData.invoicePaymentId,
        typeof validatedData.amount === 'string' ? parseFloat(validatedData.amount) : validatedData.amount
      );
      
      res.status(201).json(usage);
    } catch (error) {
      console.error("Error applying credit note to payment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/returns/:returnId/convert-to-refund", requireAuth, async (req, res) => {
    try {
      const returnId = parseInt(req.params.returnId);
      const schema = z.object({
        amount: z.union([z.string(), z.number()])
      });
      
      const validatedData = validateRequestBody(schema, req, res);
      if (!validatedData) return;
      
      const usage = await storage.convertCreditNoteToRefund(
        returnId,
        typeof validatedData.amount === 'string' ? parseFloat(validatedData.amount) : validatedData.amount
      );
      
      res.status(201).json(usage);
    } catch (error) {
      console.error("Error converting credit note to refund:", error);
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

  // Dashboard simple routes (default to store 1)
  app.get("/api/dashboard/recent-invoices", requireAuth, async (req, res) => {
    try {
      const storeId = 1; // Default to store 1
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const invoices = await storage.getRecentInvoices(storeId, limit);
      
      // Transform to match frontend interface
      const transformedInvoices = await Promise.all(invoices.map(async (invoice) => {
        const client = invoice.clientId ? await storage.getClient(invoice.clientId) : null;
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: client?.name || 'Unknown',
          issueDate: invoice.issueDate,
          total: invoice.totalAmount,
          status: invoice.status
        };
      }));
      
      res.json(transformedInvoices);
    } catch (error) {
      console.error("Error getting recent invoices:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/dashboard/top-clients", requireAuth, async (req, res) => {
    try {
      const storeId = 1; // Default to store 1
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const clients = await storage.getTopClients(storeId, limit);
      
      // Transform to match frontend interface
      const transformedClients = clients.map(client => {
        const names = client.name.split(' ');
        const initials = names.length > 1 
          ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
          : names[0].slice(0, 2).toUpperCase();
        
        return {
          id: client.id,
          name: client.name,
          email: client.email,
          totalValue: client.totalSpent,
          invoiceCount: client.invoiceCount,
          initials
        };
      });
      
      res.json(transformedClients);
    } catch (error) {
      console.error("Error getting top clients:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/dashboard/invoice-status", requireAuth, async (req, res) => {
    try {
      const storeId = 1; // Default to store 1
      const summary = await storage.getInvoiceStatusSummary(storeId);
      res.json(summary);
    } catch (error) {
      console.error("Error getting invoice status:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/dashboard/category-sales", requireAuth, async (req, res) => {
    try {
      const storeId = 1; // Default to store 1
      const data = await storage.getProductSalesByCategory(storeId);
      res.json(data);
    } catch (error) {
      console.error("Error getting category sales:", error);
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

  app.get("/api/stores/:storeId/dashboard/delivery-profit", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const startDate = req.query.start ? new Date(req.query.start as string) : undefined;
      const endDate = req.query.end ? new Date(req.query.end as string) : undefined;
      const data = await storage.getDeliveryProfitSummary(storeId, startDate, endDate);
      res.json(data);
    } catch (error) {
      console.error("Error getting delivery profit summary:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/dashboard/profit-overview", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const startDate = req.query.start ? new Date(req.query.start as string) : undefined;
      const endDate = req.query.end ? new Date(req.query.end as string) : undefined;
      const data = await storage.getProfitOverview(storeId, startDate, endDate);
      res.json(data);
    } catch (error) {
      console.error("Error getting profit overview:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Financial Reports endpoints
  app.get("/api/stores/:storeId/reports/financial", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const dateRange = req.query.dateRange as string || 'this_month';
      const report = await storage.getFinancialReport(storeId, dateRange);
      res.json(report);
    } catch (error) {
      console.error("Error getting financial report:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stores/:storeId/reports/cashflow", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const dateRange = req.query.dateRange as string || 'this_month';
      const report = await storage.getCashFlowReport(storeId, dateRange);
      res.json(report);
    } catch (error) {
      console.error("Error getting cash flow report:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Summary Dashboard Report
  app.get("/api/stores/:storeId/reports/summary", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const dateRange = req.query.dateRange as string || 'this_month';
      
      // Calculate date range
      const { startDate, endDate } = parseDateRange(dateRange);
      
      // Get all invoices
      const allInvoices = await storage.getInvoices(storeId);
      const invoicesInRange = allInvoices.filter(inv => {
        const invDate = new Date(inv.issueDate);
        return invDate >= startDate && invDate <= endDate;
      });
      
      // Calculate total sales revenue
      const totalSales = invoicesInRange.reduce((sum, inv) => 
        sum + parseFloat(inv.totalAmount || '0'), 0);
      
      // Get invoice payments for this period
      let totalReceived = 0;
      for (const inv of invoicesInRange) {
        const payments = await storage.getInvoicePayments(inv.id);
        const paymentTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        totalReceived += paymentTotal;
      }
      
      // Outstanding receivables (piutang)
      let totalReceivables = 0;
      for (const inv of allInvoices) {
        const payments = await storage.getInvoicePayments(inv.id);
        const paymentTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        const outstanding = parseFloat(inv.totalAmount || '0') - paymentTotal;
        if (outstanding > 0) totalReceivables += outstanding;
      }
      
      // Get goods receipts for supplier payables (hutang)
      const goodsReceipts = await storage.getGoodsReceipts(storeId);
      let totalPayables = 0;
      for (const gr of goodsReceipts) {
        const payments = await storage.getGoodsReceiptPayments(gr.id);
        const paymentTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        const outstanding = parseFloat(gr.totalAmount || '0') - paymentTotal;
        if (outstanding > 0) totalPayables += outstanding;
      }
      
      // Get transactions for income/expense breakdown
      const transactions = await storage.getTransactions(storeId);
      const transactionsInRange = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startDate && tDate <= endDate;
      });
      
      const totalIncome = transactionsInRange
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
      
      const totalExpense = transactionsInRange
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
      
      // Get actual profit from delivered delivery notes using FIFO calculation
      const profitOverview = await storage.getProfitOverview(storeId, startDate, endDate);
      const estimatedProfit = profitOverview.realizedProfit + profitOverview.projectedProfit;
      
      // Monthly trend (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthInvoices = allInvoices.filter(inv => {
          const invDate = new Date(inv.issueDate);
          return invDate >= monthStart && invDate <= monthEnd;
        });
        
        const monthSales = monthInvoices.reduce((sum, inv) => 
          sum + parseFloat(inv.totalAmount || '0'), 0);
        
        const monthTransactions = transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= monthStart && tDate <= monthEnd;
        });
        
        const monthExpenses = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
        
        monthlyData.push({
          month: date.toLocaleString('id-ID', { month: 'short', year: 'numeric' }),
          sales: monthSales,
          expenses: monthExpenses,
          profit: monthSales - monthExpenses
        });
      }
      
      res.json({
        totalSales,
        totalReceived,
        totalReceivables,
        totalPayables,
        totalIncome,
        totalExpense,
        netCashFlow: totalIncome - totalExpense,
        estimatedProfit,
        profitMargin: totalSales > 0 ? ((totalSales - totalExpense) / totalSales * 100) : 0,
        invoiceCount: invoicesInRange.length,
        monthlyTrend: monthlyData
      });
    } catch (error) {
      console.error("Error getting summary report:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Product Performance Report
  app.get("/api/stores/:storeId/reports/products", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const dateRange = req.query.dateRange as string || 'this_month';
      
      const { startDate, endDate } = parseDateRange(dateRange);
      
      // Get all invoices in range
      const allInvoices = await storage.getInvoices(storeId);
      const invoicesInRange = allInvoices.filter(inv => {
        const invDate = new Date(inv.issueDate);
        return invDate >= startDate && invDate <= endDate;
      });
      
      // Get all products
      const products = await storage.getProducts();
      const productMap = new Map(products.map(p => [p.id, p]));
      
      // Aggregate sales by product
      const productSales: Record<number, { 
        productId: number, 
        name: string, 
        quantitySold: number, 
        revenue: number,
        avgPrice: number 
      }> = {};
      
      for (const inv of invoicesInRange) {
        const invoiceData = await storage.getInvoiceWithItems(inv.id);
        if (!invoiceData) continue;
        for (const item of invoiceData.items) {
          if (item.productId) {
            const product = productMap.get(item.productId);
            if (!productSales[item.productId]) {
              productSales[item.productId] = {
                productId: item.productId,
                name: product?.name || item.description,
                quantitySold: 0,
                revenue: 0,
                avgPrice: 0
              };
            }
            productSales[item.productId].quantitySold += parseFloat(item.quantity || '0');
            productSales[item.productId].revenue += parseFloat(item.total || '0');
          }
        }
      }
      
      // Calculate average price and sort by revenue
      const productList = Object.values(productSales).map(p => ({
        ...p,
        avgPrice: p.quantitySold > 0 ? p.revenue / p.quantitySold : 0
      })).sort((a, b) => b.revenue - a.revenue);
      
      // Top 10 products by revenue
      const topProducts = productList.slice(0, 10);
      
      // Category breakdown
      const categoryRevenue: Record<string, number> = {};
      for (const ps of productList) {
        const product = productMap.get(ps.productId);
        const categoryName = 'Uncategorized'; // Could fetch category name if needed
        categoryRevenue[categoryName] = (categoryRevenue[categoryName] || 0) + ps.revenue;
      }
      
      res.json({
        topProducts,
        totalProductsSold: productList.length,
        totalRevenue: productList.reduce((sum, p) => sum + p.revenue, 0),
        totalQuantity: productList.reduce((sum, p) => sum + p.quantitySold, 0),
        categoryBreakdown: Object.entries(categoryRevenue).map(([name, value]) => ({ name, value }))
      });
    } catch (error) {
      console.error("Error getting product report:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Customer Performance Report
  app.get("/api/stores/:storeId/reports/customers", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const dateRange = req.query.dateRange as string || 'this_month';
      
      const { startDate, endDate } = parseDateRange(dateRange);
      
      // Get all clients
      const clients = await storage.getClients(storeId);
      const clientMap = new Map(clients.map(c => [c.id, c]));
      
      // Get all invoices
      const allInvoices = await storage.getInvoices(storeId);
      const invoicesInRange = allInvoices.filter(inv => {
        const invDate = new Date(inv.issueDate);
        return invDate >= startDate && invDate <= endDate;
      });
      
      // Aggregate by client
      const clientStats: Record<number, {
        clientId: number,
        name: string,
        invoiceCount: number,
        totalPurchase: number,
        totalPaid: number,
        outstanding: number,
        lastPurchaseDate: string | null
      }> = {};
      
      for (const inv of allInvoices) {
        if (!inv.clientId) continue;
        
        const client = clientMap.get(inv.clientId);
        if (!clientStats[inv.clientId]) {
          clientStats[inv.clientId] = {
            clientId: inv.clientId,
            name: client?.name || 'Unknown',
            invoiceCount: 0,
            totalPurchase: 0,
            totalPaid: 0,
            outstanding: 0,
            lastPurchaseDate: null
          };
        }
        
        // Only count invoices in range for stats
        const invDate = new Date(inv.issueDate);
        if (invDate >= startDate && invDate <= endDate) {
          clientStats[inv.clientId].invoiceCount++;
          clientStats[inv.clientId].totalPurchase += parseFloat(inv.totalAmount || '0');
          
          if (!clientStats[inv.clientId].lastPurchaseDate || 
              inv.issueDate > clientStats[inv.clientId].lastPurchaseDate!) {
            clientStats[inv.clientId].lastPurchaseDate = inv.issueDate;
          }
        }
        
        // Calculate outstanding for all time
        const payments = await storage.getInvoicePayments(inv.id);
        const paymentTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        clientStats[inv.clientId].totalPaid += paymentTotal;
        
        const outstanding = parseFloat(inv.totalAmount || '0') - paymentTotal;
        if (outstanding > 0) {
          clientStats[inv.clientId].outstanding += outstanding;
        }
      }
      
      const clientList = Object.values(clientStats);
      
      // Sort by total purchase (top customers)
      const topCustomers = [...clientList].sort((a, b) => b.totalPurchase - a.totalPurchase).slice(0, 10);
      
      // Sort by outstanding (highest debt)
      const highestReceivables = [...clientList]
        .filter(c => c.outstanding > 0)
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 10);
      
      res.json({
        topCustomers,
        highestReceivables,
        totalCustomers: clientList.length,
        totalReceivables: clientList.reduce((sum, c) => sum + c.outstanding, 0),
        avgPurchasePerCustomer: clientList.length > 0 
          ? clientList.reduce((sum, c) => sum + c.totalPurchase, 0) / clientList.length 
          : 0
      });
    } catch (error) {
      console.error("Error getting customer report:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Database backup endpoint
  app.get("/api/backup/export", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.query.storeId as string);
      
      if (!storeId) {
        res.status(400).json({ error: "Store ID is required" });
        return;
      }

      // Export all data for the store
      const [clients, products, categories, invoices, quotations, transactions] = await Promise.all([
        storage.getClients(storeId),
        storage.getProducts(),
        storage.getCategories(),
        storage.getInvoices(storeId),
        storage.getQuotations(storeId),
        storage.getTransactions(storeId)
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        storeId,
        data: {
          clients,
          products,
          categories,
          invoices,
          quotations,
          transactions
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="backup-${storeId}-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(backupData);
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // Database import endpoint
  app.post("/api/backup/import", requireAuth, async (req, res) => {
    try {
      const { data: backupData, storeId } = req.body;
      
      if (!backupData || !storeId) {
        res.status(400).json({ error: "Backup data and store ID are required" });
        return;
      }

      // Import data (this will replace existing data)
      let importedCount = 0;

      // Import clients
      if (backupData.clients) {
        for (const client of backupData.clients) {
          await storage.createClient({ ...client, storeId });
          importedCount++;
        }
      }

      // Import products
      if (backupData.products) {
        for (const product of backupData.products) {
          await storage.createProduct(product);
          importedCount++;
        }
      }

      // Import categories
      if (backupData.categories) {
        for (const category of backupData.categories) {
          await storage.createCategory(category);
          importedCount++;
        }
      }

      res.json({ 
        success: true, 
        message: `Successfully imported ${importedCount} records`,
        importedCount 
      });
    } catch (error) {
      console.error("Error importing backup:", error);
      res.status(500).json({ error: "Failed to import backup" });
    }
  });

  // CSV/XLSX Export routes
  app.get("/api/products/export/:format", requireAuth, async (req, res) => {
    try {
      const format = req.params.format; // 'csv' or 'xlsx'
      const products = await storage.getProducts();
      
      // Get current stock for each product from batches
      const productDataWithStock = await Promise.all(products.map(async (product) => {
        const batches = await storage.getProductBatches(product.id, 1);
        const currentStock = batches.reduce((sum, batch) => 
          sum + parseFloat(batch.remainingQuantity.toString()), 0
        );
        
        return {
          ID: product.id,
          Name: product.name,
          SKU: product.sku,
          Description: product.description || '',
          'Current Price': product.currentSellingPrice || '0',
          'Cost Price': product.costPrice || '',
          Unit: product.unit,
          'Current Stock': currentStock,
          'Initial Stock': '', // Empty for template - user fills this for new imports
          'Min Stock': product.minStock || '0',
          Weight: product.weight || '',
          Dimensions: product.dimensions || '',
          'Is Active': product.isActive ? 'Yes' : 'No'
        };
      }));

      if (format === 'csv') {
        const csvWriterInstance = csvWriter.createObjectCsvStringifier({
          header: [
            { id: 'ID', title: 'ID' },
            { id: 'Name', title: 'Name' },
            { id: 'SKU', title: 'SKU' },
            { id: 'Description', title: 'Description' },
            { id: 'Current Price', title: 'Current Price' },
            { id: 'Cost Price', title: 'Cost Price' },
            { id: 'Unit', title: 'Unit' },
            { id: 'Current Stock', title: 'Current Stock' },
            { id: 'Initial Stock', title: 'Initial Stock' },
            { id: 'Min Stock', title: 'Min Stock' },
            { id: 'Weight', title: 'Weight' },
            { id: 'Dimensions', title: 'Dimensions' },
            { id: 'Is Active', title: 'Is Active' }
          ]
        });

        const csvString = csvWriterInstance.getHeaderString() + csvWriterInstance.stringifyRecords(productDataWithStock);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="products-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvString);
      } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(productDataWithStock);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
        
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="products-${new Date().toISOString().split('T')[0]}.xlsx"`);
        res.send(buffer);
      } else {
        res.status(400).json({ error: "Invalid format. Use 'csv' or 'xlsx'" });
      }
    } catch (error) {
      console.error("Error exporting products:", error);
      res.status(500).json({ error: "Failed to export products" });
    }
  });

  app.get("/api/clients/export/:format", requireAuth, async (req, res) => {
    try {
      const format = req.params.format; // 'csv' or 'xlsx'
      const storeId = parseInt(req.query.storeId as string) || 1;
      const clients = await storage.getClients(storeId);

      const clientData = clients.map(client => ({
        ID: client.id,
        Name: client.name,
        Email: client.email,
        Phone: client.phone || '',
        Address: client.address || '',
        'Tax Number': client.taxNumber || '',
        Notes: client.notes || ''
      }));

      if (format === 'csv') {
        const csvWriterInstance = csvWriter.createObjectCsvStringifier({
          header: [
            { id: 'ID', title: 'ID' },
            { id: 'Name', title: 'Name' },
            { id: 'Email', title: 'Email' },
            { id: 'Phone', title: 'Phone' },
            { id: 'Address', title: 'Address' },
            { id: 'Tax Number', title: 'Tax Number' },
            { id: 'Notes', title: 'Notes' }
          ]
        });

        const csvString = csvWriterInstance.getHeaderString() + csvWriterInstance.stringifyRecords(clientData);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="clients-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvString);
      } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(clientData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
        
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="clients-${new Date().toISOString().split('T')[0]}.xlsx"`);
        res.send(buffer);
      } else {
        res.status(400).json({ error: "Invalid format. Use 'csv' or 'xlsx'" });
      }
    } catch (error) {
      console.error("Error exporting clients:", error);
      res.status(500).json({ error: "Failed to export clients" });
    }
  });

  // Invoice Export (with items) - Excel format
  app.get("/api/invoices/export/xlsx", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.query.storeId as string) || 1;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const paymentStatus = req.query.paymentStatus as string; // 'all', 'unpaid', 'partial_paid', 'paid', 'overdue'

      // Get invoices with filters
      const allInvoices = await storage.getInvoices(storeId);
      
      // Filter by date range (normalize to YYYY-MM-DD format)
      let filteredInvoices = allInvoices;
      if (startDate) {
        const normalizedStart = startDate.substring(0, 10);
        filteredInvoices = filteredInvoices.filter(inv => {
          const invDate = String(inv.issueDate).substring(0, 10);
          return invDate >= normalizedStart;
        });
      }
      if (endDate) {
        const normalizedEnd = endDate.substring(0, 10);
        filteredInvoices = filteredInvoices.filter(inv => {
          const invDate = String(inv.issueDate).substring(0, 10);
          return invDate <= normalizedEnd;
        });
      }

      // Exclude cancelled/void invoices
      filteredInvoices = filteredInvoices.filter(inv => inv.status !== 'cancelled' && inv.status !== 'void' && !inv.isVoided);

      // Calculate payment status for each invoice and filter
      const invoicesWithStatus = await Promise.all(
        filteredInvoices.map(async (inv) => {
          const status = await storage.calculatePaymentStatus(inv.id, inv.totalAmount, inv.dueDate);
          return { ...inv, paymentStatus: status };
        })
      );

      // Filter by payment status
      let finalInvoices = invoicesWithStatus;
      if (paymentStatus && paymentStatus !== 'all') {
        finalInvoices = invoicesWithStatus.filter(inv => inv.paymentStatus === paymentStatus);
      }

      // Get clients for lookup
      const clients = await storage.getClients(storeId);
      const clientMap = new Map(clients.map(c => [c.id, c]));

      // Get products for lookup
      const products = await storage.getProducts(storeId);
      const productMap = new Map(products.map(p => [p.id, p]));

      // Build export data - one row per invoice item
      const exportData: any[] = [];

      for (const invoice of finalInvoices) {
        const invoiceData = await storage.getInvoiceWithItems(invoice.id);
        const client = invoice.clientId ? clientMap.get(invoice.clientId) : null;
        const items = invoiceData?.items || [];

        for (const item of items) {
          const product = productMap.get(item.productId);
          exportData.push({
            'No Invoice': invoice.invoiceNumber,
            'Tanggal': invoice.issueDate,
            'Jatuh Tempo': invoice.dueDate,
            'Client': client?.name || '-',
            'Status Pembayaran': invoice.paymentStatus === 'paid' ? 'Lunas' :
                                invoice.paymentStatus === 'partial_paid' ? 'Sebagian' :
                                invoice.paymentStatus === 'overdue' ? 'Jatuh Tempo' : 'Belum Bayar',
            'Kode Produk': product?.sku || '-',
            'Nama Produk': item.description,
            'Qty': parseFloat(item.quantity),
            'Harga Satuan': parseFloat(item.unitPrice),
            'Diskon Item': parseFloat(item.discount || '0'),
            'Subtotal Item': parseFloat(item.subtotal),
            'Total Invoice': parseFloat(invoice.totalAmount),
            'Pajak Invoice': parseFloat(invoice.taxAmount || '0'),
            'Diskon Invoice': parseFloat(invoice.discount || '0'),
          });
        }
      }

      // Create Excel workbook
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

      // Auto-width columns
      const colWidths = [
        { wch: 15 }, // No Invoice
        { wch: 12 }, // Tanggal
        { wch: 12 }, // Jatuh Tempo
        { wch: 25 }, // Client
        { wch: 15 }, // Status Pembayaran
        { wch: 15 }, // Kode Produk
        { wch: 30 }, // Nama Produk
        { wch: 10 }, // Qty
        { wch: 15 }, // Harga Satuan
        { wch: 12 }, // Diskon Item
        { wch: 15 }, // Subtotal Item
        { wch: 15 }, // Total Invoice
        { wch: 12 }, // Pajak Invoice
        { wch: 12 }, // Diskon Invoice
      ];
      worksheet['!cols'] = colWidths;

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const filename = `invoices-${startDate || 'all'}-to-${endDate || 'all'}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting invoices:", error);
      res.status(500).json({ error: "Failed to export invoices" });
    }
  });

  // Export transactions to Excel
  app.get("/api/transactions/export/xlsx", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.query.storeId as string) || 1;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const transactionType = req.query.type as string; // 'all', 'income', 'expense'

      // Get all transactions
      const allTransactions = await storage.getTransactions(storeId);
      
      // Filter by date range
      let filteredTransactions = allTransactions;
      if (startDate) {
        const normalizedStart = startDate.substring(0, 10);
        filteredTransactions = filteredTransactions.filter(t => {
          const tDate = String(t.date).substring(0, 10);
          return tDate >= normalizedStart;
        });
      }
      if (endDate) {
        const normalizedEnd = endDate.substring(0, 10);
        filteredTransactions = filteredTransactions.filter(t => {
          const tDate = String(t.date).substring(0, 10);
          return tDate <= normalizedEnd;
        });
      }

      // Filter by transaction type
      if (transactionType && transactionType !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === transactionType);
      }

      // Sort by date descending
      filteredTransactions.sort((a, b) => String(b.date).localeCompare(String(a.date)));

      // Get cash accounts for lookup
      const cashAccounts = await storage.getCashAccounts(storeId);
      const cashAccountMap = new Map(cashAccounts.map(a => [a.id, a.name]));

      // Build export data
      const exportData = filteredTransactions.map(t => ({
        'Tanggal': t.date,
        'Tipe': t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        'Deskripsi': t.description,
        'Kategori': t.category || '-',
        'Akun Kas': t.accountId ? cashAccountMap.get(t.accountId) || '-' : '-',
        'No Referensi': t.referenceNumber || '-',
        'Jumlah': parseFloat(t.amount),
      }));

      // Create Excel workbook
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");

      // Auto-width columns
      const colWidths = [
        { wch: 12 }, // Tanggal
        { wch: 12 }, // Tipe
        { wch: 40 }, // Deskripsi
        { wch: 20 }, // Kategori
        { wch: 20 }, // Akun Kas
        { wch: 20 }, // No Referensi
        { wch: 15 }, // Jumlah
      ];
      worksheet['!cols'] = colWidths;

      // Write to buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const filename = `transaksi-${startDate || 'all'}-to-${endDate || 'all'}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting transactions:", error);
      res.status(500).json({ error: "Failed to export transactions" });
    }
  });

  // Stock management routes
  app.get("/api/products/:id/stock", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const storeId = parseInt(req.query.storeId as string) || 1;

      // Get total stock from all batches for this product
      const batches = await storage.getProductBatches(productId, storeId);
      const totalStock = batches.reduce((sum, batch) => 
        sum + parseFloat(batch.remainingQuantity.toString()), 0
      );

      // Get product details for min stock level
      const product = await storage.getProduct(productId);
      
      res.json({
        productId,
        currentStock: totalStock,
        minStock: product?.minStock || 0,
        isLowStock: totalStock <= (product?.minStock || 0),
        batches: batches.map(batch => ({
          id: batch.id,
          batchNumber: batch.batchNumber,
          remainingQuantity: parseFloat(batch.remainingQuantity.toString()),
          purchaseDate: batch.purchaseDate,
          expiryDate: batch.expiryDate
        }))
      });
    } catch (error) {
      console.error("Error getting product stock:", error);
      res.status(500).json({ error: "Failed to get product stock" });
    }
  });

  app.get("/api/stores/:storeId/products/stock", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      // Get ALL products, not just those with batches in this store
      const products = await storage.getProducts();
      
      // Get pending PO quantities for all products
      const pendingPOQuantities = await storage.getPendingPOQuantityByProduct(storeId);
      
      const productsWithStock = await Promise.all(
        products.map(async (product) => {
          const batches = await storage.getProductBatches(product.id, storeId);
          const currentStock = batches.reduce((sum, batch) => 
            sum + parseFloat(batch.remainingQuantity.toString()), 0
          );
          
          const pendingPOQuantity = pendingPOQuantities.get(product.id) || 0;
          
          // Get reserved quantity (from invoices with payment but not fully delivered)
          const reservedQty = await storage.getProductReservedQuantity(product.id, storeId);
          const availableStock = Math.max(0, currentStock - reservedQty);
          
          return {
            ...product,
            currentStock,
            reservedQty,
            availableStock,
            pendingPOQuantity,
            isLowStock: currentStock <= (product.minStock || 0),
            stockStatus: currentStock === 0 ? 'out_of_stock' : 
                        currentStock <= (product.minStock || 0) ? 'low_stock' : 'in_stock'
          };
        })
      );

      res.json(productsWithStock);
    } catch (error) {
      console.error("Error getting products with stock:", error);
      res.status(500).json({ error: "Failed to get products with stock" });
    }
  });

  // CSV/XLSX Import routes
  app.post("/api/products/import", requireAuth, async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!data || !Array.isArray(data)) {
        res.status(400).json({ error: "Invalid data format" });
        return;
      }

      let successCount = 0;
      let updateCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          const sku = row.SKU || row.sku;
          
          if (!sku) {
            errorCount++;
            errors.push(`Row ${data.indexOf(row) + 1}: SKU is required`);
            continue;
          }

          // Check if product exists
          const existingProduct = await storage.getProductBySku(sku);
          
          // Build update object only with fields that are present
          const productData: any = {};
          
          if (row.Name || row.name) {
            productData.name = row.Name || row.name;
          }
          
          if (row.Description !== undefined || row.description !== undefined) {
            productData.description = row.Description || row.description || '';
          }
          
          if (row['Current Price'] !== undefined || row.currentSellingPrice !== undefined) {
            productData.currentSellingPrice = row['Current Price'] || row.currentSellingPrice;
          }
          
          if (row['Cost Price'] !== undefined || row.costPrice !== undefined) {
            productData.costPrice = row['Cost Price'] || row.costPrice;
          }
          
          if (row['Lowest Price'] !== undefined || row.lowestPrice !== undefined) {
            productData.lowestPrice = row['Lowest Price'] || row.lowestPrice;
          }
          
          if (row.Unit || row.unit) {
            productData.unit = row.Unit || row.unit;
          }
          
          if (row['Min Stock'] !== undefined || row.minStock !== undefined) {
            productData.minStock = parseInt(row['Min Stock'] || row.minStock || '0');
          }
          
          if (row.Weight !== undefined || row.weight !== undefined) {
            productData.weight = row.Weight || row.weight || null;
          }
          
          if (row.Dimensions !== undefined || row.dimensions !== undefined) {
            productData.dimensions = row.Dimensions || row.dimensions || null;
          }
          
          if (row['Is Active'] !== undefined || row.isActive !== undefined) {
            const activeValue = row['Is Active'] || row.isActive;
            productData.isActive = activeValue === 'Yes' || activeValue === 'yes' || activeValue === true || activeValue === 'TRUE';
          }

          // Check for Initial Stock column
          const initialStock = row['Initial Stock'] !== undefined && row['Initial Stock'] !== '' 
            ? parseFloat(row['Initial Stock']) 
            : null;
          const costPriceForBatch = row['Cost Price'] !== undefined && row['Cost Price'] !== ''
            ? row['Cost Price']
            : productData.costPrice || '0';

          let productId: number;
          
          if (existingProduct) {
            // Update existing product
            await storage.updateProduct(existingProduct.id, productData);
            productId = existingProduct.id;
            updateCount++;
          } else {
            // Create new product (requires minimum fields)
            const newProductData = {
              sku,
              name: productData.name || sku,
              description: productData.description || '',
              currentSellingPrice: productData.currentSellingPrice || '0',
              unit: productData.unit || 'piece',
              minStock: productData.minStock || 0,
              weight: productData.weight || null,
              dimensions: productData.dimensions || null,
              isActive: productData.isActive !== undefined ? productData.isActive : true,
              costPrice: productData.costPrice || null,
              lowestPrice: productData.lowestPrice || null
            };
            
            const newProduct = await storage.createProduct(newProductData);
            productId = newProduct.id;
            successCount++;
          }
          
          // Create initial stock batch if Initial Stock is provided
          if (initialStock !== null && initialStock > 0) {
            const today = new Date().toISOString().split('T')[0];
            const batchNumber = `INIT-${sku}-${today}`;
            
            // Check if initial batch already exists for this product
            const existingBatches = await storage.getProductBatches(productId, 1);
            const hasInitialBatch = existingBatches.some(b => b.batchNumber.startsWith('INIT-'));
            
            if (!hasInitialBatch) {
              await storage.createProductBatch({
                productId,
                storeId: 1,
                batchNumber,
                purchaseDate: today,
                capitalCost: costPriceForBatch.toString(),
                initialQuantity: initialStock.toString(),
                remainingQuantity: initialStock.toString(),
                supplierName: 'Initial Stock',
                notes: 'Created from product import'
              });
            }
          }
        } catch (error: any) {
          errorCount++;
          errors.push(`Row ${data.indexOf(row) + 1}: ${error?.message || 'Unknown error'}`);
        }
      }

      res.json({
        success: true,
        message: `Import completed. ${successCount} new products created, ${updateCount} products updated, ${errorCount} errors.`,
        successCount,
        updateCount,
        errorCount,
        errors: errors.slice(0, 10) // Limit error messages
      });
    } catch (error) {
      console.error("Error importing products:", error);
      res.status(500).json({ error: "Failed to import products" });
    }
  });

  app.post("/api/clients/import", requireAuth, async (req, res) => {
    try {
      const { data, storeId } = req.body;
      
      if (!data || !Array.isArray(data) || !storeId) {
        res.status(400).json({ error: "Invalid data format or missing store ID" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          const clientData = {
            storeId: parseInt(storeId),
            name: row.Name || row.name,
            email: row.Email || row.email,
            phone: row.Phone || row.phone || '',
            address: row.Address || row.address || '',
            taxNumber: row['Tax Number'] || row.taxNumber || '',
            notes: row.Notes || row.notes || ''
          };

          await storage.createClient(clientData);
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(`Row ${data.indexOf(row) + 1}: ${error?.message || 'Unknown error'}`);
        }
      }

      res.json({
        success: true,
        message: `Import completed. ${successCount} clients imported successfully, ${errorCount} errors.`,
        successCount,
        errorCount,
        errors: errors.slice(0, 10) // Limit error messages
      });
    } catch (error) {
      console.error("Error importing clients:", error);
      res.status(500).json({ error: "Failed to import clients" });
    }
  });

  // Object Storage routes - for logo upload
  // Reference: blueprint:javascript_object_storage
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      console.log("Generated upload URL:", uploadURL);
      
      if (!uploadURL) {
        throw new Error("Failed to generate upload URL");
      }
      
      // Send response as JSON
      const responseData = { uploadURL: uploadURL };
      console.log("Sending response:", responseData);
      return res.json(responseData);
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      return res.status(500).json({ 
        error: "Failed to get upload URL",
        details: error?.message || "Unknown error"
      });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.put("/api/logo", requireAuth, async (req, res) => {
    if (!req.body.logoURL) {
      return res.status(400).json({ error: "logoURL is required" });
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.logoURL,
        {
          owner: userId.toString(),
          visibility: "public",
        },
      );

      res.status(200).json({
        logoPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Print Settings routes - print preferences only
  app.get("/api/stores/:storeId/print-settings", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      let printSettings = await storage.getPrintSettings(storeId);
      
      // If no settings exist, create default settings
      if (!printSettings) {
        printSettings = await storage.createPrintSettings({
          storeId,
          showTax: true,
          showDiscount: true,
          showPONumber: true,
          defaultNotes: "Items checked and verified upon delivery. Items cannot be returned.",
          accentColor: "#000000",
          paperSize: "prs"
        });
      }
      
      res.json(printSettings);
    } catch (error) {
      console.error("Error getting print settings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/stores/:storeId/print-settings", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const schema = z.object({
        showTax: z.boolean(),
        showDiscount: z.boolean(),
        showPONumber: z.boolean(),
        accentColor: z.string(),
        paperSize: z.enum(["a4", "prs", "halfsize"]),
      });
      
      const validatedData = schema.parse(req.body);
      
      // Check if settings exist, if not create them first
      let printSettings = await storage.getPrintSettings(storeId);
      
      if (!printSettings) {
        printSettings = await storage.createPrintSettings({
          ...validatedData,
          storeId
        });
      } else {
        printSettings = await storage.updatePrintSettings(storeId, validatedData);
      }
      
      res.json(printSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating print settings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Payment Types routes
  app.get("/api/stores/:storeId/payment-types", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const paymentTypes = await storage.getPaymentTypes(storeId);
      res.json(paymentTypes);
    } catch (error) {
      console.error("Error getting payment types:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/payment-types/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const paymentType = await storage.getPaymentType(id);
      
      if (!paymentType) {
        return res.status(404).json({ error: "Payment type not found" });
      }
      
      res.json(paymentType);
    } catch (error) {
      console.error("Error getting payment type:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/payment-types", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertPaymentTypeSchema, req, res);
      if (!validatedData) return;
      
      const newPaymentType = await storage.createPaymentType(validatedData);
      res.status(201).json(newPaymentType);
    } catch (error) {
      console.error("Error creating payment type:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/payment-types/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertPaymentTypeSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedPaymentType = await storage.updatePaymentType(id, validatedData);
      res.json(updatedPaymentType);
    } catch (error) {
      console.error("Error updating payment type:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/payment-types/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePaymentType(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment type:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Payment Terms routes
  app.get("/api/stores/:storeId/payment-terms", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const paymentTerms = await storage.getPaymentTerms(storeId);
      res.json(paymentTerms);
    } catch (error) {
      console.error("Error getting payment terms:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get all payment terms for current user's store (default storeId 1)
  app.get("/api/payment-terms", requireAuth, async (req, res) => {
    try {
      const storeId = 1; // Default store
      const paymentTerms = await storage.getPaymentTerms(storeId);
      res.json(paymentTerms);
    } catch (error) {
      console.error("Error getting payment terms:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/payment-terms/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const paymentTerm = await storage.getPaymentTerm(id);
      
      if (!paymentTerm) {
        return res.status(404).json({ error: "Payment term not found" });
      }
      
      res.json(paymentTerm);
    } catch (error) {
      console.error("Error getting payment term:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/payment-terms", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertPaymentTermSchema, req, res);
      if (!validatedData) return;
      
      const newPaymentTerm = await storage.createPaymentTerm(validatedData);
      res.status(201).json(newPaymentTerm);
    } catch (error) {
      console.error("Error creating payment term:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/payment-terms/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertPaymentTermSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedPaymentTerm = await storage.updatePaymentTerm(id, validatedData);
      res.json(updatedPaymentTerm);
    } catch (error) {
      console.error("Error updating payment term:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/payment-terms/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePaymentTerm(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment term:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Inflow Categories routes
  app.get("/api/stores/:storeId/inflow-categories", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const categories = await storage.getInflowCategories(storeId);
      res.json(categories);
    } catch (error) {
      console.error("Error getting inflow categories:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/inflow-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getInflowCategory(id);
      if (!category) {
        return res.status(404).json({ error: "Inflow category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error getting inflow category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/inflow-categories", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertInflowCategorySchema, req, res);
      if (!validatedData) return;
      const newCategory = await storage.createInflowCategory(validatedData);
      res.status(201).json(newCategory);
    } catch (error) {
      console.error("Error creating inflow category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/inflow-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertInflowCategorySchema.partial(), req, res);
      if (!validatedData) return;
      const updatedCategory = await storage.updateInflowCategory(id, validatedData);
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating inflow category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/inflow-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteInflowCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting inflow category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Outflow Categories routes
  app.get("/api/stores/:storeId/outflow-categories", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const categories = await storage.getOutflowCategories(storeId);
      res.json(categories);
    } catch (error) {
      console.error("Error getting outflow categories:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/outflow-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getOutflowCategory(id);
      if (!category) {
        return res.status(404).json({ error: "Outflow category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error getting outflow category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/outflow-categories", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertOutflowCategorySchema, req, res);
      if (!validatedData) return;
      const newCategory = await storage.createOutflowCategory(validatedData);
      res.status(201).json(newCategory);
    } catch (error) {
      console.error("Error creating outflow category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/outflow-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertOutflowCategorySchema.partial(), req, res);
      if (!validatedData) return;
      const updatedCategory = await storage.updateOutflowCategory(id, validatedData);
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating outflow category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/outflow-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteOutflowCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting outflow category:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Cash Account routes
  app.get("/api/stores/:storeId/cash-accounts", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const accounts = await storage.getCashAccountsWithBalance(storeId);
      res.json(accounts);
    } catch (error) {
      console.error("Error getting cash accounts:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/cash-accounts", requireAuth, async (req, res) => {
    try {
      const storeId = 1; // Default store
      const accounts = await storage.getCashAccountsWithBalance(storeId);
      res.json(accounts);
    } catch (error) {
      console.error("Error getting cash accounts:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/cash-accounts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.getCashAccountWithBalance(id);
      
      if (!account) {
        return res.status(404).json({ error: "Cash account not found" });
      }
      
      res.json(account);
    } catch (error) {
      console.error("Error getting cash account:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/cash-accounts", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertCashAccountSchema, req, res);
      if (!validatedData) return;
      
      const newAccount = await storage.createCashAccount(validatedData);
      res.status(201).json(newAccount);
    } catch (error) {
      console.error("Error creating cash account:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/cash-accounts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertCashAccountSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedAccount = await storage.updateCashAccount(id, validatedData);
      res.json(updatedAccount);
    } catch (error) {
      console.error("Error updating cash account:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/cash-accounts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCashAccount(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting cash account:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Account Transfer routes
  app.get("/api/stores/:storeId/account-transfers", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const transfers = await storage.getAccountTransfers(storeId);
      res.json(transfers);
    } catch (error) {
      console.error("Error getting account transfers:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/account-transfers", requireAuth, async (req, res) => {
    try {
      const storeId = 1; // Default store
      const transfers = await storage.getAccountTransfers(storeId);
      res.json(transfers);
    } catch (error) {
      console.error("Error getting account transfers:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/account-transfers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transfer = await storage.getAccountTransfer(id);
      
      if (!transfer) {
        return res.status(404).json({ error: "Account transfer not found" });
      }
      
      res.json(transfer);
    } catch (error) {
      console.error("Error getting account transfer:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/account-transfers", requireAuth, async (req, res) => {
    try {
      const validatedData = validateRequestBody(insertAccountTransferSchema, req, res);
      if (!validatedData) return;
      
      const newTransfer = await storage.createAccountTransfer(validatedData);
      res.status(201).json(newTransfer);
    } catch (error) {
      console.error("Error creating account transfer:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/account-transfers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = validateRequestBody(insertAccountTransferSchema.partial(), req, res);
      if (!validatedData) return;
      
      const updatedTransfer = await storage.updateAccountTransfer(id, validatedData);
      res.json(updatedTransfer);
    } catch (error) {
      console.error("Error updating account transfer:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/account-transfers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAccountTransfer(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting account transfer:", error);
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