import { NwEvent } from "../models/NwEvent.js";
import { NwInviteRsvp } from "../models/NwInviteRsvp.js";

export interface ScheduleResponse {
  attending: boolean;
  adults?: number;
  kids?: number;
  arrivalSlot?: string | null;
  transportMode?: string | null;
  reminderPreference?: string[] | null;
  carCount?: number;
  bikeCount?: number;
}

export interface InviteRsvpInput {
  rsvpId?: string;
  attending: boolean; // Legacy: overall attendance
  adults?: number; // Legacy: overall adults
  kids?: number; // Legacy: overall kids
  arrivalSlot?: string | null; // Legacy: overall arrival slot
  transportMode?: string | null; // Legacy: overall transport mode
  reminderPreference?: string[] | null; // Legacy: overall reminder preference
  notes?: string | null;
  carCount?: number; // Legacy: overall car count
  bikeCount?: number; // Legacy: overall bike count
  scheduleIds?: string[] | null; // Legacy: list of schedule IDs
  scheduleResponses?: Record<string, ScheduleResponse> | null; // New: schedule-specific responses
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
  scheduleBreakdown?: Record<string, {
    adults: number;
    kids: number;
    guestsCommitted: number;
    totalCars: number;
    totalBikes: number;
    responses: number;
    arrivalSlots?: Array<{ value: string; label: string; count: number }>;
  }>;
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

  // Normalize schedule-specific responses
  let scheduleResponses: Record<string, ScheduleResponse> | null = null;
  if (input.scheduleResponses && typeof input.scheduleResponses === "object") {
    const normalized: Record<string, ScheduleResponse> = {};
    for (const [scheduleId, response] of Object.entries(input.scheduleResponses)) {
      if (response && typeof response === "object") {
        normalized[scheduleId] = {
          attending: Boolean(response.attending),
          adults: normaliseCount(response.adults),
          kids: normaliseCount(response.kids),
          arrivalSlot: normaliseString(response.arrivalSlot),
          transportMode: normaliseString(response.transportMode),
          reminderPreference: normaliseStringArray(response.reminderPreference),
          carCount: normaliseCount(response.carCount),
          bikeCount: normaliseCount(response.bikeCount),
        };
        // If not attending, clear the response fields
        if (!normalized[scheduleId].attending) {
          normalized[scheduleId].adults = 0;
          normalized[scheduleId].kids = 0;
          normalized[scheduleId].arrivalSlot = null;
          normalized[scheduleId].transportMode = null;
          normalized[scheduleId].reminderPreference = null;
          normalized[scheduleId].carCount = 0;
          normalized[scheduleId].bikeCount = 0;
        }
      }
    }
    scheduleResponses = Object.keys(normalized).length > 0 ? normalized : null;
  }

  // If scheduleResponses provided, compute overall attending from schedule responses
  let overallAttending = Boolean(input.attending);
  if (scheduleResponses) {
    overallAttending = Object.values(scheduleResponses).some((resp) => resp.attending);
  }

  const payload: any = {
    attending: overallAttending,
    adults: normaliseCount(input.adults),
    kids: normaliseCount(input.kids),
    arrivalSlot: normaliseString(input.arrivalSlot),
    transportMode: normaliseString(input.transportMode),
    reminderPreference: normaliseStringArray(input.reminderPreference),
    notes: normaliseString(input.notes),
    carCount: normaliseCount(input.carCount),
    bikeCount: normaliseCount(input.bikeCount),
    scheduleIds: normaliseStringArray(input.scheduleIds),
    scheduleResponses,
  };

