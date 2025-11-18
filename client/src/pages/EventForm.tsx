import { FormEvent, useMemo, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useApi } from "../hooks/useApi";

const APP_ORIGIN =
  typeof window !== "undefined" && window.location
    ? window.location.origin
    : import.meta.env.VITE_FRONTEND_URL || "https://zerowaste-06c0.onrender.com";

const PREVIEW_INVITE_LINK = `${APP_ORIGIN}/invite/preview`;

const buildInviteLink = (eventId: string) => `${APP_ORIGIN}/invite/${eventId}`;


type ScheduleEntry = {
  id: string;
  label: string;
  date: string;
  servingsPerDay: number;
  sessionsDescription: string;
  menuNotes: string;
  categories: string[];
};

type MenuItem = {
  label: string;
  course: string;
  quantityPerAdult: number;
  quantityPerKid: number;
};

type FormState = {
  name: string;
  eventDate: string;
  surveyCutoffDate: string;
  location: string;
  schedule: ScheduleEntry[];
  menu: MenuItem[];
  expected: {
    adults: number;
    kids: number;
    staff: number;
  };
  plannedFoodKg: number;
  inviteLink: string;
  notes: string;
};

type SurveyQuestion = {
  id: string;
  prompt: string;
  type: "select" | "number" | "boolean" | "text" | "multi";
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  showIf?: {
    field: string;
    equals: string | boolean | number;
  };
};

type EventTemplate = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  defaults: Partial<FormState> & { surveyPreset?: Record<string, unknown> };
};

const steps = [
  "Template",
  "Event Details",
  "Schedule",
  "Expected guests",
  "Review",
  "Share",
];

const defaultMenu: MenuItem[] = [
  {
    label: "Veg Starter",
    course: "Starters",
    quantityPerAdult: 0.15,
    quantityPerKid: 0.1,
  },
  {
    label: "Main Course",
    course: "Mains",
    quantityPerAdult: 0.3,
    quantityPerKid: 0.15,
  },
  {
    label: "Dessert",
    course: "Desserts",
    quantityPerAdult: 0.12,
    quantityPerKid: 0.08,
  },
];

const createScheduleEntry = (index: number): ScheduleEntry => ({
  id: `schedule-${Date.now()}-${index}`,
  label: `Day ${index}`,
  date: "",
  servingsPerDay: 1,
  sessionsDescription: "",
  menuNotes: "",
  categories: [],
});

const servingTimelineOptions = [
  "6-10 AM",
  "11 AM-2 PM",
  "3-6 PM",
  "7-10 PM",
  "Late night",
];

const templates: EventTemplate[] = [
  {
    id: "wedding-multi-day",
    name: "Wedding • Multi-day",
    subtitle: "Wedding & reception",
    description:
      "Ideal for 2-5 day celebrations with breakfast, lunch, dinner, and late-night servings across venues.",
    defaults: {
      name: "Wedding celebration",
      schedule: [
        { ...createScheduleEntry(1), label: "Welcome Dinner" },
        { ...createScheduleEntry(2), label: "Wedding Ceremony" },
        { ...createScheduleEntry(3), label: "Reception" },
      ],
      menu: defaultMenu,
      inviteLink: PREVIEW_INVITE_LINK,
      surveyPreset: { event_type: "wedding" },
    },
  },
  {
    id: "housewarming",
    name: "Housewarming • Single day",
    subtitle: "Festive lunch gathering",
    description:
      "Perfect for griha pravesh or welcome lunches. Covers welcome drinks, lunch counters, desserts, and return-gift coordination.",
    defaults: {
      name: "Housewarming lunch",
      schedule: [
        { ...createScheduleEntry(1), label: "Housewarming Lunch" },
      ],
      menu: defaultMenu,
      inviteLink: PREVIEW_INVITE_LINK,
      surveyPreset: { event_type: "housewarming" },
    },
  },
  {
    id: "corporate-zero-waste",
    name: "Corporate • Zerovaste offsite",
    subtitle: "Leadership retreats & annual meets",
    description:
      "Ideal for corporate gatherings with buffet, live counters, coffee stations, and post-event donation planning.",
    defaults: {
      name: "Corporate ZeroVaste offsite",
      schedule: [
        { ...createScheduleEntry(1), label: "Leadership Conference Day" },
      ],
      menu: defaultMenu,
      inviteLink: PREVIEW_INVITE_LINK,
      surveyPreset: { event_type: "corporate" },
    },
  },
  {
    id: "community-gathering",
    name: "Community gathering",
    subtitle: "Neighborhood & club meet-ups",
    description:
      "Ideal for apartment associations, society meet-ups, and potluck evenings with shared counters, sustainability demos, and kids' activities.",
    defaults: {
      name: "Community gathering",
      schedule: [
        {
          ...createScheduleEntry(1),
          label: "Community Evening Meet",
        },
      ],
      menu: defaultMenu,
      plannedFoodKg: 0,
      inviteLink: PREVIEW_INVITE_LINK,
      surveyPreset: { event_type: "community" },
    },
  },
];

