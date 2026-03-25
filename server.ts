import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { UAParser } from "ua-parser-js";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Client SDK on server
  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Short link redirect route
  app.get("/r/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const linkDocRef = doc(db, "links", id);
      const linkDoc = await getDoc(linkDocRef);

      if (!linkDoc.exists()) {
        return res.status(404).send("Link not found");
      }

      const linkData = linkDoc.data();
      const originalUrl = linkData.originalUrl;

      // Capture analytics asynchronously
      const userAgent = req.headers["user-agent"] || "";
      const parser = new UAParser(userAgent);
      const result = parser.getResult();

      // Simple IP extraction (might be behind proxy)
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

      // Log click to Firestore
      const clickData = {
        linkId: id,
        ownerUid: linkData.ownerUid,
        timestamp: serverTimestamp(),
        ip: Array.isArray(ip) ? ip[0] : ip,
        userAgent,
        device: result.device.type || "desktop",
        browser: result.browser.name || "unknown",
        os: result.os.name || "unknown",
        // Geographic data would normally require a GeoIP service
        // For this demo, we'll just log the IP and maybe some basic info if available
      };

      // Add click to subcollection
      const clicksRef = collection(db, "links", id, "clicks");
      await addDoc(clicksRef, clickData);

      // Increment total click count on the link doc
      await updateDoc(linkDocRef, {
        clickCount: increment(1)
      });

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
