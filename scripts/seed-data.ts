import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { storage } from "../server/storage";
import {
  users, stores, clients, categories, products, productBatches,
  invoices, invoiceItems, transactions, settings
} from "../shared/schema";
import { hashPassword } from "../shared/utils";
import { format, subDays, subMonths } from "date-fns";

// Seed data utility function
async function seedData() {
  console.log("Starting data seeding process...");

  try {
    // Check if data already exists to avoid duplicates
    const existingUsers = await db.select({ count: db.fn.count() }).from(users);
    if (parseInt(existingUsers[0].count as string) > 1) {
      console.log("Data already exists. Skipping seed process.");
      return;
    }

    // Create admin user
    const adminUser = await storage.createUser({
      username: "admin",
      password: hashPassword("password"),
      fullName: "Admin User",
      email: "admin@example.com",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("Created admin user");

    // Create stores
    const store1 = await storage.createStore({
      name: "Main Workshop",
      address: "123 Main Street, City Center",
      phone: "555-123-4567",
      email: "main@aluminum-profiles.com",
      userId: adminUser.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const store2 = await storage.createStore({
      name: "Downtown Showroom",
      address: "45 Commerce Ave, Downtown",
      phone: "555-987-6543",
      email: "downtown@aluminum-profiles.com",
      userId: adminUser.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("Created stores");

    // Create categories
    const windowProfilesCategory = await storage.createCategory({
      name: "Window Profiles",
      description: "Aluminum profiles for windows and window frames",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const doorProfilesCategory = await storage.createCategory({
      name: "Door Profiles",
      description: "Aluminum profiles for doors and door frames",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const curtainWallCategory = await storage.createCategory({
      name: "Curtain Wall Profiles",
      description: "Aluminum profiles for curtain wall systems",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const accessoriesCategory = await storage.createCategory({
      name: "Accessories",
      description: "Hardware and accessories for aluminum profiles",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("Created categories");

    // Create clients
    const clients = [
      {
        name: "Skyline Construction Ltd",
        address: "789 Builder's Road, Industrial Zone",
        phone: "555-222-3333",
        email: "info@skyline-construction.com",
        storeId: store1.id,
        contactPerson: "Michael Johnson",
        taxId: "SC12345678",
        notes: "Large commercial construction company, regular customer"
      },
      {
        name: "Modern Homes Inc",
        address: "456 Developer Street, Suburb Area",
        phone: "555-444-5555",
        email: "projects@modernhomes.com",
        storeId: store1.id,
        contactPerson: "Sarah Williams",
        taxId: "MH87654321",
        notes: "Residential developer, orders in large batches"
      },
      {
        name: "Renovation Experts",
        address: "101 Remodel Avenue, City Center",
        phone: "555-666-7777",
        email: "orders@renovation-experts.com",
        storeId: store2.id,
        contactPerson: "Robert Garcia",
        taxId: "RE11223344",
        notes: "Specialized in high-end renovations"
      },
      {
        name: "Glass & Design Studio",
        address: "222 Architect Plaza, Design District",
        phone: "555-888-9999",
        email: "projects@glassdesign.com",
        storeId: store2.id,
        contactPerson: "Emily Chen",
        taxId: "GD55667788",
        notes: "Architectural studio, specialized projects"
      },
      {
        name: "City Contractors",
        address: "333 Municipal Road, Government District",
        phone: "555-111-2222",
        email: "bids@citycontractors.com",
        storeId: store1.id,
        contactPerson: "David Smith",
        taxId: "CC99887766",
        notes: "Works primarily on government projects"
      }
    ];

    const createdClients = [];
    for (const client of clients) {
      const newClient = await storage.createClient({
        ...client,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      createdClients.push(newClient);
    }
    console.log("Created clients");

    // Create products with varying stock quantities and pricing
    const products = [
      {
        name: "Standard Window Frame Profile",
        description: "Basic aluminum profile for standard window frames, 2.5m length",
        sku: "WF-STD-001",
        categoryId: windowProfilesCategory.id,
        unit: "piece",
        currentSellingPrice: "25.99",
        minStock: 50,
        isActive: true
      },
      {
        name: "Sliding Window Track",
        description: "Bottom track for sliding windows, 3m length",
        sku: "WF-SLD-002",
        categoryId: windowProfilesCategory.id,
        unit: "piece",
        currentSellingPrice: "18.50",
        minStock: 40,
        isActive: true
      },
      {
        name: "Heavy-Duty Door Frame",
        description: "Reinforced aluminum profile for commercial doors, 2.2m height",
        sku: "DF-HVY-001",
        categoryId: doorProfilesCategory.id,
        unit: "piece",
        currentSellingPrice: "42.75",
        minStock: 30,
        isActive: true
      },
      {
        name: "Thermal Break Window Profile",
        description: "Insulated aluminum profile for energy-efficient windows, 2.5m length",
        sku: "WF-THM-003",
        categoryId: windowProfilesCategory.id,
        unit: "piece",
        currentSellingPrice: "38.99",
        minStock: 35,
        isActive: true
      },
      {
        name: "Curtain Wall Mullion",
        description: "Vertical structural member for curtain wall systems, 6m length",
        sku: "CW-MUL-001",
        categoryId: curtainWallCategory.id,
        unit: "piece",
        currentSellingPrice: "85.50",
        minStock: 20,
        isActive: true
      },
      {
        name: "Curtain Wall Transom",
        description: "Horizontal structural member for curtain wall systems, 4m length",
        sku: "CW-TRN-002",
        categoryId: curtainWallCategory.id,
        unit: "piece",
        currentSellingPrice: "75.25",
        minStock: 20,
        isActive: true
      },
      {
        name: "Window Corner Connector",
        description: "90-degree connector for window frames",
        sku: "ACC-CON-001",
        categoryId: accessoriesCategory.id,
        unit: "piece",
        currentSellingPrice: "3.99",
        minStock: 100,
        isActive: true
      },
      {
        name: "Door Hinge Attachment Profile",
        description: "Specialized profile section for door hinge mounting",
        sku: "DF-HNG-002",
        categoryId: doorProfilesCategory.id,
        unit: "piece",
        currentSellingPrice: "15.75",
        minStock: 45,
        isActive: true
      },
      {
        name: "Weather Sealing Strip",
        description: "Rubber weather sealing for window profiles, 100m roll",
        sku: "ACC-WTH-001",
        categoryId: accessoriesCategory.id,
        unit: "roll",
        currentSellingPrice: "120.00",
        minStock: 10,
        isActive: true
      },
      {
        name: "Double-Glazed Window Profile",
        description: "Specialized profile for double-glazed window installation, 2.5m length",
        sku: "WF-DBL-004",
        categoryId: windowProfilesCategory.id,
        unit: "piece",
        currentSellingPrice: "32.50",
        minStock: 30,
        isActive: true
      }
    ];

    const createdProducts = [];
    for (const product of products) {
      const newProduct = await storage.createProduct({
        ...product,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      createdProducts.push(newProduct);
    }
    console.log("Created products");

    // Create product batches with varying capital costs to show price fluctuations
    // For each product, create several batches with different purchase dates and costs
    for (const product of createdProducts) {
      // First batch - oldest (from 6 months ago)
      await storage.createProductBatch({
        productId: product.id,
        storeId: store1.id,
        batchNumber: `${product.sku}-B1`,
        purchaseDate: subMonths(new Date(), 6),
        expiryDate: null,
        quantity: "100",
        remainingQuantity: "30",
        capitalCost: (parseFloat(product.currentSellingPrice) * 0.65).toFixed(2), // 65% of current selling price
        supplierName: "Aluminum Supply Co.",
        supplierInvoice: "INV-20220701-001",
        notes: "Initial stock purchase",
        createdAt: subMonths(new Date(), 6),
        updatedAt: subMonths(new Date(), 6)
      });

      // Second batch - from 3 months ago with 5% higher cost
      await storage.createProductBatch({
        productId: product.id,
        storeId: store1.id,
        batchNumber: `${product.sku}-B2`,
        purchaseDate: subMonths(new Date(), 3),
        expiryDate: null,
        quantity: "150",
        remainingQuantity: "75",
        capitalCost: (parseFloat(product.currentSellingPrice) * 0.70).toFixed(2), // 70% of current selling price
        supplierName: "Aluminum Supply Co.",
        supplierInvoice: "INV-20221001-002",
        notes: "Restocking with slight price increase",
        createdAt: subMonths(new Date(), 3),
        updatedAt: subMonths(new Date(), 3)
      });

      // Third batch - from 1 month ago with another 5% price increase
      await storage.createProductBatch({
        productId: product.id,
        storeId: store1.id,
        batchNumber: `${product.sku}-B3`,
        purchaseDate: subMonths(new Date(), 1),
        expiryDate: null,
        quantity: "100",
        remainingQuantity: "85",
        capitalCost: (parseFloat(product.currentSellingPrice) * 0.75).toFixed(2), // 75% of current selling price
        supplierName: "Aluminum Supply Co.",
        supplierInvoice: "INV-20230101-003",
        notes: "Recent stock addition",
        createdAt: subMonths(new Date(), 1),
        updatedAt: subMonths(new Date(), 1)
      });

      // Fourth batch for store 2 (if applicable) - from 2 months ago
      if (product.id % 2 === 0) { // Only add to store 2 for some products
        await storage.createProductBatch({
          productId: product.id,
          storeId: store2.id,
          batchNumber: `${product.sku}-S2-B1`,
          purchaseDate: subMonths(new Date(), 2),
          expiryDate: null,
          quantity: "80",
          remainingQuantity: "50",
          capitalCost: (parseFloat(product.currentSellingPrice) * 0.72).toFixed(2), // 72% of current selling price
          supplierName: "Premium Metals Inc.",
          supplierInvoice: "PMI-20221115-001",
          notes: "Stocking new showroom",
          createdAt: subMonths(new Date(), 2),
          updatedAt: subMonths(new Date(), 2)
        });
      }
    }
    console.log("Created product batches");

    // Create invoices with varying statuses
    // For demonstration purposes, create 20 invoices across different statuses and dates
    const statuses = ["paid", "pending", "overdue", "draft", "cancelled"];
    const today = new Date();

    for (let i = 1; i <= 20; i++) {
      const clientIndex = i % createdClients.length;
      const client = createdClients[clientIndex];
      const storeId = client.storeId;
      const invoiceDate = subDays(today, i * 3); // Spread over past 60 days
      const dueDate = subDays(today, i * 3 - 14); // Due 14 days after invoice date
      
      // Determine status based on date and a bit of randomness
      let status;
      if (i <= 3) {
        status = "draft";
      } else if (i > 3 && i <= 8) {
        status = "pending";
      } else if (i > 8 && i <= 10) {
        status = "overdue";
      } else if (i === 15) {
        status = "cancelled";
      } else {
        status = "paid";
      }

      // Create between 2-5 items per invoice
      const itemCount = 2 + (i % 4); // 2-5 items
      const invoiceItems = [];
      let subtotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const productIndex = (i + j) % createdProducts.length;
        const product = createdProducts[productIndex];
        const quantity = 5 + (j * 2); // Varying quantities
        const unitPrice = parseFloat(product.currentSellingPrice);
        const discount = j === 0 ? 10 : 0; // First item gets 10% discount
        const discountAmount = (unitPrice * quantity * discount) / 100;
        const lineTotal = (unitPrice * quantity) - discountAmount;

        invoiceItems.push({
          productId: product.id,
          description: product.name,
          quantity: quantity.toString(),
          unitPrice: unitPrice.toString(),
          discount: discount.toString(),
          totalPrice: lineTotal.toString()
        });

        subtotal += lineTotal;
      }

      // Add tax and calculate total
      const taxRate = 15; // 15% tax
      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount;

      // Create the invoice with its items
      await storage.createInvoice(
        {
          storeId: storeId,
          clientId: client.id,
          invoiceNumber: `INV-${format(invoiceDate, 'yyyyMMdd')}-${i.toString().padStart(3, '0')}`,
          issueDate: invoiceDate,
          dueDate: dueDate,
          status: status,
          subtotal: subtotal.toString(),
          taxRate: taxRate.toString(),
          taxAmount: taxAmount.toString(),
          discount: "0",
          shipping: "0",
          totalAmount: totalAmount.toString(),
          totalProfit: (subtotal * 0.3).toString(), // Approximate profit
          notes: `Sample invoice for ${client.name}`,
          termsAndConditions: "Payment due within 14 days. Late payments subject to 2% interest per month.",
          createdAt: invoiceDate,
          updatedAt: invoiceDate,
          paperSize: i % 2 === 0 ? "A4" : "PRS"
        },
        invoiceItems
      );
    }
    console.log("Created invoices");

    // Add store settings
    await storage.setSetting({
      storeId: store1.id,
      key: "company_name",
      value: "Aluminum Profiles Manufacturing Ltd.",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await storage.setSetting({
      storeId: store1.id,
      key: "company_logo",
      value: "logo.png",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await storage.setSetting({
      storeId: store1.id,
      key: "company_address",
      value: "123 Main Street, City Center",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await storage.setSetting({
      storeId: store1.id,
      key: "company_phone",
      value: "555-123-4567",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await storage.setSetting({
      storeId: store1.id,
      key: "company_email",
      value: "info@aluminum-profiles.com",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await storage.setSetting({
      storeId: store1.id,
      key: "tax_rate",
      value: "15",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await storage.setSetting({
      storeId: store1.id,
      key: "currency",
      value: "USD",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log("Created settings");

    console.log("Data seeding completed successfully!");
    
  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
}

// Execute the seed function
seedData()
  .then(() => {
    console.log("Seed script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed script failed:", error);
    process.exit(1);
  });