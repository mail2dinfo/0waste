import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Render sets PORT automatically - we must use it
const PORT = process.env.PORT || 10000;
const distPath = join(__dirname, "dist");
const indexPath = join(distPath, "index.html");

console.log("=== Server Starting ===");
console.log("PORT:", PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("__dirname:", __dirname);
console.log("distPath:", distPath);
console.log("indexPath:", indexPath);

// Verify dist folder exists
if (!existsSync(distPath)) {
  console.error(`ERROR: dist folder not found at ${distPath}`);
  console.error("Make sure to run 'npm run build' before starting the server");
  process.exit(1);
}

if (!existsSync(indexPath)) {
  console.error(`ERROR: index.html not found at ${indexPath}`);
  console.error("Make sure to run 'npm run build' before starting the server");
  process.exit(1);
}

// Serve static files from the dist directory (JS, CSS, images, etc.)
// This middleware will serve files like /assets/index-abc123.js
app.use(express.static(distPath, {
  // Don't automatically serve index.html for root requests
  // We'll handle that explicitly for SPA routing
  index: false
}));

// Handle SPA routing - serve index.html for all routes that don't match static files
// This must come AFTER express.static so static files are served first
app.get("*", (req, res) => {
  console.log(`[${new Date().toISOString()}] Request: ${req.method} ${req.path}`);
  
  // Don't serve index.html for API routes
  if (req.path.startsWith("/api")) {
    console.log("  → API route, returning 404");
    return res.status(404).json({ error: "Not found" });
  }
  
  // For all other routes (like /invite/:eventId), serve index.html
  // React Router will handle the client-side routing
  console.log(`  → SPA route, serving index.html`);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`  ✗ Error sending index.html:`, err);
      if (!res.headersSent) {
        res.status(500).send("Error loading application");
      }
    } else {
      console.log(`  ✓ Served index.html successfully`);
    }
  });
});

app.listen(PORT, () => {
  console.log(`✓ Server is running on port ${PORT}`);
  console.log(`✓ Serving static files from: ${distPath}`);
  console.log(`✓ SPA routing enabled - all routes will serve index.html`);
  console.log(`✓ Ready to handle requests like /invite/:eventId`);
});

