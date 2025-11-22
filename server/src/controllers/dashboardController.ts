import type { Request, Response } from "express";
import { getDashboardSummary } from "../services/dashboardService.js";

export async function getDashboardSummaryHandler(req: Request, res: Response) {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(401).json({ message: "Missing x-user-id header" });
  }

  const summary = await getDashboardSummary(userId);
  return res.json(summary);
}














