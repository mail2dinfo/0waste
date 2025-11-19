import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";

const PRODUCTION_URL = import.meta.env.VITE_FRONTEND_URL || 
  (typeof window !== "undefined" ? window.location.origin : "");

// Normalize invite link to use production URL instead of localhost
function normalizeInviteLink(inviteLink: string | null, eventId: string | null): string | null {
  if (!inviteLink && !eventId) return null;
  if (!inviteLink && eventId) {
    return `${PRODUCTION_URL}/invite/${eventId}`;
  }
  if (inviteLink && inviteLink.includes('localhost')) {
    // Replace localhost URL with production URL
    if (eventId) {
      return `${PRODUCTION_URL}/invite/${eventId}`;
    }
    // Extract eventId from localhost URL if possible
    const match = inviteLink.match(/\/invite\/([^\/]+)/);
    if (match && match[1]) {
      return `${PRODUCTION_URL}/invite/${match[1]}`;
    }
  }
  return inviteLink;
}

type EventListItem = {
  id: string;
  title: string;
  eventDate: string | null;
  location: string | null;
  status: string | null;
  plannedFoodKg: number | null;
  inviteLink: string | null;
  notes?: string | null;
  guests?: Array<{ id: string }>;
  menu?: Array<{ id: string }>;
  predictions?: Array<{ id: string }>;
  expectedSnapshot?: {
    adults?: number;
    kids?: number;
    staff?: number;
  } | null;
};

type SupportedLocale = "en" | "ta" | "hi" | "te" | "kn";

type EventLocale = {
  dateLocale: string;
  title: string;
  description: string;
  statsEvents: string;
  statsGuests: string;
  createButton: string;
  loading: string;
  error: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyCta: string;
  locationFallback: string;
  metrics: {
    expectedGuests: string;
    rsvpsCaptured: string;
    menuItems: string;
    predictions: string;
    plannedFood: string;
    plannedFoodUnit: string;
    plannedFoodUnknown: string;
  };
  inviteLink: string;
  actions: {
    viewIntelligence: string;
    guestResponses: string;
    predictionLog: string;
    editEvent: string;
  };
  status: {
    draft: string;
    published: string;
    completed: string;
  };
  dateNotSet: string;
};

