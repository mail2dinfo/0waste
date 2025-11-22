import { useEffect, useRef, useState, useCallback } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { QRCodeSVG } from "qrcode.react";

// Use environment variable for frontend URL, fallback to window.location for runtime detection
const APP_ORIGIN = import.meta.env.VITE_FRONTEND_URL || 
  (typeof window !== "undefined" ? window.location.origin : "");

const buildInviteLink = (id?: string | null) =>
  id ? `${APP_ORIGIN}/invite/${id}` : `${APP_ORIGIN}/invite/preview`;

const eventMap = {
  evt_demo_001: {
    title: "Priya & Arjun Reception Dinner",
    date: "16 Nov 2025 • Hyderabad Palace Grounds",
    status: "Awaiting report payment",
    reportStatus: "unpaid" as "unpaid" | "paid",
    reportPrice: "₹299",
    stats: [
      {
        title: "RSVP conversion",
        value: "152 / 188",
        helper: "81% confirmed attendance",
      },
      {
        title: "Food forecast",
        value: "168 kg",
        helper: "Projected requirement across menu",
      },
      {
        title: "Impact potential",
        value: "₹2,200",
        helper: "Savings vs. caterer buffer",
      },
    ],
    expectation: [
      "188 guests expected including 12 vendors",
      "ZeroVaste survey closes 14 Nov 8pm",
      "Donation partner: Feeding India • Slot booked 11:30pm",
    ],
    menuPreferences: [
      { item: "Hyderabadi Veg Biryani", popularity: "82%", adults: "115", kids: "28" },
      { item: "Paneer Tikka", popularity: "68%", adults: "94", kids: "22" },
      { item: "Gulab Jamun", popularity: "91%", adults: "130", kids: "35" },
      { item: "Rose Falooda", popularity: "57%", adults: "72", kids: "18" },
    ],
    planVsActual: [
      { category: "Starters", planned: "34 kg", actual: "—", delta: "Locked" },
      { category: "Mains", planned: "88 kg", actual: "—", delta: "Locked" },
      { category: "Desserts", planned: "28 kg", actual: "—", delta: "Locked" },
      { category: "Beverages", planned: "46 L", actual: "—", delta: "Locked" },
    ],
  },
  evt_demo_002: {
    title: "Anika's 1st Birthday Brunch",
    date: "08 Dec 2025 • Windflower Hall, Bengaluru",
    status: "Survey in progress",
    reportStatus: "unpaid" as "unpaid" | "paid",
    reportPrice: "₹299",
    stats: [
      {
        title: "RSVP conversion",
        value: "45 / 82",
        helper: "55% responses in",
      },
      {
        title: "Food forecast",
        value: "74 kg",
        helper: "Awaiting dessert preferences",
      },
      {
        title: "Impact potential",
        value: "₹1,050",
        helper: "Projected savings vs buffet",
      },
    ],
    expectation: [
      "Children entertainment corner planned",
      "ZeroVaste pledge acceptance at 68%",
      "Donation partner: Robin Hood Army",
    ],
    menuPreferences: [
      { item: "Mini Idlis", popularity: "61%", adults: "32", kids: "21" },
      { item: "Pasta Live Counter", popularity: "74%", adults: "26", kids: "28" },
      { item: "Cupcakes", popularity: "87%", adults: "38", kids: "29" },
      { item: "Fruit Punch", popularity: "64%", adults: "24", kids: "27" },
    ],
    planVsActual: [
      { category: "Starters", planned: "18 kg", actual: "—", delta: "Survey running" },
      { category: "Mains", planned: "40 kg", actual: "—", delta: "Survey running" },
      { category: "Desserts", planned: "16 kg", actual: "—", delta: "Survey running" },
      { category: "Beverages", planned: "28 L", actual: "—", delta: "Survey running" },
    ],
  },
  evt_demo_003: {
    title: "TechCorp New Year Gala",
    date: "02 Jan 2026 • Seaside Convention, Mumbai",
    status: "Draft",
    reportStatus: "unpaid" as "unpaid" | "paid",
    reportPrice: "₹299",
    stats: [
      {
        title: "Target attendees",
        value: "420",
        helper: "HR onboarding starts next week",
      },
      {
        title: "Food forecast",
        value: "Pending",
        helper: "Menu curation scheduled 18 Nov",
      },
      {
        title: "Impact goal",
        value: "30%",
        helper: "Waste reduction target vs 2025 gala",
      },
    ],
    expectation: [
      "Executive committee aligning on cuisines",
      "ZeroVaste pledge to be embedded in invites",
      "Donation partner shortlist: Feeding India / Akshay Patra",
    ],
    menuPreferences: [],
    planVsActual: [
      { category: "Starters", planned: "—", actual: "—", delta: "Awaiting plan" },
      { category: "Mains", planned: "—", actual: "—", delta: "Awaiting plan" },
      { category: "Desserts", planned: "—", actual: "—", delta: "Awaiting plan" },
      { category: "Beverages", planned: "—", actual: "—", delta: "Awaiting plan" },
    ],
  },
};

const numberFormatter = new Intl.NumberFormat("en-IN");

type ForecastConfidence = "low" | "medium" | "high";

interface AiFoodForecast {
  recommendedFoodKg: number;
  perGuestKg: number;
  confidence: ForecastConfidence;
}

function calculateAiFoodForecast(
  plannedFoodKg: number | null | undefined,
  plannedGuests: number,
  liveGuests: number
): AiFoodForecast | null {
  if (!plannedFoodKg || plannedFoodKg <= 0) {
    return null;
  }

  const denominator = Math.max(plannedGuests || liveGuests || 1, 1);
  const basePerGuest = plannedFoodKg / denominator;
  const activeGuests = Math.max(liveGuests || plannedGuests || 0, 0);
  const demandEstimate = basePerGuest * activeGuests;
  const loadFactor = plannedGuests > 0 ? liveGuests / plannedGuests : 1;
  const bufferMultiplier = loadFactor >= 1 ? 0.12 : loadFactor >= 0.75 ? 0.08 : 0.05;
  const recommendedFoodKg = demandEstimate * (1 + bufferMultiplier);

  let confidence: ForecastConfidence = "low";
  if (loadFactor >= 0.75) {
    confidence = "high";
  } else if (loadFactor >= 0.4) {
    confidence = "medium";
  }

  return {
    recommendedFoodKg: Math.round(recommendedFoodKg * 10) / 10,
    perGuestKg: Math.round(basePerGuest * 100) / 100,
    confidence,
  };
}

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
}

