import { NwEvent } from "../models/NwEvent.js";
import { NwInviteRsvp } from "../models/NwInviteRsvp.js";

export interface InviteRsvpInput {
  rsvpId?: string;
  attending: boolean;
  adults?: number;
  kids?: number;
  arrivalSlot?: string | null;
  transportMode?: string | null;
  reminderPreference?: string[] | null;
  notes?: string | null;
  carCount?: number;
  bikeCount?: number;
}

export interface InviteRsvpSummary {
  totals: {
    responses: number;
    attendingYes: number;
    attendingNo: number;
    adults: number;
    kids: number;
    guestsCommitted: number;
    totalCars: number;
    totalBikes: number;
  };
  ratios: {
    attendanceRate: number | null;
  };
  arrivalSlots: Array<{ value: string; label: string; count: number }>;
  transportModes: Array<{ value: string; label: string; count: number }>;
  reminders: Array<{ value: string; label: string; count: number }>;
  lastResponseAt: string | null;
}

function normaliseCount(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
}

function normaliseString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normaliseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return cleaned.length ? cleaned : null;
}

export async function saveInviteRsvp(
  eventId: string,
  input: InviteRsvpInput
): Promise<NwInviteRsvp | null> {
  const event = await NwEvent.findByPk(eventId);
  if (!event) {
    return null;
  }

  // Check if survey is closed (cutoff date passed or status is survey_completed)
  if (event.status === "survey_completed") {
    throw new Error("The survey has closed. RSVPs are no longer being accepted.");
  }

  if (event.surveyCutoffDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoffDate = new Date(event.surveyCutoffDate);
    cutoffDate.setHours(0, 0, 0, 0);
    if (today > cutoffDate) {
      throw new Error("The survey has closed. RSVPs are no longer being accepted.");
    }
  }

  const payload = {
    attending: Boolean(input.attending),
    adults: normaliseCount(input.adults),
    kids: normaliseCount(input.kids),
    arrivalSlot: normaliseString(input.arrivalSlot),
    transportMode: normaliseString(input.transportMode),
    reminderPreference: normaliseStringArray(input.reminderPreference),
    notes: normaliseString(input.notes),
    carCount: normaliseCount(input.carCount),
    bikeCount: normaliseCount(input.bikeCount),
  };

  if (!payload.attending) {
    payload.adults = 0;
    payload.kids = 0;
    payload.arrivalSlot = null;
    payload.transportMode = null;
    payload.reminderPreference = null;
    payload.notes = payload.notes ?? null;
    payload.carCount = 0;
    payload.bikeCount = 0;
  }

  if (input.rsvpId) {
    const existing = await NwInviteRsvp.findOne({
      where: { id: input.rsvpId, eventId },
    });
    if (existing) {
      await existing.update(payload);
      return existing;
    }
  }

  const created = await NwInviteRsvp.create({
    eventId,
    ...payload,
  } as any);
  return created;
}

function mapToSortedArray(
  map: Map<string, { label: string; count: number }>
): Array<{ value: string; label: string; count: number }> {
  return Array.from(map.entries())
    .map(([value, entry]) => ({ value, label: entry.label, count: entry.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export async function getInviteRsvpSummary(
  eventId: string
): Promise<InviteRsvpSummary | null> {
  const event = await NwEvent.findByPk(eventId);
  if (!event) {
    return null;
  }

  const rsvps = await NwInviteRsvp.findAll({
    where: { eventId },
    order: [["updatedAt", "DESC"]],
  });

  const totals = {
    responses: rsvps.length,
    attendingYes: 0,
    attendingNo: 0,
    adults: 0,
    kids: 0,
    guestsCommitted: 0,
    totalCars: 0,
    totalBikes: 0,
  };

  const arrivalSlotMap = new Map<string, { label: string; count: number }>();
  const transportModeMap = new Map<string, { label: string; count: number }>();
  const reminderMap = new Map<string, { label: string; count: number }>();

  let lastResponseAt: string | null = null;

  for (const rsvp of rsvps) {
    const updated = rsvp.updatedAt ?? rsvp.createdAt;
    if (updated) {
      const iso = updated.toISOString();
      if (!lastResponseAt || iso > lastResponseAt) {
        lastResponseAt = iso;
      }
    }

    if (rsvp.attending) {
      totals.attendingYes += 1;
      totals.adults += normaliseCount(rsvp.adults);
      totals.kids += normaliseCount(rsvp.kids);
      totals.totalCars += normaliseCount(rsvp.carCount);
      totals.totalBikes += normaliseCount(rsvp.bikeCount);
    } else {
      totals.attendingNo += 1;
    }

    const guestsForRsvp = normaliseCount(rsvp.adults) + normaliseCount(rsvp.kids);
    totals.guestsCommitted += rsvp.attending ? guestsForRsvp : 0;

    if (rsvp.attending) {
      const slotValue = rsvp.arrivalSlot ?? "flexible";
      const slotLabel = slotValue === "flexible" ? "Flexible arrival" : slotValue;
      const existingSlot = arrivalSlotMap.get(slotValue) ?? {
        label: slotLabel,
        count: 0,
      };
      existingSlot.count += 1;
      arrivalSlotMap.set(slotValue, existingSlot);

      const modeValue = rsvp.transportMode ?? "self";
      const transportLabelMap: Record<string, string> = {
        parking: "Needs parking",
        carpool: "Interested in carpool",
        self: "Self-arranged",
      };
      const existingMode = transportModeMap.get(modeValue) ?? {
        label: transportLabelMap[modeValue] ?? modeValue,
        count: 0,
      };
      existingMode.count += 1;
      transportModeMap.set(modeValue, existingMode);

      const reminders = Array.isArray(rsvp.reminderPreference)
        ? (rsvp.reminderPreference as string[])
        : [];
      for (const channel of reminders) {
        const channelValue = channel || "custom";
        const channelLabelMap: Record<string, string> = {
          whatsapp: "WhatsApp",
          sms: "SMS",
          email: "Email",
          custom: "Other",
        };
        const existingReminder = reminderMap.get(channelValue) ?? {
          label: channelLabelMap[channelValue] ?? channelValue,
          count: 0,
        };
        existingReminder.count += 1;
        reminderMap.set(channelValue, existingReminder);
      }
    }
  }

  const attendanceRate =
    totals.responses > 0 ? totals.attendingYes / totals.responses : null;

  return {
    totals,
    ratios: {
      attendanceRate,
    },
    arrivalSlots: mapToSortedArray(arrivalSlotMap),
    transportModes: mapToSortedArray(transportModeMap),
    reminders: mapToSortedArray(reminderMap),
    lastResponseAt,
  };
}
