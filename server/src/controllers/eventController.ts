import type { Request, Response } from "express";
import {
  createEvent,
  getEvent,
  listEvents,
  updateEvent,
} from "../services/eventService.js";
import { hasPaidForEvent } from "../services/paymentService.js";

export async function listEventsHandler(req: Request, res: Response) {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string") {
    return res.status(401).json({ message: "Missing x-user-id header" });
  }
  const events = await listEvents(userId);
  return res.json(events);
}

export async function createEventHandler(req: Request, res: Response) {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string") {
    return res.status(401).json({ message: "Missing x-user-id header" });
  }
  const event = await createEvent(userId, req.body);
  return res.status(201).json(event);
}

export async function getEventHandler(req: Request, res: Response) {
  const event = await getEvent(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  const payload = event.toJSON() as Record<string, unknown>;
  const ownerId = event.ownerId;
  if (typeof ownerId === "string") {
    const paid = await hasPaidForEvent(ownerId, event.id);
    payload.reportStatus = paid ? "paid" : "unpaid";
  }
  return res.json(payload);
}

export async function updateEventHandler(req: Request, res: Response) {
  const event = await updateEvent(req.params.eventId, req.body);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  return res.json(event);
}