  if (!payload.attending && !scheduleResponses) {
    payload.adults = 0;
    payload.kids = 0;
    payload.arrivalSlot = null;
    payload.transportMode = null;
    payload.reminderPreference = null;
    payload.notes = payload.notes ?? null;
    payload.carCount = 0;
    payload.bikeCount = 0;
    payload.scheduleIds = null;
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
  const scheduleBreakdown: Record<string, {
    adults: number;
    kids: number;
    guestsCommitted: number;
    totalCars: number;
    totalBikes: number;
    responses: number;
    arrivalSlots?: Map<string, { label: string; count: number }>;
  }> = {};

  let lastResponseAt: string | null = null;

  for (const rsvp of rsvps) {
    const updated = rsvp.updatedAt ?? rsvp.createdAt;
    if (updated) {
      const iso = updated.toISOString();
      if (!lastResponseAt || iso > lastResponseAt) {
        lastResponseAt = iso;
      }
    }

    // Check if this RSVP has schedule-specific responses
    const hasScheduleResponses = rsvp.scheduleResponses && 
      typeof rsvp.scheduleResponses === "object" && 
      Object.keys(rsvp.scheduleResponses).length > 0;

    // Aggregate overall totals (for backward compatibility and overall stats)
    if (hasScheduleResponses) {
      // Aggregate from schedule responses
      const scheduleResponses = rsvp.scheduleResponses as Record<string, ScheduleResponse>;
      let hasAnyAttending = false;
      for (const scheduleResp of Object.values(scheduleResponses)) {
        if (scheduleResp.attending) {
          hasAnyAttending = true;
          totals.adults += normaliseCount(scheduleResp.adults);
          totals.kids += normaliseCount(scheduleResp.kids);
          totals.totalCars += normaliseCount(scheduleResp.carCount);
          totals.totalBikes += normaliseCount(scheduleResp.bikeCount);
          totals.guestsCommitted += normaliseCount(scheduleResp.adults) + normaliseCount(scheduleResp.kids);
        }
      }
      if (hasAnyAttending) {
        totals.attendingYes += 1;
      } else {
        totals.attendingNo += 1;
      }
    } else {
      // Legacy: use overall RSVP data
      if (rsvp.attending) {
        totals.attendingYes += 1;
        totals.adults += normaliseCount(rsvp.adults);
        totals.kids += normaliseCount(rsvp.kids);
        totals.totalCars += normaliseCount(rsvp.carCount);
        totals.totalBikes += normaliseCount(rsvp.bikeCount);
        totals.guestsCommitted += normaliseCount(rsvp.adults) + normaliseCount(rsvp.kids);
      } else {
        totals.attendingNo += 1;
      }
    }

    // Calculate schedule-wise breakdown

    if (hasScheduleResponses) {
      // Use schedule-specific responses
      const scheduleResponses = rsvp.scheduleResponses as Record<string, ScheduleResponse>;
      
      for (const [scheduleId, scheduleResp] of Object.entries(scheduleResponses)) {
        if (!scheduleBreakdown[scheduleId]) {
          scheduleBreakdown[scheduleId] = {
            adults: 0,
            kids: 0,
            guestsCommitted: 0,
            totalCars: 0,
            totalBikes: 0,
            responses: 0,
            arrivalSlots: new Map(),
          };
        }

        if (scheduleResp.attending) {
          const scheduleAdults = normaliseCount(scheduleResp.adults);
          const scheduleKids = normaliseCount(scheduleResp.kids);
          const scheduleCars = normaliseCount(scheduleResp.carCount);
          const scheduleBikes = normaliseCount(scheduleResp.bikeCount);
          
          scheduleBreakdown[scheduleId].adults += scheduleAdults;
          scheduleBreakdown[scheduleId].kids += scheduleKids;
          scheduleBreakdown[scheduleId].guestsCommitted += scheduleAdults + scheduleKids;
          scheduleBreakdown[scheduleId].totalCars += scheduleCars;
          scheduleBreakdown[scheduleId].totalBikes += scheduleBikes;
          scheduleBreakdown[scheduleId].responses += 1;

          // Aggregate arrival slots, transport modes, and reminders from schedule response
          if (scheduleResp.arrivalSlot) {
            const slotValue = scheduleResp.arrivalSlot;
            const slotLabel = slotValue === "flexible" ? "Flexible arrival" : slotValue;
            
            // Add to global map (for backward compatibility)
            const existingSlot = arrivalSlotMap.get(slotValue) ?? {
              label: slotLabel,
              count: 0,
            };
            existingSlot.count += 1;
            arrivalSlotMap.set(slotValue, existingSlot);
            
            // Add to schedule-specific map
            if (!scheduleBreakdown[scheduleId].arrivalSlots) {
              scheduleBreakdown[scheduleId].arrivalSlots = new Map();
            }
            const scheduleSlot = scheduleBreakdown[scheduleId].arrivalSlots!.get(slotValue) ?? {
              label: slotLabel,
              count: 0,
            };
            scheduleSlot.count += 1;
            scheduleBreakdown[scheduleId].arrivalSlots!.set(slotValue, scheduleSlot);
          }

          if (scheduleResp.transportMode) {
            const modeValue = scheduleResp.transportMode;
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
          }

          if (Array.isArray(scheduleResp.reminderPreference)) {
            for (const channel of scheduleResp.reminderPreference) {
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
      }
    } else {
      // Legacy: use overall RSVP data for schedule breakdown
      if (rsvp.attending) {
        const scheduleIds = Array.isArray(rsvp.scheduleIds) ? rsvp.scheduleIds : [];
        const rsvpAdults = normaliseCount(rsvp.adults);
        const rsvpKids = normaliseCount(rsvp.kids);
        const rsvpCars = normaliseCount(rsvp.carCount);
        const rsvpBikes = normaliseCount(rsvp.bikeCount);
        
        if (scheduleIds.length > 0) {
          // Distribute guests across selected schedules
          for (const scheduleId of scheduleIds) {
            if (!scheduleBreakdown[scheduleId]) {
              scheduleBreakdown[scheduleId] = {
                adults: 0,
                kids: 0,
                guestsCommitted: 0,
                totalCars: 0,
                totalBikes: 0,
                responses: 0,
              };
            }
            scheduleBreakdown[scheduleId].adults += rsvpAdults;
            scheduleBreakdown[scheduleId].kids += rsvpKids;
            scheduleBreakdown[scheduleId].guestsCommitted += rsvpAdults + rsvpKids;
            scheduleBreakdown[scheduleId].totalCars += rsvpCars;
            scheduleBreakdown[scheduleId].totalBikes += rsvpBikes;
            scheduleBreakdown[scheduleId].responses += 1;
          }
        }

        // Aggregate arrival slots, transport modes, and reminders from overall RSVP
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
  }

  const attendanceRate =
    totals.responses > 0 ? totals.attendingYes / totals.responses : null;

  const summary: InviteRsvpSummary = {
    totals,
    ratios: {
      attendanceRate,
    },
    arrivalSlots: mapToSortedArray(arrivalSlotMap),
    transportModes: mapToSortedArray(transportModeMap),
    reminders: mapToSortedArray(reminderMap),
    lastResponseAt,
  };

  // Only include schedule breakdown if there are schedules with RSVPs
  if (Object.keys(scheduleBreakdown).length > 0) {
    // Convert Maps to arrays for JSON serialization
    const convertedBreakdown: Record<string, {
      adults: number;
      kids: number;
      guestsCommitted: number;
      totalCars: number;
      totalBikes: number;
      responses: number;
      arrivalSlots?: Array<{ value: string; label: string; count: number }>;
    }> = {};
    
    for (const [scheduleId, breakdown] of Object.entries(scheduleBreakdown)) {
      convertedBreakdown[scheduleId] = {
        adults: breakdown.adults,
        kids: breakdown.kids,
        guestsCommitted: breakdown.guestsCommitted,
        totalCars: breakdown.totalCars,
        totalBikes: breakdown.totalBikes,
        responses: breakdown.responses,
      };
      
      // Convert arrival slots Map to array
      if (breakdown.arrivalSlots && breakdown.arrivalSlots.size > 0) {
        convertedBreakdown[scheduleId].arrivalSlots = mapToSortedArray(breakdown.arrivalSlots);
      }
    }
    
    summary.scheduleBreakdown = convertedBreakdown;
  }

  return summary;
}
