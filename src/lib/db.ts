import { knex } from "knex";

const db = knex({
  client: "mysql2",
  connection: process.env.MYSQL_URL || "mysql://mysql:Gz1KKg6FhgUuLLHtBiVMcWkBZj98QX7GfhvssyoQBoQgKfQ9psnV5vPH06FYuYdC@147.93.27.94:27148/default",
  pool: { min: 0, max: 7 }
});

export async function initDb() {
  try {
    // Users table
    if (!(await db.schema.hasTable("users"))) {
      await db.schema.createTable("users", (table) => {
        table.string("uid").primary(); // We'll use nanoid for this now
        table.string("email").notNullable().unique();
        table.string("password"); // Hashed password
        table.string("role").notNullable().defaultTo("client");
        table.timestamp("createdAt").defaultTo(db.fn.now());
      });
      console.log("Created users table");
    } else {
      // Check if password column exists (for migration)
      if (!(await db.schema.hasColumn("users", "password"))) {
        await db.schema.alterTable("users", (table) => {
          table.string("password");
        });
        console.log("Added password column to users table");
      }
    }

    // Links table
    if (!(await db.schema.hasTable("links"))) {
      await db.schema.createTable("links", (table) => {
        table.string("id").primary(); // short link id
        table.text("originalUrl").notNullable();
        table.string("ownerUid").notNullable();
        table.integer("clickCount").defaultTo(0);
        table.string("utmSource");
        table.string("utmMedium");
        table.string("utmCampaign");
        table.string("utmTerm");
        table.string("utmContent");
        table.string("campaignId");
        table.timestamp("createdAt").defaultTo(db.fn.now());
      });
      console.log("Created links table");
    }

    // Clicks table (Analytics)
    if (!(await db.schema.hasTable("clicks"))) {
      await db.schema.createTable("clicks", (table) => {
        table.increments("id").primary();
        table.string("linkId").notNullable().references("id").inTable("links").onDelete("CASCADE");
        table.string("ownerUid").notNullable();
        table.string("ip");
        table.string("userAgent");
        table.string("device");
        table.string("browser");
        table.string("os");
        table.timestamp("timestamp").defaultTo(db.fn.now());
      });
      console.log("Created clicks table");
    }
    // Invites table
    if (!(await db.schema.hasTable("invites"))) {
      await db.schema.createTable("invites", (table) => {
        table.string("email").primary();
        table.string("role").defaultTo("client");
        table.string("status").defaultTo("pending");
        table.timestamp("createdAt").defaultTo(db.fn.now());
      });
    }

    // Bootstrap initial admin invite
    await db("invites").insert({
      email: "mert.sadek.91@gmail.com",
      role: "admin",
      status: "pending",
      createdAt: db.fn.now()
    }).onConflict("email").ignore();
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

export default db;
