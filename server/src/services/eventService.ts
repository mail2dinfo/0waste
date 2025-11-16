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
  });
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