const eventLocales: Record<SupportedLocale, EventLocale> = {
  en: {
    dateLocale: "en-IN",
    title: "Events",
    description:
      "Review each celebration you are planning with ZeroVaste. Open an event to access its intelligence dashboard, manage guests, or tweak the plan.",
    statsEvents: "Events hosted",
    statsGuests: "Guests planned",
    createButton: "Create event",
    loading: "Loading your events…",
    error: "We couldn't load your events right now. Please try again in a moment.",
    emptyTitle: "You haven't added any events yet.",
    emptyDescription:
      "Start by creating a ZeroVaste event plan. We'll help you gather RSVPs, forecast meals, and reduce food waste.",
    emptyCta: "Plan your first event",
    locationFallback: "Location to be confirmed",
    metrics: {
      expectedGuests: "Guests expected",
      rsvpsCaptured: "RSVPs captured",
      menuItems: "Menu items",
      predictions: "Predictions",
      plannedFood: "Planned food",
      plannedFoodUnit: "kg",
      plannedFoodUnknown: "TBD",
    },
    inviteLink: "Invitation link",
    actions: {
      viewIntelligence: "View event intelligence",
      guestResponses: "Guest responses",
      predictionLog: "Prediction log",
      editEvent: "Edit event plan",
    },
    status: {
      draft: "Draft",
      published: "Published",
      completed: "Completed",
    },
    dateNotSet: "Date not set yet",
  },
  ta: {
    dateLocale: "ta-IN",
    title: "நிகழ்வுகள்",
    description:
      "நீங்கள் திட்டமிடும் ஒவ்வொரு ZeroVaste கொண்டாட்டத்தையும் இங்கிருந்து பராமரிக்கவும். நிகழ்வைத் திறந்து அறிவுக் கண்காணிப்பை பார்வையிடுங்கள், விருந்தினர்களை நிர்வகிக்கவும், திட்டத்தை மாற்றவும்.",
    statsEvents: "நிகழ்வுகள்",
    statsGuests: "திட்டமிட்ட விருந்தினர்கள்",
    createButton: "புதிய நிகழ்வு",
    loading: "உங்கள் நிகழ்வுகள் ஏற்றப்படுகின்றன…",
    error: "இப்போது உங்கள் நிகழ்வுகளை ஏற்ற முடியவில்லை. சில நொடி கழித்து மீண்டும் முயற்சிக்கவும்.",
    emptyTitle: "இன்னும் எந்த நிகழ்வும் சேர்க்கப்படவில்லை.",
    emptyDescription:
      "ZeroVaste நிகழ்வு திட்டத்துடன் தொடங்குங்கள். RSVP-ஐ சேகரிக்க, உணவு முன்னறிவிப்பை உருவாக்க, உணவுக் கழிவை குறைக்க நாம் உதவுவோம்.",
    emptyCta: "உங்கள் முதல் நிகழ்வை திட்டமிடுங்கள்",
    locationFallback: "இடம் பின்னர் உறுதிப்படுத்தப்படும்",
    metrics: {
      expectedGuests: "எதிர்பார்க்கப்படும் விருந்தினர்கள்",
      rsvpsCaptured: "சேகரிக்கப்பட்ட RSVP",
      menuItems: "மெனு பொருட்கள்",
      predictions: "கணிப்புகள்",
      plannedFood: "திட்டமிட்ட உணவு",
      plannedFoodUnit: "கிலோ",
      plannedFoodUnknown: "தீர்மானிக்கப்படவில்லை",
    },
    inviteLink: "அழைப்புக் இணைப்பு",
    actions: {
      viewIntelligence: "நிகழ்வின் அறிவுக் குறிப்புகள்",
      guestResponses: "விருந்தினர் பதில்கள்",
      predictionLog: "கணிப்பு பதிவு",
      editEvent: "நிகழ்வு திட்டத்தைத் திருத்து",
    },
    status: {
      draft: "வரைவு",
      published: "வெளியிடப்பட்டது",
      completed: "முடிக்கப்பட்டது",
    },
    dateNotSet: "தேதி இன்னும் சேர்க்கப்படவில்லை",
  },
  hi: {
    dateLocale: "hi-IN",
    title: "कार्यक्रम",
    description:
      "ZeroVaste के साथ योजना बना रहे हर उत्सव की यहाँ समीक्षा करें। कार्यक्रम खोलें, बुद्धिमान डैशबोर्ड देखें, मेहमानों का प्रबंधन करें और योजना में बदलाव करें।",
    statsEvents: "आयोजित कार्यक्रम",
    statsGuests: "योजना में मेहमान",
    createButton: "कार्यक्रम बनाएँ",
    loading: "आपके कार्यक्रम लोड हो रहे हैं…",
    error: "हम अभी आपके कार्यक्रम लोड नहीं कर सके। कृपया कुछ देर बाद पुनः प्रयास करें।",
    emptyTitle: "आपने अभी तक कोई कार्यक्रम नहीं जोड़ा है।",
    emptyDescription:
      "ZeroVaste कार्यक्रम योजना से शुरुआत करें। हम RSVP, भोजन अनुमान और खाद्य अपशिष्ट कम करने में आपकी मदद करेंगे।",
    emptyCta: "अपना पहला कार्यक्रम योजना बनाएं",
    locationFallback: "स्थान बाद में निर्धारित होगा",
    metrics: {
      expectedGuests: "अपेक्षित मेहमान",
      rsvpsCaptured: "संग्रहित RSVP",
      menuItems: "मेनू आइटम",
      predictions: "पूर्वानुमान",
      plannedFood: "योजना बनाया भोजन",
      plannedFoodUnit: "किग्रा",
      plannedFoodUnknown: "निर्धारित नहीं",
    },
    inviteLink: "आमंत्रण लिंक",
    actions: {
      viewIntelligence: "कार्यक्रम बुद्धिमत्ता देखें",
      guestResponses: "अतिथि प्रतिक्रियाएँ",
      predictionLog: "पूर्वानुमान लॉग",
      editEvent: "कार्यक्रम योजना संपादित करें",
    },
    status: {
      draft: "मसौदा",
      published: "प्रकाशित",
      completed: "समाप्त",
    },
    dateNotSet: "तारीख अभी निर्धारित नहीं",
  },
  te: {
    dateLocale: "te-IN",
    title: "ఈవెంట్లు",
    description:
      "ZeroVaste తో మీరు ప్రణాళిక చేస్తున్న ప్రతి వేడుకను ఇక్కడ సమీక్షించండి. ఈవెంట్ తెరచి ఇంటెలిజెన్స్ డ్యాష్‌బోర్డ్ చూడండి, అతిథులను నిర్వహించండి, ప్రణాళికను సవరించండి.",
    statsEvents: "ఆయోజిత ఈవెంట్లు",
    statsGuests: "ప్రణాళికలో ఉన్న అతిథులు",
    createButton: "ఈవెంట్ సృష్టించండి",
    loading: "మీ ఈవెంట్లు లోడ్ అవుతున్నాయి…",
    error: "ఇప్పుడు మీ ఈవెంట్లను లోడ్ చేయలేకపోయాం. మరికొంత సేపటి తర్వాత ప్రయత్నించండి.",
    emptyTitle: "మీరు ఇంకా ఏ ఈవెంట్‌ని కూడా జోడించలేదు.",
    emptyDescription:
      "ZeroVaste ఈవెంట్ ప్రణాళికతో ప్రారంభించండి. RSVPలను సేకరించడంలో, భోజన అంచనాలు వేయడంలో మరియు ఆహార వ్యర్థాన్ని తగ్గించడంలో మేము సహాయపడతాము.",
    emptyCta: "మీ మొదటి ఈవెంట్‌ను ప్రణాళిక చేయండి",
    locationFallback: "స్థలం తరువాత నిర్ణయించబడుతుంది",
    metrics: {
      expectedGuests: "అంచనా అతిథులు",
      rsvpsCaptured: "సేకరించిన RSVPలు",
      menuItems: "మెను అంశాలు",
      predictions: "అంచనాలు",
      plannedFood: "ప్రణాళిక చేసిన ఆహారం",
      plannedFoodUnit: "కిలోలు",
      plannedFoodUnknown: "నిర్ధారించబడలేదు",
    },
    inviteLink: "ఆహ్వాన లింక్",
    actions: {
      viewIntelligence: "ఈవెంట్ ఇంటెలిజెన్స్ చూడండి",
      guestResponses: "అతిథి ప్రతిస్పందనలు",
      predictionLog: "అంచనా లాగ్",
      editEvent: "ఈవెంట్ ప్రణాళికను సవరించండి",
    },
    status: {
      draft: "ప్రారూపం",
      published: "ప్రచురించబడింది",
      completed: "పూర్తైంది",
    },
    dateNotSet: "తేదీ ఇంకా నిర్ణయించలేదు",
  },
  kn: {
    dateLocale: "kn-IN",
    title: "ಕಾರ್ಯಕ್ರಮಗಳು",
    description:
      "ZeroVaste ಜೊತೆಗೆ ನೀವು ಯೋಜಿಸುತ್ತಿರುವ ಪ್ರತಿಯೊಂದು ಸಂಭ್ರಮವನ್ನೂ ಇಲ್ಲಿ ವಿಮರ್ಶಿಸಿ. ಕಾರ್ಯಕ್ರಮವನ್ನು ತೆರೆಯಿರಿ, ಬುದ್ಧಿವಂತಿಕೆ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ನೋಡಿ, ಅತಿಥಿಗಳನ್ನು ನಿರ್ವಹಿಸಿ ಮತ್ತು ಯೋಜನೆಯನ್ನು ಬದಲಿಸಿ.",
    statsEvents: "ನಡೆಯಿಸಿದ ಕಾರ್ಯಕ್ರಮಗಳು",
    statsGuests: "ಯೋಜಿತ ಅತಿಥಿಗಳು",
    createButton: "ಕಾರ್ಯಕ್ರಮವನ್ನು ರಚಿಸಿ",
    loading: "ನಿಮ್ಮ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…",
    error: "ಈಗ ನಿಮ್ಮ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಹೊತ್ತಿನ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    emptyTitle: "ನೀವು ಇನ್ನೂ ಯಾವುದೇ ಕಾರ್ಯಕ್ರಮವನ್ನು ಸೇರಿಸಿಲ್ಲ.",
    emptyDescription:
      "ZeroVaste ಕಾರ್ಯಕ್ರಮ ಯೋಜನೆ ಮೂಲಕ ಪ್ರಾರಂಭಿಸಿ. RSVPಗಳನ್ನು ಸಂಗ್ರಹಿಸಲು, ಆಹಾರ ಅಂದಾಜು ಮಾಡಲು ಮತ್ತು ವ್ಯರ್ಥವನ್ನು ಕಡಿಮೆ ಮಾಡಲು ನಾವು ಸಹಾಯ ಮಾಡುತ್ತೇವೆ.",
    emptyCta: "ನಿಮ್ಮ ಮೊದಲ ಕಾರ್ಯಕ್ರಮವನ್ನು ಯೋಜಿಸಿ",
    locationFallback: "ಸ್ಥಳವನ್ನು ನಂತರ ದೃಢಪಡಿಸಲಾಗುವುದು",
    metrics: {
      expectedGuests: "ಅಪೇಕ್ಷಿತ ಅತಿಥಿಗಳು",
      rsvpsCaptured: "ಸಂಗ್ರಹಿಸಿದ RSVPಗಳು",
      menuItems: "ಮೆನು ಅಂಶಗಳು",
      predictions: "ಮುನ್ನೋಟಗಳು",
      plannedFood: "ಯೋಜಿತ ಆಹಾರ",
      plannedFoodUnit: "ಕೆಜಿ",
      plannedFoodUnknown: "ನಿರ್ಧರಿಸಲಾಗಿಲ್ಲ",
    },
    inviteLink: "ಆಮಂತ್ರಣ ಲಿಂಕ್",
    actions: {
      viewIntelligence: "ಕಾರ್ಯಕ್ರಮ ಬುದ್ಧಿವಂತಿಕೆ ನೋಡಿ",
      guestResponses: "ಅತಿಥಿ ಪ್ರತಿಕ್ರಿಯೆಗಳು",
      predictionLog: "ಮುನ್ನೋಟ ದಿನಚರಿ",
      editEvent: "ಕಾರ್ಯಕ್ರಮ ಯೋಜನೆಯನ್ನು ಸಂಪಾದಿಸಿ",
    },
    status: {
      draft: "ಕರಡು",
      published: "ಪ್ರಕಟಿಸಲಾಗಿದೆ",
      completed: "ಪೂರ್ಣಗೊಂಡಿದೆ",
    },
    dateNotSet: "ದಿನಾಂಕವನ್ನು ಇನ್ನೂ ನಿಗದಿಪಡಿಸಲಿಲ್ಲ",
  },
};

