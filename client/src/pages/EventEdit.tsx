import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "../hooks/useApi";

type EventRecord = {
  id: string;
  title: string | null;
  eventDate: string | null;
  surveyCutoffDate: string | null;
  location: string | null;
  status: string | null;
  plannedFoodKg: number | null;
  inviteLink: string | null;
  notes: string | null;
  expectedSnapshot?: {
    adults?: number | null;
    kids?: number | null;
    staff?: number | null;
  } | null;
};

type FormState = {
  title: string;
  eventDate: string;
  surveyCutoffDate: string;
  location: string;
  status: string;
  plannedFoodKg: string;
  notes: string;
  expectedAdults: string;
  expectedKids: string;
  expectedStaff: string;
};

const defaultFormState: FormState = {
  title: "",
  eventDate: "",
  surveyCutoffDate: "",
  location: "",
  status: "draft",
  plannedFoodKg: "",
  notes: "",
  expectedAdults: "",
  expectedKids: "",
  expectedStaff: "",
};

function buildFormState(event: EventRecord | null): FormState {
  if (!event) {
    return defaultFormState;
  }

  const snapshot = event.expectedSnapshot ?? {};
  return {
    title: event.title ?? "",
    eventDate: event.eventDate ?? "",
    surveyCutoffDate: event.surveyCutoffDate ?? "",
    location: event.location ?? "",
    status: event.status ?? "draft",
    plannedFoodKg:
      event.plannedFoodKg !== null && event.plannedFoodKg !== undefined
        ? String(event.plannedFoodKg)
        : "",
    notes: event.notes ?? "",
    expectedAdults:
      snapshot?.adults !== undefined && snapshot?.adults !== null
        ? String(snapshot.adults)
        : "",
    expectedKids:
      snapshot?.kids !== undefined && snapshot?.kids !== null
        ? String(snapshot.kids)
        : "",
    expectedStaff:
      snapshot?.staff !== undefined && snapshot?.staff !== null
        ? String(snapshot.staff)
        : "",
  };
}

function formatInviteLink(inviteLink: string | null, id: string | null) {
  if (inviteLink) {
    return inviteLink;
  }
  if (id) {
    const origin =
      typeof window !== "undefined" && window.location
        ? window.location.origin
        : import.meta.env.VITE_FRONTEND_URL || "https://zerowaste-06c0.onrender.com";
    return `${origin}/invite/${id}`;
  }
  return null;
}

type SupportedLocale = "en" | "ta" | "hi" | "te" | "kn";

type EventEditLocale = {
  backLink: string;
  headerBadge: string;
  headerTitle: string;
  headerDescription: string;
  inviteLinkLabel: string;
  loading: string;
  loadError: string;
  form: {
    eventTitle: string;
    eventTitlePlaceholder: string;
    eventDate: string;
    location: string;
    locationPlaceholder: string;
    status: string;
    plannedFood: string;
    expectedHeadcount: string;
    adults: string;
    kids: string;
    staff: string;
    notes: string;
    notesPlaceholder: string;
  };
  statusOptions: {
    draft: string;
    published: string;
    completed: string;
  };
  buttons: {
    cancel: string;
    save: string;
    saving: string;
  };
  saveError: string;
};

