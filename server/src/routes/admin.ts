import express from "express";
import { requireAdmin } from "../middleware/adminAuth.js";
import {
  getAdminDashboardHandler,
  getAdminUsersHandler,
} from "../controllers/adminController.js";
import {
  getUpiSettingsHandler,
  updateUpiSettingsHandler,
} from "../controllers/settingsController.js";

export const adminRouter = express.Router();

adminRouter.use(requireAdmin);

adminRouter.get("/dashboard", getAdminDashboardHandler);
adminRouter.get("/users", getAdminUsersHandler);
adminRouter.get("/settings/upi", getUpiSettingsHandler);
adminRouter.put("/settings/upi", updateUpiSettingsHandler);

