import express from "express";
import {
  createUserHandler,
  loginHandler,
  meHandler,
  requestOtpHandler,
  verifyOtpHandler,
} from "../controllers/userController.js";

export const userRouter = express.Router();

userRouter.post("/", createUserHandler);
userRouter.post("/login", loginHandler);
userRouter.get("/me", meHandler);
userRouter.post("/request-otp", requestOtpHandler);
userRouter.post("/verify-otp", verifyOtpHandler);

