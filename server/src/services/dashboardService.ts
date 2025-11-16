import { NwEvent } from "../models/NwEvent.js";
import { NwPrediction } from "../models/NwPrediction.js";
import { listPaidEventIds } from "./paymentService.js";

const INR_PER_KG_FALLBACK = 240;

type ImpactSnapshot = {
  foodSavedKg?: number;
  moneySavedInr?: number;
  mealsSupported?: number;
};

type DashboardImpact = {
  foodSavedKg: number;
  moneySavedInr: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function coerceImpactSnapshot(snapshot: unknown): ImpactSnapshot {
  if (!snapshot || typeof snapshot !== "object") {
    return {};
  }
  const candidate = snapshot as ImpactSnapshot;
  const result: ImpactSnapshot = {};
  if (isFiniteNumber(candidate.foodSavedKg)) {
    result.foodSavedKg = candidate.foodSavedKg;
  }
  if (isFiniteNumber(candidate.moneySavedInr)) {
    result.moneySavedInr = candidate.moneySavedInr;
  }
  if (isFiniteNumber(candidate.mealsSupported)) {
    result.mealsSupported = candidate.mealsSupported;
  }
  return result;
}

function pickBestPredictionTotal(predictions: NwPrediction[]): number | null {
  const totals = predictions
    .map((prediction) => {
      const output = prediction.outputRecommendation ?? {};
      if (
        typeof output === "object" &&
        output !== null &&
        "totalKg" in output &&
        isFiniteNumber((output as Record<string, unknown>).totalKg)
      ) {
        return (output as { totalKg: number }).totalKg;
      }
      return null;
    })
    .filter((value): value is number => value !== null);

  if (!totals.length) {
    return null;
  }

  return Math.min(...totals);
}

function calculateImpactForEvent(event: NwEvent): DashboardImpact | null {
  const snapshot = coerceImpactSnapshot(event.impactSnapshot);

  if (isFiniteNumber(snapshot.foodSavedKg)) {
    const money =
      snapshot.moneySavedInr ??
      Math.round(snapshot.foodSavedKg * INR_PER_KG_FALLBACK);
    return {
      foodSavedKg: snapshot.foodSavedKg,
      moneySavedInr: Math.max(0, money),
    };
  }

  if (isFiniteNumber(event.plannedFoodKg) && event.predictions?.length) {
    const bestTotal = pickBestPredictionTotal(event.predictions);
    if (bestTotal !== null) {
      const saved = Math.max(event.plannedFoodKg - bestTotal, 0);
      const money = Math.round(saved * INR_PER_KG_FALLBACK);
      return {
        foodSavedKg: Number(saved.toFixed(1)),
        moneySavedInr: Math.max(0, money),
      };
    }
  }

  return null;
}

export async function getDashboardSummary(userId: string) {
  const events = await NwEvent.findAll({
    where: { ownerId: userId },
    include: ["predictions"],
    order: [
      ["eventDate", "ASC"],
      ["createdAt", "DESC"],
    ],
  });

  const paidEventIds = new Set(await listPaidEventIds(userId));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventsWithImpact = events.map((event) => ({
    event,
    impact: calculateImpactForEvent(event),
  }));

  const upcomingEvents = eventsWithImpact
    .filter(({ event }) => {
      if (!event.eventDate) {
        return false;
      }
      const eventDate = new Date(event.eventDate);
      return !Number.isNaN(eventDate.getTime()) && eventDate >= today;
    })
    .map(({ event, impact }) => {
      const status = typeof event.status === "string" ? event.status.trim() : "";
      const statusLabel = (() => {
        if (!status) return "Survey in progress";
        if (status.toLowerCase() === "draft") return "Survey in progress";
        if (status.toLowerCase() === "survey_in_progress") return "Survey in progress";
        if (status.toLowerCase() === "published") return "Plan locked";
        if (status.toLowerCase() === "completed") return "Event completed";
        return status
          .split(" ")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
      })();

      const expected = (event.expectedSnapshot ?? null) as
        | { adults?: number; kids?: number; staff?: number }
        | null;
      const adults = isFiniteNumber(expected?.adults) ? Number(expected?.adults) : 0;
      const kids = isFiniteNumber(expected?.kids) ? Number(expected?.kids) : 0;
      const staff = isFiniteNumber(expected?.staff) ? Number(expected?.staff) : 0;
      const expectedGuests = adults + kids + staff;

      return {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
        location: event.location,
        status,
        statusLabel,
        plannedFoodKg: isFiniteNumber(event.plannedFoodKg)
          ? Number(event.plannedFoodKg.toFixed(1))
          : null,
        expectedGuests: expectedGuests > 0 ? expectedGuests : null,
        impact: impact ?? undefined,
        reportStatus: paidEventIds.has(event.id) ? "paid" : "unpaid",
      };
    })
    .sort(
      (a, b) =>
        new Date(a.eventDate ?? 0).getTime() -
        new Date(b.eventDate ?? 0).getTime()
    );

  const totalFoodSaved = eventsWithImpact
    .map(({ impact }) => impact?.foodSavedKg ?? 0)
    .reduce((sum, value) => sum + value, 0);

  const totalMoneySaved = eventsWithImpact
    .map(({ impact }) => impact?.moneySavedInr ?? 0)
    .reduce((sum, value) => sum + value, 0);

  const foodSavedRounded = Number(totalFoodSaved.toFixed(1));
  const moneySavedRounded = Math.max(0, Math.round(totalMoneySaved));

  return {
    totals: {
      eventsCount: events.length,
      foodSavedKg: foodSavedRounded,
      moneySavedInr: moneySavedRounded,
    },
    upcomingEvents,
  };
}


