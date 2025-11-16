import type { Request, Response } from "express";
import { getAdminStats, getAdminEventLists, getAllUsers } from "../services/adminService.js";

export async function getAdminDashboardHandler(req: Request, res: Response) {
  try {
    const stats = await getAdminStats();
    const eventLists = await getAdminEventLists();
    return res.json({
      stats,
      events: eventLists,
    });
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    return res.status(500).json({ message: "Failed to fetch admin dashboard" });
  }
}

export async function getAdminUsersHandler(req: Request, res: Response) {
  try {
    const users = await getAllUsers();
    return res.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
}

