import type { Request, Response } from "express";
import {
  recordReportPayment,
  PaymentError,
} from "../services/paymentService.js";

export async function createReportPaymentHandler(req: Request, res: Response) {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string") {
    return res.status(401).json({ message: "Missing x-user-id header" });
  }

  try {
    const { payment, created } = await recordReportPayment(
      userId,
      req.params.eventId,
      req.body
    );

    const payload = {
      paymentId: payment.id,
      status: payment.status,
      method: payment.method,
      paidAt: payment.paidAt,
      reportStatus: "paid" as const,
    };

    return res.status(created ? 201 : 200).json(payload);
  } catch (error) {
    if (error instanceof PaymentError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Failed to create payment", error);
    return res.status(500).json({ message: "Unable to process payment right now" });
  }
}






