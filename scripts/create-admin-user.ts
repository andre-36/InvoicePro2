import { storage } from "../server/storage";
import { createHash } from "crypto";

// Simple password hashing function
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingUser = await storage.getUserByUsername("admin");
    
    if (existingUser) {
      console.log("Admin user already exists");
      return;
    }
    
    // Create admin user
    const adminUser = await storage.createUser({
      username: "admin",
      password: hashPassword("password"),
      fullName: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
    
    console.log("Admin user created successfully:", adminUser);
    
    // Create a default store
    const store = await storage.createStore({
      name: "Main Store",
      address: "123 Main St",
      phone: "555-1234",
      email: "store@example.com",
      currency: "USD",
      userId: adminUser.id,
    });
    
    console.log("Default store created successfully:", store);
    
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();