import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { UAParser } from "ua-parser-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import db, { initDb } from "./src/lib/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "ist-links-secret-key-2026";

async function startServer() {
  // Initialize MySQL database
  await initDb();

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify JWT
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const user = await db("users").where({ email }).first();
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: { uid: user.uid, email: user.email, role: user.role } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Auth: Signup (with invite check)
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      // Check if user already exists
      const existingUser = await db("users").where({ email }).first();
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Check for invite
      const invite = await db("invites").where({ email }).first();
      const isDefaultAdmin = ["mert@istrealestate.ae", "mert.sadek.91@gmail.com"].includes(email);
      
      if (!invite && !isDefaultAdmin) {
        return res.status(403).json({ error: "No invitation found for this email" });
      }

      const role = invite?.role || (isDefaultAdmin ? "admin" : "client");
      const hashedPassword = await bcrypt.hash(password, 10);
      const uid = nanoid();

      await db("users").insert({
        uid,
        email,
        password: hashedPassword,
        role,
        createdAt: new Date()
      });

      if (invite) {
        await db("invites").where({ email }).update({ status: "accepted" });
      }

      const token = jwt.sign({ uid, email, role }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: { uid, email, role } });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Create User Directly
  app.post("/api/admin/create-user", authenticate, async (req, res) => {
    const { email, password, role } = req.body;
    const requester = (req as any).user;

    if (!email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      if (requester.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      // Check if user already exists
      const existingUser = await db("users").where({ email }).first();
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const uid = nanoid();

      await db("users").insert({
        uid,
        email,
        password: hashedPassword,
        role,
        createdAt: new Date()
      });

      res.json({ success: true, uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message || "Failed to create user" });
    }
  });

  // Links API
  app.get("/api/links", authenticate, async (req, res) => {
    const { uid, role } = (req as any).user;

    try {
      const isAdmin = role === "admin";

      let links;
      if (isAdmin) {
        links = await db("links").orderBy("createdAt", "desc");
      } else {
        links = await db("links").where({ ownerUid: uid }).orderBy("createdAt", "desc");
      }
      res.json(links);
    } catch (error) {
      console.error("Error fetching links:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/links", authenticate, async (req, res) => {
    const { uid } = (req as any).user;

    try {
      const { id, originalUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, campaignId } = req.body;

      await db("links").insert({
        id,
        originalUrl,
        ownerUid: uid,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        campaignId,
        createdAt: new Date()
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error creating link:", error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: "Short link ID already exists" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/links/:id", authenticate, async (req, res) => {
    const { uid, role } = (req as any).user;
    const { id } = req.params;

    try {
      const isAdmin = role === "admin";

      const link = await db("links").where({ id }).first();
      if (!link) return res.status(404).json({ error: "Link not found" });

      if (!isAdmin && link.ownerUid !== uid) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      res.json(link);
    } catch (error) {
      console.error("Error fetching link:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/links/:id", authenticate, async (req, res) => {
    const { uid, role } = (req as any).user;
    const { id } = req.params;

    try {
      const isAdmin = role === "admin";

      const link = await db("links").where({ id }).first();
      if (!link) return res.status(404).json({ error: "Link not found" });

      if (!isAdmin && link.ownerUid !== uid) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await db("links").where({ id }).delete();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting link:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Analytics API
  app.get("/api/analytics/:linkId", authenticate, async (req, res) => {
    const { uid, role } = (req as any).user;
    const { linkId } = req.params;

    try {
      const isAdmin = role === "admin";

      const link = await db("links").where({ id: linkId }).first();
      if (!link) return res.status(404).json({ error: "Link not found" });

      if (!isAdmin && link.ownerUid !== uid) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const clicks = await db("clicks").where({ linkId }).orderBy("timestamp", "desc");
      res.json({ link, clicks });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Invites API (Admin only)
  app.get("/api/invites", authenticate, async (req, res) => {
    const { role } = (req as any).user;

    try {
      const isAdmin = role === "admin";
      if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

      const invites = await db("invites").orderBy("createdAt", "desc");
      res.json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/invites", authenticate, async (req, res) => {
    const { role } = (req as any).user;

    try {
      const isAdmin = role === "admin";
      if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

      const { email, role: inviteRole } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      await db("invites").insert({
        email: email.toLowerCase(),
        role: inviteRole || "client",
        status: "pending",
        createdAt: new Date()
      }).onConflict("email").merge();

      res.json({ success: true });
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/invites/:email", authenticate, async (req, res) => {
    const { role } = (req as any).user;

    try {
      const isAdmin = role === "admin";
      if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

      const { email } = req.params;
      await db("invites").where({ email }).delete();

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Users API (Admin only)
  app.get("/api/users", authenticate, async (req, res) => {
    const { role } = (req as any).user;

    try {
      const isAdmin = role === "admin";
      if (!isAdmin) return res.status(403).json({ error: "Unauthorized" });

      const users = await db("users").orderBy("createdAt", "desc");
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/users/:uid", authenticate, async (req, res) => {
    const { role: requesterRole } = (req as any).user;
    const { uid } = req.params;
    const { role } = req.body;

    try {
      const isAdmin = requesterRole === "admin";
      if (!isAdmin) return res.status(403).json({ error: "Unauthorized" });

      await db("users").where({ uid }).update({ role });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/users/:uid", authenticate, async (req, res) => {
    const { role: requesterRole } = (req as any).user;
    const { uid } = req.params;

    try {
      const isAdmin = requesterRole === "admin";
      if (!isAdmin) return res.status(403).json({ error: "Unauthorized" });

      // Delete from MySQL
      await db("users").where({ uid }).delete();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Short link redirect route
  app.get("/r/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const link = await db("links").where({ id }).first();

      if (!link) {
        return res.status(404).send("Link not found");
      }

      const originalUrl = link.originalUrl;

      // Capture analytics asynchronously
      const userAgent = req.headers["user-agent"] || "";
      const parser = new UAParser(userAgent);
      const result = parser.getResult();

      // Simple IP extraction
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

      // Log click to MySQL
      const clickData = {
        linkId: id,
        ownerUid: link.ownerUid,
        timestamp: new Date(),
        ip: Array.isArray(ip) ? ip[0] : ip,
        userAgent,
        device: result.device.type || "desktop",
        browser: result.browser.name || "unknown",
        os: result.os.name || "unknown",
      };

      // Add click to clicks table
      await db("clicks").insert(clickData);

      // Increment total click count on the link
      await db("links").where({ id }).increment("clickCount", 1);

      // Redirect user
      res.redirect(originalUrl);
    } catch (error) {
      console.error("Redirect error:", error);
      res.status(500).send("Internal server error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