function Events() {
  const api = useApi();
  const { i18n } = useTranslation("common");
  const language = (i18n.language ?? "en").split("-")[0] as SupportedLocale;
  const text = useMemo(
    () => eventLocales[language] ?? eventLocales.en,
    [language]
  );
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatEventDate = useCallback(
    (value: string | null) => {
      if (!value) {
        return text.dateNotSet;
      }
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return value;
      }
      return parsed.toLocaleDateString(text.dateLocale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },
    [text.dateLocale, text.dateNotSet]
  );

  const eventStatusLabel = useCallback(
    (status: string | null) => {
      if (!status) {
        return text.status.draft;
      }
      switch (status) {
        case "published":
          return text.status.published;
        case "completed":
          return text.status.completed;
        case "survey_completed":
          return "Survey completed";
        default:
          return text.status.draft;
      }
    },
    [text.status]
  );

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    api
      .get<EventListItem[]>("/events")
      .then((response) => {
        if (ignore) return;
        setEvents(response.data);
      })
      .catch((err) => {
        if (ignore) return;
        console.error(err);
        setError(text.error);
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [api, text.error]);

  useEffect(() => {
    if (error && error !== text.error) {
      setError(text.error);
    }
  }, [error, text.error]);

  const totals = useMemo(() => {
    const hosted = events.length;
    const committedGuests = events.reduce((sum, event) => {
      const snapshot = event.expectedSnapshot ?? {};
      const guests =
        (snapshot.adults ?? 0) + (snapshot.kids ?? 0) + (snapshot.staff ?? 0);
      return sum + guests;
    }, 0);
    return { hosted, committedGuests };
  }, [events]);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">{text.title}</h1>
          <p className="text-sm text-slate-500">{text.description}</p>
          {events.length > 0 && !loading && (
            <dl className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-wide text-brand-600">
              <div className="flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1">
                <dt>{text.statsEvents}</dt>
                <dd className="text-brand-700">{totals.hosted}</dd>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1">
                <dt>{text.statsGuests}</dt>
                <dd className="text-brand-700">{totals.committedGuests}</dd>
              </div>
            </dl>
          )}
        </div>
        <Link
          to="/events/new"
          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-brand-600"
        >
          {text.createButton}
        </Link>
      </header>

      {loading && (
        <div className="rounded-3xl border border-orange-100 bg-white p-6 text-sm text-slate-600 shadow-sm">
          {text.loading}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/50 p-8 text-center text-sm text-slate-600 shadow-sm">
          <p className="text-lg font-semibold text-slate-900">
            {text.emptyTitle}
          </p>
          <p className="mt-2">
            {text.emptyDescription}
          </p>
          <Link
            to="/events/new"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600"
          >
            {text.emptyCta}
          </Link>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => {
          const expected = event.expectedSnapshot ?? {};
          const totalGuests =
            (expected.adults ?? 0) +
            (expected.kids ?? 0) +
            (expected.staff ?? 0);
          const guestsCaptured = event.guests?.length ?? 0;
          const menuItems = event.menu?.length ?? 0;
          const predictions = event.predictions?.length ?? 0;

          return (
            <article
              key={event.id}
              className="flex h-full flex-col justify-between rounded-3xl border border-orange-100 bg-white p-6 shadow-sm shadow-orange-100/60 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-100/80"
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-brand-600">
                    {eventStatusLabel(event.status)}
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {event.title}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {formatEventDate(event.eventDate)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {event.location ?? text.locationFallback}
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-xs text-slate-600">
                  <dl className="space-y-1">
                    <div className="flex items-center justify-between">
                      <dt className="font-semibold text-slate-800">{text.metrics.expectedGuests}</dt>
                      <dd>{totalGuests}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-semibold text-slate-800">{text.metrics.rsvpsCaptured}</dt>
                      <dd>{guestsCaptured}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-semibold text-slate-800">{text.metrics.menuItems}</dt>
                      <dd>{menuItems}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-semibold text-slate-800">{text.metrics.predictions}</dt>
                      <dd>{predictions}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-semibold text-slate-800">{text.metrics.plannedFood}</dt>
                      <dd>
                        {event.plannedFoodKg !== null
                          ? `${event.plannedFoodKg} ${text.metrics.plannedFoodUnit}`
                          : text.metrics.plannedFoodUnknown}
                      </dd>
                    </div>
                  </dl>

                  {normalizeInviteLink(event.inviteLink, event.id) && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        {text.inviteLink}
                      </p>
                      <code className="block truncate text-[11px] text-slate-700">
                        {normalizeInviteLink(event.inviteLink, event.id)}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3 text-xs font-semibold uppercase tracking-wide text-brand-600">
                <Link
                  to={`/events/${event.id}/overview`}
                  className="flex items-center justify-center rounded-full border border-brand-200 px-4 py-2 text-brand-600 hover:bg-brand-50"
                >
                  {text.actions.viewIntelligence}
                </Link>
                <div className="flex gap-2">
                  <Link
                    to={`/events/${event.id}/guests`}
                    className="flex-1 rounded-full border border-orange-200 px-4 py-2 text-center text-slate-500 hover:bg-orange-50 hover:text-brand-600"
                  >
                    {text.actions.guestResponses}
                  </Link>
                  <Link
                    to={`/events/${event.id}`}
                    className="flex-1 rounded-full border border-orange-200 px-4 py-2 text-center text-slate-500 hover:bg-orange-50 hover:text-brand-600"
                  >
                    {text.actions.predictionLog}
                  </Link>
                </div>
                <Link
                  to={`/events/${event.id}/edit`}
                  className="flex items-center justify-center rounded-full bg-brand-500 px-4 py-2 text-white shadow hover:bg-brand-600"
                >
                  {text.actions.editEvent}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default Events;

