import { Op } from "sequelize";
import { NwEvent } from "../models/NwEvent.js";
import { NwUser } from "../models/NwUser.js";
import { env } from "../config/env.js";

function buildInviteLink(eventId: string) {
  const base = env.inviteBaseUrl.endsWith("/")
    ? env.inviteBaseUrl.slice(0, -1)
    : env.inviteBaseUrl;
  return `${base}/${eventId}`;
}

export async function listEvents(userId: string) {
  return NwEvent.findAll({
    where: { ownerId: userId },
    include: ["guests", "menu", "predictions"],
    order: [["eventDate", "ASC"]],
  });
}

export async function createEvent(
  userId: string,
  payload: Partial<NwEvent>
) {
  const event = await NwEvent.create({
    ...payload,
    ownerId: userId,
  } as any);
  if (!event.inviteLink) {
    const inviteLink = buildInviteLink(event.id);
    await event.update({ inviteLink });
    event.inviteLink = inviteLink;
  }
  return event;
}

export async function getEvent(eventId: string) {
  return NwEvent.findByPk(eventId, {
    include: ["guests", "menu", "predictions", { model: NwUser, as: "owner" }],
  });
}

export async function updateEvent(eventId: string, payload: Partial<NwEvent>) {
  const event = await getEvent(eventId);
  if (!event) {
    return null;
  }
  await event.update(payload);
  if (!event.inviteLink) {
    const inviteLink = buildInviteLink(event.id);
    await event.update({ inviteLink });
    event.inviteLink = inviteLink;
  }
  return event;
}

/**
 * Check and update event statuses based on survey cutoff dates
 * Should be called daily via a scheduled job
 */
export async function updateEventStatusesByCutoffDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Find all published events with cutoff dates that have passed
  const eventsToUpdate = await NwEvent.findAll({
    where: {
      status: "published",
      surveyCutoffDate: {
        [Op.lte]: todayStr,
      },
    },
  });

  // Update status to survey_completed
  const updatePromises = eventsToUpdate.map((event) =>
    event.update({ status: "survey_completed" })
  );

  await Promise.all(updatePromises);

  return {
    updated: eventsToUpdate.length,
    eventIds: eventsToUpdate.map((e) => e.id),
  };
}

