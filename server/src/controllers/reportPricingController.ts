import type { Request, Response } from "express";
import {
  getReportPricingForCountry,
  listReportPricing,
  upsertReportPricing,
} from "../services/reportPricingService.js";
import { findUserById } from "../services/userService.js";

async function resolveUser(req: Request) {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || !userId.trim()) {
    return null;
  }
  return findUserById(userId);
}

export async function listReportPricingHandler(req: Request, res: Response) {
  const entries = await listReportPricing();
  return res.json(entries);
}

export async function getReportPricingHandler(req: Request, res: Response) {
  const { countryCode } = req.params;
  if (!countryCode) {
    return res.status(400).json({ message: "countryCode is required" });
  }
  const pricing = await getReportPricingForCountry(countryCode);
  return res.json(pricing);
}

export async function updateReportPricingHandler(req: Request, res: Response) {
  const { countryCode } = req.params;
  const { currencyCode, amount } = req.body ?? {};

  if (!countryCode) {
    return res.status(400).json({ message: "countryCode is required" });
  }
  if (!currencyCode || typeof currencyCode !== "string") {
    return res
      .status(400)
      .json({ message: "currencyCode must be provided as a string" });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res
      .status(400)
      .json({ message: "amount must be a positive number" });
  }

  const user = await resolveUser(req);
  if (!user) {
    return res.status(401).json({ message: "Missing or invalid x-user-id header" });
  }
  if (user.role !== "admin") {
    return res.status(403).json({ message: "Only admins can update pricing" });
  }

  const pricing = await upsertReportPricing(countryCode, {
    currencyCode: currencyCode.toUpperCase(),
    amount: Math.round(numericAmount),
    updatedByUserId: user.id,
  });

  return res.json(pricing);
}