interface InviteRsvpSummary {
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

function EventOverview() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const [remoteEvent, setRemoteEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rsvpSummary, setRsvpSummary] = useState<InviteRsvpSummary | null>(null);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [expandedSchedules, setExpandedSchedules] = useState<Set<number>>(new Set([0]));
  
  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [reportPricing, setReportPricing] = useState<{ currencyCode: string; amount: number } | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [upiSettings, setUpiSettings] = useState<{ upiId: string; upiName: string; qrCodeImage?: string | null } | null>(null);
  const [upiId, setUpiId] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success">("idle");

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Fetch pricing and UPI settings
  useEffect(() => {
    let ignore = false;

    const fetchPricing = (countryCode: string) => {
      api
        .get<{ currencyCode: string; amount: number }>(
          `/report-pricing/${countryCode}`
        )
        .then((response) => {
          if (ignore) return;
          setReportPricing(response.data);
          setPricingError(null);
        })
        .catch((err) => {
          console.error(err);
          if (ignore) return;
          setReportPricing(null);
          setPricingError("Pricing unavailable right now. Please try again later.");
        });
    };

    const syncPricing = () => {
      const storedCountry =
        window.localStorage.getItem("nowasteCountry") || "IN";
      fetchPricing(storedCountry.toUpperCase());
    };

    // Fetch UPI settings
    api
      .get<{ upiId: string; upiName: string; qrCodeImage?: string | null }>("/settings/upi")
      .then((response) => {
        if (ignore) return;
        setUpiSettings(response.data);
      })
      .catch((err) => {
        console.error("Failed to fetch UPI settings:", err);
        if (ignore) return;
        setUpiSettings({ upiId: "zerovaste@upi", upiName: "Zerovaste", qrCodeImage: null });
      });

    syncPricing();
    window.addEventListener("nowaste-locale-changed", syncPricing);
    return () => {
      ignore = true;
      window.removeEventListener("nowaste-locale-changed", syncPricing);
    };
  }, [api]);

  // Format currency
  const formatCurrency = useCallback((amount: number, currencyCode: string = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const formattedPrice = reportPricing
    ? formatCurrency(reportPricing.amount, reportPricing.currencyCode)
    : null;

  // Payment handlers
  const resetPaymentState = useCallback(() => {
    setUpiId("");
    setPaymentError(null);
    setPaymentStatus("idle");
  }, []);

  const handlePayClick = useCallback(() => {
    resetPaymentState();
    setShowPaymentModal(true);
    if (!reportPricing) {
      setPaymentError(pricingError ?? "Pricing unavailable right now. Please try again later.");
    }
  }, [reportPricing, pricingError, resetPaymentState]);

  const closePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
    resetPaymentState();
  }, [resetPaymentState]);

  const handlePaymentSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (!eventId) {
      return;
    }
    if (!reportPricing) {
      setPaymentError(pricingError ?? "Pricing unavailable right now. Please try again later.");
      return;
    }

    if (paymentStatus === "processing") {
      return;
    }

    // Manual UPI flow: just ensure the user entered a transaction reference
    if (!upiId.trim()) {
      setPaymentError("Enter the UPI transaction ID / reference after you pay.");
      return;
    }

    setPaymentStatus("processing");
    setPaymentError(null);

