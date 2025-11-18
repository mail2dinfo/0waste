import { Op } from "sequelize";
import { NwEvent } from "../models/NwEvent.js";
import { NwReportPayment } from "../models/NwReportPayment.js";

export type PaymentMethod = "upi" | "card";

export type CreateReportPaymentInput = {
  amount: number;
  currencyCode: string;
  method: PaymentMethod;
  upiId?: string;
  /** Optional manual reference like UPI transaction ID */
  reference?: string;
  card?: {
    cardNumber?: string;
    nameOnCard?: string;
    expiryMonth?: string;
    expiryYear?: string;
  };
};

export class PaymentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PaymentError";
    this.status = status;
  }
}

export async function recordReportPayment(
  userId: string,
  eventId: string,
  payload: CreateReportPaymentInput
) {
  const event = await NwEvent.findByPk(eventId);
  if (!event) {
    throw new PaymentError("Event not found", 404);
  }
  if (event.ownerId !== userId) {
    throw new PaymentError("You are not allowed to pay for this event", 403);
  }

  const existing = await NwReportPayment.findOne({
    where: {
      userId,
      eventId,
      status: { [Op.eq]: "success" },
    },
  });

  if (existing) {
    return { payment: existing, created: false } as const;
  }

  if (!payload.currencyCode || typeof payload.currencyCode !== "string") {
    throw new PaymentError("Currency code is required");
  }

  const amountNumber = Number(payload.amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    throw new PaymentError("Amount must be a positive number");
  }

  if (payload.method !== "upi" && payload.method !== "card") {
    throw new PaymentError("Unsupported payment method");
  }

  const paymentDetails: Record<string, unknown> = {
    method: payload.method,
  };

  if (payload.method === "upi") {
    const upiId = (payload.upiId ?? "").trim();
    if (!upiId) {
      throw new PaymentError("UPI ID is required for UPI payments");
    }
    if (!/^[\w.\-]{2,}@([\w\-]{2,})$/.test(upiId)) {
      throw new PaymentError("UPI ID format looks invalid");
    }
    paymentDetails.upiId = upiId;
    if (payload.reference?.trim()) {
      paymentDetails.reference = payload.reference.trim();
    }
  } else {
    const card = payload.card ?? {};
    const rawNumber = (card.cardNumber ?? "").replace(/\D/g, "");
    if (rawNumber.length < 8) {
      throw new PaymentError("Card number looks invalid");
    }
    const last4 = rawNumber.slice(-4);
    paymentDetails.cardLast4 = last4;
    if (card.nameOnCard?.trim()) {
      paymentDetails.cardholder = card.nameOnCard.trim();
    }
    if (card.expiryMonth && card.expiryYear) {
      paymentDetails.expiry = `${card.expiryMonth}/${card.expiryYear}`;
    }
  }

  const payment = await NwReportPayment.create({
    userId,
    eventId,
    amount: amountNumber,
    currencyCode: payload.currencyCode,
    method: payload.method,
    status: "success",
    paymentDetails,
  } as any);

  return { payment, created: true } as const;
}

export async function listPaidEventIds(userId: string) {
  const payments = await NwReportPayment.findAll({
    where: { userId, status: { [Op.eq]: "success" } },
    attributes: ["eventId"],
  });
  return payments.map((payment) => payment.eventId);
}

export async function hasPaidForEvent(userId: string, eventId: string) {
  const payment = await NwReportPayment.findOne({
    where: {
      userId,
      eventId,
      status: { [Op.eq]: "success" },
    },
    attributes: ["id"],
  });
  return Boolean(payment);
}



