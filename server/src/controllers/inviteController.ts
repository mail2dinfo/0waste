import type { Request, Response } from "express";
import {
  saveInviteRsvp,
  getInviteRsvpSummary,
} from "../services/inviteRsvpService.js";

export async function createInviteRsvpHandler(req: Request, res: Response) {
  const { eventId } = req.params;
  const {
    rsvpId,
    attending,
    adults,
    kids,
    arrivalSlot,
    transportMode,
    reminderPreference,
    notes,
    carCount,
    bikeCount,
    scheduleIds,
    scheduleResponses,
  } = req.body ?? {};

  if (typeof attending !== "boolean") {
    return res
      .status(400)
      .json({ message: "attending must be provided as a boolean" });
  }

  try {
    const rsvp = await saveInviteRsvp(eventId, {
      rsvpId: typeof rsvpId === "string" ? rsvpId : undefined,
      attending,
      adults,
      kids,
      arrivalSlot,
      transportMode,
      reminderPreference,
      notes,
      carCount,
      bikeCount,
      scheduleIds: Array.isArray(scheduleIds) ? scheduleIds : undefined,
      scheduleResponses: scheduleResponses && typeof scheduleResponses === "object" ? scheduleResponses : undefined,
    });

    if (!rsvp) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(rsvpId ? 200 : 201).json({
      id: rsvp.id,
      attending: rsvp.attending,
      adults: rsvp.adults,
      kids: rsvp.kids,
      arrivalSlot: rsvp.arrivalSlot,
      transportMode: rsvp.transportMode,
      reminderPreference: rsvp.reminderPreference,
      notes: rsvp.notes,
      carCount: rsvp.carCount,
      bikeCount: rsvp.bikeCount,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("survey has closed")) {
      return res.status(403).json({ message: error.message });
    }
    throw error;
  }

}

export async function getInviteRsvpSummaryHandler(req: Request, res: Response) {
  const { eventId } = req.params;

  const summary = await getInviteRsvpSummary(eventId);
  if (!summary) {
    return res.status(404).json({ message: "Event not found" });
  }

  return res.status(200).json(summary);
}
