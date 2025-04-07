#!/bin/bash
echo "Creating database schema and seeding with sample data..."

# Add drizzle-kit to generate migrations based on schema
echo "Running schema push to create tables..."
npx drizzle-kit push:pg

# Run the seed script
echo "Seeding database with sample data..."
npx tsx scripts/seed-db.ts

echo "Database setup complete!"
