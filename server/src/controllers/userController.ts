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
  const { fullName, phoneNumber } = req.body ?? {};
  if (!fullName || !phoneNumber) {
    return res
      .status(400)
      .json({
        message: "fullName and phoneNumber are required",
      });
  }
  
  // Normalize phone number: remove spaces, dashes, and parentheses
  const normalizedPhone = phoneNumber.trim().replace(/[\s\-\(\)]/g, "");
  
  try {
    // Check if user already exists with this phone number
    const existingUser = await findUserByPhone(normalizedPhone);
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Phone number is already registered. Please login instead." });
    }
    
    const user = await createUser({
      fullName: fullName.trim(),
      phoneNumber: normalizedPhone,
      email: null, // Email is optional
      passwordHash: null, // No password needed
      role: "product_owner",
    });
    return res
      .status(201)
      .json({ id: user.id, fullName: user.fullName, phoneNumber: user.phoneNumber, role: user.role });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return res
        .status(409)
        .json({ message: "Phone number is already registered." });
    }
    throw error;
  }
}

export async function loginHandler(req: Request, res: Response) {
  const { phoneNumber } = req.body ?? {};
  if (!phoneNumber) {
    return res
      .status(400)
      .json({ message: "phoneNumber is required" });
  }
  
  // Normalize phone number: remove spaces, dashes, and parentheses (no country code handling)
  const normalizedPhone = phoneNumber.trim().replace(/[\s\-\(\)]/g, "");
  
  // Try to find user with normalized phone number
  let user = await findUserByPhone(normalizedPhone);
  
  // If not found, try with the original (trimmed) phone number
  if (!user) {
    user = await findUserByPhone(phoneNumber.trim());
  }
  
  if (!user) {
    console.log(`[Login] User not found for phone: ${phoneNumber} (normalized: ${normalizedPhone})`);
    return res.status(404).json({ message: "Phone number not registered. Please sign up first." });
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

