import express from "express";
import {
  getReportPricingHandler,
  listReportPricingHandler,
  updateReportPricingHandler,
} from "../controllers/reportPricingController.js";

export const reportPricingRouter = express.Router();

reportPricingRouter.get("/", listReportPricingHandler);
reportPricingRouter.get("/:countryCode", getReportPricingHandler);
reportPricingRouter.put("/:countryCode", updateReportPricingHandler);








