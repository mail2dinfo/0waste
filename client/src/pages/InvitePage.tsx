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

type ScheduleResponse = {
  attending: boolean;
  adults: number;
  kids: number;
  arrivalSlot: string | null;
  transportMode: string | null;
  reminderPreference: string[];
  carCount: number;
  bikeCount: number;
  busCount?: number;
};

type StoredRsvp = {
  id?: string;
  attending: boolean; // Legacy: overall attendance
  adults: number; // Legacy: overall adults
  kids: number; // Legacy: overall kids
  arrivalSlot: string | null; // Legacy: overall arrival slot
  transportMode: string | null; // Legacy: overall transport mode
  reminderPreference: string[]; // Legacy: overall reminder preference
  carCount: number; // Legacy: overall car count
  bikeCount: number; // Legacy: overall bike count
  scheduleIds?: string[] | null; // Legacy: list of schedule IDs
  scheduleResponses?: Record<string, ScheduleResponse> | null; // New: schedule-specific responses
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
  // Legacy state for backward compatibility
  const [attending, setAttending] = useState<boolean | null>(null);
  const [adultCount, setAdultCount] = useState(0);
  const [kidCount, setKidCount] = useState(0);
  const [arrivalSlot, setArrivalSlot] = useState<string>("flexible");
  const [transportMode, setTransportMode] = useState<string | null>(null);
  const [reminderPreference, setReminderPreference] = useState<string[]>([]);
  const [carCount, setCarCount] = useState(0);
  const [bikeCount, setBikeCount] = useState(0);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  // New: schedule-specific responses
  const [scheduleResponses, setScheduleResponses] = useState<Record<string, ScheduleResponse>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
      setSelectedScheduleIds(parsed.scheduleIds ?? []);
      setScheduleResponses(parsed.scheduleResponses ?? {});
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
        // Handle 12 AM (midnight) = 0, 12 PM (noon) = 12
        if (h === 12) {
          return p === "AM" ? 0 : 12;
        }
        // For other hours: AM stays as-is (except 12), PM adds 12
        const base = h % 12;
        return p === "PM" ? base + 12 : base;
      };
      let start = to24(startHour, startPeriod);
      let end = to24(endHour, endPeriod);
      
      // Handle special case: if end is 12 AM (midnight), it means next day (24)
      if (endHour === 12 && endPeriod === "AM") {
        end = 24;
      }
      // Handle case where end time is before start (wraps around)
      if (end <= start && end !== 24) {
        // This shouldn't happen with predefined windows, but handle it
        if (end === 0) {
          end = 24; // 12 AM means end of day
        } else {
          end = 24; // Wrap to end of day
        }
      }
      
      // Generate hourly slots from start to end
      for (let h = start; h < end; h += 1) {
        const endHour = Math.min(h + 1, end === 24 ? 24 : end);
        if (endHour <= 24) {
          pushWindow(h, endHour);
        }
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
      const trimmed = desc.trim();
      
      if (!trimmed) {
        return;
      }
      
      // First, try to match new format: "5 AM to 12 PM", "12 PM to 6 PM", "6 PM to 12 PM"
      let m = trimmed.match(/^(\d{1,2})\s*(AM|PM)\s+to\s+(\d{1,2})\s*(AM|PM)$/i);
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
      
      // Legacy format support: split by newline and process each line
      desc
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((line) => {
          // Match new format: "5 AM to 12 PM", "12 PM to 6 PM", "6 PM to 12 PM"
          m = line.match(/^(\d{1,2})\s*(AM|PM)\s+to\s+(\d{1,2})\s*(AM|PM)$/i);
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
          
          // Match legacy formats like "7-10 PM" or "6-10 AM"
          m = line.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s*(AM|PM)$/i);
          if (m) {
            const from = parseInt(m[1]!, 10);
            const to = parseInt(m[2]!, 10);
            const period = (m[3]!.toUpperCase() as "AM" | "PM");
            if (from >= 1 && from <= 12 && to >= 1 && to <= 12) {
              simpleExpand(from, to, period);
            }
            return;
          }
          // Match legacy formats like "7 PM-10 PM" or "11 AM-2 PM"
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
      setSelectedScheduleIds([]);
    } else if (schedule.length === 1) {
      // Auto-select the only schedule
      const scheduleId = schedule[0]?.id ?? "schedule-0";
      setSelectedScheduleIds([scheduleId]);
    }
  };

  const toggleScheduleSelection = (scheduleId: string) => {
    setSelectedScheduleIds((prev) => {
      if (prev.includes(scheduleId)) {
        return prev.filter((id) => id !== scheduleId);
      } else {
        return [...prev, scheduleId];
      }
    });
    clearSubmitState();
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

  // Helper functions for schedule-specific responses
  const getScheduleResponse = (scheduleId: string): ScheduleResponse => {
    return scheduleResponses[scheduleId] ?? {
      attending: false,
      adults: 0,
      kids: 0,
      arrivalSlot: "flexible",
      transportMode: null,
      reminderPreference: [],
      carCount: 0,
      bikeCount: 0,
      busCount: 0,
    };
  };

  const updateScheduleResponse = (scheduleId: string, updates: Partial<ScheduleResponse>) => {
    setScheduleResponses((prev) => ({
      ...prev,
      [scheduleId]: {
        ...getScheduleResponse(scheduleId),
        ...updates,
      },
    }));
    clearSubmitState();
  };

  const toggleScheduleAttendance = (scheduleId: string, value: boolean) => {
    updateScheduleResponse(scheduleId, {
      attending: value,
      adults: value ? getScheduleResponse(scheduleId).adults : 0,
      kids: value ? getScheduleResponse(scheduleId).kids : 0,
      arrivalSlot: value ? getScheduleResponse(scheduleId).arrivalSlot : "flexible",
      transportMode: value ? getScheduleResponse(scheduleId).transportMode : null,
      reminderPreference: value ? getScheduleResponse(scheduleId).reminderPreference : [],
      carCount: value ? getScheduleResponse(scheduleId).carCount : 0,
      bikeCount: value ? getScheduleResponse(scheduleId).bikeCount : 0,
    });
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

  // Validate: at least one schedule should have attending = true with guests > 0
  const canSubmit = !isSurveyClosed && schedule.length > 0 && 
    Object.values(scheduleResponses).some((resp) => 
      resp.attending && (resp.adults > 0 || resp.kids > 0)
    );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventId) {
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

    // Build schedule-specific responses if schedules exist
    let scheduleResponsesPayload: Record<string, ScheduleResponse> | null = null;
    if (schedule.length > 0) {
      scheduleResponsesPayload = {};
      for (const scheduleItem of schedule) {
        const scheduleId = scheduleItem.id ?? `schedule-${schedule.indexOf(scheduleItem)}`;
        const response = getScheduleResponse(scheduleId);
        // Only include if attending
        if (response.attending) {
          scheduleResponsesPayload[scheduleId] = {
            attending: true,
            adults: response.adults,
            kids: response.kids,
            arrivalSlot: response.arrivalSlot && response.arrivalSlot !== "flexible" ? response.arrivalSlot : null,
            transportMode: response.transportMode,
            reminderPreference: response.reminderPreference && response.reminderPreference.length > 0 ? response.reminderPreference : null,
            carCount: response.carCount,
            bikeCount: response.bikeCount,
          };
        }
      }
      // Only include if there are any attending responses
      if (Object.keys(scheduleResponsesPayload).length === 0) {
        scheduleResponsesPayload = null;
      }
    }

    // Calculate overall attending status from schedule responses
    const overallAttending = scheduleResponsesPayload 
      ? Object.values(scheduleResponsesPayload).some((resp) => resp.attending)
      : attending;

    const payload: any = {
      rsvpId,
      attending: overallAttending,
      adults: adultCount,
      kids: kidCount,
      arrivalSlot: attending && arrivalSlot !== "flexible" ? arrivalSlot : null,
      transportMode: attending ? transportMode : null,
      reminderPreference: attending && reminderPreference.length > 0 ? reminderPreference : null,
      carCount: attending ? carCount : 0,
      bikeCount: attending ? bikeCount : 0,
      scheduleIds: attending && schedule.length > 0 
        ? (schedule.length === 1 
          ? [schedule[0]?.id ?? "schedule-0"]
          : selectedScheduleIds.length > 0 
            ? selectedScheduleIds 
            : null)
        : null,
      scheduleResponses: scheduleResponsesPayload,
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
      setShowSuccessModal(true);
      const stored: StoredRsvp = {
        id: data.id ?? undefined,
        attending: overallAttending,
        adults: attending ? adultCount : 0,
        kids: attending ? kidCount : 0,
        arrivalSlot: attending ? (payload.arrivalSlot ?? "flexible") : "flexible",
        transportMode: attending ? payload.transportMode ?? null : null,
        reminderPreference: attending ? reminderPreference : [],
        carCount: attending ? carCount : 0,
        bikeCount: attending ? bikeCount : 0,
        scheduleIds: attending ? selectedScheduleIds : null,
        scheduleResponses: scheduleResponsesPayload,
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        {/* Zerovaste Branding at Top */}
        <div className="mb-4 flex items-center justify-center">
          <Link to="https://zerovaste.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logo} alt="Zerovaste logo" className="h-10 w-10" />
            <span className="text-2xl font-bold">
              <span className="text-brand-600">Zero</span>
              <span className="text-slate-900">vaste</span>
            </span>
            <span className="text-xs text-slate-500">.com</span>
          </Link>
        </div>

        {/* Compact Header */}
        <header className="mb-4 rounded-2xl border border-orange-100 bg-white/80 backdrop-blur-sm p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                <span aria-hidden>🎉</span>
                {t("hero.badge")}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl truncate">
                {eventTitle}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {eventDateLabel} • {eventLocation}
              </p>
              {event?.owner?.fullName && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                  {t("hero.hostedBy", { name: event.owner.fullName })}
                </p>
              )}
            </div>
          </div>
        </header>
        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs text-red-600 shadow-sm">
            {error}
          </section>
        )}

        {!error && event && isSurveyClosed && (
          <section className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-center shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-orange-900">
                Survey Closed
              </p>
              <p className="text-xs text-orange-700">
                The RSVP survey for this event has closed. We're no longer accepting responses.
              </p>
              {event.surveyCutoffDate && (
                <p className="text-[10px] text-orange-600">
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
              className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm shadow-brand-100/60"
            >
              <header className="mb-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  {t("rsvp.title")}
                </h2>
              </header>
              <form className="space-y-4" onSubmit={handleSubmit}>
                {schedule.length > 0 ? (
                  // Schedule-specific forms
                  <div className="space-y-4">
                    {schedule.map((scheduleItem, scheduleIndex) => {
                      const scheduleId = scheduleItem.id ?? `schedule-${scheduleIndex}`;
                      const scheduleResp = getScheduleResponse(scheduleId);
                      const scheduleArrivalSlots = extractArrivalTimeSlots([scheduleItem]);
                      const scheduleArrivalOptions = scheduleArrivalSlots.length > 0
                        ? scheduleArrivalSlots.map((label) => ({ value: label, label }))
                        : [{ value: "flexible", label: "Flexible" }];
                      
                      return (
                        <div
                          key={scheduleId}
                          className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm"
                        >
                          {/* Schedule Header */}
                          <div className="mb-4">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {scheduleItem.label ?? `Schedule ${scheduleIndex + 1}`}
                            </h3>
                            <p className="text-xs text-slate-600 mt-1">
                              {scheduleItem.date ? formatDateLabel(scheduleItem.date) : "Date TBD"}
                              {scheduleItem.sessionsDescription && ` • ${scheduleItem.sessionsDescription.split("\n")[0]}`}
                            </p>
                          </div>

                          {/* Will you be joining this schedule? */}
                          <div className="space-y-3 rounded-2xl bg-orange-50/60 p-4 text-sm text-slate-700 mb-3">
                            <p className="font-medium text-slate-800">
                              Will you be joining <span className="font-semibold text-brand-600">{scheduleItem.label ?? `Schedule ${scheduleIndex + 1}`}</span>?
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleScheduleAttendance(scheduleId, true)}
                                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                  scheduleResp.attending
                                    ? "bg-emerald-500 text-white shadow"
                                    : "border border-brand-200 bg-white text-brand-600 hover:bg-brand-100"
                                }`}
                              >
                                {t("rsvp.attendingYes")}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleScheduleAttendance(scheduleId, false)}
                                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                  !scheduleResp.attending && scheduleResp.adults === 0 && scheduleResp.kids === 0
                                    ? "bg-slate-800 text-white shadow"
                                    : "border border-brand-200 bg-white text-brand-600 hover:bg-brand-100"
                                }`}
                              >
                                {t("rsvp.attendingNo")}
                              </button>
                            </div>
                          </div>

                          {/* Schedule-specific questions - only show if attending */}
                          {scheduleResp.attending && (
                            <div className="space-y-3">
                              {/* How many of you are coming? */}
                              <div>
                                <p className="mb-2 text-xs font-semibold text-slate-800">
                                  {t("rsvp.guestCounts.title")}
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-white p-2.5">
                                    <span className="text-xs font-medium text-slate-700">
                                      {t("rsvp.guestCounts.adults")}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => updateScheduleResponse(scheduleId, { adults: Math.max(0, scheduleResp.adults - 1) })}
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 text-brand-600 transition hover:bg-brand-100 text-xs"
                                      >
                                        −
                                      </button>
                                      <span className="w-5 text-center text-xs font-semibold text-slate-900">
                                        {scheduleResp.adults}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => updateScheduleResponse(scheduleId, { adults: scheduleResp.adults + 1 })}
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 text-brand-600 transition hover:bg-brand-100 text-xs"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-white p-2.5">
                                    <span className="text-xs font-medium text-slate-700">
                                      {t("rsvp.guestCounts.kids")}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => updateScheduleResponse(scheduleId, { kids: Math.max(0, scheduleResp.kids - 1) })}
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 text-brand-600 transition hover:bg-brand-100 text-xs"
                                      >
                                        −
                                      </button>
                                      <span className="w-5 text-center text-xs font-semibold text-slate-900">
                                        {scheduleResp.kids}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => updateScheduleResponse(scheduleId, { kids: scheduleResp.kids + 1 })}
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 text-brand-600 transition hover:bg-brand-100 text-xs"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Preferred arrival slot */}
                              <div>
                                <p className="mb-2 text-xs font-semibold text-slate-800">
                                  {t("rsvp.arrivalSlot.title")}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {scheduleArrivalOptions.length > 0 ? (
                                    scheduleArrivalOptions.map((option) => (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => updateScheduleResponse(scheduleId, { arrivalSlot: option.value })}
                                        className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition ${
                                          scheduleResp.arrivalSlot === option.value
                                            ? "border-emerald-500 bg-emerald-500 text-white"
                                            : "border-brand-200 bg-white text-brand-600 hover:bg-brand-100"
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    ))
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => updateScheduleResponse(scheduleId, { arrivalSlot: "flexible" })}
                                      className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition ${
                                        (!scheduleResp.arrivalSlot || scheduleResp.arrivalSlot === "flexible")
                                          ? "border-emerald-500 bg-emerald-500 text-white"
                                          : "border-brand-200 bg-white text-brand-600 hover:bg-brand-100"
                                      }`}
                                    >
                                      Flexible
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Need Parking? */}
                              <div>
                                <p className="mb-2 text-xs font-semibold text-slate-800">
                                  Need Parking?
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const needsParking = scheduleResp.transportMode === "parking";
                                      updateScheduleResponse(scheduleId, { 
                                        transportMode: needsParking ? null : "parking",
                                        // Clear vehicle counts if saying no to parking
                                        carCount: needsParking ? 0 : scheduleResp.carCount,
                                        bikeCount: needsParking ? 0 : scheduleResp.bikeCount,
                                        busCount: needsParking ? 0 : (scheduleResp.busCount ?? 0),
                                      });
                                    }}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                      scheduleResp.transportMode === "parking"
                                        ? "bg-emerald-500 text-white shadow"
                                        : "border border-brand-200 bg-white text-brand-600 hover:bg-brand-100"
                                    }`}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateScheduleResponse(scheduleId, { 
                                        transportMode: null,
                                        carCount: 0,
                                        bikeCount: 0,
                                        busCount: 0,
                                      });
                                    }}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                      scheduleResp.transportMode !== "parking" && scheduleResp.carCount === 0 && scheduleResp.bikeCount === 0 && (scheduleResp.busCount ?? 0) === 0
                                        ? "bg-slate-800 text-white shadow"
                                        : "border border-brand-200 bg-white text-brand-600 hover:bg-brand-100"
                                    }`}
                                  >
                                    No
                                  </button>
                                </div>

                                {/* If parking needed, show vehicle type options */}
                                {scheduleResp.transportMode === "parking" && (
                                  <div>
                                    <p className="mb-2 text-xs font-medium text-slate-600">
                                      For what vehicle?
                                    </p>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                      {/* Car */}
                                      <button
                                        type="button"
                                        onClick={() => updateScheduleResponse(scheduleId, { 
                                          carCount: scheduleResp.carCount === 1 ? 0 : 1,
                                          bikeCount: 0, // Clear bike when selecting car
                                          busCount: 0, // Clear bus when selecting car
                                        })}
                                        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition ${
                                          scheduleResp.carCount === 1
                                            ? "border-emerald-500 bg-emerald-50"
                                            : "border-orange-100 bg-white hover:bg-orange-50"
                                        }`}
                                      >
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                                          scheduleResp.carCount === 1 ? "bg-emerald-100" : "bg-brand-100"
                                        }`}>
                                          <svg className={`h-6 w-6 ${scheduleResp.carCount === 1 ? "text-emerald-600" : "text-brand-600"}`} fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                                          </svg>
                                        </div>
                                        <span className={`text-xs font-semibold ${
                                          scheduleResp.carCount === 1 ? "text-emerald-700" : "text-slate-700"
                                        }`}>
                                          Car
                                        </span>
                                        {scheduleResp.carCount === 1 && (
                                          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">✓</span>
                                        )}
                                      </button>

                                      {/* Bike */}
                                      <button
                                        type="button"
                                        onClick={() => updateScheduleResponse(scheduleId, { 
                                          bikeCount: scheduleResp.bikeCount === 1 ? 0 : 1,
                                          carCount: 0, // Clear car when selecting bike
                                          busCount: 0, // Clear bus when selecting bike
                                        })}
                                        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition ${
                                          scheduleResp.bikeCount === 1
                                            ? "border-emerald-500 bg-emerald-50"
                                            : "border-orange-100 bg-white hover:bg-orange-50"
                                        }`}
                                      >
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                                          scheduleResp.bikeCount === 1 ? "bg-emerald-100" : "bg-emerald-100"
                                        }`}>
                                          <svg className={`h-6 w-6 ${scheduleResp.bikeCount === 1 ? "text-emerald-600" : "text-emerald-600"}`} fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm5.5-1.5c-.83 0-1.5-.67-1.5-1.5S9.67 5.5 10.5 5.5 12 6.17 12 7s-.67 1.5-1.5 1.5zm4.5 6.5c-1.5 0-4.5.83-4.5 2.5V19h9v-1.5c0-1.67-3-2.5-4.5-2.5z"/>
                                            <circle cx="6.5" cy="11.5" r="1.5"/>
                                            <circle cx="17.5" cy="11.5" r="1.5"/>
                                          </svg>
                                        </div>
                                        <span className={`text-xs font-semibold ${
                                          scheduleResp.bikeCount === 1 ? "text-emerald-700" : "text-slate-700"
                                        }`}>
                                          Bike
                                        </span>
                                        {scheduleResp.bikeCount === 1 && (
                                          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">✓</span>
                                        )}
                                      </button>

                                      {/* Bus */}
                                      <button
                                        type="button"
                                        onClick={() => updateScheduleResponse(scheduleId, { 
                                          busCount: scheduleResp.busCount === 1 ? 0 : 1,
                                          carCount: 0, // Clear car when selecting bus
                                          bikeCount: 0, // Clear bike when selecting bus
                                        })}
                                        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition ${
                                          scheduleResp.busCount === 1
                                            ? "border-emerald-500 bg-emerald-50"
                                            : "border-orange-100 bg-white hover:bg-orange-50"
                                        }`}
                                      >
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                                          scheduleResp.busCount === 1 ? "bg-emerald-100" : "bg-blue-100"
                                        }`}>
                                          <svg className={`h-6 w-6 ${scheduleResp.busCount === 1 ? "text-emerald-600" : "text-blue-600"}`} fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
                                          </svg>
                                        </div>
                                        <span className={`text-xs font-semibold ${
                                          scheduleResp.busCount === 1 ? "text-emerald-700" : "text-slate-700"
                                        }`}>
                                          Bus
                                        </span>
                                        {scheduleResp.busCount === 1 && (
                                          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">✓</span>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Send me a reminder */}
                              <div>
                                <p className="mb-2 text-xs font-semibold text-slate-800">
                                  {t("rsvp.reminders.title")}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {reminderOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => {
                                        const current = scheduleResp.reminderPreference || [];
                                        const updated = current.includes(option.value)
                                          ? current.filter((v) => v !== option.value)
                                          : [...current, option.value];
                                        updateScheduleResponse(scheduleId, { reminderPreference: updated });
                                      }}
                                      className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition ${
                                        scheduleResp.reminderPreference?.includes(option.value)
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
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Fallback: show old form if no schedules
                  <div className="space-y-3 rounded-2xl bg-orange-50/60 p-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-800">{t("rsvp.question")}</p>
                    <p className="text-xs text-slate-500">No schedules available for this event.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    type="submit"
                    className="w-full rounded-full bg-brand-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? t("rsvp.updating") : t("rsvp.submit")}
                  </button>
                  {submitMessage && (
                    <div className="space-y-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
                      <p className="text-sm font-semibold text-emerald-800">
                        Thanks for fighting against food waste!
                      </p>
                      <p className="text-xs text-emerald-700">
                        Please use this portal to fight food wastage:{" "}
                        <a 
                          href="https://zerovaste.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-bold text-emerald-900 underline hover:text-emerald-950"
                        >
                          zerovaste.com
                        </a>
                      </p>
                    </div>
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
          </>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm transition-opacity"
          onClick={() => setShowSuccessModal(false)}
        >
          <div 
            className="relative w-full max-w-xl max-h-[95vh] rounded-2xl bg-white shadow-2xl transform transition-all overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute right-2 top-2 z-20 rounded-full bg-white p-1.5 text-slate-400 shadow-md border border-slate-200 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Compact Content - All in one section */}
            <div className="p-4 overflow-y-auto">
              {/* Logo and Success Icon */}
              <div className="mb-3 flex items-center justify-center gap-2">
                <Link to="https://zerovaste.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <img src={logo} alt="Zerovaste logo" className="h-8 w-8" />
                  <span className="text-xl font-bold">
                    <span className="text-brand-600">Zero</span>
                    <span className="text-slate-900">vaste</span>
                  </span>
                </Link>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Main Message */}
              <h2 className="mb-3 text-center text-lg font-bold text-slate-900">
                Thanks for Fighting Against Food Waste! 🎉
              </h2>

              {/* Statistics Section - Compact */}
              <div className="mb-3 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 p-3">
                <h3 className="mb-2 text-center text-sm font-bold text-red-900">
                  The Food Waste Crisis
                </h3>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">1.3 Billion Tons</div>
                  <p className="text-xs text-slate-700 mb-2">of food wasted globally every year</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-white/80 p-2">
                      <div className="text-lg font-bold text-red-600">33%</div>
                      <div className="text-slate-600">of all food produced</div>
                    </div>
                    <div className="rounded-lg bg-white/80 p-2">
                      <div className="text-lg font-bold text-red-600">$1 Trillion</div>
                      <div className="text-slate-600">economic loss annually</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why Zerovaste Section - Compact */}
              <div className="mb-3 rounded-xl bg-gradient-to-br from-emerald-50 to-brand-50 border border-emerald-200 p-3">
                <h3 className="mb-2 text-center text-sm font-bold text-emerald-900">
                  Why Zerovaste?
                </h3>
                <ul className="space-y-1.5 text-left">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm">✅</span>
                    <div className="text-xs">
                      <strong className="text-emerald-900">Smart Planning:</strong>
                      <span className="text-slate-700"> AI-powered food estimation reduces waste by up to 40%</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm">✅</span>
                    <div className="text-xs">
                      <strong className="text-emerald-900">Real-time RSVP:</strong>
                      <span className="text-slate-700"> Accurate headcount prevents over-preparation</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm">✅</span>
                    <div className="text-xs">
                      <strong className="text-emerald-900">Surplus Donation:</strong>
                      <span className="text-slate-700"> Connect excess food to NGOs and communities in need</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm">✅</span>
                    <div className="text-xs">
                      <strong className="text-emerald-900">Impact Tracking:</strong>
                      <span className="text-slate-700"> See your contribution to fighting food waste</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Call to Action - Compact */}
              <div className="text-center">
                <p className="mb-3 text-xs font-semibold text-slate-800">
                  Join thousands fighting food waste. Use Zerovaste for your next event!
                </p>
                <a
                  href="https://zerovaste.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-full bg-gradient-to-r from-brand-600 to-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:from-brand-700 hover:to-amber-700 transition-all transform hover:scale-105"
                >
                  Visit Zerovaste.com →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvitePage;
