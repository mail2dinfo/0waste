import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import { assertEnv, env } from "./config/env.js";
import { sequelize } from "./db/sequelize.js";
import { registerRoutes } from "./routes/index.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { ensureDefaultAdmin } from "./services/userService.js";
import { ensureDefaultReportPricing } from "./services/reportPricingService.js";
import { ensureDefaultSettings } from "./services/settingsService.js";
import { chatServer } from "./websocket/chatServer.js";
import { updateEventStatusesByCutoffDate } from "./services/eventService.js";

async function bootstrap() {
  assertEnv();

  const app = express();
  const allowedOrigins = new Set(env.frontendOrigins);

  // Helper function to check if origin is allowed
  const isOriginAllowed = (origin: string | undefined): boolean => {
    if (!origin) {
      return true;
    }
    if (allowedOrigins.has(origin)) {
      return true;
    }
    // Allow localhost for development
    if (/^http:\/\/localhost:\d+$/.test(origin)) {
      allowedOrigins.add(origin);
      return true;
    }
    // Allow Render domains (onrender.com)
    if (/^https:\/\/.*\.onrender\.com$/.test(origin)) {
      allowedOrigins.add(origin);
      return true;
    }
    // Allow zerovaste.com domains
    if (/^https:\/\/(www\.)?zerovaste\.com$/.test(origin)) {
      allowedOrigins.add(origin);
      return true;
    }
    return false;
  };

  app.use(
    cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not permitted by CORS`));
      },
      credentials: true,
    })
  );
  app.use(helmet());
  app.use(express.json());
  app.use(requestLogger);

  registerRoutes(app);

  await sequelize.authenticate();
  console.log("Database connection established");

  await sequelize.sync({ alter: true });
  console.log("Database schema synchronized");

  await ensureDefaultAdmin();
  await ensureDefaultReportPricing();
  await ensureDefaultSettings();

  const server = createServer(app);
  
  // Initialize WebSocket chat server with origin verification
  chatServer.initialize(server, isOriginAllowed);

  server.listen(env.port, () => {
    console.log(`Nowaste API listening on port ${env.port}`);
    
    // Construct WebSocket URL - use backend URL if available, otherwise localhost
    let wsUrl: string;
    if (env.backendUrl) {
      // Convert http/https to ws/wss
      const wsProtocol = env.backendUrl.startsWith("https") ? "wss" : "ws";
      const wsHost = env.backendUrl.replace(/^https?:\/\//, "");
      wsUrl = `${wsProtocol}://${wsHost}/chat`;
    } else {
      // Fallback to localhost for development
      wsUrl = `ws://localhost:${env.port}/chat`;
    }
    console.log(`WebSocket chat server ready on ${wsUrl}`);
  });

  // Schedule daily job to check and update event statuses based on cutoff dates
  // Runs once per day at midnight
  const scheduleCutoffDateCheck = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Run immediately on startup, then schedule for daily at midnight
    setTimeout(async () => {
      try {
        const result = await updateEventStatusesByCutoffDate();
        console.log(`Cutoff date check: Updated ${result.updated} event(s) to survey_completed`);
        if (result.eventIds.length > 0) {
          console.log(`Updated event IDs: ${result.eventIds.join(", ")}`);
        }
      } catch (error) {
        console.error("Error checking cutoff dates:", error);
      }
      
      // Schedule next run for 24 hours later
      setInterval(async () => {
        try {
          const result = await updateEventStatusesByCutoffDate();
          console.log(`Cutoff date check: Updated ${result.updated} event(s) to survey_completed`);
          if (result.eventIds.length > 0) {
            console.log(`Updated event IDs: ${result.eventIds.join(", ")}`);
          }
        } catch (error) {
          console.error("Error checking cutoff dates:", error);
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntilMidnight);
  };

  scheduleCutoffDateCheck();
  console.log("Cutoff date checker scheduled (runs daily at midnight)");
}

bootstrap().catch((error) => {
  console.error("Failed to start Nowaste API", error);
  process.exit(1);
});