const eventEditLocales: Record<SupportedLocale, EventEditLocale> = {
  en: {
    backLink: "← Back to events",
    headerBadge: "Manage event plan",
    headerTitle: "Edit event details",
    headerDescription:
      "Fine tune the information shared with your guests and internal teams. Updating these fields keeps the ZeroVaste forecasts accurate.",
    inviteLinkLabel: "Invitation link",
    loading: "Loading event details…",
    loadError: "We couldn't load this event. Please try again soon.",
    form: {
      eventTitle: "Event title",
      eventTitlePlaceholder: "Wedding reception dinner",
      eventDate: "Event date",
      location: "Location / venue",
      locationPlaceholder: "Hyderabad Palace Grounds",
      status: "Status",
      plannedFood: "Planned food (kg)",
      expectedHeadcount: "Expected headcount",
      adults: "Adults",
      kids: "Kids",
      staff: "Support staff",
      notes: "Notes for ZeroVaste team",
      notesPlaceholder: "Add additional context or coordination notes…",
    },
    statusOptions: {
      draft: "Draft",
      published: "Published",
      completed: "Completed",
    },
    buttons: {
      cancel: "Cancel",
      save: "Save changes",
      saving: "Saving…",
    },
    saveError:
      "We couldn't save your changes. Please review the fields and try again.",
  },
  ta: {
    backLink: "← நிகழ்வுகளுக்கு திரும்பு",
    headerBadge: "நிகழ்வு திட்ட மேலாண்மை",
    headerTitle: "நிகழ்வு விவரங்களைத் திருத்து",
    headerDescription:
      "விருந்தினர்களும் உங்கள் அணியும் பகிரும் தகவல்களை நுணுக்கமாக மாற்றுங்கள். இப்புலங்களை புதுப்பிப்பது ZeroVaste முன்னறிவிப்புகளை துல்லியமாக வைத்திருக்கிறது.",
    inviteLinkLabel: "அழைப்புக் இணைப்பு",
    loading: "நிகழ்வு விவரங்கள் ஏற்றப்படுகின்றன…",
    loadError:
      "இந்த நிகழ்வை ஏற்ற முடியவில்லை. தயவுசெய்து சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.",
    form: {
      eventTitle: "நிகழ்வு தலைப்பு",
      eventTitlePlaceholder: "திருமண வரவேற்பு விருந்து",
      eventDate: "நிகழ்வு தேதி",
      location: "இடம் / நிகழ்விடம்",
      locationPlaceholder: "சென்னை • கோட்டை மைதானம்",
      status: "நிலை",
      plannedFood: "திட்டமிட்ட உணவு (கிலோ)",
      expectedHeadcount: "எதிர்பார்க்கப்படும் வருகை",
      adults: "பெரியவர்கள்",
      kids: "குழந்தைகள்",
      staff: "ஆதரவு பணியாளர்கள்",
      notes: "ZeroVaste அணிக்கான குறிப்புகள்",
      notesPlaceholder:
        "அமைப்புத் தகவல்கள், குறிப்புகள், ஒருங்கிணைப்பு தேவை ஆகியவற்றை உள்ளிடுங்கள்…",
    },
    statusOptions: {
      draft: "வரைவு",
      published: "வெளியிடப்பட்டது",
      completed: "முடிக்கப்பட்டது",
    },
    buttons: {
      cancel: "ரத்து செய்",
      save: "மாற்றங்களை சேமிக்கவும்",
      saving: "சேமிக்கிறது…",
    },
    saveError:
      "நீங்கள் செய்த மாற்றங்கள் சேமிக்கப்படவில்லை. புலங்களை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
  },
  hi: {
    backLink: "← कार्यक्रमों पर वापस जाएँ",
    headerBadge: "कार्यक्रम योजना प्रबंधन",
    headerTitle: "कार्यक्रम विवरण संपादित करें",
    headerDescription:
      "मेहमानों और आपकी टीम के साथ साझा जानकारी को परिष्कृत करें। इन फ़ील्ड्स को अपडेट करने से ZeroVaste पूर्वानुमान सटीक रहते हैं।",
    inviteLinkLabel: "आमंत्रण लिंक",
    loading: "कार्यक्रम का विवरण लोड हो रहा है…",
    loadError: "हम यह कार्यक्रम लोड नहीं कर सके। कृपया थोड़ी देर बाद फिर प्रयास करें।",
    form: {
      eventTitle: "कार्यक्रम का शीर्षक",
      eventTitlePlaceholder: "गृह प्रवेश रात्रिभोज",
      eventDate: "कार्यक्रम तिथि",
      location: "स्थान / स्थल",
      locationPlaceholder: "दिल्ली • टाउन हॉल",
      status: "स्थिति",
      plannedFood: "योजना बनाया भोजन (किग्रा)",
      expectedHeadcount: "अपेक्षित उपस्थिति",
      adults: "बड़े",
      kids: "बच्चे",
      staff: "सहायक स्टाफ",
      notes: "ZeroVaste टीम के लिए नोट्स",
      notesPlaceholder:
        "अतिरिक्त संदर्भ, मेनू नोट्स या समन्वय विवरण साझा करें…",
    },
    statusOptions: {
      draft: "मसौदा",
      published: "प्रकाशित",
      completed: "पूर्ण",
    },
    buttons: {
      cancel: "रद्द करें",
      save: "परिवर्तन सहेजें",
      saving: "सहेजा जा रहा है…",
    },
    saveError:
      "हम आपके परिवर्तन सहेज नहीं सके। कृपया फ़ील्ड जाँचें और पुनः प्रयास करें।",
  },
  te: {
    backLink: "← ఈవెంట్లకు తిరిగి వెళ్ళండి",
    headerBadge: "ఈవెంట్ ప్రణాళిక నిర్వహణ",
    headerTitle: "ఈవెంట్ వివరాలను సవరించండి",
    headerDescription:
      "అతిథులు మరియు మీ బృందంతో పంచుకునే సమాచారాన్ని మెరుగుపరచండి. ఈ ఫీల్డులను నవీకరించడం ద్వారా ZeroVaste అంచనాలు సరిగ్గా ఉంటాయి.",
    inviteLinkLabel: "ఆహ్వాన లింక్",
    loading: "ఈవెంట్ వివరాలు లోడ్ అవుతున్నాయి…",
    loadError: "ఈ ఈవెంట్‌ను లోడ్ చేయలేకపోయాం. దయచేసి కొద్దిసేపటి తర్వాత ప్రయత్నించండి.",
    form: {
      eventTitle: "ఈవెంట్ శీర్షిక",
      eventTitlePlaceholder: "గృహప్రవేశ విందు",
      eventDate: "ఈవెంట్ తేదీ",
      location: "స్థానం / వేడుక ప్రాంగణం",
      locationPlaceholder: "హైదరాబాద్ • కల్చరల్ క్లబ్",
      status: "స్థితి",
      plannedFood: "ప్రణాళిక చేసిన ఆహారం (కిలోలు)",
      expectedHeadcount: "అంచనా పాల్గొనేవారు",
      adults: "పెద్దలు",
      kids: "పిల్లలు",
      staff: "సహాయక సిబ్బంది",
      notes: "ZeroVaste బృందానికి గమనికలు",
      notesPlaceholder:
        "అదనపు సమాచారాన్ని లేదా సమన్వయ వివరాలను ఇక్కడ పంచుకోండి…",
    },
    statusOptions: {
      draft: "ప్రారూపం",
      published: "ప్రచురించబడింది",
      completed: "పూర్తైంది",
    },
    buttons: {
      cancel: "రద్దు చేయండి",
      save: "మార్పులను సేవ్ చేయండి",
      saving: "సేవ్ అవుతోంది…",
    },
    saveError:
      "మీ మార్పులను సేవ్ చేయలేకపోయాం. దయచేసి ఫీల్డులను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.",
  },
  kn: {
    backLink: "← ಕಾರ್ಯಕ್ರಮಗಳಿಗೆ ಹಿಂತಿರುಗಿ",
    headerBadge: "ಕಾರ್ಯಕ್ರಮ ಯೋಜನೆ ನಿರ್ವಹಣೆ",
    headerTitle: "ಕಾರ್ಯಕ್ರಮ ವಿವರಗಳನ್ನು ಸಂಪಾದಿಸಿ",
    headerDescription:
      "ಅತಿಥಿಗಳು ಮತ್ತು ನಿಮ್ಮ ತಂಡದೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳುವ ಮಾಹಿತಿಯನ್ನು ಹೆಚ್ಚು ನಿಖರಗೊಳಿಸಿ. ಈ ಕ್ಷೇತ್ರಗಳನ್ನು ನವೀಕರಿಸುವುದು ZeroVaste ಅಂದಾಜುಗಳನ್ನು ಸರಿಯಾಗಿ ಇಡುತ್ತದೆ.",
    inviteLinkLabel: "ಆಮಂತ್ರಣ ಲಿಂಕ್",
    loading: "ಕಾರ್ಯಕ್ರಮ ವಿವರಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…",
    loadError:
      "ಈ ಕಾರ್ಯಕ್ರಮವನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    form: {
      eventTitle: "ಕಾರ್ಯಕ್ರಮ ಶೀರ್ಷಿಕೆ",
      eventTitlePlaceholder: "ಗೃಹ ಪ್ರವೇಶ ಔತಣ",
      eventDate: "ಕಾರ್ಯಕ್ರಮ ದಿನಾಂಕ",
      location: "ಸ್ಥಳ / ವೇದಿಕೆ",
      locationPlaceholder: "ಬೆಂಗಳೂರು • ಜಯನಗರ ಸಭಾಂಗಣ",
      status: "ಸ್ಥಿತಿ",
      plannedFood: "ಯೋಜಿತ ಆಹಾರ (ಕೆಜಿ)",
      expectedHeadcount: "ಅಪೇಕ್ಷಿತ ಹಾಜರಿ",
      adults: "ವಯಸ್ಕರು",
      kids: "ಮಕ್ಕಳು",
      staff: "ಸಹಾಯಕ ಸಿಬ್ಬಂದಿ",
      notes: "ZeroVaste ತಂಡಕ್ಕೆ ಟಿಪ್ಪಣಿಗಳು",
      notesPlaceholder:
        "ಹೆಚ್ಚುವರಿ ವಿವರಗಳು ಅಥವಾ ಸಮನ್ವಯ ಸೂಚನೆಗಳನ್ನು ಇಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ…",
    },
    statusOptions: {
      draft: "ಕರಡು",
      published: "ಪ್ರಕಟಿಸಲಾಗಿದೆ",
      completed: "ಪೂರ್ಣಗೊಂಡಿದೆ",
    },
    buttons: {
      cancel: "ರದ್ದು",
      save: "ಮாற்றಗಳನ್ನು ಉಳಿಸಿ",
      saving: "ಉಳಿಸಲಾಗುತ್ತಿದೆ…",
    },
    saveError:
      "ನಿಮ್ಮ ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಲಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಕ್ಷೇತ್ರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
  },
};

