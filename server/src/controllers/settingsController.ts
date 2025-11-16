import type { Request, Response } from "express";
import { getUpiSettings, updateUpiSettings } from "../services/settingsService.js";

export async function getUpiSettingsHandler(req: Request, res: Response) {
  try {
    const settings = await getUpiSettings();
    return res.json(settings);
  } catch (error) {
    console.error("Error fetching UPI settings:", error);
    return res.status(500).json({ message: "Failed to fetch UPI settings" });
  }
}

export async function updateUpiSettingsHandler(req: Request, res: Response) {
  try {
    const { upiId, upiName, qrCodeImage } = req.body ?? {};
    if (!upiId) {
      return res.status(400).json({ message: "UPI ID is required" });
    }

    const settings = await updateUpiSettings(upiId, upiName, qrCodeImage);
    return res.json(settings);
  } catch (error) {
    console.error("Error updating UPI settings:", error);
    const message = error instanceof Error ? error.message : "Failed to update UPI settings";
    return res.status(400).json({ message });
  }
}

