import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import inviteHero from "../assets/invite-hero.svg";
import logo from "../assets/zerowaste-logo.svg";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

interface ScheduleSnapshot {
  id?: string;
  label?: string;
  date?: string;
  categories?: string[];
  sessionsDescription?: string;
  menuNotes?: string;
  servingsPerDay?: number;
}

interface InviteEventResponse {
  id: string;
  title: string;
  eventDate?: string | null;
  surveyCutoffDate?: string | null;
  location?: string | null;
  inviteLink?: string | null;
  notes?: string | null;
  status?: string | null;
  scheduleSnapshot?: ScheduleSnapshot[] | null;
  owner?: {
    fullName?: string | null;
  } | null;
}

const RSVP_STORAGE_PREFIX = "nowasteRsvp:";

type StoredRsvp = {
  id?: string;
  attending: boolean;
  adults: number;
  kids: number;
  arrivalSlot: string | null;
  transportMode: string | null;
  reminderPreference: string[];
  carCount: number;
  bikeCount: number;
};

function formatDateLabel(value?: string | null) {
  if (!value) return "Date to be announced";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCourse(course?: string) {
  if (!course) return "Course";
  return course.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function InvitePage() {
  const { t } = useTranslation("invite");
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<InviteEventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rsvpId, setRsvpId] = useState<string | null>(null);
  const [attending, setAttending] = useState<boolean | null>(null);
  const [adultCount, setAdultCount] = useState(0);
  const [kidCount, setKidCount] = useState(0);
  const [arrivalSlot, setArrivalSlot] = useState<string>("flexible");
  const [transportMode, setTransportMode] = useState<string | null>(null);
  const [reminderPreference, setReminderPreference] = useState<string[]>([]);
  const [carCount, setCarCount] = useState(0);
  const [bikeCount, setBikeCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setError(t("errors.missingEvent"));
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(t("errors.notFound"));
          }
          throw new Error(t("errors.unavailable"));
        }
        const data: InviteEventResponse = await response.json();
        setEvent(data);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : t("errors.unavailable")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();

    return () => controller.abort();
  }, [eventId, t]);

  useEffect(() => {
    if (!eventId) return;
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(`${RSVP_STORAGE_PREFIX}${eventId}`);
    if (!stored) return;

    try {
      const parsed: StoredRsvp = JSON.parse(stored);
      setRsvpId(parsed.id ?? null);
      setAttending(parsed.attending ?? null);
      setAdultCount(parsed.adults ?? 0);
      setKidCount(parsed.kids ?? 0);
      setArrivalSlot(parsed.arrivalSlot ?? "flexible");
      setTransportMode(parsed.transportMode ?? null);
      setReminderPreference(parsed.reminderPreference ?? []);
      setCarCount(parsed.carCount ?? 0);
      setBikeCount(parsed.bikeCount ?? 0);
    } catch (err) {
      console.error("Failed to parse stored RSVP", err);
    }
  }, [eventId]);

  const schedule = useMemo(() => {
    return Array.isArray(event?.scheduleSnapshot) ? event?.scheduleSnapshot : [];
  }, [event?.scheduleSnapshot]);

  const extractArrivalTimeSlots = (items: ScheduleSnapshot[]): string[] => {
    const results = new Set<string>();
    const pushWindow = (startHour24: number, endHour24: number) => {
      // normalize to 0-24 and format 12h label
      const toLabel = (h: number) => {
        const period = h >= 12 ? "PM" : "AM";
        const hour12 = ((h + 11) % 12) + 1;
        return `${hour12}:00 ${period}`;
      };
      results.add(`${toLabel(startHour24)}–${toLabel(endHour24)}`);
    };
    const expandRange = (startHour: number, startPeriod: "AM" | "PM", endHour: number, endPeriod: "AM" | "PM") => {
      const to24 = (h: number, p: "AM" | "PM") => {
        const base = h % 12;
        return p === "PM" ? base + 12 : base;
      };
      let start = to24(startHour, startPeriod);
      let end = to24(endHour, endPeriod);
      if (end <= start) {
        // assume wraps to later in day; cap at 24
        end = Math.min(start + 6, 24); // avoid huge wrap
      }
      for (let h = start; h < end; h += 1) {
        pushWindow(h, Math.min(h + 1, 24));
      }
    };
    const simpleExpand = (from: number, to: number, period: "AM" | "PM") => {
      for (let h = from; h < to; h += 1) {
        const start24 = ((h % 12) + (period === "PM" ? 12 : 0)) % 24;
        const end24 = ((h + 1) % 12) + (period === "PM" ? 12 : 0);
        pushWindow(start24, end24);
      }
    };
    items.forEach((slot) => {
      const desc = slot.sessionsDescription || "";
      desc
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((line) => {
          // Match formats like "7-10 PM" or "6-10 AM"
          let m = line.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s*(AM|PM)$/i);
          if (m) {
            const from = parseInt(m[1]!, 10);
            const to = parseInt(m[2]!, 10);
            const period = (m[3]!.toUpperCase() as "AM" | "PM");
            if (from >= 1 && from <= 12 && to >= 1 && to <= 12) {
              simpleExpand(from, to, period);
            }
            return;
          }
          // Match formats like "7 PM-10 PM" or "11 AM-2 PM"
          m = line.match(/^(\d{1,2})\s*(AM|PM)\s*-\s*(\d{1,2})\s*(AM|PM)$/i);
          if (m) {
            const sh = parseInt(m[1]!, 10);
            const sp = (m[2]!.toUpperCase() as "AM" | "PM");
            const eh = parseInt(m[3]!, 10);
            const ep = (m[4]!.toUpperCase() as "AM" | "PM");
            if (sh >= 1 && sh <= 12 && eh >= 1 && eh <= 12) {
              expandRange(sh, sp, eh, ep);
            }
            return;
          }
        });
    });
    if (results.size === 0) {
      // Fallback to common evening windows
      ["6:00 PM–7:00 PM", "7:00 PM–8:00 PM", "8:00 PM–9:00 PM"].forEach((w) => results.add(w));
    }
    // Return sorted by start time where possible
    const parseStart = (label: string) => {
      const m = label.match(/^(\d{1,2}):00\s*(AM|PM)/i);
      if (!m) return 0;
      let h = parseInt(m[1]!, 10) % 12;
      const p = m[2]!.toUpperCase();
      if (p === "PM") h += 12;
      return h;
    };
    return Array.from(results).sort((a, b) => parseStart(a) - parseStart(b));
  };

  const arrivalOptions = useMemo(() => {
    const windows = extractArrivalTimeSlots(schedule);
    return windows.map((label) => ({ value: label, label }));
  }, [schedule]);

  useEffect(() => {
    if (arrivalOptions.length === 0) {
      setArrivalSlot("flexible");
      return;
    }
    if (
      arrivalSlot !== "flexible" &&
      !arrivalOptions.some((option) => option.value === arrivalSlot)
    ) {
      setArrivalSlot(arrivalOptions[0].value);
    }
  }, [arrivalOptions, arrivalSlot]);

  const transportOptions = useMemo(
    () => [
      { value: "parking", label: t("rsvp.transport.parking") },
    ],
    [t]
  );

  const reminderOptions = useMemo(
    () => [
      { value: "whatsapp", label: t("rsvp.reminders.whatsapp") },
      { value: "sms", label: t("rsvp.reminders.sms") },
      { value: "email", label: t("rsvp.reminders.email") },
    ],
    [t]
  );

  const clearSubmitState = () => {
    setSubmitMessage(null);
    setSubmitError(null);
  };

  const handleAttendanceToggle = () => {
    const nextValue = attending ? false : true;
    setAttending(nextValue);
    clearSubmitState();
    if (!nextValue) {
      setAdultCount(0);
      setKidCount(0);
      setArrivalSlot("flexible");
      setTransportMode(null);
      setReminderPreference([]);
      setCarCount(0);
      setBikeCount(0);
    }
  };

  const adjustAdultCount = (delta: number) => {
    setAdultCount((prev) => Math.max(0, prev + delta));
    clearSubmitState();
  };

  const adjustKidCount = (delta: number) => {
    setKidCount((prev) => Math.max(0, prev + delta));
    clearSubmitState();
  };

  const adjustCarCount = (delta: number) => {
    setCarCount((prev) => Math.max(0, prev + delta));
    clearSubmitState();
  };

  const adjustBikeCount = (delta: number) => {
    setBikeCount((prev) => Math.max(0, prev + delta));
    clearSubmitState();
  };

  const handleTransportSelect = (value: string) => {
    setTransportMode((prev) => (prev === value ? null : value));
    clearSubmitState();
  };

  const toggleReminder = (value: string) => {
    setReminderPreference((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
    clearSubmitState();
  };

  const selectArrivalSlot = (value: string) => {
    setArrivalSlot(value);
    clearSubmitState();
  };

  // Check if survey is closed (cutoff date passed or status is survey_completed)
  const isSurveyClosed = useMemo(() => {
    if (!event) return false;
    
    // Check status first
    if (event.status === "survey_completed") {
      return true;
    }
    
    // Check cutoff date
    if (event.surveyCutoffDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cutoffDate = new Date(event.surveyCutoffDate);
      cutoffDate.setHours(0, 0, 0, 0);
      return today > cutoffDate;
    }
    
    return false;
  }, [event]);

  const canSubmit = !isSurveyClosed && attending !== null && (!attending || adultCount + kidCount > 0);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventId || attending === null) {
      return;
    }

    // Check if survey is closed
    if (isSurveyClosed) {
      setSubmitError("The survey has closed. RSVPs are no longer being accepted.");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);
    setSubmitError(null);

    const payload = {
      rsvpId,
      attending,
      adults: adultCount,
      kids: kidCount,
      arrivalSlot:
        attending && arrivalSlot !== "flexible" ? arrivalSlot : null,
      transportMode: attending ? transportMode : null,
      reminderPreference:
        attending && reminderPreference.length > 0 ? reminderPreference : null,
      carCount: attending ? carCount : 0,
      bikeCount: attending ? bikeCount : 0,
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/events/${eventId}/invite-rsvp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();
      setRsvpId(data.id ?? null);
      setSubmitMessage(t("rsvp.success"));
      const stored: StoredRsvp = {
        id: data.id ?? undefined,
        attending,
        adults: attending ? adultCount : 0,
        kids: attending ? kidCount : 0,
        arrivalSlot: attending ? (payload.arrivalSlot ?? "flexible") : "flexible",
        transportMode: attending ? payload.transportMode ?? null : null,
        reminderPreference: attending ? reminderPreference : [],
        carCount: attending ? carCount : 0,
        bikeCount: attending ? bikeCount : 0,
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `${RSVP_STORAGE_PREFIX}${eventId}`,
          JSON.stringify(stored)
        );
      }
    } catch (err) {
      console.error("Failed to submit RSVP", err);
      setSubmitError(t("rsvp.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const attendanceStatusLabel =
    attending === null
      ? t("rsvp.attendanceHint")
      : attending
      ? t("rsvp.attendingYes")
      : t("rsvp.attendingNo");

  const attendanceStatusClass =
    attending === null
      ? "text-slate-500"
      : attending
      ? "text-emerald-600"
      : "text-red-500";

  const eventTitle = event?.title ?? t("defaults.title");
  const eventDateLabel = formatDateLabel(event?.eventDate);
  const eventLocation = event?.location ?? t("defaults.location");

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <section className="rounded-3xl border border-orange-100 bg-white p-8 text-center text-sm text-slate-600 shadow-sm shadow-orange-100/80">
            {t("loading")}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
        <header className="relative overflow-hidden rounded-[2.5rem] border border-orange-100 bg-gradient-to-br from-white via-orange-50 to-amber-100/60 p-8 shadow-lg shadow-orange-100">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-14 -right-20 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
          </div>
          <div className="relative grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Link to="/" className="inline-flex items-center gap-2">
                  <img src={logo} alt="Zerowaste logo" className="h-8 w-8" />
                  <span className="text-3xl font-bold">
                    <span className="text-brand-600">Zero</span>
                    <span className="text-slate-900">waste</span>
                  </span>
                </Link>
              </div>
            </div>
            <div className="space-y-5 text-center md:text-left">
              <div className="inline-flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-amber-500 px-5 py-2 text-[12px] font-bold uppercase tracking-[0.25em] text-white shadow ring-1 ring-white/40">
                  <span aria-hidden>🎉</span>
                  {t("hero.badge")}
                </span>
              </div>
              <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
                {eventTitle}
              </h1>
              <p className="text-base font-medium text-slate-700 sm:text-lg">
                {eventDateLabel} • {eventLocation}
              </p>
              {event?.owner?.fullName && (
                <p className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600 shadow-sm">
                  {t("hero.hostedBy", { name: event.owner.fullName })}
                </p>
              )}
              {/* Invitation message shown above; preferences appear next */}
            </div>
            <div className="relative mx-auto w-full max-w-xs md:max-w-sm">
              <div className="absolute inset-x-6 bottom-6 h-24 rounded-full bg-brand-500/10 blur-2xl" />
              <img
                src={inviteHero}
                alt={t("hero.illustrationAlt")}
                className="relative z-10 w-full rounded-3xl border border-white/40 bg-white/80 p-4 shadow-xl shadow-orange-200/50"
              />
            </div>
          </div>
        </header>
        <hr className="mx-auto my-2 h-px w-24 rounded-full border-0 bg-orange-200" />
        {error && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 shadow-sm">
            {error}
          </section>
        )}

        {!error && event && isSurveyClosed && (
          <section className="rounded-3xl border border-orange-200 bg-orange-50 p-6 text-center shadow-sm">
            <div className="space-y-2">
              <p className="text-base font-semibold text-orange-900">
                Survey Closed
              </p>
              <p className="text-sm text-orange-700">
                The RSVP survey for this event has closed. We're no longer accepting responses.
              </p>
              {event.surveyCutoffDate && (
                <p className="text-xs text-orange-600">
                  Survey closed on {formatDateLabel(event.surveyCutoffDate)}
                </p>
              )}
            </div>
          </section>
        )}

        {!error && event && !isSurveyClosed && (
          <>
            <section
              id="rsvp-card"
              className="space-y-5 rounded-3xl border border-brand-100 bg-white p-6 shadow-sm shadow-brand-100/60"
            >
              <header className="space-y-1">
                <h2 className="text-base font-semibold text-slate-900">
                  {t("rsvp.title")}
                </h2>
                <p className="text-xs text-slate-500">{t("rsvp.editNotice")}</p>
              </header>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-3 rounded-2xl bg-orange-50/60 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-800">{t("rsvp.question")}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setAttending(true); clearSubmitState(); }}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        attending === true
                          ? "bg-emerald-500 text-white shadow"
                          : "border border-brand-200 bg-white text-brand-600 hover:bg-brand-100"
                      }`}
                    >
                      {t("rsvp.attendingYes")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAttending(false); clearSubmitState(); }}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        attending === false
                          ? "bg-slate-800 text-white shadow"
                          : "border border-brand-200 bg-white text-brand-600 hover:bg-brand-100"
                      }`}
                    >
                      {t("rsvp.attendingNo")}
                    </button>
                  </div>
                  <p className={`text-xs font-semibold ${attendanceStatusClass}`}>{attendanceStatusLabel}</p>
                </div>

                {attending && (
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-slate-800">
                        {t("rsvp.guestCounts.title")}
                      </p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                          <span className="text-sm font-medium text-slate-700">
                            {t("rsvp.guestCounts.adults")}
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => adjustAdultCount(-1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 text-brand-600 transition hover:bg-brand-100"
                              aria-label={t("rsvp.guestCounts.adults") + " -"}
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-semibold text-slate-900">
                              {adultCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustAdultCount(1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 text-brand-600 transition hover:bg-brand-100"
                              aria-label={t("rsvp.guestCounts.adults") + " +"}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                          <span className="text-sm font-medium text-slate-700">
                            {t("rsvp.guestCounts.kids")}
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => adjustKidCount(-1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 text-brand-600 shadow-sm transition hover:bg-brand-100"
                              aria-label={t("rsvp.guestCounts.kids") + " -"}
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-semibold text-slate-900">
                              {kidCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustKidCount(1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 text-brand-600 shadow-sm transition hover:bg-brand-100"
                              aria-label={t("rsvp.guestCounts.kids") + " +"}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="font-medium text-slate-800">
                        {t("rsvp.arrivalSlot.title")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {arrivalOptions.length > 0 ? (
                          arrivalOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => selectArrivalSlot(option.value)}
                              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                                arrivalSlot === option.value
                                  ? "border-emerald-500 bg-emerald-500 text-white shadow"
                                  : "border-brand-200 bg-white text-brand-600 hover:bg-brand-100"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">
                            {t("rsvp.arrivalSlot.noOptions")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="font-medium text-slate-800">
                        {t("rsvp.transport.title")}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* Car Option */}
                        <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                              <svg className="h-6 w-6 text-brand-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-slate-700">Car</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => adjustCarCount(-1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 text-brand-600 transition hover:bg-brand-100"
                              aria-label="Car count -"
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-semibold text-slate-900">
                              {carCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustCarCount(1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 text-brand-600 transition hover:bg-brand-100"
                              aria-label="Car count +"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Bike Option */}
                        <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                              <svg className="h-6 w-6 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm5.5-1.5c-.83 0-1.5-.67-1.5-1.5S9.67 5.5 10.5 5.5 12 6.17 12 7s-.67 1.5-1.5 1.5zm4.5 6.5c-1.5 0-4.5.83-4.5 2.5V19h9v-1.5c0-1.67-3-2.5-4.5-2.5z"/>
                                <circle cx="6.5" cy="11.5" r="1.5"/>
                                <circle cx="17.5" cy="11.5" r="1.5"/>
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-slate-700">Bike</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => adjustBikeCount(-1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 text-brand-600 transition hover:bg-brand-100"
                              aria-label="Bike count -"
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-semibold text-slate-900">
                              {bikeCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustBikeCount(1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 text-brand-600 transition hover:bg-brand-100"
                              aria-label="Bike count +"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="font-medium text-slate-800">
                        {t("rsvp.reminders.title")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {reminderOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleReminder(option.value)}
                            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                              reminderPreference.includes(option.value)
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-brand-200 bg-white text-brand-600 hover:bg-brand-100"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="submit"
                    className="w-full rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? t("rsvp.updating") : t("rsvp.submit")}
                  </button>
                  {submitMessage && (
                    <p className="rounded-full bg-emerald-500/10 px-4 py-2 text-center text-xs font-semibold text-emerald-700">
                      {submitMessage}
                    </p>
                  )}
                  {submitError && (
                    <p className="rounded-full bg-red-100 px-4 py-2 text-center text-xs font-semibold text-red-600">
                      {submitError}
                    </p>
                  )}
                  <p className="text-center text-[11px] text-slate-500">
                    {t("rsvp.totalsHint")}
                  </p>
                </div>
              </form>
            </section>

            <section className="space-y-4 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm shadow-orange-100/60">
              <header>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                  {t("schedule.title")}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {t("schedule.subtitle")}
                </p>
              </header>
              <ul className="space-y-3">
                {schedule.length > 0 ? (
                  schedule.map((slot, index) => (
                    <li
                      key={slot.id ?? `${slot.label}-${index}`}
                      className="rounded-2xl border border-orange-100 bg-orange-50 p-4"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {slot.label ?? t("schedule.itemLabel", { index: index + 1 })} • {formatDateLabel(slot.date)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        {t("schedule.details", {
                          servings: slot.servingsPerDay ?? 0,
                          categories:
                            Array.isArray(slot.categories) && slot.categories.length
                              ? slot.categories.join(", ")
                              : t("schedule.categoriesFallback"),
                        })}
                      </p>
                      {slot.sessionsDescription && (
                        <p className="mt-2 text-xs text-slate-600">
                          {slot.sessionsDescription}
                        </p>
                      )}
                      {slot.menuNotes && (
                        <p className="mt-2 text-xs text-slate-600">
                          {t("schedule.menuNotes", { notes: slot.menuNotes })}
                        </p>
                      )}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-4 text-xs text-slate-500">
                    {t("schedule.empty")}
                  </li>
                )}
              </ul>
            </section>

            {event.notes && (
              <section className="rounded-3xl border border-orange-100 bg-white p-6 text-sm text-slate-700 shadow-sm shadow-orange-100/60">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                  {t("notes.title")}
                </h2>
                <p className="mt-2 whitespace-pre-line">{event.notes}</p>
              </section>
            )}

            <section className="rounded-3xl border border-brand-100 bg-brand-50 p-6 text-center text-sm text-brand-700 shadow-sm shadow-brand-100/60">
              <p className="font-semibold text-brand-800">
                {t("cta.title")}
              </p>
              <p className="mt-2">
                {t("cta.subtitle")}
              </p>
              <p className="mt-4 text-xs uppercase tracking-wide text-brand-600">
                {t("cta.poweredBy")}
              </p>
              <Link
                to="/"
                className="mt-3 inline-flex rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600 hover:bg-brand-50"
              >
                {t("cta.link")}
              </Link>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default InvitePage;