function EventEdit() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const { i18n } = useTranslation("common");
  const language = (i18n.language ?? "en").split("-")[0] as SupportedLocale;
  const text = useMemo(
    () => eventEditLocales[language] ?? eventEditLocales.en,
    [language]
  );

  const [form, setForm] = useState<FormState>(defaultFormState);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<"load_failed" | null>(null);
  const [saveErrorCode, setSaveErrorCode] = useState<"save_failed" | null>(null);
  const [event, setEvent] = useState<EventRecord | null>(null);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    let ignore = false;
    setLoading(true);
    setLoadError(null);
    api
      .get<EventRecord>(`/events/${eventId}`)
      .then((response) => {
        if (ignore) return;
        setEvent(response.data);
        setForm(buildFormState(response.data));
      })
      .catch((err) => {
        if (ignore) return;
        console.error(err);
        setLoadError("load_failed");
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [api, eventId]);

  const inviteLink = useMemo(
    () => formatInviteLink(event?.inviteLink ?? null, event?.id ?? null),
    [event]
  );

  if (!eventId) {
    return <Navigate to="/events" replace />;
  }

  const handleSubmit = async (submittedEvent: FormEvent<HTMLFormElement>) => {
    submittedEvent.preventDefault();
    if (!eventId) {
      return;
    }
    setSaving(true);
    setSaveErrorCode(null);

    try {
      const payload: Partial<EventRecord> & {
        expectedSnapshot: EventRecord["expectedSnapshot"];
      } = {
        title: form.title.trim(),
        eventDate: form.eventDate ? form.eventDate : null,
        surveyCutoffDate: form.surveyCutoffDate || null,
        location: form.location ? form.location.trim() : null,
        status: form.status as EventRecord["status"],
        plannedFoodKg:
          form.plannedFoodKg.trim() !== ""
            ? Number(form.plannedFoodKg)
            : null,
        notes: form.notes.trim() !== "" ? form.notes.trim() : null,
        expectedSnapshot: null,
      };

      const expectedSnapshot: NonNullable<
        EventRecord["expectedSnapshot"]
      > = {};

      if (form.expectedAdults.trim() !== "") {
        expectedSnapshot.adults = Number(form.expectedAdults);
      }
      if (form.expectedKids.trim() !== "") {
        expectedSnapshot.kids = Number(form.expectedKids);
      }
      if (form.expectedStaff.trim() !== "") {
        expectedSnapshot.staff = Number(form.expectedStaff);
      }

      if (Object.keys(expectedSnapshot).length > 0) {
        payload.expectedSnapshot = expectedSnapshot;
      }

      await api.put(`/events/${eventId}`, payload);
      navigate(`/events/${eventId}/overview`);
    } catch (err) {
      console.error(err);
      setSaveErrorCode("save_failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-4">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-600 hover:bg-brand-50"
        >
          {text.backLink}
        </Link>
        <div className="rounded-3xl bg-white p-6 shadow-sm shadow-orange-100/70">
          <p className="text-xs uppercase tracking-wide text-brand-600">
            {text.headerBadge}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            {text.headerTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {text.headerDescription}
          </p>
          {inviteLink && (
            <div className="mt-4 rounded-2xl bg-brand-500/5 px-4 py-3 text-xs text-brand-700">
              <p className="font-semibold uppercase tracking-wide">
                {text.inviteLinkLabel}
              </p>
              <code className="mt-1 block break-all text-[11px]">
                {inviteLink}
              </code>
            </div>
          )}
        </div>
      </header>

      {loading && (
        <div className="rounded-3xl border border-orange-100 bg-white p-6 text-sm text-slate-600 shadow-sm">
          {text.loading}
        </div>
      )}

      {loadError && !loading && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 shadow-sm">
          {text.loadError}
        </div>
      )}

      {!loading && !loadError && event && (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-orange-100 bg-white p-8 shadow-sm shadow-orange-100/70"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-800">
              {text.form.eventTitle}
              <input
                value={form.title}
                onChange={(evt) =>
                  setForm((prev) => ({ ...prev, title: evt.target.value }))
                }
                required
                placeholder={text.form.eventTitlePlaceholder}
                className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-800">
              {text.form.eventDate}
              <input
                type="date"
                value={form.eventDate}
                onChange={(evt) => {
                  const eventDate = evt.target.value;
                  // Auto-populate survey cutoff date as one day before event date
                  let surveyCutoffDate = "";
                  if (eventDate) {
                    const cutoffDate = new Date(eventDate);
                    cutoffDate.setDate(cutoffDate.getDate() - 1);
                    surveyCutoffDate = cutoffDate.toISOString().split('T')[0];
                  }
                  setForm((prev) => ({
                    ...prev,
                    eventDate,
                    surveyCutoffDate,
                  }));
                }}
                className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-800">
              Survey cutoff date
              <input
                type="date"
                value={form.surveyCutoffDate}
                onChange={(evt) =>
                  setForm((prev) => ({ ...prev, surveyCutoffDate: evt.target.value }))
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
            <label className="space-y-2 text-sm font-medium text-slate-800">
              {text.form.location}
              <input
                value={form.location}
                onChange={(evt) =>
                  setForm((prev) => ({ ...prev, location: evt.target.value }))
                }
                placeholder={text.form.locationPlaceholder}
                className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-800">
              {text.form.status}
              <select
                value={form.status}
                onChange={(evt) =>
                  setForm((prev) => ({ ...prev, status: evt.target.value }))
                }
                className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="draft">{text.statusOptions.draft}</option>
                <option value="published">{text.statusOptions.published}</option>
                <option value="completed">{text.statusOptions.completed}</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-800">
              {text.form.plannedFood}
              <input
                type="number"
                min={0}
                step={0.1}
                value={form.plannedFoodKg}
                onChange={(evt) =>
                  setForm((prev) => ({
                    ...prev,
                    plannedFoodKg: evt.target.value,
                  }))
                }
                placeholder="180"
                className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
            <div className="space-y-2 text-sm font-medium text-slate-800">
              {text.form.expectedHeadcount}
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {text.form.adults}
                  <input
                    type="number"
                    min={0}
                    value={form.expectedAdults}
                    onChange={(evt) =>
                      setForm((prev) => ({
                        ...prev,
                        expectedAdults: evt.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {text.form.kids}
                  <input
                    type="number"
                    min={0}
                    value={form.expectedKids}
                    onChange={(evt) =>
                      setForm((prev) => ({
                        ...prev,
                        expectedKids: evt.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {text.form.staff}
                  <input
                    type="number"
                    min={0}
                    value={form.expectedStaff}
                    onChange={(evt) =>
                      setForm((prev) => ({
                        ...prev,
                        expectedStaff: evt.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </label>
              </div>
            </div>
            <label className="lg:col-span-2 space-y-2 text-sm font-medium text-slate-800">
              {text.form.notes}
              <textarea
                rows={4}
                value={form.notes}
                onChange={(evt) =>
                  setForm((prev) => ({ ...prev, notes: evt.target.value }))
                }
                placeholder={text.form.notesPlaceholder}
                className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
          </div>

          {saveErrorCode && (
            <p className="text-sm text-red-600">{text.saveError}</p>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
            >
              {text.buttons.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? text.buttons.saving : text.buttons.save}
            </button>
          </footer>
        </form>
      )}
    </section>
  );
}

export default EventEdit;