const surveyQuestions: SurveyQuestion[] = [
  {
    id: "donation_preference",
    prompt: "Preferred donation partner for surplus food",
    type: "select",
    required: false,
    options: [
      { value: "feeding-india", label: "Feeding India" },
      { value: "robin-hood", label: "Robin Hood Army" },
      { value: "akshaya-patra", label: "Akshaya Patra" },
      { value: "other", label: "I have my own NGO" },
    ],
  },
  {
    id: "zero_waste_pledge",
    prompt: "Would you like guests to pledge ZeroVaste at RSVP?",
    type: "boolean",
    required: true,
  },
  {
    id: "wastage_donation",
    prompt: "If there is any surplus food, can we coordinate donation to orphan foundations?",
    type: "boolean",
    required: true,
  },
  {
    id: "share_recommendation",
    prompt: "If Zerovaste feels productive, will you recommend it to friends and relatives?",
    type: "boolean",
    required: true,
  },
];

function EventForm() {
  const navigate = useNavigate();
  const api = useApi();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<any>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    eventDate: "",
    surveyCutoffDate: "",
    location: "",
    schedule: [createScheduleEntry(1)],
    menu: defaultMenu,
    expected: {
      adults: 0,
      kids: 0,
      staff: 0,
    },
    plannedFoodKg: 0,
    inviteLink: PREVIEW_INVITE_LINK,
    notes: "",
  });

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId]
  );

  const visibleSurveyQuestions = useMemo(() => {
    return [];
  }, []);

  const isCurrentStepValid = () => {
    switch (activeStep) {
      case 0:
        return Boolean(selectedTemplateId);
      case 1:
        return Boolean(form.name && form.eventDate && form.location);
      case 2:
        return form.schedule.length > 0;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const goBack = () => {
    if (activeStep > 0) {
      setActiveStep((step) => step - 1);
    }
  };

  const applyTemplate = (template: EventTemplate) => {
    setSelectedTemplateId(template.id);
    setForm((prev) => ({
      ...prev,
      ...template.defaults,
      schedule: template.defaults.schedule ?? prev.schedule,
      menu: template.defaults.menu ?? prev.menu,
      inviteLink: template.defaults.inviteLink ?? prev.inviteLink,
    }));
  };

  const handleSurveyChange = (
    question: SurveyQuestion,
    value: string | number | boolean | string[]
  ) => {
    // This function is no longer used as survey state is removed
  };

  const saveEventPlan = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = {
        title: form.name,
        eventDate: form.eventDate || null,
        surveyCutoffDate: form.surveyCutoffDate || null,
        location: form.location,
        status: "draft",
        plannedFoodKg: form.plannedFoodKg ?? null,
        notes: form.notes,
        scheduleSnapshot: form.schedule,
        expectedSnapshot: form.expected,
        menuSnapshot: form.menu,
        surveySnapshot: {},
      };
      const response = await api.post("/events", payload);
      setCreatedEvent(response.data);
      if (response.data.inviteLink) {
        setForm((prev) => ({ ...prev, inviteLink: response.data.inviteLink }));
      }
      return response.data;
    } catch (error) {
      setSaveError(
        "We couldn't save this event. Please check your details and try again."
      );
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const goNext = async () => {
    if (!isCurrentStepValid() || isSaving) {
      return;
    }

    if (activeStep === 4 && !createdEvent) {
      try {
        await saveEventPlan();
      } catch {
        return;
      }
    }

    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    try {
      const saved = createdEvent ?? (await saveEventPlan());
      if (saved?.id) {
        navigate(`/events/${saved.id}/overview`);
      } else {
        navigate("/events");
      }
    } catch {
      // No-op; saveEventPlan already surfaced the error message
    }
  };

  const inviteLinkValue = useMemo(() => {
    if (createdEvent?.inviteLink) {
      return createdEvent.inviteLink;
    }
    if (form.inviteLink) {
      return form.inviteLink;
    }
    return PREVIEW_INVITE_LINK;
  }, [createdEvent, form.inviteLink]);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <section className="space-y-6">
            <header>
              <h2 className="text-xl font-semibold text-slate-900">
                Pick a planning template
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Select the template that best matches your celebration. You can
                always tweak schedule, menu, and surveys later.
              </p>
            </header>
            <div className="grid gap-5 lg:grid-cols-3">
              {templates.map((template) => {
                const isActive = selectedTemplateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={`group relative overflow-hidden rounded-[28px] border p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                      isActive
                        ? "border-brand-400 bg-gradient-to-br from-brand-50 via-white to-brand-50/60 text-slate-800 ring-2 ring-brand-500/40"
                        : "border-orange-100 bg-white text-slate-700 shadow-orange-100/40 hover:border-brand-200"
                    }`}
                  >
                    <div className="pointer-events-none absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-brand-200/30 blur-2xl transition group-hover:opacity-100" />
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? "bg-brand-100 text-brand-700" : "bg-orange-50 text-brand-700"} shadow-sm`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 3h10a2 2 0 0 1 2 2v2H5V5a2 2 0 0 1 2-2zm12 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9h14zm-9 3h6v2H10v-2z"/>
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${isActive ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700"}`}>
                            {template.subtitle}
                          </span>
                        </div>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">
                          {template.name}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                          {template.description}
                        </p>
                        {isActive && (
                          <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17l-3.88-3.88L3.7 13.71 9 19l12-12-1.41-1.41z"/></svg>
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      case 1:
        return (
          <section className="space-y-6">
            <header>
              <h2 className="text-xl font-semibold text-slate-900">
                Event details
              </h2>
            </header>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-800">
                Event name
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Reception dinner"
                  className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-800">
                Event date
                <input
                  required
                  type="date"
                  value={form.eventDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      eventDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-800">
                Survey cutoff date
                <input
                  type="date"
                  value={form.surveyCutoffDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      surveyCutoffDate: event.target.value,
                    }))
                  }
                  max={form.eventDate ? (() => {
                    const eventDate = new Date(form.eventDate);
                    eventDate.setDate(eventDate.getDate() - 1);
                    return eventDate.toISOString().split('T')[0];
                  })() : undefined}
                  className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
                <p className="text-xs text-slate-500">
                  Survey will close on this date (must be before event date)
                </p>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-800 sm:col-span-2">
                Location / venue
                <input
                  required
                  value={form.location}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Hyderabad Palace Grounds"
                  className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
            </div>
          </section>
        );
      case 2:
        return (
          <section className="space-y-8">
            <div className="space-y-5 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm shadow-orange-100/60">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h10a2 2 0 0 1 2 2v2H5V5a2 2 0 0 1 2-2zm12 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9h14zm-9 3h6v2H10v-2z"/></svg></div>
                  <div>
                    <h2 className="text-base font-semibold uppercase tracking-wide text-slate-900">
                      Event schedule
                    </h2>
                    <p className="text-xs text-slate-500">
                      Define days, time windows, and meal categories to power predictions.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                    {form.schedule.length} day{form.schedule.length === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-brand-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow">
                    Total servings: {form.schedule.reduce(
                      (total, entry) => total + Number(entry.servingsPerDay || 0),
                      0
                    )}
                  </span>
                </div>
              </header>

              <div className="space-y-5">
                {form.schedule.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="space-y-5 rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/80"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                          Day {index + 1}
                        </span>
                        <p className="text-xs text-slate-500">Configure schedule details</p>
                      </div>
                      <span className="rounded-full bg-brand-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow">
                        {entry.servingsPerDay} serving{entry.servingsPerDay === 1 ? "" : "s"}
                      </span>
                    </header>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-1 text-xs font-medium text-slate-700">
                        Label
                        <input
                          value={entry.label}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              schedule: prev.schedule.map((item) =>
                                item.id === entry.id
                                  ? { ...item, label: event.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                        placeholder="e.g., Wedding Ceremony"
                        />
                      </label>
                      <label className="space-y-1 text-xs font-medium text-slate-700">
                        Date
                        <input
                          type="date"
                          value={entry.date}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              schedule: prev.schedule.map((item) =>
                                item.id === entry.id
                                  ? { ...item, date: event.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                        />
                      </label>
                      <label className="space-y-1 text-xs font-medium text-slate-700">
                        Servings this day
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={entry.servingsPerDay}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              schedule: prev.schedule.map((item) =>
                                item.id === entry.id
                                  ? {
                                      ...item,
                                      servingsPerDay: Number(event.target.value),
                                    }
                                  : item
                              ),
                            }))
                          }
                          className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                        />
                      </label>
                    </div>
                    <div className="space-y-2 text-xs font-medium text-slate-700">
                      <p className="tracking-wide">
                        Serving timeline (select time windows)
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                        {servingTimelineOptions.map((slot) => {
                          const selectedSlots = (entry.sessionsDescription || "")
                            ? entry.sessionsDescription
                                .split("\n")
                                .map((value) => value.trim())
                                .filter(Boolean)
                            : [];
                          const isSelected = selectedSlots.includes(slot);
                          return (
                            <button
                              key={`${entry.id}-${slot}`}
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  schedule: prev.schedule.map((item) => {
                                    if (item.id !== entry.id) {
                                      return item;
                                    }
                                    const current = (item.sessionsDescription || "")
                                      ? item.sessionsDescription
                                          .split("\n")
                                          .map((value) => value.trim())
                                          .filter(Boolean)
                                      : [];
                                    const next = current.includes(slot)
                                      ? current.filter((value) => value !== slot)
                                      : [...current, slot];
                                    return {
                                      ...item,
                                      sessionsDescription: next.join("\n"),
                                    };
                                  }),
                                }))
                              }
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition ${
                                isSelected
                                  ? "bg-brand-500 text-white shadow"
                                  : "border border-brand-200 text-brand-600 hover:bg-brand-50"
                              }`}
                            >
                              {isSelected && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17l-3.88-3.88L3.7 13.71 9 19l12-12-1.41-1.41z"/></svg>
                              )}
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2 text-xs font-medium text-slate-700">
                      <p className="tracking-wide">Meal categories served</p>
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                        {["Breakfast", "Lunch", "Dinner", "Evening snacks"].map((category) => {
                          const isActive = (entry.categories || []).includes(category);
                          return (
                            <button
                              key={`${entry.id}-${category}`}
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  schedule: prev.schedule.map((item) =>
                                    item.id === entry.id
                                      ? {
                                          ...item,
                                          categories: isActive
                                            ? (item.categories || []).filter((cat) => cat !== category)
                                            : [...(item.categories || []), category],
                                        }
                                      : item
                                  ),
                                }))
                              }
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition ${
                                isActive
                                  ? "bg-brand-500 text-white shadow"
                                  : "border border-brand-200 text-brand-600 hover:bg-brand-50"
                              }`}
                            >
                              {isActive && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17l-3.88-3.88L3.7 13.71 9 19l12-12-1.41-1.41z"/></svg>
                              )}
                              {category}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <label className="block space-y-1 text-xs font-medium text-slate-700">
                      Menu plan for this schedule (list dishes, counters, beverages)
                      <textarea
                        rows={3}
                        value={entry.menuNotes}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            schedule: prev.schedule.map((item) =>
                              item.id === entry.id
                                ? { ...item, menuNotes: event.target.value }
                                : item
                            ),
                          }))
                        }
                        className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                        placeholder="Add dishes, service notes, or vendor details"
                      />
                    </label>

                    {form.schedule.length > 1 && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              schedule: prev.schedule.filter((item) => item.id !== entry.id),
                            }))
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-brand-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600 hover:bg-brand-50"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
                          Remove this day
                        </button>
                      </div>
                    )}
                    {index < form.schedule.length - 1 && (
                      <hr className="border-dashed border-orange-100" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      schedule: [
                        ...prev.schedule,
                        createScheduleEntry(prev.schedule.length + 1),
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-700"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
                  Add another day
                </button>
              </div>
            </div>
          </section>
        );
      case 3:
        return (
          <section className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-orange-100 bg-orange-50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                Expected attendance
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {(["adults", "kids", "staff"] as const).map((key) => {
                  const value = form.expected[key];
                  const label =
                    key === "staff"
                      ? "Support staff"
                      : key.charAt(0).toUpperCase() + key.slice(1);
                  return (
                    <label
                      key={key}
                      className="space-y-1 text-xs font-medium text-slate-700"
                    >
                      {label}
                      <input
                        type="text"
                        inputMode="numeric"
                        value={value}
                        onChange={(event) => {
                          const raw = event.target.value.replace(/[^\d]/g, "");
                          const nextValue = raw.length ? Number(raw) : 0;
                          setForm((prev) => ({
                            ...prev,
                            expected: {
                              ...prev.expected,
                              [key]: nextValue,
                            },
                          }));
                        }}
                        className={clsx(
                          "w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200",
                          value === 0 ? "text-slate-400" : "text-slate-900"
                        )}
                      />
                    </label>
                  );
                })}
              </div>
                  <p className="text-xs text-slate-500">
                    Zerovaste will gather precise RSVPs and menu preferences before
                    the deadline to fine tune these numbers.
                  </p>
            </div>
          </section>
        );
      case 4:
        return (
          <section className="space-y-6">
            <header>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Review & confirm
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Confirm the details below. You can still edit before and after submitting.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="rounded-full border border-brand-200 px-3 py-1 text-brand-600 hover:bg-brand-50"
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="rounded-full border border-brand-200 px-3 py-1 text-brand-600 hover:bg-brand-50"
                  >
                    Edit schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="rounded-full border border-brand-200 px-3 py-1 text-brand-600 hover:bg-brand-50"
                  >
                    Edit guests
                  </button>
                </div>
              </div>
            </header>
            <div className="grid gap-6">
              <article className="space-y-8 rounded-[28px] border border-orange-200 bg-white p-8 shadow-lg shadow-orange-100/80">
                <header className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h10a2 2 0 0 1 2 2v2H5V5a2 2 0 0 1 2-2zm12 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9h14zm-9 3h6v2H10v-2z"/></svg>
                    </div>
                    <div>
                      <h3 className="mt-1 text-2xl font-bold text-slate-900">Review your event plan</h3>
                    </div>
                  </div>
                  <div className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow">
                    {steps[activeStep]}
                  </div>
                </header>

                <section className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4 rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100/30 p-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-600">Core details</h4>
                      <button
                        type="button"
                        onClick={() => setActiveStep(1)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        Edit
                      </button>
                    </div>
                    <dl className="space-y-3 text-base text-slate-800">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Event name</dt>
                        <dd className="text-lg font-semibold text-slate-900">{form.name || <span className="text-orange-400">Not set</span>}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Event date</dt>
                        <dd className="text-lg font-semibold text-slate-900">{form.eventDate || <span className="text-orange-400">TBD</span>}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Location / venue</dt>
                        <dd className="text-lg font-semibold text-slate-900">{form.location || <span className="text-orange-400">TBD</span>}</dd>
                      </div>
                    </dl>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Invite link</p>
                      <code className="mt-2 block break-all rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-brand-600 shadow-inner shadow-orange-200/60">
                        {inviteLinkValue}
                      </code>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-3xl border border-orange-100 bg-white p-6 shadow-inner shadow-orange-100/70">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-600">Expected guests</h4>
                      <button
                        type="button"
                        onClick={() => setActiveStep(3)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center text-slate-800">
                      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Adults</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{form.expected.adults}</p>
                      </div>
                      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Kids</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{form.expected.kids}</p>
                      </div>
                      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Support staff</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{form.expected.staff}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">
                      Total expected guests: <span className="font-semibold text-slate-900">{form.expected.adults + form.expected.kids + form.expected.staff}</span>
                    </p>
                  </div>
                </section>

                <section className="space-y-5 rounded-3xl border border-brand-100 bg-gradient-to-bl from-white via-orange-50 to-white p-6">
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7 3h4v11h-4V10z"/></svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-600">Schedule overview</h4>
                        <p className="text-sm text-slate-600">
                          Time windows, servings, and meal categories fuel predictions and procurement recommendations.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-brand-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                        {form.schedule.length} schedule{form.schedule.length === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600 hover:bg-brand-50"
                      >
                        Edit schedule
                      </button>
                    </div>
                  </header>

                  <div className="space-y-4">
                    {form.schedule.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm shadow-orange-100/70"
                      >
                        <header className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Schedule {index + 1}</p>
                            <h5 className="text-base font-semibold text-slate-900">
                              {entry.label || `Serving window ${index + 1}`} • {entry.date || "Date TBD"}
                            </h5>
                          </div>
                          <span className="rounded-full bg-brand-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow">
                            {entry.servingsPerDay} serving{entry.servingsPerDay === 1 ? "" : "s"}
                          </span>
                        </header>

                        <dl className="mt-5 grid gap-4 text-sm text-slate-700 md:grid-cols-3">
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-slate-500">Serving timeline</dt>
                            <dd className="mt-2 flex flex-wrap gap-2">
                              {entry.sessionsDescription && entry.sessionsDescription.trim() ? (
                                entry.sessionsDescription
                                  .split("\n")
                                  .map((slot) => slot.trim())
                                  .filter(Boolean)
                                  .map((slot) => (
                                    <span
                                      key={`${entry.id}-${slot}`}
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
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-slate-500">Meal categories served</dt>
                            <dd className="mt-2 flex flex-wrap gap-2">
                              {entry.categories.length > 0 ? (
                                entry.categories.map((category) => (
                                  <span
                                    key={`${entry.id}-${category}`}
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
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-slate-500">Menu plan notes</dt>
                            <dd className="mt-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-slate-700">
                              {entry.menuNotes?.trim() ? entry.menuNotes : "No extra menu notes added"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                </section>
              </article>
            </div>
            <footer className="text-center text-xs text-slate-500">
              Thanks for championing ZeroVaste. Share this experience with friends
              so every celebration feeds people, not landfills.
            </footer>
          </section>
        );
      case 5:
        return (
          <section className="space-y-8">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12a5 5 0 0 1 8.2-3.8l1.2 1 1.2-1A5 5 0 1 1 19.9 15l-7 5-7-5A5 5 0 0 1 3.9 12z"/></svg>
                </div>
                <div>
                  <h3 className="mt-1 text-2xl font-bold text-slate-900">Share your Zerovaste invitation</h3>
                  <p className="text-sm text-slate-600">Send the link or QR code to collect guest preferences quickly.</p>
                </div>
              </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
              {!createdEvent && (
                <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50 p-6 text-sm text-slate-700 lg:col-span-2">
                  Save your event to unlock the QR code and sharing shortcuts. Return to the previous step if you need to edit details before submitting.
                </div>
              )}

              {createdEvent && (
                <>
                  <article className="space-y-5 rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/80">
                    <header className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v2H4V5zm0 12h16v2H4v-2zm2-8h2v6H6V9zm4 0h2v6h-2V9zm4 0h2v6h-2V9zm4 0h2v6h-2V9z"/></svg>
                        </div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-600">QR code for invitations</h4>
                      </div>
                    </header>
                    <p className="text-sm text-slate-600">Guests can scan to RSVP and share preferences in seconds.</p>
                    <div className="flex items-center justify-center rounded-3xl bg-orange-50 p-6 shadow-inner shadow-orange-200/60">
                      <QRCodeSVG
                        value={inviteLinkValue}
                        size={240}
                        fgColor="#1f2937"
                        bgColor="#fff7ed"
                        level="Q"
                        includeMargin
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <code className="block break-all rounded-full bg-orange-50 px-4 py-2 text-center text-xs font-semibold text-brand-600">
                        {inviteLinkValue}
                      </code>
                      <button
                        type="button"
                        onClick={() => { void navigator.clipboard?.writeText(inviteLinkValue); }}
                        className="inline-flex items-center justify-center rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600 hover:bg-brand-50"
                      >
                        Copy link
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Tip: Add this QR to printed invites or event signage.</p>
                  </article>

                  <aside className="space-y-5 rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/80">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-600">Share via WhatsApp</h4>
                        <button
                          type="button"
                          onClick={() => { void navigator.clipboard?.writeText(`Hey! We're planning ${form.name || "our celebration"} on ${form.eventDate || "the upcoming date"}. Tap to confirm how many of you will join and vote on the menu. Let's avoid food waste together: ${inviteLinkValue}`); }}
                          className="rounded-full border border-brand-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600 hover:bg-brand-50"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">Copy the message or open WhatsApp with the invite pre-filled.</p>
                      <textarea
                        readOnly
                        className="w-full rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-slate-700"
                        rows={4}
                        value={`Hey! We're planning ${form.name || "our celebration"} on ${form.eventDate || "the upcoming date"}. Tap to confirm how many of you will join and vote on the menu. Let's avoid food waste together: ${inviteLinkValue}`}
                      />
                      <a
                        className="inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-700"
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Hey! We're planning ${form.name || "our celebration"} on ${form.eventDate || "the upcoming date"}. Tap to confirm how many of you will join and vote on the menu. Let's avoid food waste together: ${inviteLinkValue}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open WhatsApp
                      </a>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-600">Share via SMS</h4>
                        <button
                          type="button"
                          onClick={() => { void navigator.clipboard?.writeText(`You're invited to ${form.name || "our celebration"}! RSVP here and help us avoid food waste: ${inviteLinkValue}`); }}
                          className="rounded-full border border-brand-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600 hover:bg-brand-50"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">Use your phone's SMS composer to send the invite link.</p>
                      <textarea
                        readOnly
                        className="w-full rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-slate-700"
                        rows={3}
                        value={`You're invited to ${form.name || "our celebration"}! RSVP here and help us avoid food waste: ${inviteLinkValue}`}
                      />
                      <a
                        className="inline-flex w-full items-center justify-center rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600 hover:bg-brand-50"
                        href={`sms:?body=${encodeURIComponent(
                          `You're invited to ${form.name || "our celebration"}! RSVP here and help us avoid food waste: ${inviteLinkValue}`
                        )}`}
                      >
                        Compose SMS
                      </a>
                    </div>
                  </aside>
                </>
              )}
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">
          Plan a new event
        </h1>
      </header>

      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm shadow-orange-100/70">
        <div className="border-b border-orange-100 bg-orange-50 px-6 py-4">
          <ol className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {steps.map((label, index) => {
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => !isSaving && setActiveStep(index)}
                    className={`flex items-center gap-2 rounded-full px-3 py-1 transition ${
                      isActive
                        ? "bg-brand-500 text-white"
                        : isCompleted
                          ? "bg-brand-100 text-brand-700"
                          : "bg-white text-slate-500"
                    }`}
                    disabled={isSaving}
                  >
                    <span className="font-bold">{index + 1}</span>
                    {label}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-8">
          {renderStepContent()}

          <footer className="mt-8 flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={activeStep === 0 || isSaving}
              className="rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            {saveError && activeStep === 5 && (
              <p className="flex-1 text-right text-xs text-red-500">
                {saveError}
              </p>
            )}
            {activeStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!isCurrentStepValid() || ((activeStep === 4 || activeStep === 5) && isSaving)}
                className="rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {activeStep === 4 ? (isSaving ? "Submitting..." : "Submit") : activeStep === 5 && isSaving ? "Saving..." : "Next"}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSaving ? "Saving..." : createdEvent ? "Go to event dashboard" : "Save event plan"}
              </button>
            )}
          </footer>
        </form>
      </div>
    </section>
  );
}

export default EventForm;

