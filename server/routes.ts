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
import createCsvWriter from "csv-writer";
import {
  insertUserSchema,
  insertStoreSchema,
  insertClientSchema,
  insertSupplierSchema,
  insertCategorySchema,
  insertProductSchema,
  insertProductBatchSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertQuotationSchema,
  insertQuotationItemSchema,
  insertTransactionSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
  insertSettingSchema,
  insertPrintSettingsSchema,
  insertPaymentTypeSchema,
  insertPaymentTermSchema,
  loginSchema,
  updateUserProfileSchema,
  updateUserCompanySchema,
  updateUserPaymentSchema
} from "../shared/schema";
// Import InvoiceItem type from schema
import { type InvoiceItem } from "../shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

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

  // General invoices endpoint
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      // Default to store 1 for general invoice listing
      const invoices = await storage.getInvoices(1);
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
      const validatedData = validateRequestBody(insertInvoiceSchema.partial(), req, res);
      if (!validatedData) return;
      
      // Prevent modification of invoice number to prevent fraud
      if (validatedData.invoiceNumber !== undefined) {
        return res.status(400).json({ error: "Invoice number cannot be modified" });
      }
      
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
      const validatedData = validateRequestBody(insertQuotationSchema.partial(), req, res);
      if (!validatedData) return;
      
      // Prevent modification of quotation number to prevent fraud
      if (validatedData.quotationNumber !== undefined) {
        return res.status(400).json({ error: "Quotation number cannot be modified" });
      }
      
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
      const purchaseOrder = await storage.getPurchaseOrderWithItems(purchaseOrderId);
      
      if (!purchaseOrder) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      res.json(purchaseOrder);
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
            quantity: z.union([z.string(), z.number()]),
            unitCost: z.union([z.string(), z.number()]),
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
            productId: z.number(),
            quantity: z.union([z.string(), z.number()]),
            unitCost: z.union([z.string(), z.number()]),
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
        const client = await storage.getClient(invoice.clientId);
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
        storage.getTransactions()
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

      const productData = products.map(product => ({
        ID: product.id,
        Name: product.name,
        SKU: product.sku,
        Description: product.description || '',
        'Current Price': product.currentSellingPrice || '0',
        Unit: product.unit,
        'Min Stock': product.minStock || '0',
        Weight: product.weight || '',
        Dimensions: product.dimensions || '',
        'Is Active': product.isActive ? 'Yes' : 'No'
      }));

      if (format === 'csv') {
        const csvWriter = createCsvWriter.createObjectCsvStringifier({
          header: [
            { id: 'ID', title: 'ID' },
            { id: 'Name', title: 'Name' },
            { id: 'SKU', title: 'SKU' },
            { id: 'Description', title: 'Description' },
            { id: 'Current Price', title: 'Current Price' },
            { id: 'Unit', title: 'Unit' },
            { id: 'Min Stock', title: 'Min Stock' },
            { id: 'Weight', title: 'Weight' },
            { id: 'Dimensions', title: 'Dimensions' },
            { id: 'Is Active', title: 'Is Active' }
          ]
        });

        const csvString = csvWriter.getHeaderString() + csvWriter.stringifyRecords(productData);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="products-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvString);
      } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(productData);
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
        const csvWriter = createCsvWriter.createObjectCsvStringifier({
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

        const csvString = csvWriter.getHeaderString() + csvWriter.stringifyRecords(clientData);
        
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
      const products = await storage.getProducts(storeId);
      
      const productsWithStock = await Promise.all(
        products.map(async (product) => {
          const batches = await storage.getProductBatches(product.id, storeId);
          const currentStock = batches.reduce((sum, batch) => 
            sum + parseFloat(batch.remainingQuantity.toString()), 0
          );
          
          return {
            ...product,
            currentStock,
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
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          const productData = {
            name: row.Name || row.name,
            sku: row.SKU || row.sku,
            description: row.Description || row.description || '',
            currentSellingPrice: row['Current Price'] || row.currentSellingPrice || '0',
            unit: row.Unit || row.unit || 'piece',
            minStock: parseInt(row['Min Stock'] || row.minStock || '0'),
            weight: row.Weight || row.weight || null,
            dimensions: row.Dimensions || row.dimensions || null,
            isActive: (row['Is Active'] || row.isActive || 'Yes').toLowerCase() === 'yes' || (row['Is Active'] || row.isActive || 'Yes') === true
          };

          await storage.createProduct(productData);
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Row ${data.indexOf(row) + 1}: ${error.message}`);
        }
      }

      res.json({
        success: true,
        message: `Import completed. ${successCount} products imported successfully, ${errorCount} errors.`,
        successCount,
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
        } catch (error) {
          errorCount++;
          errors.push(`Row ${data.indexOf(row) + 1}: ${error.message}`);
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
      
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ 
        error: "Failed to get upload URL",
        details: error.message 
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

    const userId = req.user?.id;
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
      const validatedData = validateRequestBody(insertPrintSettingsSchema.partial(), req, res);
      if (!validatedData) return;
      
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