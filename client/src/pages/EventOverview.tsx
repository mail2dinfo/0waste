import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { QRCodeSVG } from "qrcode.react";

const APP_ORIGIN =
  typeof window !== "undefined" && window.location
    ? window.location.origin
    : "https://zerowaste.in";

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
      "ZeroWaste survey closes 14 Nov 8pm",
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
      "ZeroWaste pledge acceptance at 68%",
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
      "ZeroWaste pledge to be embedded in invites",
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
  };
  ratios: {
    attendanceRate: number | null;
  };
  arrivalSlots: Array<{ value: string; label: string; count: number }>;
  transportModes: Array<{ value: string; label: string; count: number }>;
  reminders: Array<{ value: string; label: string; count: number }>;
  lastResponseAt: string | null;
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

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

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
        <p className="rounded-2xl border border-orange-100 bg-white p-6 text-sm text-slate-600 shadow">
          Loading event intelligence…
        </p>
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

    const carTransport = transportModes.find((mode) =>
      mode.value.toLowerCase().includes("car") || mode.label.toLowerCase().includes("car")
    );
    const carArrivals = carTransport?.count ?? 0;
    const parkingSlotsNeeded = carArrivals > 0 ? Math.max(1, Math.ceil(carArrivals / 3)) : null;

    const inviteLink = remoteEvent.inviteLink ?? buildInviteLink(eventId);
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
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4">
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
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {remoteEvent.status ?? "Draft"}
                  </span>
                  <h1 className="text-3xl font-bold text-slate-900">
                    {remoteEvent.title}
                  </h1>
                  <p className="text-sm text-slate-600">
                    {remoteEvent.eventDate ? remoteEvent.eventDate : "Date not set yet"} • {remoteEvent.location ?? "Location TBC"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3 text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {inviteLink && (
                    <code className="rounded-full bg-brand-500/10 px-4 py-2 text-[11px] font-semibold text-brand-600 shadow-inner shadow-orange-200/60">
                      {inviteLink}
                    </code>
                  )}
                  <span className="rounded-full border border-brand-200 bg-white/70 px-4 py-2 text-[11px]">
                    Schedule iterations: {scheduleSnapshot.length}
                  </span>
                </div>
              </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dynamicStats.map((stat) => (
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
                  <p className="mt-2 text-sm text-slate-600">
                    {stat.helper}
                  </p>
                </article>
              ))}
            </div>

            <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <article className="space-y-6 rounded-3xl border border-orange-200 bg-white/90 p-8 shadow-lg shadow-orange-200/60">
                <header className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-brand-600">
                    Plan vs live reality
                  </p>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Alignment snapshot
                  </h2>
                  <p className="text-sm text-slate-600">
                    Compare what was planned with current RSVP intelligence. Gaps highlight where you may adjust portions or outreach.
                  </p>
                </header>

                <div className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-inner shadow-orange-100/70">
                  <table className="min-w-full divide-y divide-orange-100 text-sm">
                    <thead className="bg-brand-50 text-brand-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Metric</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Planned</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Live actual</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100 text-slate-700">
                      {planActualRows.map((row) => {
                        const plannedValue = row.planned ?? null;
                        const actualValue = row.actual ?? null;
                        const delta =
                          plannedValue !== null && actualValue !== null
                            ? Math.round((actualValue - plannedValue) * 10) / 10
                            : null;

                        return (
                          <tr key={row.label} className="hover:bg-brand-50/40">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <div>{row.label}</div>
                              {row.note && (
                                <p className="text-[11px] font-normal uppercase tracking-wide text-slate-400">
                                  {row.note}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {plannedValue !== null ? formatCount(plannedValue) : "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {actualValue !== null ? formatCount(actualValue) : "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {delta !== null ? `${delta > 0 ? "+" : ""}${formatCount(delta)}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>

              <aside className="space-y-5 rounded-3xl border border-orange-200 bg-white/95 p-8 shadow-lg shadow-orange-200/60">
                <header className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-brand-600">AI action board</p>
                  <h3 className="text-xl font-semibold text-slate-900">Smart recommendations</h3>
                  <p className="text-sm text-slate-600">
                    Forecasts update as more responses arrive. Use them to fine-tune portions, parking, and scheduling.
                  </p>
                </header>

                <div className="space-y-4 text-sm text-slate-700">
                  <div className="rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-brand-600">AI food forecast</p>
                    {aiForecast ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-lg font-semibold text-slate-900">
                          {formatCount(aiForecast.recommendedFoodKg)} kg recommended
                        </p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {aiForecast.perGuestKg} kg per guest • Confidence {aiForecast.confidence}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">
                        Share more invites or log planned food to unlock the smart portion planner.
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-orange-100 bg-white px-4 py-3">
                    <header className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-brand-600">Peak arrival slot</p>
                      <span className="text-xs text-slate-400">
                        {arrivalSlots.length} slots tracked
                      </span>
                    </header>
                    <div className="mt-3 space-y-3">
                      {arrivalSlots.length ? (
                        arrivalSlots.map((slot) => {
                          const widthPercent = maxArrivalCount
                            ? Math.max(6, Math.round((slot.count / maxArrivalCount) * 100))
                            : 0;
                          return (
                            <div key={slot.value} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-700">{slot.label}</span>
                                <span className="text-brand-600">{formatCount(slot.count)}</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-orange-50">
                                <div
                                  className="h-full rounded-full bg-brand-500/70"
                                  style={{ width: `${widthPercent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-500">
                          No arrival slots captured yet. Encourage guests to pick their time window.
                        </p>
                      )}
                    </div>
                    {peakArrivalSlot && (
                      <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-[11px] uppercase tracking-wide text-brand-600">
                        Highest load expected around {peakArrivalSlot.label} • {formatCount(peakArrivalSlot.count)} guests
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-orange-100 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-brand-600">Parking readiness</p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-semibold text-slate-900">
                        {parkingSlotsNeeded !== null ? formatCount(parkingSlotsNeeded) : "—"} slots
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatCount(carArrivals)} guests arriving by car
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Assumes 3 guests per car. Adjust valet staffing or shuttle plans if you expect more drive-ins.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-xs text-slate-600">
                    <p className="font-semibold uppercase tracking-wide text-brand-600">Share insights</p>
                    <p className="mt-1">
                      Export coming soon. Meanwhile, use the share toolkit below or screenshot this section to align with caterers.
                    </p>
                  </div>
                </div>
              </aside>
            </section>

            <section className="space-y-6 rounded-3xl border border-brand-100 bg-white p-8 shadow-sm shadow-brand-100/60">
              <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-600">
                    RSVP intelligence
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Zero waste headcount tracker
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Every RSVP captured via the invitation QR feeds this dashboard to help you pay only when the insights are ready.
                  </p>
                </div>
                {rsvpSummary?.lastResponseAt && (
                  <p className="rounded-full bg-brand-500/10 px-4 py-2 text-xs font-semibold text-brand-600">
                    Last response • {new Date(rsvpSummary.lastResponseAt).toLocaleString()}
                  </p>
                )}
              </header>

              {rsvpLoading && (
                <p className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-slate-600">
                  Crunching RSVP numbers…
                </p>
              )}

              {rsvpError && !rsvpLoading && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {rsvpError}
                </p>
              )}

              {rsvpSummary && !rsvpLoading && (
                <div className="space-y-6 text-sm text-slate-700">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Total responses
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {rsvpSummary.totals.responses}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {rsvpSummary.totals.attendingYes} attending • {rsvpSummary.totals.attendingNo} skipping
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-emerald-600">
                        Committed guests
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-800">
                        {rsvpSummary.totals.guestsCommitted}
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Adults {rsvpSummary.totals.adults} • Kids {rsvpSummary.totals.kids}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-brand-100 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-brand-600">
                        Attendance rate
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-brand-700">
                        {rsvpSummary.ratios.attendanceRate !== null
                          ? `${Math.round(rsvpSummary.ratios.attendanceRate * 100)}%`
                          : "TBD"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Pay ₹299 to unlock live meal forecast
                      </p>
                    </div>
                    <div className="rounded-2xl border border-brand-100 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-brand-600">
                        Ready for payment
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-brand-700">
                        {rsvpSummary.totals.attendingYes >= 10
                          ? "Yes"
                          : "Awaiting more"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Unlock your ZeroWaste action plan once RSVPs stabilise.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-orange-100 bg-white p-4">
                      <header className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wide text-brand-600">
                          Arrival slots
                        </p>
                        <span className="text-xs text-slate-400">
                          {rsvpSummary.arrivalSlots.length} options
                        </span>
                      </header>
                      <ul className="mt-3 space-y-2 text-xs">
                        {rsvpSummary.arrivalSlots.length === 0 && (
                          <li className="rounded-xl bg-orange-50 px-3 py-2 text-slate-500">
                            Waiting for attending RSVPs
                          </li>
                        )}
                        {rsvpSummary.arrivalSlots.map((slot) => (
                          <li
                            key={slot.value}
                            className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2"
                          >
                            <span className="font-medium text-slate-700">{slot.label}</span>
                            <span className="text-brand-600">{slot.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-orange-100 bg-white p-4">
                      <header className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wide text-brand-600">
                          Transport needs
                        </p>
                        <span className="text-xs text-slate-400">
                          {rsvpSummary.transportModes.length} choices
                        </span>
                      </header>
                      <ul className="mt-3 space-y-2 text-xs">
                        {rsvpSummary.transportModes.length === 0 && (
                          <li className="rounded-xl bg-orange-50 px-3 py-2 text-slate-500">
                            No requests captured yet
                          </li>
                        )}
                        {rsvpSummary.transportModes.map((mode) => (
                          <li
                            key={mode.value}
                            className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2"
                          >
                            <span className="font-medium text-slate-700">{mode.label}</span>
                            <span className="text-brand-600">{mode.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-orange-100 bg-white p-4">
                      <header className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wide text-brand-600">
                          Reminder channels
                        </p>
                        <span className="text-xs text-slate-400">
                          {rsvpSummary.reminders.length} preferences
                        </span>
                      </header>
                      <ul className="mt-3 space-y-2 text-xs">
                        {rsvpSummary.reminders.length === 0 && (
                          <li className="rounded-xl bg-orange-50 px-3 py-2 text-slate-500">
                            Guests haven’t picked reminder options yet
                          </li>
                        )}
                        {rsvpSummary.reminders.map((reminder) => (
                          <li
                            key={reminder.value}
                            className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2"
                          >
                            <span className="font-medium text-slate-700">{reminder.label}</span>
                            <span className="text-brand-600">{reminder.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <p className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-xs text-brand-700">
                    Keep sharing the ZeroWaste invitation. Once you’re confident about the headcount, pay ₹299 to unlock live meal forecasts and surplus diversion playbooks.
                  </p>
                </div>
              )}
            </section>

            <section className="space-y-6 rounded-3xl border border-orange-100 bg-white p-8 shadow-sm shadow-orange-100/70">
              <h2 className="text-lg font-semibold text-slate-900">
                Schedule overview
              </h2>
              <ul className="space-y-4 text-sm text-slate-700">
                {scheduleSnapshot.map((entry, index) => {
                  const timelineSlots = typeof entry.sessionsDescription === "string"
                    ? entry.sessionsDescription.split("\n").map((slot: string) => slot.trim()).filter(Boolean)
                    : [];
                  const categories = Array.isArray(entry.categories)
                    ? (entry.categories as string[])
                    : [];

                  return (
                    <li
                      key={`${entry.id ?? index}`}
                      className="rounded-3xl border border-orange-100 bg-white/90 p-6 shadow-inner shadow-orange-100/60"
                    >
                      <header className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-brand-600">
                            Schedule {index + 1}
                          </p>
                          <h3 className="text-base font-semibold text-slate-900">
                            {entry.label ?? `Serving window ${index + 1}`} • {entry.date ?? "Date TBD"}
                          </h3>
                        </div>
                        <span className="rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                          {entry.servingsPerDay ?? 0} serving{(entry.servingsPerDay ?? 0) === 1 ? "" : "s"}
                        </span>
                      </header>

                      <div className="mt-4 grid gap-4 text-xs text-slate-600 md:grid-cols-3">
                        <div>
                          <p className="uppercase tracking-wide text-slate-500">Serving timeline</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {timelineSlots.length > 0 ? (
                              timelineSlots.map((slot) => (
                                <span
                                  key={`${entry.id ?? index}-${slot}`}
                                  className="inline-flex items-center rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600"
                                >
                                  {slot}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-dashed border-orange-200 px-3 py-1 text-[11px] uppercase tracking-wide text-orange-300">
                                No timeline added
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="uppercase tracking-wide text-slate-500">Meal categories served</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {categories.length > 0 ? (
                              categories.map((category) => (
                                <span
                                  key={`${entry.id ?? index}-${category}`}
                                  className="inline-flex items-center rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600"
                                >
                                  {category}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-dashed border-orange-200 px-3 py-1 text-[11px] uppercase tracking-wide text-orange-300">
                                No categories selected
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="uppercase tracking-wide text-slate-500">Menu notes</p>
                          <div className="mt-2 rounded-2xl bg-orange-50 px-4 py-3 text-slate-700">
                            {entry.menuNotes?.trim()?.length
                              ? entry.menuNotes
                              : "No extra menu notes added"}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
                {scheduleSnapshot.length === 0 && (
                  <li className="rounded-3xl border border-dashed border-orange-200 bg-orange-50 px-4 py-6 text-center text-sm text-slate-500">
                    No schedule captured yet. Return to the event planner to add days and servings.
                  </li>
                )}
              </ul>
            </section>

            <section className="space-y-4 rounded-3xl border border-orange-100 bg-white p-8 shadow-sm shadow-orange-100/70">
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
                    ZeroWaste pledge
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
                      ? "Host intends to recommend ZeroWaste"
                      : "Host has not committed to share yet"}
                  </p>
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
    );
  }

  if (!staticEvent) {
    return <Navigate to="/events" replace />;
  }

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
              <code className="rounded-full bg-brand-500/10 px-4 py-2 text-[11px] font-semibold text-brand-600 shadow-inner shadow-orange-200/60">
                {inviteLink}
              </code>
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

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
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
                Share this link anytime to capture RSVPs, menu preferences, and ZeroWaste pledges.
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

        <section className="space-y-6 rounded-3xl border border-orange-200 bg-white/90 p-8 shadow-lg shadow-orange-200/60">
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

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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
              After you unlock the premium report, answer a quick survey so we can continue improving ZeroWaste for your future events.
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

