import type { Request, Response } from "express";
import { UniqueConstraintError } from "sequelize";
import {
  createUser,
  findUserByEmail,
  findUserByPhone,
  requestOtp,
  verifyOtp,
} from "../services/userService.js";

export async function createUserHandler(req: Request, res: Response) {
  const { fullName, email, phoneNumber, password } = req.body ?? {};
  if (!fullName || !email || !phoneNumber || !password) {
    return res
      .status(400)
      .json({
        message: "fullName, email, phoneNumber, and password are required",
      });
  }
  try {
    const user = await createUser({
      fullName,
      email,
      phoneNumber,
      passwordHash: password,
      role: "product_owner",
    });
    return res
      .status(201)
      .json({ id: user.id, email: user.email, fullName, role: user.role });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return res
        .status(409)
        .json({ message: "Email or phone is already registered." });
    }
    throw error;
  }
}

export async function loginHandler(req: Request, res: Response) {
  const { phoneNumber, password } = req.body ?? {};
  if (!phoneNumber || !password) {
    return res
      .status(400)
      .json({ message: "phoneNumber and password are required" });
  }
  
  // Normalize phone number: remove spaces, dashes, and parentheses (no country code handling)
  const normalizedPhone = phoneNumber.trim().replace(/[\s\-\(\)]/g, "");
  
  // Try to find user with normalized phone number
  let user = await findUserByPhone(normalizedPhone);
  
  // If not found, try with the original (trimmed) phone number
  if (!user) {
    user = await findUserByPhone(phoneNumber.trim());
  }
  
  // Compare passwords (trim both to handle whitespace issues)
  const providedPassword = password.trim();
  const storedPassword = user?.passwordHash?.trim() || "";
  
  if (!user || storedPassword !== providedPassword) {
    console.log(`[Login] Failed attempt for phone: ${phoneNumber} (normalized: ${normalizedPhone})`);
    return res.status(401).json({ message: "Invalid credentials" });
  }
  
  console.log(`[Login] Success for user: ${user.fullName} (${user.phoneNumber})`);
  return res.json({
    token: "stub-token",
    userId: user.id,
    fullName: user.fullName,
    role: user.role,
  });
}

export async function meHandler(req: Request, res: Response) {
  const user = await findUserByEmail(String(req.query.email));
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
  });
}

export async function requestOtpHandler(req: Request, res: Response) {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ message: "phoneNumber is required" });
  }
  const result = await requestOtp(phoneNumber);
  return res.json({ message: "OTP sent", otp: result.otp });
}

export async function verifyOtpHandler(req: Request, res: Response) {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) {
    return res
      .status(400)
      .json({ message: "phoneNumber and otp are required" });
  }

  const isValid = await verifyOtp(phoneNumber, otp);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid or expired OTP" });
  }

  return res.json({ token: "stub-otp-token", phoneNumber });
}

