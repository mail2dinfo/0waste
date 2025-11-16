import type { Express } from "express";
import express from "express";
import { eventRouter } from "./events.js";
import { guestRouter } from "./guests.js";
import { predictionRouter } from "./predictions.js";
import { userRouter } from "./users.js";
import { getDashboardSummaryHandler } from "../controllers/dashboardController.js";
import { reportPricingRouter } from "./reportPricing.js";
import { adminRouter } from "./admin.js";
import { getUpiSettingsHandler } from "../controllers/settingsController.js";

export function registerRoutes(app: Express) {
  const api = express.Router();

  api.get("/health", (_req, res) =>
    res.json({ status: "ok", service: "nowaste-api" })
  );

  api.get("/dashboard/summary", getDashboardSummaryHandler);
  api.get("/settings/upi", getUpiSettingsHandler);

  api.use("/users", userRouter);
  api.use("/events", eventRouter);
  api.use("/events/:eventId/guests", guestRouter);
  api.use("/events/:eventId/predictions", predictionRouter);
  api.use("/report-pricing", reportPricingRouter);
  api.use("/admin", adminRouter);

  app.use("/api", api);
}

