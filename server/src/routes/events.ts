import express from "express";
import {
  createEventHandler,
  listEventsHandler,
  getEventHandler,
  updateEventHandler,
} from "../controllers/eventController.js";
import {
  createInviteRsvpHandler,
  getInviteRsvpSummaryHandler,
} from "../controllers/inviteController.js";
import { createReportPaymentHandler } from "../controllers/paymentController.js";

export const eventRouter = express.Router();

eventRouter.get("/", listEventsHandler);
eventRouter.post("/", createEventHandler);
eventRouter.get("/:eventId", getEventHandler);
eventRouter.put("/:eventId", updateEventHandler);
eventRouter.post("/:eventId/invite-rsvp", createInviteRsvpHandler);
eventRouter.get("/:eventId/invite-rsvp/summary", getInviteRsvpSummaryHandler);
eventRouter.post("/:eventId/payments", createReportPaymentHandler);



