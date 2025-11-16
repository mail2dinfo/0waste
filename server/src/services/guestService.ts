import { NwGuest } from "../models/NwGuest.js";

export async function listGuests(eventId: string) {
  return NwGuest.findAll({ where: { eventId }, order: [["fullName", "ASC"]] });
}

export async function upsertGuest(eventId: string, payload: Partial<NwGuest>) {
  const [guest] = await NwGuest.upsert({
    ...payload,
    eventId,
  });
  return guest;
}

export async function deleteGuest(eventId: string, guestId: string) {
  return NwGuest.destroy({ where: { eventId, id: guestId } });
}

