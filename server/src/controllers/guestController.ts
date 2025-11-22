import type { Request, Response } from "express";
import {
  deleteGuest,
  listGuests,
  upsertGuest,
} from "../services/guestService.js";

export async function listGuestsHandler(
  req: Request<{ eventId: string }>,
  res: Response
) {
  const guests = await listGuests(req.params.eventId);
  return res.json(guests);
}

export async function upsertGuestHandler(
  req: Request<{ eventId: string }>,
  res: Response
) {
  const guest = await upsertGuest(req.params.eventId, req.body);
  return res.status(201).json(guest);
}

export async function deleteGuestHandler(
  req: Request<{ eventId: string; guestId: string }>,
  res: Response
) {
  const deleted = await deleteGuest(req.params.eventId, req.params.guestId);
  if (!deleted) {
    return res.status(404).json({ message: "Guest not found" });
  }
  return res.status(204).send();
}