    try {
      const payload: Record<string, unknown> = {
        amount: reportPricing.amount,
        currencyCode: reportPricing.currencyCode,
        method: "upi",
        upiId: upiSettings?.upiId || "zerovaste@upi",
        reference: upiId.trim(),
      };

      await api.post(`/events/${eventId}/payments`, payload);

      setPaymentStatus("success");
      
      // Reload event data to get updated payment status
      if (remoteEvent) {
        api
          .get(`/events/${eventId}`)
          .then((response) => {
            setRemoteEvent(response.data);
          })
          .catch((err) => {
            console.error("Failed to reload event", err);
          });
      }

      // Dispatch payment success event to refresh events list
      window.dispatchEvent(new CustomEvent("nowaste-payment-success"));
    } catch (error) {
      console.error("Payment failed", error);
      const fallbackMessage = "We couldn't process the payment. Please try again.";
      const serverMessage = (error as any)?.response?.data?.message;
      setPaymentError(typeof serverMessage === "string" ? serverMessage : fallbackMessage);
      setPaymentStatus("idle");
    }
  };

  const copyInviteLink = (link: string) => {
    if (!link) return;
    const fallbackCopy = () => {
      try {
        const temp = document.createElement("textarea");
        temp.value = link;
        temp.setAttribute("readonly", "");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        setCopyStatus("copied");
      } catch (error) {
        console.error("Failed to copy invite link", error);
      }
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(link)
        .then(() => setCopyStatus("copied"))
        .catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }

    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => setCopyStatus("idle"), 2000);
  };

  const staticEvent = eventId ? eventMap[eventId as keyof typeof eventMap] : null;

  useEffect(() => {
    let ignore = false;
    if (!staticEvent && eventId) {
      setLoading(true);
      setRsvpSummary(null);
      setRsvpError(null);
      api
        .get(`/events/${eventId}`)
        .then((response) => {
          if (ignore) return;
          setRemoteEvent(response.data);
        })
        .catch((err) => {
          if (ignore) return;
          console.error(err);
          setError("Unable to load event details.");
        })
        .finally(() => {
          if (ignore) return;
          setLoading(false);
        });

      setRsvpLoading(true);
      api
        .get(`/events/${eventId}/invite-rsvp/summary`)
        .then((response) => {
          if (ignore) return;
          setRsvpSummary(response.data as InviteRsvpSummary);
        })
        .catch((err) => {
          if (ignore) return;
          console.error(err);
          setRsvpError("We couldn’t load RSVP analytics yet.");
        })
        .finally(() => {
          if (ignore) return;
          setRsvpLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [api, eventId, staticEvent]);

  if (!eventId) {
    return <Navigate to="/events" replace />;
  }

  if (!staticEvent && loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-orange-100 bg-white p-8 shadow">
          <div className="space-y-4">
            <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-400 rounded-full"
                style={{
                  width: '60%',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                  background: 'linear-gradient(90deg, #fb923c 0%, #f97316 50%, #fb923c 100%)',
                  backgroundSize: '200% 100%'
                }}
              />
            </div>
            <p className="text-center text-sm text-slate-600">Loading event details...</p>
          </div>
          <style>{`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `}</style>
        </div>
      </section>
    );
  }

  if (!staticEvent && error) {
    return (
      <section className="space-y-6">
        <p className="rounded-2xl border border-orange-100 bg-white p-6 text-sm text-red-500 shadow">
          {error}
        </p>
      </section>
    );
  }

  if (!staticEvent && !remoteEvent) {
    return (
      <section className="space-y-6">
        <p className="rounded-2xl border border-orange-100 bg-white p-6 text-sm text-slate-600 shadow">
          We couldn’t find this event. Please return to the events list.
        </p>
      </section>
    );
  }

  if (!staticEvent && remoteEvent) {
    const scheduleSnapshot = Array.isArray(remoteEvent.scheduleSnapshot)
      ? (remoteEvent.scheduleSnapshot as Array<Record<string, any>>)
      : [];
    const expectedSnapshot = (remoteEvent.expectedSnapshot ??
      {}) as Record<string, number>;
    const surveySnapshot = remoteEvent.surveySnapshot ?? {};
    const hasPaidReport = remoteEvent.reportStatus === "paid";
    const totalGuests =
      (expectedSnapshot.adults ?? 0) +
      (expectedSnapshot.kids ?? 0) +
      (expectedSnapshot.staff ?? 0);
    const dynamicStats = [
      {
        title: "Schedule days",
        value: `${scheduleSnapshot.length}`,
        helper: "Total iterations planned",
      },
      {
        title: "Guests expected",
        value: `${totalGuests}`,
        helper: `Adults ${expectedSnapshot.adults ?? 0} • Kids ${
          expectedSnapshot.kids ?? 0
        }`,
      },
      {
        title: "Planned food",
        value: remoteEvent.plannedFoodKg
          ? `${remoteEvent.plannedFoodKg} kg`
          : "TBD",
        helper: "Based on your event plan",
      },
      rsvpSummary
        ? {
            title: "RSVP responses",
            value: `${rsvpSummary.totals.attendingYes}/${rsvpSummary.totals.responses}`,
            helper:
              rsvpSummary.ratios.attendanceRate !== null
                ? `${Math.round(rsvpSummary.ratios.attendanceRate * 100)}% confirmed`
                : "Awaiting first response",
          }
        : null,
      rsvpSummary
        ? {
            title: "Guests committed",
            value: `${rsvpSummary.totals.guestsCommitted}`,
            helper: `Adults ${rsvpSummary.totals.adults} • Kids ${rsvpSummary.totals.kids}`,
          }
        : null,
    ].filter(Boolean) as Array<{
      title: string;
      value: string;
      helper: string;
    }>;

    const plannedGuests = totalGuests;
    const liveGuestsCommitted = rsvpSummary?.totals.guestsCommitted ?? null;
    const liveAdults = rsvpSummary?.totals.adults ?? null;
    const liveKids = rsvpSummary?.totals.kids ?? null;
    const liveYesResponses = rsvpSummary?.totals.attendingYes ?? null;

    const aiForecast = calculateAiFoodForecast(
      remoteEvent.plannedFoodKg,
      plannedGuests,
      liveGuestsCommitted ?? liveYesResponses ?? 0
    );

    const planActualRows = [
      {
        label: "Total guests",
        planned: plannedGuests,
        actual: liveGuestsCommitted,
        note: "RSVPs counted as coming",
      },
      {
        label: "Adults",
        planned: expectedSnapshot.adults ?? null,
        actual: liveAdults,
      },
      {
        label: "Kids",
        planned: expectedSnapshot.kids ?? null,
        actual: liveKids,
      },
      {
        label: "Support staff",
        planned: expectedSnapshot.staff ?? null,
        actual: null,
        note: "Staff RSVPs captured offline",
      },
    ] as Array<{ label: string; planned: number | null; actual: number | null; note?: string }>;

    if (remoteEvent.plannedFoodKg) {
      planActualRows.push({
        label: "Food requirement (kg)",
        planned: remoteEvent.plannedFoodKg,
        actual: aiForecast?.recommendedFoodKg ?? null,
        note: aiForecast
          ? `AI suggests ${aiForecast.perGuestKg} kg per guest (${aiForecast.confidence} confidence)`
          : "Forecast will unlock after more RSVPs",
      });
    }

    const arrivalSlots = rsvpSummary?.arrivalSlots ?? [];
    const transportModes = rsvpSummary?.transportModes ?? [];
    const maxArrivalCount = arrivalSlots.reduce((acc, slot) => Math.max(acc, slot.count), 0);
    const peakArrivalSlot = arrivalSlots.reduce<
      { label: string; count: number } | null
    >((acc, slot) => {
      if (!acc || slot.count > acc.count) {
        return { label: slot.label, count: slot.count };
      }
      return acc;
    }, null);

    const parkingTransport = transportModes.find((mode) =>
      mode.value.toLowerCase() === "parking"
    );
    const parkingRequestCount = parkingTransport?.count ?? 0;
    const totalCars = rsvpSummary?.totals?.totalCars ?? 0;
    const totalBikes = rsvpSummary?.totals?.totalBikes ?? 0;
    const parkingSlotsNeeded = totalCars > 0 ? Math.max(1, Math.ceil(totalCars / 3)) : null;

    // Always use production URL generated from eventId, ignore database value which may have localhost
    const inviteLink = buildInviteLink(eventId);
    const shareTitle = remoteEvent.title ?? "our celebration";
    const shareDate = remoteEvent.eventDate ?? "the upcoming date";
    const copyLabel = copyStatus === "copied" ? "Link copied!" : "Copy invite link";
    const whatsappMessage = `Hey! We're planning ${shareTitle} on ${shareDate}. Tap to confirm how many of you will join and vote on the menu. Let's avoid food waste together: ${inviteLink}`;
    const smsMessage = `You're invited to ${shareTitle}! RSVP here and help us avoid food waste: ${inviteLink}`;
    const planningHighlights = [
      remoteEvent.location
        ? `Venue confirmed: ${remoteEvent.location}`
        : "Venue confirmation pending",
      totalGuests > 0
        ? `Guests planned: ${totalGuests} (Adults ${expectedSnapshot.adults ?? 0}, Kids ${expectedSnapshot.kids ?? 0})`
        : "Guest headcount yet to be finalised",
      scheduleSnapshot.length > 0
        ? `Schedule iterations: ${scheduleSnapshot.length}`
        : "Schedule plan not captured yet",
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8 lg:gap-10 px-4 sm:px-6">
          <section className="space-y-8">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600 transition hover:bg-brand-50"
            >
              ← Back
            </button>
            <header className="rounded-[32px] border border-orange-200 bg-white/90 p-8 shadow-xl shadow-orange-200/60 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-slate-900">
                    {remoteEvent.title}
                  </h1>
                  <p className="text-sm text-slate-600">
                    {remoteEvent.eventDate ? remoteEvent.eventDate : "Date not set yet"} • {remoteEvent.location ?? "Location TBC"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3 text-xs font-semibold uppercase tracking-wide text-brand-600">
                  <span className="rounded-full border border-brand-200 bg-white/70 px-4 py-2 text-[11px]">
                    Schedule iterations: {scheduleSnapshot.length}
                  </span>
                </div>
              </div>
            </header>

            {/* 60/40 Split: Schedules (60%) and Invitation Toolkit (40%) */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-[3fr_2fr]">
              {/* Left Side: Schedules (60%) */}
              <div className="space-y-4 relative">
                <div className={!hasPaidReport ? 'filter blur-sm pointer-events-none' : ''}>
                  {scheduleSnapshot.length > 0 ? (
                  scheduleSnapshot.map((entry, index) => {
                    const timelineSlots = typeof entry.sessionsDescription === "string"
                      ? entry.sessionsDescription.split("\n").map((slot: string) => slot.trim()).filter(Boolean)
                      : [];
                    const categories = Array.isArray(entry.categories)
                      ? (entry.categories as string[])
                      : [];
                    const isExpanded = expandedSchedules.has(index);
                    const scheduleId = entry.id ?? `schedule-${index}`;
                    const scheduleBreakdown = rsvpSummary?.scheduleBreakdown?.[scheduleId];
                    
                    // Use schedule-specific analytics if available, otherwise use event-level totals
                    const plannedAdults = expectedSnapshot.adults ?? 0;
                    const plannedKids = expectedSnapshot.kids ?? 0;
                    const plannedTotal = plannedAdults + plannedKids;
                    const expectedAdults = scheduleBreakdown?.adults ?? rsvpSummary?.totals.adults ?? 0;
                    const expectedKids = scheduleBreakdown?.kids ?? rsvpSummary?.totals.kids ?? 0;
                    const expectedTotal = expectedAdults + expectedKids;
                    const scheduleResponses = scheduleBreakdown?.responses ?? 0;
                    // Schedule-specific parking counts
                    const scheduleCars = scheduleBreakdown?.totalCars ?? rsvpSummary?.totals?.totalCars ?? 0;
                    const scheduleBikes = scheduleBreakdown?.totalBikes ?? rsvpSummary?.totals?.totalBikes ?? 0;
                    
                    // Extract all possible hourly slots from the timeline
                    const extractTimelineSlots = (timeline: string): string[] => {
                      if (!timeline || !timeline.trim()) return [];
                      
                      const results = new Set<string>();
                      const pushWindow = (startHour24: number, endHour24: number) => {
                        const toLabel = (h: number) => {
                          const period = h >= 12 ? "PM" : "AM";
                          const hour12 = ((h + 11) % 12) + 1;
                          return `${hour12}:00 ${period}`;
                        };
                        results.add(`${toLabel(startHour24)}–${toLabel(endHour24)}`);
                      };
                      
                      const expandRange = (startHour: number, startPeriod: "AM" | "PM", endHour: number, endPeriod: "AM" | "PM") => {
                        const to24 = (h: number, p: "AM" | "PM") => {
                          if (h === 12) {
                            return p === "AM" ? 0 : 12;
                          }
                          const base = h % 12;
                          return p === "PM" ? base + 12 : base;
                        };
                        let start = to24(startHour, startPeriod);
                        let end = to24(endHour, endPeriod);
                        
                        if (endHour === 12 && endPeriod === "AM") {
                          end = 24;
                        }
                        if (end <= start && end !== 24) {
                          end = 24;
                        }
                        
                        for (let h = start; h < end; h += 1) {
                          const endHour24 = Math.min(h + 1, end === 24 ? 24 : end);
                          if (endHour24 <= 24) {
                            pushWindow(h, endHour24);
                          }
                        }
                      };
                      
                      const trimmed = timeline.trim();
                      const m = trimmed.match(/^(\d{1,2})\s*(AM|PM)\s+to\s+(\d{1,2})\s*(AM|PM)$/i);
                      if (m) {
                        const sh = parseInt(m[1]!, 10);
                        const sp = (m[2]!.toUpperCase() as "AM" | "PM");
                        const eh = parseInt(m[3]!, 10);
                        const ep = (m[4]!.toUpperCase() as "AM" | "PM");
                        if (sh >= 1 && sh <= 12 && eh >= 1 && eh <= 12) {
                          expandRange(sh, sp, eh, ep);
                        }
                      }
                      
                      return Array.from(results).sort((a, b) => {
                        const parseStart = (label: string) => {
                          const m = label.match(/^(\d{1,2}):00\s*(AM|PM)/i);
                          if (!m) return 0;
                          let h = parseInt(m[1]!, 10) % 12;
                          const p = m[2]!.toUpperCase();
                          if (p === "PM") {
                            if (h === 0) h = 12;
                            h += 12;
                            if (h === 24) h = 0;
                          } else {
                            if (h === 12) h = 0;
                          }
                          return h;
                        };
                        return parseStart(a) - parseStart(b);
                      });
                    };
                    
                    // Get all possible slots from timeline
                    const timelineDescription = entry.sessionsDescription || "";
                    const allPossibleSlots = extractTimelineSlots(timelineDescription);
                    
                    // Get RSVP data for arrival slots
                    const rsvpArrivalSlots = scheduleBreakdown?.arrivalSlots ?? [];
                    const rsvpSlotMap = new Map(rsvpArrivalSlots.map(slot => [slot.value, slot.count]));
                    
                    // Merge: show all timeline slots with actual RSVP counts (default to 0)
                    const allScheduleArrivalSlots = allPossibleSlots.length > 0 
                      ? allPossibleSlots.map(slotLabel => {
                          // Find matching RSVP slot by label or value
                          const rsvpSlot = rsvpArrivalSlots.find(rs => 
                            rs.label === slotLabel || rs.value === slotLabel
                          );
                          return {
                            value: slotLabel,
                            label: slotLabel,
                            count: rsvpSlot?.count ?? 0,
                          };
                        })
                      : rsvpArrivalSlots;
                    
                    // Sort by count descending (peak first) and show only top slots with customers
                    const slotsWithCustomers = allScheduleArrivalSlots
                      .filter(slot => slot.count > 0)
                      .sort((a, b) => b.count - a.count); // Descending order
                    
                    const slotsWithoutCustomers = allScheduleArrivalSlots
                      .filter(slot => slot.count === 0);
                    
                    // Combine: top slots with customers first, then slots without customers
                    const scheduleArrivalSlots = [...slotsWithCustomers, ...slotsWithoutCustomers];
                    
                    const scheduleMaxArrivalCount = scheduleArrivalSlots.reduce((acc, slot) => Math.max(acc, slot.count), 0);
                    const schedulePeakArrivalSlot = scheduleArrivalSlots.length > 0 && scheduleArrivalSlots[0].count > 0
                      ? scheduleArrivalSlots[0]
                      : null;
                    
                    // Show top 3 slots with customers, or all if less than 3
                    const topSlotsToShow = slotsWithCustomers.length > 0 
                      ? slotsWithCustomers.slice(0, 3)
                      : [];
                    // Show all slots (sorted) if we want to show everything, or just top 3
                    const scheduleArrivalSlotsToDisplay = topSlotsToShow.length > 0 
                      ? topSlotsToShow 
                      : scheduleArrivalSlots;

                    return (
                      <div key={`${entry.id ?? index}`} className="rounded-3xl border border-orange-200 bg-white/90 shadow-lg shadow-orange-200/60 overflow-hidden">
                        {/* Schedule Header - Always Visible */}
                        <button
                          type="button"
                          onClick={() => {
                            const newExpanded = new Set(expandedSchedules);
                            if (isExpanded) {
                              newExpanded.delete(index);
                            } else {
                              newExpanded.add(index);
                            }
                            setExpandedSchedules(newExpanded);
                          }}
                          className="w-full p-6 flex items-center justify-between hover:bg-orange-50/50 transition"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-700">
                              <span className="text-lg font-bold">{index + 1}</span>
            </div>
                            <div className="text-left">
                  <p className="text-xs uppercase tracking-wide text-brand-600">
                                Schedule {index + 1}
                              </p>
                              <h3 className="text-lg font-semibold text-slate-900">
                                {entry.label ?? `Serving window ${index + 1}`}
                              </h3>
                  <p className="text-sm text-slate-600">
                                {entry.date ?? "Date TBD"} • {entry.servingsPerDay ?? 0} serving{(entry.servingsPerDay ?? 0) === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <span className="rounded-full bg-brand-500/10 p-2 text-brand-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </span>
                            ) : (
                              <span className="rounded-full bg-brand-500/10 p-2 text-brand-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-6 pb-6 space-y-6 border-t border-orange-100 pt-6">
                            {/* Schedule Details */}
                            <div className="grid gap-4 text-sm text-slate-700 md:grid-cols-3">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Event timeline</p>
                                <div className="flex flex-wrap gap-2">
                                  {timelineSlots.length > 0 ? (
                                    timelineSlots.map((slot) => (
                                      <span
                                        key={`${entry.id ?? index}-${slot}`}
                                        className="inline-flex items-center rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600"
                                      >
                                        {slot}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-slate-400">No timeline</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Meal categories</p>
                                <div className="flex flex-wrap gap-2">
                                  {categories.length > 0 ? (
                                    categories.map((category) => (
                                      <span
                                        key={`${entry.id ?? index}-${category}`}
                                        className="inline-flex items-center rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600"
                                      >
                                        {category}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-slate-400">No categories</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Menu notes</p>
                                <div className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-slate-700">
                                  {entry.menuNotes?.trim()?.length
                                    ? entry.menuNotes
                                    : "No notes"}
                                </div>
                              </div>
                            </div>

                            {/* Analytics: Planned vs Expected */}
                            <div className="rounded-2xl border border-orange-100 bg-white p-6">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                                  Planned vs Expected
                                </h4>
                                {scheduleBreakdown && (
                                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    {scheduleResponses} RSVP{scheduleResponses === 1 ? '' : 's'} for this schedule
                                  </span>
                                )}
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-orange-100">
                                      <th className="text-left py-2 px-3 text-xs uppercase tracking-wide text-slate-500 font-semibold">Category</th>
                                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wide text-slate-500 font-semibold">Planned</th>
                                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wide text-slate-500 font-semibold">Expected</th>
                                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wide text-slate-500 font-semibold">Gap</th>
                      </tr>
                    </thead>
                                  <tbody className="divide-y divide-orange-50">
                                    <tr>
                                      <td className="py-3 px-3 font-medium text-slate-900">Adults</td>
                                      <td className="py-3 px-3 text-right font-semibold text-slate-900">{plannedAdults}</td>
                                      <td className="py-3 px-3 text-right font-semibold text-emerald-600">{expectedAdults}</td>
                                      <td className={`py-3 px-3 text-right font-bold ${expectedAdults - plannedAdults >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {expectedAdults - plannedAdults >= 0 ? '+' : ''}{Math.abs(expectedAdults - plannedAdults)}
                            </td>
                                    </tr>
                                    <tr>
                                      <td className="py-3 px-3 font-medium text-slate-900">Kids</td>
                                      <td className="py-3 px-3 text-right font-semibold text-slate-900">{plannedKids}</td>
                                      <td className="py-3 px-3 text-right font-semibold text-emerald-600">{expectedKids}</td>
                                      <td className={`py-3 px-3 text-right font-bold ${expectedKids - plannedKids >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {expectedKids - plannedKids >= 0 ? '+' : ''}{Math.abs(expectedKids - plannedKids)}
                            </td>
                                    </tr>
                                    <tr className="border-t-2 border-orange-200 bg-orange-50/50">
                                      <td className="py-3 px-3 font-semibold text-slate-900">Total</td>
                                      <td className="py-3 px-3 text-right font-bold text-slate-900">{plannedTotal}</td>
                                      <td className="py-3 px-3 text-right font-bold text-emerald-600">{expectedTotal}</td>
                                      <td className={`py-3 px-3 text-right font-bold text-lg ${expectedTotal - plannedTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {expectedTotal - plannedTotal >= 0 ? '+' : ''}{Math.abs(expectedTotal - plannedTotal)}
                            </td>
                          </tr>
                    </tbody>
                  </table>
                </div>
                            </div>

                            {/* Guest Arrival Peak Time Slot, Parking & Food Recommendations */}
                            <div className="space-y-4">
                              {/* Guest Arrival Peak Time Slot */}
                              <div className="rounded-2xl border border-orange-100 bg-white p-5">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-600 mb-4">
                                  Guest Arrival Peak Time Slot
                                </h4>
                                {scheduleArrivalSlotsToDisplay.length > 0 && schedulePeakArrivalSlot ? (
                                  <div className="space-y-3">
                                    {scheduleArrivalSlotsToDisplay.map((slot, index) => {
                                      const isPeak = index === 0 && slot.count > 0; // First slot with customers is peak
                                      const widthPercent = scheduleMaxArrivalCount
                                        ? Math.max(10, Math.round((slot.count / scheduleMaxArrivalCount) * 100))
                                        : 0;
                                      return (
                                        <div key={slot.value} className={`rounded-xl border p-4 ${
                                          isPeak 
                                            ? 'bg-gradient-to-br from-brand-50 to-brand-100/50 border-brand-200/50' 
                                            : 'bg-white border-orange-100'
                                        }`}>
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-semibold text-slate-900">{slot.label}</span>
                                              <span className="text-slate-400">-</span>
                                              <span className="text-sm font-semibold text-slate-900">
                                                {formatCount(slot.count)} Customer{slot.count === 1 ? '' : 's'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {isPeak ? (
                                                <>
                                                  <span className="inline-flex items-center justify-center rounded-full bg-brand-500 text-white w-6 h-6 text-sm font-bold">
                                                    ↑
                                                  </span>
                                                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                                                    Peak time
                                                  </span>
                                                </>
                                              ) : slot.count > 0 ? (
                                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                  Mild Time
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>
                                          {slot.count > 0 && (
                                            <div className="h-2 w-full rounded-full bg-orange-50">
                                              <div
                                                className={`h-full rounded-full transition-all ${
                                                  isPeak ? 'bg-brand-500' : 'bg-brand-300'
                                                }`}
                                                style={{ width: `${widthPercent}%` }}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {topSlotsToShow.length > 0 && slotsWithCustomers.length > 3 && (
                                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                                        <p className="text-xs text-slate-500">
                                          + {formatCount(slotsWithCustomers.length - 3)} more time slot{slotsWithCustomers.length - 3 === 1 ? '' : 's'} with customers
                                        </p>
                                      </div>
                                    )}
                                  </div>
                      ) : (
                                  <div className="rounded-xl bg-orange-50 p-4 text-center">
                        <p className="text-xs text-slate-500">
                          No arrival slots captured yet. Encourage guests to pick their time window.
                        </p>
                    </div>
                    )}
                  </div>

                              {/* Parking Recommendation */}
                              <div className="rounded-2xl border border-orange-100 bg-white p-5">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-600 mb-4">
                                  Parking Recommendation
                                </h4>
                                <div className="space-y-4">
                                  <div className="rounded-xl bg-gradient-to-br from-emerald-50 via-emerald-100/30 to-emerald-50 border border-emerald-200/50 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 mb-4">
                                      How many are expecting via Car, Bike?
                                    </p>
                                    <div className="grid gap-3">
                                      {/* Cars */}
                                      {scheduleCars > 0 && (() => {
                                        const estimatedGuestsPerCar = expectedTotal > 0 && scheduleCars > 0 ? Math.ceil(expectedTotal / scheduleCars) : 3;
                                        const estimatedGuestsViaCar = scheduleCars * estimatedGuestsPerCar;
                                        return (
                                          <div className="flex items-center gap-4 rounded-xl bg-white shadow-sm border-2 border-brand-200 p-4 hover:border-brand-300 transition">
                                            <div className="flex-shrink-0">
                                              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 shadow-inner">
                                                <svg className="h-12 w-12 text-brand-600" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                                                </svg>
                                              </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-3xl font-bold text-slate-900">
                                                  {formatCount(scheduleCars)}
                                                </span>
                                                <span className="text-base font-semibold text-slate-700">
                                                  {scheduleCars === 1 ? "Car" : "Cars"}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs font-medium text-slate-500">Expecting:</span>
                                                <span className="text-lg font-bold text-emerald-600">
                                                  {formatCount(estimatedGuestsViaCar)}
                                                </span>
                                                <span className="text-xs font-medium text-emerald-600">
                                                  guest{estimatedGuestsViaCar === 1 ? "" : "s"} (~{formatCount(estimatedGuestsPerCar)} per car)
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                      
                                      {/* Bikes */}
                                      {scheduleBikes > 0 && (() => {
                                        const estimatedGuestsPerBike = expectedTotal > 0 && scheduleBikes > 0 ? Math.ceil(expectedTotal / scheduleBikes) : 1;
                                        const estimatedGuestsViaBike = scheduleBikes * estimatedGuestsPerBike;
                                        return (
                                          <div className="flex items-center gap-4 rounded-xl bg-white shadow-sm border-2 border-emerald-200 p-4 hover:border-emerald-300 transition">
                                            <div className="flex-shrink-0">
                                              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 shadow-inner">
                                                <svg className="h-12 w-12 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M19 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm5.5-1.5c-.83 0-1.5-.67-1.5-1.5S9.67 5.5 10.5 5.5 12 6.17 12 7s-.67 1.5-1.5 1.5zm4.5 6.5c-1.5 0-4.5.83-4.5 2.5V19h9v-1.5c0-1.67-3-2.5-4.5-2.5z"/>
                                                  <circle cx="6.5" cy="11.5" r="1.5"/>
                                                  <circle cx="17.5" cy="11.5" r="1.5"/>
                                                </svg>
                                              </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-3xl font-bold text-slate-900">
                                                  {formatCount(scheduleBikes)}
                                                </span>
                                                <span className="text-base font-semibold text-slate-700">
                                                  {scheduleBikes === 1 ? "Bike" : "Bikes"}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs font-medium text-slate-500">Expecting:</span>
                                                <span className="text-lg font-bold text-emerald-600">
                                                  {formatCount(estimatedGuestsViaBike)}
                                                </span>
                                                <span className="text-xs font-medium text-emerald-600">
                                                  guest{estimatedGuestsViaBike === 1 ? "" : "s"} (~{formatCount(estimatedGuestsPerBike)} per bike)
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                      
                                      {scheduleCars === 0 && scheduleBikes === 0 && (
                                        <div className="rounded-xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                                          <svg className="h-16 w-16 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          <p className="text-sm font-medium text-slate-600 mb-1">No parking requests yet</p>
                                          <p className="text-xs text-slate-500">
                                            Guests can specify their transportation when RSVPing
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {scheduleCars > 0 && (() => {
                                    const scheduleParkingSlots = Math.max(1, Math.ceil(scheduleCars / 3));
                                    const estimatedGuestsWithCars = scheduleCars * 3;
                                    return (
                                      <div className="rounded-xl bg-gradient-to-r from-orange-50 via-orange-100/50 to-orange-50 border border-orange-200 p-4">
                                        <div className="flex items-start gap-3">
                                          <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                                            <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
                                              Recommended Parking Slots
                                            </p>
                                            <div className="space-y-1">
                                              <p className="text-sm font-semibold text-orange-700">
                                                {formatCount(scheduleParkingSlots)} parking slot{scheduleParkingSlots === 1 ? "" : "s"} needed
                                              </p>
                                              <p className="text-xs text-slate-600">
                                                Based on {formatCount(scheduleCars)} car{scheduleCars === 1 ? "" : "s"} (assuming 3 guests per car, ~{formatCount(estimatedGuestsWithCars)} total guests)
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Food Quantity Recommendation */}
                              <div className="rounded-2xl border border-orange-100 bg-white p-5">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-600 mb-3">
                                  Food Quantity Recommendation
                                </h4>
                                {expectedTotal > 0 ? (
                                  <div className="space-y-3">
                                    {/* Expected Meals Based on RSVP Stats */}
                                    <div className="rounded-xl bg-emerald-50 p-4">
                                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Expected meals</p>
                                      <p className="text-2xl font-bold text-emerald-700">
                                        {formatCount(expectedTotal)}
                                      </p>
                                      <p className="text-xs text-slate-600 mt-1">
                                        {scheduleBreakdown ? (
                                          <>
                                            Based on <span className="font-semibold">{formatCount(scheduleResponses)} RSVP{scheduleResponses === 1 ? '' : 's'}</span> for this schedule
                                            {expectedAdults > 0 || expectedKids > 0 && (
                                              <> • {formatCount(expectedAdults)} adults, {formatCount(expectedKids)} kids</>
                                            )}
                                          </>
                                        ) : scheduleResponses === 0 ? (
                                          <>Based on planned guest count (no RSVPs for this schedule yet)</>
                                        ) : (
                                          <>
                                            Based on <span className="font-semibold">{formatCount(rsvpSummary?.totals?.attendingYes ?? 0)} RSVP{rsvpSummary?.totals?.attendingYes === 1 ? '' : 's'}</span> confirmed
                                            {liveAdults !== null && liveKids !== null && (
                                              <> • {formatCount(liveAdults)} adults, {formatCount(liveKids)} kids</>
                                            )}
                                          </>
                                        )}
                      </p>
                    </div>

                                    {aiForecast ? (
                                      <>
                                        <div className="rounded-xl bg-brand-50/60 p-4">
                                          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Recommended quantity</p>
                                          <p className="text-2xl font-bold text-brand-700">{formatCount(aiForecast.recommendedFoodKg)} kg</p>
                                          <p className="text-xs text-slate-600 mt-1">
                                            For {formatCount(expectedTotal)} expected guests
                      </p>
                    </div>
                                        <div className="rounded-xl bg-orange-50 p-3 space-y-2">
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600">Per guest</span>
                                            <span className="font-semibold text-slate-900">{formatCount(aiForecast.perGuestKg)} kg</span>
                                          </div>
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600">Confidence</span>
                                            <span className={`font-semibold ${
                                              aiForecast.confidence === 'high' ? 'text-emerald-600' :
                                              aiForecast.confidence === 'medium' ? 'text-yellow-600' :
                                              'text-orange-600'
                                            }`}>
                                              {aiForecast.confidence.charAt(0).toUpperCase() + aiForecast.confidence.slice(1)}
                                            </span>
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="space-y-3">
                                        <div className="rounded-xl bg-orange-50 p-4">
                                          <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Estimated quantity</p>
                                          {remoteEvent.plannedFoodKg ? (
                                            <>
                                              <p className="text-lg font-bold text-slate-900">
                                                {formatCount(remoteEvent.plannedFoodKg)} kg
                                              </p>
                                              <p className="text-xs text-slate-600 mt-1">
                                                Based on planned food allocation
                                              </p>
                                            </>
                                          ) : (
                                            <p className="text-sm text-slate-600">
                                              Calculate based on {formatCount(expectedTotal)} expected guests
                                            </p>
                                          )}
                    </div>
                                        <div className="rounded-xl bg-orange-50 p-3">
                                          <p className="text-xs text-slate-600">
                                            <span className="font-semibold">Tip:</span> Share more invites or log planned food to unlock AI-powered portion recommendations.
                      </p>
                    </div>
                  </div>
                                    )}
                    </div>
                                ) : (
                                  <div className="rounded-xl bg-orange-50 p-4 text-center">
                                    <p className="text-xs text-slate-500">
                                      Food quantity recommendation will appear once RSVPs are captured.
                                    </p>
                    </div>
                                )}
                    </div>
                  </div>
                </div>
              )}
                      </div>
                    );
                  })
                  ) : (
                    <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50 px-4 py-6 text-center text-sm text-slate-500">
                      No schedule captured yet. Return to the event planner to add days and servings.
                    </div>
                  )}
                </div>
                {/* Payment Overlay - Only show when not paid */}
                {!hasPaidReport && (
                  <div className="absolute inset-0 flex items-start justify-center bg-white/90 backdrop-blur-sm rounded-3xl z-10 pointer-events-auto pt-16">
                    <div className="text-center space-y-4 p-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 mb-4">
                        <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <p className="text-lg font-semibold text-slate-900">Pay ₹99 to get the stats</p>
                      <p className="text-sm text-slate-600">Unlock detailed analytics and insights for your event</p>
                      <button
                        type="button"
                        onClick={handlePayClick}
                        disabled={paymentStatus === "processing"}
                        className="mt-4 inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-brand-600 transition-colors disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {formattedPrice ? `Pay ${formattedPrice}` : "Pay ₹99"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Invitation Toolkit (40%) */}
              <aside className="space-y-6 rounded-3xl border border-orange-200 bg-white/90 p-6 shadow-lg shadow-orange-200/60 sticky top-4 h-fit">
                <header className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-brand-600">Invitation toolkit</p>
                  <h2 className="text-lg font-semibold text-slate-900">QR code & quick share</h2>
                  <p className="text-xs text-slate-600">
                    Share this link to capture RSVPs and preferences.
                  </p>
                      </header>

                <div className="flex flex-col items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-4 shadow-inner shadow-orange-100/70">
                  <QRCodeSVG
                    value={inviteLink}
                    size={160}
                    fgColor="#1f2937"
                    bgColor="#fff7ed"
                    level="Q"
                    includeMargin
                  />
                  <code className="block break-all rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-brand-600 shadow-sm max-w-full">
                    {inviteLink}
                  </code>
                          </div>

                <div className="space-y-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                  <button
                    onClick={() => copyInviteLink(inviteLink)}
                    type="button"
                    className="w-full rounded-full border border-brand-200 px-3 py-2 text-brand-600 transition hover:bg-brand-50"
                  >
                    {copyLabel}
                  </button>
                  <a
                    className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-3 py-2 text-white shadow hover:bg-brand-600"
                    href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Share via WhatsApp
                  </a>
                  <a
                    className="inline-flex w-full items-center justify-center rounded-full border border-brand-200 px-3 py-2 text-brand-600 hover:bg-brand-50"
                    href={`sms:?body=${encodeURIComponent(smsMessage)}`}
                  >
                    Share via SMS
                  </a>
                          </div>
              </aside>
            </section>

            <section className="space-y-4 rounded-2xl sm:rounded-3xl border border-orange-100 bg-white p-4 sm:p-6 lg:p-8 shadow-sm shadow-orange-100/70">
              <h2 className="text-lg font-semibold text-slate-900">
                Donation & sharing preferences
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-orange-50 p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Donation partner
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {surveySnapshot.donation_preference ?? "Not specified"}
                  </p>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    ZeroVaste pledge
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {surveySnapshot.zero_waste_pledge === true
                      ? "Guests will be asked to pledge"
                      : "Pledge not enabled"}
                  </p>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Surplus donation consent
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {surveySnapshot.wastage_donation === true
                      ? "Yes, coordinate donation for surplus food"
                      : "No donation coordination requested"}
                  </p>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Recommendation intent
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {surveySnapshot.share_recommendation === true
                      ? "Host intends to recommend ZeroVaste"
                      : "Host has not committed to share yet"}
                  </p>
                </div>
              </div>
            </section>
          </section>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-8">
            <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl shadow-slate-900/20 mx-4 sm:mx-auto">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Unlock premium report
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">
                    {remoteEvent?.title || "Event Report"}
                  </h3>
                  {formattedPrice && (
                    <p className="mt-1 text-sm text-slate-600">
                      Pay {formattedPrice} once to access ZeroVaste insights for this celebration.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              {paymentStatus === "success" ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    Payment received! The detailed ZeroVaste report is now unlocked.
                  </div>
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="w-full rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-600"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePaymentSubmit} className="mt-6 space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Amount</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {formattedPrice ?? "₹99"}
                    </p>
                  </div>

                  {paymentError && (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {paymentError}
                    </p>
                  )}

                  <div className="space-y-4 rounded-2xl border border-orange-100 bg-orange-50/80 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                      Step 1 — Pay via UPI
                    </p>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                      <div className="flex-shrink-0 rounded-xl border-2 border-white bg-white p-3 shadow-sm">
                        {upiSettings?.qrCodeImage ? (
                          <img
                            src={upiSettings.qrCodeImage}
                            alt="UPI QR Code"
                            className="h-40 w-40 object-contain"
                          />
                        ) : (
                          <QRCodeSVG
                            value={`upi://pay?pa=${upiSettings?.upiId || "zerovaste@upi"}&pn=${encodeURIComponent(upiSettings?.upiName || "Zerovaste")}&am=${reportPricing?.amount ?? 99}&cu=INR&tn=Event Report Payment`}
                            size={160}
                            fgColor="#1f2937"
                            bgColor="#ffffff"
                            level="M"
                            includeMargin
                          />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p>
                          Scan the QR code with your UPI app (GPay, PhonePe, Paytm…) or send{" "}
                          <span className="font-semibold">
                            {formattedPrice ?? "₹99"}
                          </span>{" "}
                          to <span className="font-semibold text-brand-600">{upiSettings?.upiId || "zerovaste@upi"}</span>.
                        </p>
                        <div className="rounded-lg border border-orange-200 bg-white p-2 text-center">
                          <p className="text-xs font-medium text-slate-600">UPI ID</p>
                          <p className="text-sm font-bold text-brand-600">{upiSettings?.upiId || "zerovaste@upi"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Step 2 — UPI transaction ID / reference
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      disabled={paymentStatus === "processing"}
                      onChange={(event) => setUpiId(event.target.value)}
                      className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                      placeholder="Paste the UPI reference / UTR after paying"
                    />
                    <p className="text-[11px] text-slate-500">
                      After you pay, copy the reference/UTR from your UPI app and paste it here so you can track this payment.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={closePaymentModal}
                      disabled={paymentStatus === "processing"}
                      className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={paymentStatus === "processing"}
                      className="rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {paymentStatus === "processing"
                        ? "Processing…"
                        : formattedPrice
                        ? `Pay ${formattedPrice}`
                        : "Pay now"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!staticEvent) {
    return <Navigate to="/events" replace />;
  }

  const event = staticEvent;
  const hasPaidReport = event.reportStatus === "paid";
  const inviteLink = buildInviteLink(eventId);
  const shareTitle = event.title ?? "our celebration";
  const shareDate = event.date ?? "the upcoming date";
  const copyLabel = copyStatus === "copied" ? "Link copied!" : "Copy invite link";
  const whatsappMessage = `Hey! We're planning ${shareTitle} on ${shareDate}. Tap to confirm how many of you will join and vote on the menu. Let's avoid food waste together: ${inviteLink}`;
  const smsMessage = `You're invited to ${shareTitle}! RSVP here and help us avoid food waste: ${inviteLink}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600 transition hover:bg-brand-50"
        >
          ← Back
        </button>

        <header className="rounded-[32px] border border-orange-200 bg-white/90 p-8 shadow-xl shadow-orange-200/60 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                {event.status}
              </span>
              <h1 className="text-3xl font-bold text-slate-900">{event.title}</h1>
              <p className="text-sm text-slate-600">{event.date}</p>
            </div>
            <div className="flex flex-col.items-end gap-3 text-xs font-semibold uppercase tracking-wide text-brand-600">
              <span
                className={`flex items-center gap-2 rounded-full px-4 py-2 ${
                  hasPaidReport ? "border border-brand-200 bg-white/80 text-brand-700" : "bg-orange-100 text-orange-700"
                }`}
              >
                {hasPaidReport ? "Report unlocked" : `Pay ${event.reportPrice} to unlock actuals`}
              </span>
              {!hasPaidReport && (
                <button className="rounded-full bg-brand-500 px-4 py-2 text-white shadow hover:bg-brand-600">
                  Pay {event.reportPrice}
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {event.stats.map((stat) => (
            <article
              key={stat.title}
              className="group rounded-3xl border border-orange-200 bg-white/90 p-6 shadow-md shadow-orange-200/50 transition-transform hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {stat.title}
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-900 group-hover:text-brand-600">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-slate-600">{stat.helper}</p>
            </article>
          ))}
        </div>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.5fr_1fr]">
          <article className="space-y-6 rounded-3xl border border-orange-200 bg-white/90 p-8 shadow-lg shadow-orange-200/60">
            <header>
              <p className="text-xs uppercase tracking-wide text-brand-600">Event pulse</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Planning highlights</h2>
              <p className="mt-1 text-sm text-slate-600">
                A quick glance at what matters most before the premium report goes live.
              </p>
            </header>
            <ul className="space-y-3 text-sm text-slate-700">
              {event.expectation.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <aside className="space-y-5 rounded-3xl border border-orange-200 bg-white/90 p-8 shadow-lg shadow-orange-200/60">
            <header className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-brand-600">Invitation toolkit</p>
              <h3 className="text-lg font-semibold text-slate-900">QR code & quick share</h3>
              <p className="text-sm text-slate-600">
                Share this link anytime to capture RSVPs, menu preferences, and ZeroVaste pledges.
              </p>
            </header>

            <div className="flex flex-col items-center gap-4 rounded-3xl border border-orange-100 bg-orange-50/70 p-6 shadow-inner shadow-orange-100/70">
              <QRCodeSVG value={inviteLink} size={200} fgColor="#1f2937" bgColor="#fff7ed" level="Q" includeMargin />
              <code className="block break-all rounded-full bg-white px-4 py-2 text-xs font-semibold text-brand-600 shadow-sm">
                {inviteLink}
              </code>
            </div>

            <div className="grid gap-3 text-xs font-semibold uppercase tracking-wide text-brand-600">
              <button
                onClick={() => copyInviteLink(inviteLink)}
                type="button"
                className="rounded-full border border-brand-200 px-4 py-3 text-brand-600 transition hover:bg-brand-50"
              >
                {copyLabel}
              </button>
              <a
                className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-4 py-3 text-white shadow hover:bg-brand-600"
                href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noreferrer"
              >
                Share via WhatsApp
              </a>
              <a
                className="inline-flex w-full items-center justify-center rounded-full border border-brand-200 px-4 py-3 text-brand-600 hover:bg-brand-50"
                href={`sms:?body=${encodeURIComponent(smsMessage)}`}
              >
                Share via SMS
              </a>
            </div>
          </aside>
        </section>

        <section className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl border border-orange-200 bg-white/90 p-4 sm:p-6 lg:p-8 shadow-lg shadow-orange-200/60">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-600">Guest taste intelligence</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Menu preferences</h2>
              <p className="mt-1 text-sm text-slate-600">Based on current survey data. Actual sentiment updates live as guests respond.</p>
            </div>
          </header>

          {event.menuPreferences.length ? (
            <div className="overflow-hidden rounded-[28px] border border-orange-200 bg-white shadow-inner shadow-orange-100/80">
              <table className="min-w-full divide-y divide-orange-100 text-sm">
                <thead className="bg-brand-50 text-brand-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Menu item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Popularity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Adults</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Kids</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100 text-slate-700">
                  {event.menuPreferences.map((row) => (
                    <tr key={row.item} className="hover:bg-brand-50/40">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.item}</td>
                      <td className="px-4 py-3 text-brand-600">{row.popularity}</td>
                      <td className="px-4 py-3">{row.adults}</td>
                      <td className="px-4 py-3">{row.kids}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-3xl border border-dashed border-orange-200 bg-orange-50 px-4 py-6 text-center text-sm text-slate-600">
              Menu preferences will appear once the invitation link is shared and guests start responding.
            </p>
          )}
        </section>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.4fr_1fr]">
          <article className="space-y-4 rounded-3xl border border-orange-200 bg-white/90 p-8 shadow-lg shadow-orange-200/60">
            <header>
              <p className="text-xs uppercase tracking-wide text-brand-600">Plan vs actuals</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Report will reveal the truth</h2>
              <p className="mt-1 text-sm text-slate-600">
                Insights are released once the premium report is unlocked. Until then, expected plan metrics are shown.
              </p>
            </header>
            <div className="space-y-3">
              {event.planVsActual.map((row) => (
                <div
                  key={row.category}
                  className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-slate-700"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">{row.category}</p>
                  <p className="mt-1">
                    Planned: <span className="font-semibold">{row.planned}</span>
                  </p>
                  <p>
                    Actual: {" "}
                    <span className={`font-semibold ${hasPaidReport ? "text-brand-600" : "text-slate-400"}`}>
                      {hasPaidReport ? row.actual : "Locked"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">Delta: {row.delta}</p>
                </div>
              ))}
            </div>
          </article>

          <aside className="space-y-4 rounded-3xl border border-orange-200 bg-white/90 p-8 shadow-lg shadow-orange-200/60">
            <p className="text-sm text-slate-600">
              After you unlock the premium report, answer a quick survey so we can continue improving ZeroVaste for your future events.
            </p>
            {hasPaidReport ? (
              <div className="space-y-3 text-xs font-semibold uppercase tracking-wide text-brand-600">
                <button className="w-full rounded-full bg-brand-500 px-4 py-3 text-white shadow hover:bg-brand-600">
                  Yes, I’m satisfied
                </button>
                <button className="w-full rounded-full border border-brand-200 px-4 py-3 text-brand-600 hover:bg-brand-50">
                  Needs improvement
                </button>
                <p className="mt-2 text-center text-[11px] uppercase tracking-wide text-brand-600">
                  Share with friends
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 rounded-full border border-brand-200 px-4 py-2 text-[11px] text-brand-600 hover:bg-brand-50">
                    Share via ChatGPT
                  </button>
                  <button className="flex-1 rounded-full border border-brand-200 px-4 py-2 text-[11px] text-brand-600 hover:bg-brand-50">
                    Send SMS invite
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
                Pay {event.reportPrice} to compare planned vs actual consumption, unlock savings insights, and share proud moments with family.
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}

export default EventOverview;

