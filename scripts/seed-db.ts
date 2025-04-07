import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { hashPassword } from "../shared/utils";
import { format, subDays, subMonths } from "date-fns";
import { users, stores, categories, clients, products, productBatches, invoices, invoiceItems,
         invoiceItemBatches, settings } from "../shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Helper function to safely get ID from a query result
function getId(result: any): number {
  if (!result || !Array.isArray(result.rows) || result.rows.length === 0) {
    throw new Error("Database operation did not return expected data");
  }
  const id = result.rows[0]?.id;
  if (typeof id !== 'number') {
    throw new Error(`Expected numeric ID but got ${typeof id}: ${id}`);
  }
  return id;
}

async function seedDatabase() {
  console.log("Starting database seeding...");

  try {
    // First, check if the tables exist before trying to check counts
    try {
      // Check if there are already users in the database
      const usersCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      
      // Debug output
      console.log("Users count query result:", usersCount);
      
      if (usersCount.rows && usersCount.rows.length > 0 && parseInt(String(usersCount.rows[0].count)) > 1) {
        console.log("Database already has data. Skipping seed process.");
        return;
      }
    } catch (error) {
      console.log("Tables may not exist yet. Continuing with seeding...");
    }

    // 1. Get or create admin user
    console.log("Getting or creating admin user...");
    let userId;
    try {
      // Try to create admin user
      const adminUser = await db.execute(sql`
        INSERT INTO users (username, password, full_name, email, role)
        VALUES ('admin', ${hashPassword("password")}, 'Admin User', 'admin@example.com', 'admin')
        RETURNING *
      `);
      userId = adminUser.rows[0].id;
      console.log(`Created admin user with ID ${userId}`);
    } catch (error) {
      // If admin user already exists, get the ID
      console.log("Admin user already exists, getting ID...");
      try {
        const existingAdmin = await db.execute(sql`
          SELECT id FROM users WHERE username = 'admin'
        `);
        
        console.log("Existing admin query result:", existingAdmin);
        
        if (existingAdmin && existingAdmin.rows && existingAdmin.rows.length > 0) {
          userId = existingAdmin.rows[0].id;
          console.log(`Using existing admin user with ID ${userId}`);
        } else {
          console.log("Could not find existing admin user. Using default ID 1.");
          userId = 1; // Fallback to ID 1 if we can't find the admin user
        }
      } catch (err) {
        console.log("Error getting admin user ID:", err);
        console.log("Using default ID 1");
        userId = 1; // Fallback to ID 1 if there's an error
      }
    }

    // 2. Create or get stores
    console.log("Creating or getting stores...");
    let store1Id, store2Id;
    try {
      const store1 = await db.execute(sql`
        INSERT INTO stores (name, address, phone, email)
        VALUES ('Main Workshop', '123 Main Street, City Center', '555-123-4567', 'main@aluminum-profiles.com')
        RETURNING *
      `);
      store1Id = store1.rows[0].id;
      console.log(`Created Main Workshop store with ID ${store1Id}`);
    } catch (error) {
      console.log("Main Workshop store may already exist, getting ID...");
      try {
        const existingStore = await db.execute(sql`
          SELECT id FROM stores WHERE name = 'Main Workshop'
        `);
        
        console.log("Existing store query result:", existingStore);
        
        if (existingStore && existingStore.rows && existingStore.rows.length > 0) {
          store1Id = existingStore.rows[0].id;
          console.log(`Using existing Main Workshop store with ID ${store1Id}`);
        } else {
          console.log("Could not find existing Main Workshop store. Using default ID 1.");
          store1Id = 1; // Fallback to ID 1 if we can't find the store
        }
      } catch (err) {
        console.log("Error getting Main Workshop store ID:", err);
        console.log("Using default ID 1");
        store1Id = 1; // Fallback to ID 1 if there's an error
      }
    }

    try {
      const store2 = await db.execute(sql`
        INSERT INTO stores (name, address, phone, email)
        VALUES ('Downtown Showroom', '45 Commerce Ave, Downtown', '555-987-6543', 'downtown@aluminum-profiles.com')
        RETURNING *
      `);
      store2Id = store2.rows[0].id;
      console.log(`Created Downtown Showroom store with ID ${store2Id}`);
    } catch (error) {
      console.log("Downtown Showroom store may already exist, getting ID...");
      try {
        const existingStore = await db.execute(sql`
          SELECT id FROM stores WHERE name = 'Downtown Showroom'
        `);
        
        console.log("Existing store query result:", existingStore);
        
        if (existingStore && existingStore.rows && existingStore.rows.length > 0) {
          store2Id = existingStore.rows[0].id;
          console.log(`Using existing Downtown Showroom store with ID ${store2Id}`);
        } else {
          console.log("Could not find existing Downtown Showroom store. Using default ID 2.");
          store2Id = 2; // Fallback to ID 2 if we can't find the store
        }
      } catch (err) {
        console.log("Error getting Downtown Showroom store ID:", err);
        console.log("Using default ID 2");
        store2Id = 2; // Fallback to ID 2 if there's an error
      }
    }
    
    console.log(`Created stores with IDs ${store1Id} and ${store2Id}`);

    // 3. Create categories
    console.log("Creating product categories...");
    let windowCatId, doorCatId, curtainCatId, accessoryCatId;
    
    try {
      const windowCat = await db.execute(sql`
        INSERT INTO categories (name, description)
        VALUES ('Window Profiles', 'Aluminum profiles for windows and window frames')
        RETURNING *
      `);
      
      console.log("Window category insert result:", windowCat);
      if (windowCat && windowCat.rows && windowCat.rows.length > 0) {
        windowCatId = windowCat.rows[0].id;
        console.log(`Created Window Profiles category with ID ${windowCatId}`);
      } else {
        console.log("Could not create Window Profiles category. Using default ID 1");
        windowCatId = 1;
      }
    } catch (error) {
      console.log("Window Profiles category may already exist, getting ID...");
      try {
        const existingCat = await db.execute(sql`
          SELECT id FROM categories WHERE name = 'Window Profiles'
        `);
        
        console.log("Existing window category query result:", existingCat);
        
        if (existingCat && existingCat.rows && existingCat.rows.length > 0) {
          windowCatId = existingCat.rows[0].id;
          console.log(`Using existing Window Profiles category with ID ${windowCatId}`);
        } else {
          console.log("Could not find Window Profiles category. Using default ID 1");
          windowCatId = 1;
        }
      } catch (err) {
        console.log("Error getting Window Profiles category ID:", err);
        console.log("Using default ID 1");
        windowCatId = 1;
      }
    }
    
    try {
      const doorCat = await db.execute(sql`
        INSERT INTO categories (name, description)
        VALUES ('Door Profiles', 'Aluminum profiles for doors and door frames')
        RETURNING *
      `);
      
      if (doorCat && doorCat.rows && doorCat.rows.length > 0) {
        doorCatId = doorCat.rows[0].id;
        console.log(`Created Door Profiles category with ID ${doorCatId}`);
      } else {
        console.log("Could not create Door Profiles category. Using default ID 2");
        doorCatId = 2;
      }
    } catch (error) {
      console.log("Door Profiles category may already exist, getting ID...");
      try {
        const existingCat = await db.execute(sql`
          SELECT id FROM categories WHERE name = 'Door Profiles'
        `);
        
        if (existingCat && existingCat.rows && existingCat.rows.length > 0) {
          doorCatId = existingCat.rows[0].id;
          console.log(`Using existing Door Profiles category with ID ${doorCatId}`);
        } else {
          console.log("Could not find Door Profiles category. Using default ID 2");
          doorCatId = 2;
        }
      } catch (err) {
        console.log("Error getting Door Profiles category ID:", err);
        console.log("Using default ID 2");
        doorCatId = 2;
      }
    }
    
    try {
      const curtainCat = await db.execute(sql`
        INSERT INTO categories (name, description)
        VALUES ('Curtain Wall Profiles', 'Aluminum profiles for curtain wall systems')
        RETURNING *
      `);
      
      if (curtainCat && curtainCat.rows && curtainCat.rows.length > 0) {
        curtainCatId = curtainCat.rows[0].id;
        console.log(`Created Curtain Wall Profiles category with ID ${curtainCatId}`);
      } else {
        console.log("Could not create Curtain Wall Profiles category. Using default ID 3");
        curtainCatId = 3;
      }
    } catch (error) {
      console.log("Curtain Wall Profiles category may already exist, getting ID...");
      try {
        const existingCat = await db.execute(sql`
          SELECT id FROM categories WHERE name = 'Curtain Wall Profiles'
        `);
        
        if (existingCat && existingCat.rows && existingCat.rows.length > 0) {
          curtainCatId = existingCat.rows[0].id;
          console.log(`Using existing Curtain Wall Profiles category with ID ${curtainCatId}`);
        } else {
          console.log("Could not find Curtain Wall Profiles category. Using default ID 3");
          curtainCatId = 3;
        }
      } catch (err) {
        console.log("Error getting Curtain Wall Profiles category ID:", err);
        console.log("Using default ID 3");
        curtainCatId = 3;
      }
    }
    
    try {
      const accessoryCat = await db.execute(sql`
        INSERT INTO categories (name, description)
        VALUES ('Accessories', 'Hardware and accessories for aluminum profiles')
        RETURNING *
      `);
      
      if (accessoryCat && accessoryCat.rows && accessoryCat.rows.length > 0) {
        accessoryCatId = accessoryCat.rows[0].id;
        console.log(`Created Accessories category with ID ${accessoryCatId}`);
      } else {
        console.log("Could not create Accessories category. Using default ID 4");
        accessoryCatId = 4;
      }
    } catch (error) {
      console.log("Accessories category may already exist, getting ID...");
      try {
        const existingCat = await db.execute(sql`
          SELECT id FROM categories WHERE name = 'Accessories'
        `);
        
        if (existingCat && existingCat.rows && existingCat.rows.length > 0) {
          accessoryCatId = existingCat.rows[0].id;
          console.log(`Using existing Accessories category with ID ${accessoryCatId}`);
        } else {
          console.log("Could not find Accessories category. Using default ID 4");
          accessoryCatId = 4;
        }
      } catch (err) {
        console.log("Error getting Accessories category ID:", err);
        console.log("Using default ID 4");
        accessoryCatId = 4;
      }
    }
    
    console.log("Created product categories");

    // 4. Create clients
    console.log("Creating clients...");
    let client1Id, client2Id, client3Id;
    
    try {
      const client1 = await db.execute(sql`
        INSERT INTO clients (store_id, name, email, phone, address, tax_number, notes)
        VALUES (
          ${store1Id}, 
          'Skyline Construction Ltd', 
          'info@skyline-construction.com', 
          '555-222-3333', 
          '789 Builder''s Road, Industrial Zone', 
          'SC12345678', 
          'Large commercial construction company, regular customer'
        )
        RETURNING *
      `);
      
      console.log("Client 1 insert result:", client1);
      if (client1 && client1.rows && client1.rows.length > 0) {
        client1Id = client1.rows[0].id;
        console.log(`Created Skyline Construction client with ID ${client1Id}`);
      } else {
        console.log("Could not create Skyline Construction client. Using default ID 1");
        client1Id = 1;
      }
    } catch (error) {
      console.log("Skyline Construction client may already exist, getting ID...");
      try {
        const existingClient = await db.execute(sql`
          SELECT id FROM clients WHERE name = 'Skyline Construction Ltd'
        `);
        
        if (existingClient && existingClient.rows && existingClient.rows.length > 0) {
          client1Id = existingClient.rows[0].id;
          console.log(`Using existing Skyline Construction client with ID ${client1Id}`);
        } else {
          console.log("Could not find Skyline Construction client. Using default ID 1");
          client1Id = 1;
        }
      } catch (err) {
        console.log("Error getting Skyline Construction client ID:", err);
        console.log("Using default ID 1");
        client1Id = 1;
      }
    }

    try {
      const client2 = await db.execute(sql`
        INSERT INTO clients (store_id, name, email, phone, address, tax_number, notes)
        VALUES (
          ${store1Id}, 
          'Modern Homes Inc', 
          'projects@modernhomes.com', 
          '555-444-5555', 
          '456 Developer Street, Suburb Area', 
          'MH87654321', 
          'Residential developer, orders in large batches'
        )
        RETURNING *
      `);
      
      if (client2 && client2.rows && client2.rows.length > 0) {
        client2Id = client2.rows[0].id;
        console.log(`Created Modern Homes Inc client with ID ${client2Id}`);
      } else {
        console.log("Could not create Modern Homes Inc client. Using default ID 2");
        client2Id = 2;
      }
    } catch (error) {
      console.log("Modern Homes Inc client may already exist, getting ID...");
      try {
        const existingClient = await db.execute(sql`
          SELECT id FROM clients WHERE name = 'Modern Homes Inc'
        `);
        
        if (existingClient && existingClient.rows && existingClient.rows.length > 0) {
          client2Id = existingClient.rows[0].id;
          console.log(`Using existing Modern Homes Inc client with ID ${client2Id}`);
        } else {
          console.log("Could not find Modern Homes Inc client. Using default ID 2");
          client2Id = 2;
        }
      } catch (err) {
        console.log("Error getting Modern Homes Inc client ID:", err);
        console.log("Using default ID 2");
        client2Id = 2;
      }
    }

    try {
      const client3 = await db.execute(sql`
        INSERT INTO clients (store_id, name, email, phone, address, tax_number, notes)
        VALUES (
          ${store2Id}, 
          'Renovation Experts', 
          'orders@renovation-experts.com', 
          '555-666-7777', 
          '101 Remodel Avenue, City Center', 
          'RE11223344', 
          'Specialized in high-end renovations'
        )
        RETURNING *
      `);
      
      if (client3 && client3.rows && client3.rows.length > 0) {
        client3Id = client3.rows[0].id;
        console.log(`Created Renovation Experts client with ID ${client3Id}`);
      } else {
        console.log("Could not create Renovation Experts client. Using default ID 3");
        client3Id = 3;
      }
    } catch (error) {
      console.log("Renovation Experts client may already exist, getting ID...");
      try {
        const existingClient = await db.execute(sql`
          SELECT id FROM clients WHERE name = 'Renovation Experts'
        `);
        
        if (existingClient && existingClient.rows && existingClient.rows.length > 0) {
          client3Id = existingClient.rows[0].id;
          console.log(`Using existing Renovation Experts client with ID ${client3Id}`);
        } else {
          console.log("Could not find Renovation Experts client. Using default ID 3");
          client3Id = 3;
        }
      } catch (err) {
        console.log("Error getting Renovation Experts client ID:", err);
        console.log("Using default ID 3");
        client3Id = 3;
      }
    }
    
    console.log("Created clients");

    // 5. Create products
    console.log("Creating products...");
    let product1Id, product2Id, product3Id, product4Id, product5Id;
    
    try {
      const product1 = await db.execute(sql`
        INSERT INTO products (name, description, sku, category_id, unit, current_selling_price, min_stock, is_active)
        VALUES (
          'Standard Window Frame Profile', 
          'Basic aluminum profile for standard window frames, 2.5m length', 
          'WF-STD-001', 
          ${windowCatId}, 
          'piece', 
          '25.99', 
          50, 
          true
        )
        RETURNING *
      `);
      
      if (product1 && product1.rows && product1.rows.length > 0) {
        product1Id = product1.rows[0].id;
        console.log(`Created Standard Window Frame product with ID ${product1Id}`);
      } else {
        console.log("Could not create Standard Window Frame product. Using default ID 1");
        product1Id = 1;
      }
    } catch (error) {
      console.log("Standard Window Frame product may already exist, getting ID...");
      try {
        const existingProduct = await db.execute(sql`
          SELECT id FROM products WHERE sku = 'WF-STD-001'
        `);
        
        if (existingProduct && existingProduct.rows && existingProduct.rows.length > 0) {
          product1Id = existingProduct.rows[0].id;
          console.log(`Using existing Standard Window Frame product with ID ${product1Id}`);
        } else {
          console.log("Could not find Standard Window Frame product. Using default ID 1");
          product1Id = 1;
        }
      } catch (err) {
        console.log("Error getting Standard Window Frame product ID:", err);
        console.log("Using default ID 1");
        product1Id = 1;
      }
    }

    try {
      const product2 = await db.execute(sql`
        INSERT INTO products (name, description, sku, category_id, unit, current_selling_price, min_stock, is_active)
        VALUES (
          'Sliding Window Track', 
          'Bottom track for sliding windows, 3m length', 
          'WF-SLD-002', 
          ${windowCatId}, 
          'piece', 
          '18.50', 
          40, 
          true
        )
        RETURNING *
      `);
      
      if (product2 && product2.rows && product2.rows.length > 0) {
        product2Id = product2.rows[0].id;
        console.log(`Created Sliding Window Track product with ID ${product2Id}`);
      } else {
        console.log("Could not create Sliding Window Track product. Using default ID 2");
        product2Id = 2;
      }
    } catch (error) {
      console.log("Sliding Window Track product may already exist, getting ID...");
      try {
        const existingProduct = await db.execute(sql`
          SELECT id FROM products WHERE sku = 'WF-SLD-002'
        `);
        
        if (existingProduct && existingProduct.rows && existingProduct.rows.length > 0) {
          product2Id = existingProduct.rows[0].id;
          console.log(`Using existing Sliding Window Track product with ID ${product2Id}`);
        } else {
          console.log("Could not find Sliding Window Track product. Using default ID 2");
          product2Id = 2;
        }
      } catch (err) {
        console.log("Error getting Sliding Window Track product ID:", err);
        console.log("Using default ID 2");
        product2Id = 2;
      }
    }

    try {
      const product3 = await db.execute(sql`
        INSERT INTO products (name, description, sku, category_id, unit, current_selling_price, min_stock, is_active)
        VALUES (
          'Heavy-Duty Door Frame', 
          'Reinforced aluminum profile for commercial doors, 2.2m height', 
          'DF-HVY-001', 
          ${doorCatId}, 
          'piece', 
          '42.75', 
          30, 
          true
        )
        RETURNING *
      `);
      
      if (product3 && product3.rows && product3.rows.length > 0) {
        product3Id = product3.rows[0].id;
        console.log(`Created Heavy-Duty Door Frame product with ID ${product3Id}`);
      } else {
        console.log("Could not create Heavy-Duty Door Frame product. Using default ID 3");
        product3Id = 3;
      }
    } catch (error) {
      console.log("Heavy-Duty Door Frame product may already exist, getting ID...");
      try {
        const existingProduct = await db.execute(sql`
          SELECT id FROM products WHERE sku = 'DF-HVY-001'
        `);
        
        if (existingProduct && existingProduct.rows && existingProduct.rows.length > 0) {
          product3Id = existingProduct.rows[0].id;
          console.log(`Using existing Heavy-Duty Door Frame product with ID ${product3Id}`);
        } else {
          console.log("Could not find Heavy-Duty Door Frame product. Using default ID 3");
          product3Id = 3;
        }
      } catch (err) {
        console.log("Error getting Heavy-Duty Door Frame product ID:", err);
        console.log("Using default ID 3");
        product3Id = 3;
      }
    }

    try {
      const product4 = await db.execute(sql`
        INSERT INTO products (name, description, sku, category_id, unit, current_selling_price, min_stock, is_active)
        VALUES (
          'Curtain Wall Mullion', 
          'Vertical structural member for curtain wall systems, 6m length', 
          'CW-MUL-001', 
          ${curtainCatId}, 
          'piece', 
          '85.50', 
          20, 
          true
        )
        RETURNING *
      `);
      
      if (product4 && product4.rows && product4.rows.length > 0) {
        product4Id = product4.rows[0].id;
        console.log(`Created Curtain Wall Mullion product with ID ${product4Id}`);
      } else {
        console.log("Could not create Curtain Wall Mullion product. Using default ID 4");
        product4Id = 4;
      }
    } catch (error) {
      console.log("Curtain Wall Mullion product may already exist, getting ID...");
      try {
        const existingProduct = await db.execute(sql`
          SELECT id FROM products WHERE sku = 'CW-MUL-001'
        `);
        
        if (existingProduct && existingProduct.rows && existingProduct.rows.length > 0) {
          product4Id = existingProduct.rows[0].id;
          console.log(`Using existing Curtain Wall Mullion product with ID ${product4Id}`);
        } else {
          console.log("Could not find Curtain Wall Mullion product. Using default ID 4");
          product4Id = 4;
        }
      } catch (err) {
        console.log("Error getting Curtain Wall Mullion product ID:", err);
        console.log("Using default ID 4");
        product4Id = 4;
      }
    }

    try {
      const product5 = await db.execute(sql`
        INSERT INTO products (name, description, sku, category_id, unit, current_selling_price, min_stock, is_active)
        VALUES (
          'Window Corner Connector', 
          '90-degree connector for window frames', 
          'ACC-CON-001', 
          ${accessoryCatId}, 
          'piece', 
          '3.99', 
          100, 
          true
        )
        RETURNING *
      `);
      
      if (product5 && product5.rows && product5.rows.length > 0) {
        product5Id = product5.rows[0].id;
        console.log(`Created Window Corner Connector product with ID ${product5Id}`);
      } else {
        console.log("Could not create Window Corner Connector product. Using default ID 5");
        product5Id = 5;
      }
    } catch (error) {
      console.log("Window Corner Connector product may already exist, getting ID...");
      try {
        const existingProduct = await db.execute(sql`
          SELECT id FROM products WHERE sku = 'ACC-CON-001'
        `);
        
        if (existingProduct && existingProduct.rows && existingProduct.rows.length > 0) {
          product5Id = existingProduct.rows[0].id;
          console.log(`Using existing Window Corner Connector product with ID ${product5Id}`);
        } else {
          console.log("Could not find Window Corner Connector product. Using default ID 5");
          product5Id = 5;
        }
      } catch (err) {
        console.log("Error getting Window Corner Connector product ID:", err);
        console.log("Using default ID 5");
        product5Id = 5;
      }
    }
    
    console.log("Created products");

    // 6. Create product batches with varying costs
    console.log("Creating product batches...");
    // For product 1 (Window Frame Profile)
    try {
      await db.execute(sql`
        INSERT INTO product_batches (product_id, store_id, batch_number, purchase_date, initial_quantity, remaining_quantity, capital_cost, supplier_name, supplier_invoice, notes)
        VALUES (
          ${product1Id}, 
          ${store1Id}, 
          'WF-STD-001-B1', 
          ${format(subMonths(new Date(), 6), 'yyyy-MM-dd')}, 
          '100', 
          '30', 
          '16.89', 
          'Aluminum Supply Co.', 
          'INV-20220701-001', 
          'Initial stock purchase'
        )
      `);
      console.log("Created product batch 1 for product 1");
    } catch (error) {
      console.log("Error creating product batch 1 for product 1:", error);
    }

    try {
      await db.execute(sql`
        INSERT INTO product_batches (product_id, store_id, batch_number, purchase_date, initial_quantity, remaining_quantity, capital_cost, supplier_name, supplier_invoice, notes)
        VALUES (
          ${product1Id}, 
          ${store1Id}, 
          'WF-STD-001-B2', 
          ${format(subMonths(new Date(), 3), 'yyyy-MM-dd')}, 
          '150', 
          '75', 
          '18.19', 
          'Aluminum Supply Co.', 
          'INV-20221001-002', 
          'Restocking with slight price increase'
        )
      `);
      console.log("Created product batch 2 for product 1");
    } catch (error) {
      console.log("Error creating product batch 2 for product 1:", error);
    }

    try {
      await db.execute(sql`
        INSERT INTO product_batches (product_id, store_id, batch_number, purchase_date, initial_quantity, remaining_quantity, capital_cost, supplier_name, supplier_invoice, notes)
        VALUES (
          ${product1Id}, 
          ${store1Id}, 
          'WF-STD-001-B3', 
          ${format(subMonths(new Date(), 1), 'yyyy-MM-dd')}, 
          '100', 
          '85', 
          '19.49', 
          'Aluminum Supply Co.', 
          'INV-20230101-003', 
          'Recent stock addition'
        )
      `);
      console.log("Created product batch 3 for product 1");
    } catch (error) {
      console.log("Error creating product batch 3 for product 1:", error);
    }

    // For product 2 (Sliding Window Track)
    try {
      await db.execute(sql`
        INSERT INTO product_batches (product_id, store_id, batch_number, purchase_date, initial_quantity, remaining_quantity, capital_cost, supplier_name, supplier_invoice, notes)
        VALUES (
          ${product2Id}, 
          ${store1Id}, 
          'WF-SLD-002-B1', 
          ${format(subMonths(new Date(), 5), 'yyyy-MM-dd')}, 
          '120', 
          '40', 
          '12.03', 
          'Aluminum Supply Co.', 
          'INV-20220801-001', 
          'Initial stock purchase'
        )
      `);
      console.log("Created product batch 1 for product 2");
    } catch (error) {
      console.log("Error creating product batch 1 for product 2:", error);
    }

    try {
      await db.execute(sql`
        INSERT INTO product_batches (product_id, store_id, batch_number, purchase_date, initial_quantity, remaining_quantity, capital_cost, supplier_name, supplier_invoice, notes)
        VALUES (
          ${product2Id}, 
          ${store2Id}, 
          'WF-SLD-002-S2-B1', 
          ${format(subMonths(new Date(), 2), 'yyyy-MM-dd')}, 
          '80', 
          '50', 
          '13.32', 
          'Premium Metals Inc.', 
          'PMI-20221115-001', 
          'Stocking new showroom'
        )
      `);
      console.log("Created product batch 2 for product 2");
    } catch (error) {
      console.log("Error creating product batch 2 for product 2:", error);
    }
    
    console.log("Created product batches");

    // 7. Create invoices
    console.log("Creating invoices and invoice items...");
    
    // Create a paid invoice for client 1
    let invoice1Id;
    try {
      const invoice1 = await db.execute(sql`
        INSERT INTO invoices (
          store_id, client_id, invoice_number, issue_date, due_date, 
          status, subtotal, tax_rate, tax_amount, discount, 
          shipping, total_amount, total_profit, notes, terms_and_conditions, paper_size
        )
        VALUES (
          ${store1Id}, ${client1Id}, 'INV-20230301-001', 
          ${format(subDays(new Date(), 30), 'yyyy-MM-dd')}, 
          ${format(subDays(new Date(), 16), 'yyyy-MM-dd')}, 
          'paid', '509.95', '15', '76.49', '0', 
          '0', '586.44', '152.99', 'Sample invoice for commercial project', 
          'Payment due within 14 days. Late payments subject to 2% interest per month.',
          'a4'
        )
        RETURNING *
      `);
      
      if (invoice1 && invoice1.rows && invoice1.rows.length > 0) {
        invoice1Id = invoice1.rows[0].id;
        console.log(`Created paid invoice with ID ${invoice1Id}`);
      } else {
        console.log("Could not create paid invoice. Using default ID 1");
        invoice1Id = 1;
      }
      
      // Check if invoice 1 exists
      try {
        const invoiceExists = await db.execute(sql`
          SELECT id FROM invoices WHERE id = ${invoice1Id}
        `);
        
        if (invoiceExists && invoiceExists[0] && invoiceExists[0].length > 0) {
          console.log(`Invoice ${invoice1Id} exists, adding items`);
          
          // Check if invoice items already exist
          const existingItems = await db.execute(sql`
            SELECT id FROM invoice_items WHERE invoice_id = ${invoice1Id}
          `);
          
          if (!existingItems || !existingItems[0] || existingItems[0].length === 0) {
            // Add invoice items for invoice 1
            try {
              await db.execute(sql`
                INSERT INTO invoice_items (
                  invoice_id, product_id, description, quantity, 
                  unit_price, discount, subtotal, total_amount, profit
                )
                VALUES (
                  ${invoice1Id}, ${product1Id}, 'Standard Window Frame Profile', 
                  '15', '25.99', '5', '389.85', '370.36', '113.25'
                )
              `);
              console.log("Added item 1 to invoice 1");
            } catch (error) {
              console.log("Error adding item 1 to invoice 1:", error);
            }

            try {
              await db.execute(sql`
                INSERT INTO invoice_items (
                  invoice_id, product_id, description, quantity, 
                  unit_price, discount, subtotal, total_amount, profit
                )
                VALUES (
                  ${invoice1Id}, ${product5Id}, 'Window Corner Connector', 
                  '35', '3.99', '0', '139.65', '139.65', '39.74'
                )
              `);
              console.log("Added item 2 to invoice 1");
            } catch (error) {
              console.log("Error adding item 2 to invoice 1:", error);
            }
          } else {
            console.log("Invoice items for invoice 1 already exist, skipping");
          }
        } else {
          console.log(`Invoice ${invoice1Id} does not exist, skipping items`);
        }
      } catch (error) {
        console.log("Error checking invoice 1:", error);
      }

      // Deduct from product batches and record which batches were used
      try {
        await db.execute(sql`
          UPDATE product_batches 
          SET remaining_quantity = '15' 
          WHERE product_id = ${product1Id} AND batch_number = 'WF-STD-001-B1'
        `);
        console.log("Updated product batch for product 1");
      } catch (error) {
        console.log("Error updating product batch for product 1:", error);
      }

      try {
        await db.execute(sql`
          INSERT INTO invoice_item_batches (
            invoice_item_id, batch_id, quantity, capital_cost
          )
          VALUES (
            1, 1, '15', '16.89'
          )
        `);
        console.log("Added invoice item batch for item 1");
      } catch (error) {
        console.log("Error adding invoice item batch for item 1:", error);
      }

      try {
        await db.execute(sql`
          UPDATE product_batches 
          SET remaining_quantity = '65' 
          WHERE product_id = ${product5Id} AND batch_number = 'ACC-CON-001-B1'
        `);
        console.log("Updated product batch for product 5");
      } catch (error) {
        console.log("Error updating product batch for product 5:", error);
      }
      
    } catch (error) {
      console.log("Paid invoice may already exist, using default ID 1");
      invoice1Id = 1;
    }

    // Create a pending invoice for client 2
    let invoice2Id;
    try {
      const invoice2 = await db.execute(sql`
        INSERT INTO invoices (
          store_id, client_id, invoice_number, issue_date, due_date, 
          status, subtotal, tax_rate, tax_amount, discount, 
          shipping, total_amount, total_profit, notes, terms_and_conditions, paper_size
        )
        VALUES (
          ${store1Id}, ${client2Id}, 'INV-20230315-001', 
          ${format(subDays(new Date(), 15), 'yyyy-MM-dd')}, 
          ${format(subDays(new Date(), 1), 'yyyy-MM-dd')}, 
          'pending', '855.00', '15', '128.25', '0', 
          '0', '983.25', '0', 'Residential project materials', 
          'Payment due within 14 days. Late payments subject to 2% interest per month.',
          'prs'
        )
        RETURNING *
      `);
      
      if (invoice2 && invoice2.rows && invoice2.rows.length > 0) {
        invoice2Id = invoice2.rows[0].id;
        console.log(`Created pending invoice with ID ${invoice2Id}`);
      } else {
        console.log("Could not create pending invoice. Using default ID 2");
        invoice2Id = 2;
      }
      
      // Check if invoice 2 exists
      try {
        const invoice2Exists = await db.execute(sql`
          SELECT id FROM invoices WHERE id = ${invoice2Id}
        `);
        
        if (invoice2Exists && invoice2Exists[0] && invoice2Exists[0].length > 0) {
          console.log(`Invoice ${invoice2Id} exists, adding items`);
          
          // Check if invoice items already exist
          const existingItems = await db.execute(sql`
            SELECT id FROM invoice_items WHERE invoice_id = ${invoice2Id}
          `);
          
          if (!existingItems || !existingItems[0] || existingItems[0].length === 0) {
            // Add invoice items for invoice 2
            try {
              await db.execute(sql`
                INSERT INTO invoice_items (
                  invoice_id, product_id, description, quantity, 
                  unit_price, discount, subtotal, total_amount
                )
                VALUES (
                  ${invoice2Id}, ${product3Id}, 'Heavy-Duty Door Frame', 
                  '20', '42.75', '0', '855.00', '855.00'
                )
              `);
              console.log("Added item to invoice 2");
            } catch (error) {
              console.log("Error adding item to invoice 2:", error);
            }
          } else {
            console.log("Invoice items for invoice 2 already exist, skipping");
          }
        } else {
          console.log(`Invoice ${invoice2Id} does not exist, skipping items`);
        }
      } catch (error) {
        console.log("Error checking invoice 2:", error);
      }
      
    } catch (error) {
      console.log("Pending invoice may already exist, using default ID 2");
      invoice2Id = 2;
    }

    // Create a draft invoice for client 3
    let invoice3Id;
    try {
      const invoice3 = await db.execute(sql`
        INSERT INTO invoices (
          store_id, client_id, invoice_number, issue_date, due_date, 
          status, subtotal, tax_rate, tax_amount, discount, 
          shipping, total_amount, notes, terms_and_conditions, paper_size
        )
        VALUES (
          ${store2Id}, ${client3Id}, 'INV-20230320-001', 
          ${format(subDays(new Date(), 10), 'yyyy-MM-dd')}, 
          ${format(subDays(new Date(), -4), 'yyyy-MM-dd')}, 
          'draft', '1710.00', '15', '256.50', '0', 
          '0', '1966.50', 'High-end renovation materials', 
          'Payment due within 14 days. Late payments subject to 2% interest per month.',
          'a4'
        )
        RETURNING *
      `);
      
      if (invoice3 && invoice3.rows && invoice3.rows.length > 0) {
        invoice3Id = invoice3.rows[0].id;
        console.log(`Created draft invoice with ID ${invoice3Id}`);
      } else {
        console.log("Could not create draft invoice. Using default ID 3");
        invoice3Id = 3;
      }
      
      // Check if invoice 3 exists
      try {
        const invoice3Exists = await db.execute(sql`
          SELECT id FROM invoices WHERE id = ${invoice3Id}
        `);
        
        if (invoice3Exists && invoice3Exists[0] && invoice3Exists[0].length > 0) {
          console.log(`Invoice ${invoice3Id} exists, adding items`);
          
          // Check if invoice items already exist
          const existingItems = await db.execute(sql`
            SELECT id FROM invoice_items WHERE invoice_id = ${invoice3Id}
          `);
          
          if (!existingItems || !existingItems[0] || existingItems[0].length === 0) {
            // Add invoice items for invoice 3
            try {
              await db.execute(sql`
                INSERT INTO invoice_items (
                  invoice_id, product_id, description, quantity, 
                  unit_price, discount, subtotal, total_amount
                )
                VALUES (
                  ${invoice3Id}, ${product4Id}, 'Curtain Wall Mullion', 
                  '20', '85.50', '0', '1710.00', '1710.00'
                )
              `);
              console.log("Added item to invoice 3");
            } catch (error) {
              console.log("Error adding item to invoice 3:", error);
            }
          } else {
            console.log("Invoice items for invoice 3 already exist, skipping");
          }
        } else {
          console.log(`Invoice ${invoice3Id} does not exist, skipping items`);
        }
      } catch (error) {
        console.log("Error checking invoice 3:", error);
      }
    } catch (error) {
      console.log("Draft invoice may already exist, using default ID 3");
      invoice3Id = 3;
    }
    
    console.log("Created invoices with items");

    // 8. Add store settings
    console.log("Adding store settings...");
    
    try {
      await db.execute(sql`
        INSERT INTO settings (store_id, key, value)
        VALUES (${store1Id}, 'company_name', 'Aluminum Profiles Manufacturing Ltd.')
      `);
      console.log("Added company_name setting");
    } catch (error) {
      console.log("Error adding company_name setting, may already exist");
    }
    
    try {
      await db.execute(sql`
        INSERT INTO settings (store_id, key, value)
        VALUES (${store1Id}, 'company_logo', 'logo.png')
      `);
      console.log("Added company_logo setting");
    } catch (error) {
      console.log("Error adding company_logo setting, may already exist");
    }
    
    try {
      await db.execute(sql`
        INSERT INTO settings (store_id, key, value)
        VALUES (${store1Id}, 'company_address', '123 Main Street, City Center')
      `);
      console.log("Added company_address setting");
    } catch (error) {
      console.log("Error adding company_address setting, may already exist");
    }
    
    try {
      await db.execute(sql`
        INSERT INTO settings (store_id, key, value)
        VALUES (${store1Id}, 'company_phone', '555-123-4567')
      `);
      console.log("Added company_phone setting");
    } catch (error) {
      console.log("Error adding company_phone setting, may already exist");
    }
    
    try {
      await db.execute(sql`
        INSERT INTO settings (store_id, key, value)
        VALUES (${store1Id}, 'company_email', 'info@aluminum-profiles.com')
      `);
      console.log("Added company_email setting");
    } catch (error) {
      console.log("Error adding company_email setting, may already exist");
    }
    
    try {
      await db.execute(sql`
        INSERT INTO settings (store_id, key, value)
        VALUES (${store1Id}, 'tax_rate', '15')
      `);
      console.log("Added tax_rate setting");
    } catch (error) {
      console.log("Error adding tax_rate setting, may already exist");
    }
    
    try {
      await db.execute(sql`
        INSERT INTO settings (store_id, key, value)
        VALUES (${store1Id}, 'currency', 'USD')
      `);
      console.log("Added currency setting");
    } catch (error) {
      console.log("Error adding currency setting, may already exist");
    }
    
    console.log("Added store settings");

    console.log("Database seeding completed successfully!");
    
  } catch (error) {
    console.error("Error during database seeding:", error);
    throw error;
  }
}

// Execute the seed function
seedDatabase()
  .then(() => {
    console.log("Seed script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed script failed:", error);
    process.exit(1);
  });