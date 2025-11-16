import type { Request, Response, NextFunction } from "express";
import { findUserById } from "../services/userService.js";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(401).json({ message: "Missing x-user-id header" });
  }

  const user = await findUserById(userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  if (user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  (req as Request & { adminUser: typeof user }).adminUser = user;
  next();
}

