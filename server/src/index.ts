import express from "express";
import helmet from "helmet";
import cors from "cors";
import { assertEnv, env } from "./config/env.js";
import { sequelize } from "./db/sequelize.js";
import { registerRoutes } from "./routes/index.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { ensureDefaultAdmin } from "./services/userService.js";
import { ensureDefaultReportPricing } from "./services/reportPricingService.js";
import { ensureDefaultSettings } from "./services/settingsService.js";

async function bootstrap() {
  assertEnv();

  const app = express();
  const allowedOrigins = new Set(env.frontendOrigins);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        if (allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        if (/^http:\/\/localhost:\d+$/.test(origin)) {
          allowedOrigins.add(origin);
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

  await sequelize.sync();
  console.log("Database schema synchronized");

  await ensureDefaultAdmin();
  await ensureDefaultReportPricing();
  await ensureDefaultSettings();

  app.listen(env.port, () => {
    console.log(`Nowaste API listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start Nowaste API", error);
  process.exit(1);
});



