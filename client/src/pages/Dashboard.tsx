import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { FormEvent } from "react";
import { ListBulletIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { QRCodeSVG } from "qrcode.react";
import { useApi } from "../hooks/useApi";
import { useTranslation } from "react-i18next";

type DashboardSummary = {
  totals: {
    eventsCount: number;
    foodSavedKg: number;
    moneySavedInr: number;
  };
  upcomingEvents: Array<{
    id: string;
    title: string;
    eventDate: string | null;
    location: string | null;
    status: string;
    statusLabel: string;
    plannedFoodKg: number | null;
    expectedGuests?: number | null;
    impact?: {
      foodSavedKg: number;
      moneySavedInr: number;
    };
    reportStatus?: "paid" | "pending" | "unpaid";
  }>;
};

function formatCurrencyInr(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(value: string | null, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDisplayName(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

type SupportedLocale = "en" | "ta" | "hi" | "te" | "kn";

type DashboardLocale = {
  dateLocale: string;
  currencyLocale: string;
  dateFallback: string;
  plannedFoodUnit: string;
  plannedFoodUnknown: string;
  guestsUpdating: string;
  inviteReady: string;
    welcomeWithName: string;
    welcomeGeneric: string;
    welcomeDescription: string;
    welcomeFirstTime: string;
    welcomeFirstTimeDescription: string;
  statCards: {
    eventsTitle: string;
    eventsLoading: string;
    eventsEmpty: string;
    eventsZeroHelper: string;
    eventsHelper: (count: number) => string;
    foodTitle: string;
    foodLoading: string;
    foodEmpty: string;
    foodHelper: (value: number) => string;
    moneyTitle: string;
    moneyLoading: string;
    moneyEmpty: string;
    moneyHelper: (value: number) => string;
  };
  upcoming: {
    sectionLabel: string;
    headingWithEvents: string;
    headingWithoutEvents: string;
    newButtonExisting: string;
    newButtonEmpty: string;
    loading: string;
    error: string;
    emptyTitle: string;
    emptyDescription: string;
    layoutList: string;
    layoutCard: string;
  };
  table: {
    columns: {
      event: string;
      date: string;
      plannedFood: string;
      expectedGuests: string;
      status: string;
      actions: string;
    };
    reportReadyPrefix: string;
    reportReadyFallback: string;
    actions: {
      view: string;
      log: string;
      viewReport: string;
    };
  };
  card: {
    eventNameLabel: string;
    eventDateLabel: string;
    locationPrefix: string;
    statsTitle: string;
    plannedFoodLabel: string;
    guestsLabel: string;
    inviteLabel: string;
    reportReadyHeading: string;
    reportDescription: string;
    viewReportButton: string;
    viewReportBadge: string;
    unlockReportSuffix: string;
    impactNote: string;
    plannedStatusButton: string;
    predictionLogButton: string;
  };
  payCta: {
    withPrice: (price: string) => string;
    unavailable: string;
    fallback: string;
  };
  pricingErrorMessage: string;
  alerts: {
    payInfo: string;
    viewInfoTemplate: string;
  };
};

const dashboardLocales: Record<SupportedLocale, DashboardLocale> = {
  en: {
    dateLocale: "en-IN",
    currencyLocale: "en-IN",
    dateFallback: "Date to be announced",
    plannedFoodUnit: "kg",
    plannedFoodUnknown: "TBD",
    guestsUpdating: "Updating",
    inviteReady: "Ready to share",
      welcomeWithName: "Welcome {{name}}",
      welcomeGeneric: "Welcome back, Zerovaste champion!",
    welcomeDescription:
      "Your celebrations are already making a dent in food waste. Review your highlights below and keep building the ZeroVaste movement.",
    welcomeFirstTime: "Welcome {{name}} Congratulations!!! you are fighting against food waste.",
    welcomeFirstTimeDescription: "Create your first event",
    statCards: {
      eventsTitle: "My events",
      eventsLoading: "Calculating your celebrations",
      eventsEmpty: "Create your first mindful event",
      eventsZeroHelper: "Start your first mindful celebration",
      eventsHelper: (count) =>
        `${count} celebration${count > 1 ? "s" : ""} planned`,
      foodTitle: "Food saved",
      foodLoading: "Tallying ZeroVaste impact",
      foodEmpty: "Savings will appear once events go live",
      foodHelper: (value) =>
        value > 0
          ? "Based on all events you've optimised"
          : "Savings appear once predictions reduce buffers",
      moneyTitle: "Money saved",
      moneyLoading: "Crunching the numbers",
      moneyEmpty: "Unlock insights by planning your first event",
      moneyHelper: (value) =>
        value > 0
          ? "Estimated against traditional catering buffers"
          : "Create or update events to unlock savings",
    },
    upcoming: {
      sectionLabel: "My upcoming events",
      headingWithEvents: "Here's what's next",
      headingWithoutEvents: "Ready to create your first event?",
      newButtonExisting: "Plan another event",
      newButtonEmpty: "Create my first event",
      loading: "Crunching your mindful celebrations…",
      error:
        "We couldn't load your dashboard summary. Please refresh to try again.",
      emptyTitle: "No upcoming events yet.",
      emptyDescription:
        "Start your first ZeroVaste celebration to see RSVP intelligence, savings, and the premium report unlock option right here.",
      layoutList: "List",
      layoutCard: "Card",
    },
    table: {
      columns: {
        event: "Event",
        date: "Date",
        plannedFood: "Planned food",
        expectedGuests: "Guests expected",
        status: "Status",
        actions: "Actions",
      },
      reportReadyPrefix: "Report ready • ",
      reportReadyFallback: "Pay to view",
      actions: {
        view: "View",
        log: "Log",
        viewReport: "View report",
      },
    },
    card: {
      eventNameLabel: "Event name",
      eventDateLabel: "Event date",
      locationPrefix: "Venue",
      statsTitle: "Planned stats snapshot",
      plannedFoodLabel: "Planned food",
      guestsLabel: "Guests expected",
      inviteLabel: "Invite link",
      reportReadyHeading: "Report ready — unlock ZeroVaste insights for",
      reportDescription:
        "Pay once to access the detailed report for this celebration.",
      viewReportButton: "View report",
      viewReportBadge: "Insights unlocked",
      unlockReportSuffix: "Unlock report",
      impactNote:
        "Every paid report funds smarter portions and keeps surplus low.",
      plannedStatusButton: "View planned status",
      predictionLogButton: "Prediction log",
    },
    payCta: {
      withPrice: (price) => `Pay ${price}`,
      unavailable: "Pay (pricing unavailable)",
      fallback: "Pay to view",
    },
    pricingErrorMessage: "Pricing unavailable for your region",
    alerts: {
      payInfo:
        "Payment integration is coming soon. We'll guide you through secure checkout to unlock the full ZeroVaste report.",
      viewInfoTemplate:
        "Report access for event {{eventId}} will redirect here once available.",
    },
  },
  ta: {
    dateLocale: "ta-IN",
    currencyLocale: "ta-IN",
    dateFallback: "தேதி பின்னர் அறிவிக்கப்படும்",
    plannedFoodUnit: "கிலோ",
    plannedFoodUnknown: "தீர்மானிக்கப்படவில்லை",
    guestsUpdating: "புதுப்பிக்கப்படுகிறது",
    inviteReady: "பகிர தயாராக உள்ளது",
    welcomeWithName: "மீண்டும் வரவேற்கிறோம், {{name}}!",
    welcomeGeneric: "ZeroVaste முன்னோடி, மீண்டும் வரவேற்கிறோம்!",
    welcomeDescription:
      "உங்கள் கொண்டாட்டங்கள் ஏற்கனவே உணவுக் கழிவை குறைக்கும் தாக்கத்தை உருவாக்குகின்றன. கீழே உள்ள முக்கிய தருணங்களை மீண்டும் பார்வையிட்டு ZeroVaste இயக்கத்தை தொடர்ந்து வளர்த்திடுங்கள்.",
    welcomeFirstTime: "Welcome {{name}} Congratulations!!! you are fighting against food waste.",
    welcomeFirstTimeDescription: "Create your first event",
    statCards: {
      eventsTitle: "என் நிகழ்வுகள்",
      eventsLoading: "உங்கள் கொண்டாட்டங்களை கணக்கிடுகிறது",
      eventsEmpty: "உங்கள் முதல் ZeroVaste நிகழ்வை உருவாக்குங்கள்",
      eventsZeroHelper: "உங்கள் முதல் பொறுப்பான கொண்டாட்டத்தைத் தொடங்குங்கள்",
      eventsHelper: (count) =>
        `${count} நிகழ்வு${count > 1 ? "கள்" : ""} திட்டமிடப்பட்டுள்ளன`,
      foodTitle: "சேமிக்கப்பட்ட உணவு",
      foodLoading: "ZeroVaste தாக்கத்தை கணக்கிடுகிறது",
      foodEmpty: "நிகழ்வுகள் செயலில் வந்தவுடன் சேமிப்பு காட்டப்படும்",
      foodHelper: (value) =>
        value > 0
          ? "நீங்கள் மேம்படுத்திய அனைத்து நிகழ்வுகளின் அடிப்படையில்"
          : "முன்கூட்டல் குறையும்போது சேமிப்பு வெளியாகும்",
      moneyTitle: "சேமிக்கப்பட்ட தொகை",
      moneyLoading: "எண்ணிக்கைகளை தயார் செய்கிறது",
      moneyEmpty: "உங்கள் முதல் நிகழ்வை திட்டமிட்டு அறிவுகளைத் திறக்கவும்",
      moneyHelper: (value) =>
        value > 0
          ? "பாரம்பரிய உணவுப்பாடுகளை ஒப்பிட்டு கணிக்கப்பட்டது"
          : "சேமிப்புகளைத் திறக்க நிகழ்வுகளை உருவாக்கவும் அல்லது புதுப்பிக்கவும்",
    },
    upcoming: {
      sectionLabel: "எனது வரவிருக்கும் நிகழ்வுகள்",
      headingWithEvents: "அடுத்து வாரப்போவது இதோ",
      headingWithoutEvents: "உங்கள் முதல் நிகழ்வை உருவாக்க தயாரா?",
      newButtonExisting: "மற்றொரு நிகழ்வை திட்டமிடு",
      newButtonEmpty: "என் முதல் நிகழ்வை உருவாக்கு",
      loading: "உங்கள் உணர்வுள்ள கொண்டாட்டங்களை தொகுக்கிறது…",
      error:
        "உங்கள் டாஷ்போர்ட் சுருக்கத்தை ஏற்ற முடியவில்லை. தயவுசெய்து புதுப்பித்துப் பார்க்கவும்.",
      emptyTitle: "வரவிருக்கும் நிகழ்வுகள் எதுவும் இல்லை.",
      emptyDescription:
        "RSVP தகவல், சேமிப்பு, மற்றும் பிரீமியம் அறிக்கை திறக்க மாற்றத்தை இங்கிருந்தே பார்க்க உங்கள் முதல் ZeroVaste நிகழ்வைத் தொடங்குங்கள்.",
      layoutList: "பட்டியல்",
      layoutCard: "அட்டைகள்",
    },
    table: {
      columns: {
        event: "நிகழ்வு",
        date: "தேதி",
        plannedFood: "திட்டமிட்ட உணவு",
        expectedGuests: "எதிர்பார்க்கப்படும் விருந்தினர்கள்",
        status: "நிலை",
        actions: "செயல்கள்",
      },
      reportReadyPrefix: "அறிக்கை தயார் • ",
      reportReadyFallback: "கட்டணம் செலுத்தி காண்க",
      actions: {
        view: "காண்",
        log: "பதிவு",
        viewReport: "அறிக்கையை காண்",
      },
    },
    card: {
      eventNameLabel: "நிகழ்வு பெயர்",
      eventDateLabel: "நிகழ்வு தேதி",
      locationPrefix: "நிகழ்வு இடம்",
      statsTitle: "திட்டமிட்ட புள்ளிவிவரங்கள்",
      plannedFoodLabel: "திட்டமிட்ட உணவு",
      guestsLabel: "எதிர்பார்க்கப்படும் விருந்தினர்கள்",
      inviteLabel: "அழைப்புக் இணைப்பு",
      reportReadyHeading: "அறிக்கை தயார் — ZeroVaste அறிவுகளைத் திறக்க",
      reportDescription:
        "இந்த கொண்டாட்டத்திற்கான விரிவான அறிக்கையை அணுக ஒருமுறை கட்டணம் செலுத்துங்கள்.",
      viewReportButton: "அறிக்கையை காண்",
      viewReportBadge: "அறிவுகள் திறக்கப்பட்டன",
      unlockReportSuffix: "அறிக்கையைத் திறக்க",
      impactNote:
        "ஒவ்வொரு கட்டண அறிக்கையும் நுணுக்கமான உணவு அளவுக்கு ஆதரவு அளித்து மீதியை குறைக்கிறது.",
      plannedStatusButton: "திட்ட நிலையை காண்",
      predictionLogButton: "கணிப்பு பதிவு",
    },
    payCta: {
      withPrice: (price) => `${price} கட்டணம் செலுத்தவும்`,
      unavailable: "கட்டணம் செலுத்தவும் (விலை இல்லை)",
      fallback: "கட்டணம் செலுத்தி காண்க",
    },
    pricingErrorMessage: "உங்கள் பகுதியில் விலைத் தகவல் இல்லை",
    alerts: {
      payInfo:
        "கட்டண ஒருங்கிணைப்பு விரைவில் வருகிறது. முழுமையான ZeroVaste அறிக்கையைத் திறக்க பாதுகாப்பான செலுத்தும் செயல்முறையில் நாங்கள் வழிநடத்துவோம்.",
      viewInfoTemplate:
        "நிகழ்வு {{eventId}} கான அறிக்கையினை அணுகும் இணைப்பு தயார் ஆனதும் இங்கிருந்தே மாற்றப்படுகிறோம்.",
    },
  },
  hi: {
    dateLocale: "hi-IN",
    currencyLocale: "hi-IN",
    dateFallback: "तिथि बाद में घोषित होगी",
    plannedFoodUnit: "किग्रा",
    plannedFoodUnknown: "निर्धारित नहीं",
    guestsUpdating: "अद्यतन हो रहा है",
    inviteReady: "साझा करने के लिए तैयार",
    welcomeWithName: "फिर से स्वागत है, {{name}}!",
    welcomeGeneric: "ZeroVaste चैम्पियन, आपका स्वागत है!",
    welcomeDescription:
      "आपके उत्सव पहले ही खाद्य अपशिष्ट कम कर रहे हैं। नीचे मुख्य झलकियां देखें और ZeroVaste आंदोलन को आगे बढ़ाते रहें।",
    welcomeFirstTime: "Welcome {{name}} Congratulations!!! you are fighting against food waste.",
    welcomeFirstTimeDescription: "Create your first event",
    statCards: {
      eventsTitle: "मेरे कार्यक्रम",
      eventsLoading: "आपके उत्सवों की गणना हो रही है",
      eventsEmpty: "अपना पहला ZeroVaste कार्यक्रम बनाएँ",
      eventsZeroHelper: "अपना पहला जिम्मेदार उत्सव शुरू करें",
      eventsHelper: (count) => `${count} कार्यक्रम योजना में हैं`,
      foodTitle: "सहेजा गया भोजन",
      foodLoading: "ZeroVaste प्रभाव की गणना हो रही है",
      foodEmpty: "जैसे ही कार्यक्रम लाइव होंगे, बचत दिखाई देगी",
      foodHelper: (value) =>
        value > 0
          ? "आपके अनुकूलित सभी कार्यक्रमों के आधार पर"
          : "पूर्वानुमान घटने पर बचत दिखाई देगी",
      moneyTitle: "सहेजी गई राशि",
      moneyLoading: "आंकड़े तैयार किए जा रहे हैं",
      moneyEmpty: "अपना पहला कार्यक्रम योजना बनाकर अंतर्दृष्टि खोलें",
      moneyHelper: (value) =>
        value > 0
          ? "परंपरागत कैटरिंग की तुलना में अनुमानित"
          : "अधिक जानकारी पाने के लिए कार्यक्रम बनाएं या अपडेट करें",
    },
    upcoming: {
      sectionLabel: "मेरे आगामी कार्यक्रम",
      headingWithEvents: "आगे क्या है",
      headingWithoutEvents: "क्या आप अपना पहला कार्यक्रम बनाने के लिए तैयार हैं?",
      newButtonExisting: "एक और कार्यक्रम योजना बनाएं",
      newButtonEmpty: "मेरा पहला कार्यक्रम बनाएँ",
      loading: "आपके सार्थक उत्सवों को संकलित किया जा रहा है…",
      error:
        "हम डैशबोर्ड सारांश लोड नहीं कर सके। कृपया रिफ्रेश करके पुनः प्रयास करें।",
      emptyTitle: "अभी कोई आगामी कार्यक्रम नहीं है।",
      emptyDescription:
        "RSVP जानकारी, बचत और प्रीमियम रिपोर्ट विकल्प देखने के लिए अपना पहला ZeroVaste कार्यक्रम शुरू करें।",
      layoutList: "सूची",
      layoutCard: "कार्ड",
    },
    table: {
      columns: {
        event: "कार्यक्रम",
        date: "तिथि",
        plannedFood: "योजना बनाया भोजन",
        expectedGuests: "अपेक्षित मेहमान",
        status: "स्थिति",
        actions: "क्रियाएँ",
      },
      reportReadyPrefix: "रिपोर्ट तैयार • ",
      reportReadyFallback: "देखने के लिए भुगतान करें",
      actions: {
        view: "देखें",
        log: "रिकॉर्ड",
        viewReport: "रिपोर्ट देखें",
      },
    },
    card: {
      eventNameLabel: "कार्यक्रम का नाम",
      eventDateLabel: "कार्यक्रम तिथि",
      locationPrefix: "स्थल",
      statsTitle: "योजना के आँकड़े",
      plannedFoodLabel: "योजना बनाया भोजन",
      guestsLabel: "अपेक्षित मेहमान",
      inviteLabel: "आमंत्रण लिंक",
      reportReadyHeading: "रिपोर्ट तैयार — ZeroVaste अंतर्दृष्टि अनलॉक करें",
      reportDescription:
        "इस उत्सव की विस्तृत रिपोर्ट देखने के लिए एक बार भुगतान करें।",
      viewReportButton: "रिपोर्ट देखें",
      viewReportBadge: "अंतर्दृष्टि उपलब्ध",
      unlockReportSuffix: "रिपोर्ट अनलॉक करें",
      impactNote:
        "हर भुगतान की गई रिपोर्ट बेहतर परोसने की योजना को मजबूत करती है और अतिरिक्त भोजन कम रखने में मदद करती है।",
      plannedStatusButton: "योजना की स्थिति देखें",
      predictionLogButton: "पूर्वानुमान लॉग",
    },
    payCta: {
      withPrice: (price) => `${price} का भुगतान करें`,
      unavailable: "भुगतान करें (मूल्य उपलब्ध नहीं)",
      fallback: "देखने के लिए भुगतान करें",
    },
    pricingErrorMessage: "आपके क्षेत्र के लिए मूल्य उपलब्ध नहीं है",
    alerts: {
      payInfo:
        "भुगतान एकीकरण जल्द ही आ रहा है। पूर्ण ZeroVaste रिपोर्ट अनलॉक करने के लिए हम आपको सुरक्षित प्रक्रिया से मार्गदर्शन करेंगे।",
      viewInfoTemplate:
        "कार्यक्रम {{eventId}} के लिए रिपोर्ट उपलब्ध होते ही यहाँ से खुल जाएगी।",
    },
  },
  te: {
    dateLocale: "te-IN",
    currencyLocale: "te-IN",
    dateFallback: "తేదీ తర్వాత ప్రకటించబడుతుంది",
    plannedFoodUnit: "కిలోలు",
    plannedFoodUnknown: "తీర్మానించబడలేదు",
    guestsUpdating: "నవీకరించబడుతోంది",
    inviteReady: "పంచుకోవడానికి సిద్ధంగా ఉంది",
    welcomeWithName: "తిరిగి స్వాగతం, {{name}}!",
    welcomeGeneric: "ZeroVaste చాంపియన్, తిరిగి స్వాగతం!",
    welcomeDescription:
      "మీ వేడుకలు ఇప్పటికే ఆహార వ్యర్థాన్ని తగ్గిస్తున్నాయి. క్రింది ముఖ్యాంశాలను చూడండి మరియు ZeroVaste ఉద్యమాన్ని కొనసాగించండి.",
    welcomeFirstTime: "Welcome {{name}} Congratulations!!! you are fighting against food waste.",
    welcomeFirstTimeDescription: "Create your first event",
    statCards: {
      eventsTitle: "నా ఈవెంట్లు",
      eventsLoading: "మీ వేడుకలను లెక్కిస్తున్నాం",
      eventsEmpty: "మీ మొదటి ZeroVaste ఈవెంట్ సృష్టించండి",
      eventsZeroHelper: "మీ మొదటి బాధ్యతాయుత వేడుకను ప్రారంభించండి",
      eventsHelper: (count) => `${count} ఈవెంట్‌లు ప్రణాళికలో ఉన్నాయి`,
      foodTitle: "సేవ్ చేసిన ఆహారం",
      foodLoading: "ZeroVaste ప్రభావాన్ని లెక్కిస్తున్నాం",
      foodEmpty: "ఈవెంట్‌లు ప్రారంభమైన తర్వాత సేవింగ్స్ కనిపిస్తాయి",
      foodHelper: (value) =>
        value > 0
          ? "మీరు మెరుగుపరిచిన అన్ని ఈవెంట్‌ల ఆధారంగా"
          : "అంచనాలు తగ్గినప్పుడు సేవింగ్స్ కనిపిస్తాయి",
      moneyTitle: "సేవ్ చేసిన మొత్తం",
      moneyLoading: "సంఖ్యలను సిద్ధం చేస్తోంది",
      moneyEmpty: "మీ మొదటి ఈవెంట్‌ను ప్రణాళికచేసి సమాచారాన్ని అన్లాక్ చేయండి",
      moneyHelper: (value) =>
        value > 0
          ? "సాంప్రదాయ క్యాటరింగ్ బఫర్లతో పోల్చి అంచనా వేయబడింది"
          : "సేవింగ్స్ పొందడానికి ఈవెంట్‌లను సృష్టించండి లేదా నవీకరించండి",
    },
    upcoming: {
      sectionLabel: "నా రాబోయే ఈవెంట్‌లు",
      headingWithEvents: "తదుపరి ఇవే",
      headingWithoutEvents: "మీ మొదటి ఈవెంట్‌కు సిద్ధంగా ఉన్నారా?",
      newButtonExisting: "మరో ఈవెంట్ ప్లాన్ చేయండి",
      newButtonEmpty: "నా మొదటి ఈవెంట్ సృష్టించండి",
      loading: "మీ అర్థవంతమైన వేడుకలు సమీకరించబడుతున్నాయి…",
      error:
        "మేము డ్యాష్‌బోర్డ్ సారాంశాన్ని లోడ్ చేయలేకపోయాము. దయచేసి రిఫ్రెష్ చేసి మళ్లీ ప్రయత్నించండి.",
      emptyTitle: "ఇప్పటికి రాబోయే ఈవెంట్‌లు లేవు.",
      emptyDescription:
        "RSVP సమాచారం, సేవింగ్స్, ప్రీమియం రిపోర్ట్ ఎంపికలను చూడటానికి మీ మొదటి ZeroVaste ఈవెంట్‌ను ప్రారంభించండి.",
      layoutList: "జాబితా",
      layoutCard: "కార్డు",
    },
    table: {
      columns: {
        event: "ఈవెంట్",
        date: "తేదీ",
        plannedFood: "ప్రణాళిక చేసిన ఆహారం",
        expectedGuests: "అంచనా అతిథులు",
        status: "స్థితి",
        actions: "చర్యలు",
      },
      reportReadyPrefix: "రిపోర్ట్ సిద్ధం • ",
      reportReadyFallback: "చూడటానికి చెల్లించండి",
      actions: {
        view: "చూడండి",
        log: "లాగ్",
        viewReport: "రిపోర్ట్ చూడండి",
      },
    },
    card: {
      eventNameLabel: "ఈవెంట్ పేరు",
      eventDateLabel: "ఈవెంట్ తేదీ",
      locationPrefix: "స్థలం",
      statsTitle: "ప్రణాళిక గణాంకాలు",
      plannedFoodLabel: "ప్రణాళిక చేసిన ఆహారం",
      guestsLabel: "అంచనా అతిథులు",
      inviteLabel: "ఆహ్వాన లింక్",
      reportReadyHeading: "రిపోర్ట్ సిద్ధం — ZeroVaste అంతర్దృష్టులను అన్లాక్ చేయండి",
      reportDescription:
        "ఈ వేడుక కోసం వివరణాత్మక రిపోర్ట్‌ను చూడటానికి ఒకసారి చెల్లించండి.",
      viewReportButton: "రిపోర్ట్ చూడండి",
      viewReportBadge: "అంతర్దృష్టులు అన్లాక్ అయ్యాయి",
      unlockReportSuffix: "రిపోర్ట్ అన్లాక్ చేయండి",
      impactNote:
        "ప్రతి చెల్లింపు రిపోర్ట్ తెలివైన పరిమాణాలకు మద్దతు ఇస్తుంది మరియు మిగులను తగ్గిస్తుంది.",
      plannedStatusButton: "ప్రణాళిక స్థితి చూడండి",
      predictionLogButton: "అంచనా లాగ్",
    },
    payCta: {
      withPrice: (price) => `${price} చెల్లించండి`,
      unavailable: "చెల్లించండి (ధర అందుబాటులో లేదు)",
      fallback: "చూడటానికి చెల్లించండి",
    },
    pricingErrorMessage: "మీ ప్రాంతానికి ధర సమాచారంలేదు",
    alerts: {
      payInfo:
        "చెల్లింపు సమగ్రీకరణ త్వరలో వస్తోంది. పూర్తి ZeroVaste రిపోర్ట్‌ను అన్లాక్ చేయడానికి మేము మీకు భద్రమైన చెకೌట్ ద్వారా మార్గదర్శనం చేస్తాము.",
      viewInfoTemplate:
        "ఈవెంట్ {{eventId}} కి సంబంధించిన రిపోర్ట్ అందుబాటులో వచ్చిన వెంటనే ఇక్కడే తెరవబడుతుంది.",
    },
  },
  kn: {
    dateLocale: "kn-IN",
    currencyLocale: "kn-IN",
    dateFallback: "ದಿನಾಂಕವನ್ನು ನಂತರ ಘೋಷಿಸಲಾಗುವುದು",
    plannedFoodUnit: "ಕೆಜಿ",
    plannedFoodUnknown: "ನಿರ್ಧರಿಸಲಾಗಿಲ್ಲ",
    guestsUpdating: "ನವೀಕರಿಸಲಾಗುತ್ತಿದೆ",
    inviteReady: "ಹಂಚಲು ಸಿದ್ಧವಾಗಿದೆ",
    welcomeWithName: "ಮತ್ತೆ ಸ್ವಾಗತ, {{name}}!",
    welcomeGeneric: "ZeroVaste ನಾಯಕ, ನಿಮ್ಮನ್ನು ಮತ್ತೆ ಸ್ವಾಗತಿಸುತ್ತೇವೆ!",
    welcomeDescription:
      "ನಿಮ್ಮ ಸಂಭ್ರಮಗಳು ಈಗಾಗಲೇ ಆಹಾರ ವ್ಯರ్ಥವನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತಿವೆ. ಕೆಳಗಿನ ಮುಖ್ಯಾಂಶಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ZeroVaste ಚಳವಳಿಯನ್ನು ಮುಂದುವರಿಸಿ.",
    statCards: {
      eventsTitle: "ನನ್ನ ಕಾರ್ಯಕ್ರಮಗಳು",
      eventsLoading: "ನಿಮ್ಮ ಸಂಭ್ರಮಗಳನ್ನು கணಿಸುತ್ತಿದೆ",
      eventsEmpty: "ನಿಮ್ಮ ಮೊದಲ ZeroVaste ಕಾರ್ಯಕ್ರಮವನ್ನು ರಚಿಸಿ",
      eventsZeroHelper: "ನಿಮ್ಮ ಮೊದಲ ಜವಾಬ್ದಾರಿಯುತ ಸಂಭ್ರಮವನ್ನು ಪ್ರಾರಂಭಿಸಿ",
      eventsHelper: (count) => `${count} ಕಾರ್ಯಕ್ರಮಗಳು ಯೋಜನೆಗೊಂಡಿವೆ`,
      foodTitle: "ಉಳಿಸಿದ ಆಹಾರ",
      foodLoading: "ZeroVaste ಪರಿಣಾಮವನ್ನು ಲೆಕ್ಕಿಸುತ್ತಿದೆ",
      foodEmpty: "ಕಾರ್ಯಕ್ರಮಗಳು ಲೈವ್ ಆದ ನಂತರ ಉಳಿವುಗಳು ಕಾಣಿಸುತ್ತದೆ",
      foodHelper: (value) =>
        value > 0
          ? "ನೀವು ಸುಧಾರಿಸಿದ ಎಲ್ಲಾ ಕಾರ್ಯಕ್ರಮಗಳ ಆಧಾರದ ಮೇಲೆ"
          : "ಮುನ್ನೋಟಗಳು ಕಡಿಮೆಯಾಗುತ್ತಿದ್ದಂತೆ ಉಳಿವುಗಳು ಪ್ರಕಟವಾಗುತ್ತದೆ",
      moneyTitle: "ಉಳಿಸಿದ ಮೊತ್ತ",
      moneyLoading: "ಅಂಕಿಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ",
      moneyEmpty: "ನಿಮ್ಮ ಮೊದಲ ಕಾರ್ಯಕ್ರಮವನ್ನು ರೂಪಿಸಿ ತಿಳಿವುಗಳನ್ನು ಅನ್ಲಾಕ్ ಮಾಡಿ",
      moneyHelper: (value) =>
        value > 0
          ? "ಪಾರಂಪರಿಕ ಕೆಟರಿಂಗ್ ಬಫರ್‌ಗಳಿಗೆ ಹೋಲಿಸಿ ಅಂದಾಜಿಸಲಾಗಿದೆ"
          : "ಉಳಿವುಗಳನ್ನು ಪಡೆಯಲು ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ರಚಿಸಿ ಅಥವಾ ನವೀಕರಿಸಿ",
    },
    upcoming: {
      sectionLabel: "ನನ್ನ ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು",
      headingWithEvents: "ಮುಂದೇನು ಬರುತ್ತಿದೆ",
      headingWithoutEvents: "ನಿಮ್ಮ ಮೊದಲ ಕಾರ್ಯಕ್ರಮ ಮಾಡಲು ಸಿದ್ಧವೇ?",
      newButtonExisting: "ಇನ್ನೊಂದು ಕಾರ್ಯಕ್ರಮವನ್ನು ಯೋಜಿಸಿ",
      newButtonEmpty: "ನನ್ನ ಮೊದಲ ಕಾರ್ಯಕ್ರಮ ರಚಿಸಿ",
      loading: "ನಿಮ್ಮ ಅರ್ಥಪೂರ್ಣ ಸಂಭ್ರಮಗಳನ್ನು ಸಂಗ್ರಹಿಸಲಾಗುತ್ತಿದೆ…",
      error:
        "ನಾವು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಸಾರಾಂಶವನ್ನು ಲೋಡ್ ಮಾಡಲಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ರಿಫ್ರೆಶ್ ಮಾಡಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
      emptyTitle: "ಈಗ ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳಿಲ್ಲ.",
      emptyDescription:
        "RSVP ಮಾಹಿತಿ, ಉಳಿವುಗಳು ಮತ್ತು ಪ್ರೀಮಿಯಂ ರಿಪೋರ್ಟ్ ಆಯ್ಕೆಯನ್ನು ಇಲ್ಲಿ ನೋಡಲು ನಿಮ್ಮ ಮೊದಲ ZeroVaste ಕಾರ್ಯಕ್ರಮವನ್ನು ಪ್ರಾರಂಭಿಸಿ.",
      layoutList: "ಪಟ್ಟಿ",
      layoutCard: "ಕಾರ್ಡ್",
    },
    table: {
      columns: {
        event: "ಕಾರ್ಯಕ್ರಮ",
        date: "ದಿನಾಂಕ",
        plannedFood: "ಯೋಜಿತ ಆಹಾರ",
        expectedGuests: "ಅಪೇಕ್ಷಿತ ಅತಿಥಿಗಳು",
        status: "ಸ್ಥಿತಿ",
        actions: "ಕ್ರಿಯೆಗಳು",
      },
      reportReadyPrefix: "ವರದಿ ಸಿದ್ಧ • ",
      reportReadyFallback: "ನೋಡಲು ಪಾವತಿ ಮಾಡಿ",
      actions: {
        view: "ನೋಡಿ",
        log: "ದಾಖಲೆ",
        viewReport: "ವರದಿ ನೋಡಿ",
      },
    },
    card: {
      eventNameLabel: "ಕಾರ್ಯಕ್ರಮದ ಹೆಸರು",
      eventDateLabel: "ಕಾರ್ಯಕ್ರಮ ದಿನಾಂಕ",
      locationPrefix: "ಸ್ಥಳ",
      statsTitle: "ಯೋಜಿತ ಅಂಕಿ-ಅಂಶಗಳು",
      plannedFoodLabel: "ಯೋಜಿತ ಆಹಾರ",
      guestsLabel: "ಅಪೇಕ್ಷಿತ ಅತಿಥಿಗಳು",
      inviteLabel: "ಆಮಂತ್ರಣ ಲಿಂಕ್",
      reportReadyHeading: "ವರದಿ ಸಿದ್ಧ — ZeroVaste ತಿಳಿವಳಿಕೆಯನ್ನು ಅನ್ಲಾಕ్ ಮಾಡಿ",
      reportDescription:
        "ಈ ಸಂಭ್ರಮದ ವಿವರವಾದ ವರದಿಯನ್ನು ನೋಡಲು ಒಮ್ಮೆ ಪಾವತಿ ಮಾಡಿ.",
      viewReportButton: "ವರದಿ ನೋಡಿ",
      viewReportBadge: "ತಿಳಿವಳಿಕೆ ಅನ್ಲಾಕ್ ಆಗಿದೆ",
      unlockReportSuffix: "ವರದಿಯನ್ನು ಅನ್ಲಾಕ್ ಮಾಡಿ",
      impactNote:
        "ಪ್ರತಿ ಪೇವ್ಡ್ ವರದಿ ಉತ್ತಮ ಪಾಳಿಗಳನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆ ಮತ್ತು ಉಳಿಕೆಯನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ.",
      plannedStatusButton: "ಯೋಜನೆಯ ಸ್ಥಿತಿಯನ್ನು ನೋಡಿ",
      predictionLogButton: "ಮುನ್ನೋಟ ದಿನಚರಿ",
    },
    payCta: {
      withPrice: (price) => `${price} ಪಾವತಿಸಿ`,
      unavailable: "ಪಾವತಿಸಿ (ಬೆಲೆ ಲಭ್ಯವಿಲ್ಲ)",
      fallback: "ನೋಡಲು ಪಾವತಿಸಿ",
    },
    pricingErrorMessage: "ನಿಮ್ಮ ಪ್ರದೇಶಕ್ಕೆ ಬೆಲೆ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ",
    alerts: {
      payInfo:
        "ಪಾವತಿ ಏಕೀಕರಣವು ಶೀಘ್ರದಲ್ಲೇ ಬರುತ್ತಿದೆ. ಸಂಪೂರ್ಣ ZeroVaste ವರದಿಯನ್ನು ಅನ್ಲಾಕ್ ಮಾಡಲು ನಾವು ಭದ್ರ ಚೆಕ್‌ಔಟ್ ಮೂಲಕ ನಿಮಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತೇವೆ.",
      viewInfoTemplate:
        "ಕಾರ್ಯಕ್ರಮ {{eventId}} ಗೆ ಸಂಬంಧಿಸಿದ ವರದಿ ಲಭ್ಯವಾಗುತ್ತಿದ್ದಂತೆ ಇಲ್ಲಿಯೇ ತೆರೆಯಲಾಗುತ್ತದೆ.",
    },
  },
};

function Dashboard() {
  const api = useApi();
  const { i18n } = useTranslation("common");
  const language = (i18n.language ?? "en").split("-")[0] as SupportedLocale;
  const text = useMemo(
    () => dashboardLocales[language] ?? dashboardLocales.en,
    [language]
  );
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"load_failed" | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [reportPricing, setReportPricing] = useState<
    | {
        currencyCode: string;
        amount: number;
      }
    | null
  >(null);
  const [pricingError, setPricingError] = useState<"unavailable" | null>(null);
  const [activePayment, setActivePayment] = useState<
    | {
        id: string;
        title: string;
      }
    | null
  >(null);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi");
  const [upiId, setUpiId] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success">("idle");
  const [upiSettings, setUpiSettings] = useState<{ upiId: string; upiName: string; qrCodeImage?: string | null } | null>(null);
  const formatCurrency = useCallback(
    (value: number) => formatCurrencyInr(value, text.currencyLocale),
    [text.currencyLocale]
  );
  const formatDate = useCallback(
    (value: string | null) =>
      formatDateLabel(value, text.dateLocale, text.dateFallback),
    [text.dateLocale, text.dateFallback]
  );

  useEffect(() => {
    const storedName = window.localStorage.getItem("nowasteUserName");
    setDisplayName(formatDisplayName(storedName));
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    api
      .get<DashboardSummary>("/dashboard/summary")
      .then((response) => {
        if (ignore) return;
        setSummary(response.data);
      })
      .catch((err) => {
        console.error(err);
        if (ignore) return;
        setError("load_failed");
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [api]);

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
          setPricingError("unavailable");
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
        // Fallback to default
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

  const statCards = useMemo(() => {
    const stat = text.statCards;
    if (!summary) {
      return [
        {
          title: stat.eventsTitle,
          value: loading ? "…" : "0",
          helper: loading ? stat.eventsLoading : stat.eventsEmpty,
        },
        {
          title: stat.foodTitle,
          value: loading ? "…" : `0 ${text.plannedFoodUnit}`,
          helper: loading ? stat.foodLoading : stat.foodEmpty,
        },
        {
          title: stat.moneyTitle,
          value: loading ? "…" : formatCurrency(0),
          helper: loading ? stat.moneyLoading : stat.moneyEmpty,
        },
      ];
    }

    const { eventsCount, foodSavedKg, moneySavedInr } = summary.totals;
    return [
      {
        title: stat.eventsTitle,
        value: `${eventsCount}`,
        helper:
          eventsCount === 0
            ? stat.eventsZeroHelper
            : stat.eventsHelper(eventsCount),
      },
      {
        title: stat.foodTitle,
        value: `${foodSavedKg.toFixed(foodSavedKg >= 1 ? 1 : 0)} ${
          text.plannedFoodUnit
        }`,
        helper: stat.foodHelper(foodSavedKg),
      },
      {
        title: stat.moneyTitle,
        value: formatCurrency(moneySavedInr),
        helper: stat.moneyHelper(moneySavedInr),
      },
    ];
  }, [summary, loading, text, formatCurrency]);

  const upcomingEvents = useMemo(() => {
    if (!summary?.upcomingEvents) {
      return [];
    }
    return [...summary.upcomingEvents].sort((a, b) => {
      const aTime = a.eventDate ? new Date(a.eventDate).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.eventDate ? new Date(b.eventDate).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  }, [summary?.upcomingEvents]);

  const formattedPrice = useMemo(() => {
    if (!reportPricing) {
      return null;
    }
    try {
      return new Intl.NumberFormat(text.currencyLocale, {
        style: "currency",
        currency: reportPricing.currencyCode,
        maximumFractionDigits: reportPricing.currencyCode === "INR" ? 0 : 2,
      }).format(reportPricing.amount);
    } catch (_error) {
      const symbol = reportPricing.currencyCode === "INR" ? "₹" : "";
      return `${symbol}${reportPricing.amount}`;
    }
  }, [text.currencyLocale, reportPricing]);

  const payCtaLabel = formattedPrice
    ? text.payCta.withPrice(formattedPrice)
    : pricingError === "unavailable"
    ? text.payCta.unavailable
    : text.payCta.fallback;
  const pricingErrorMessage =
    pricingError === "unavailable" ? text.pricingErrorMessage : null;

  const resetPaymentState = useCallback(() => {
    setPaymentMethod("upi");
    setUpiId("");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setPaymentError(null);
    setPaymentStatus("idle");
  }, []);

  const handlePayClick = useCallback(
    (eventInfo: { id: string; title: string }) => {
      resetPaymentState();
      setActivePayment(eventInfo);
      if (!reportPricing) {
        setPaymentError(pricingErrorMessage ?? text.alerts.payInfo);
      }
    },
    [pricingErrorMessage, reportPricing, resetPaymentState, text.alerts.payInfo]
  );

  const closePaymentModal = useCallback(() => {
    setActivePayment(null);
    resetPaymentState();
  }, [resetPaymentState]);

  const handlePaymentSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (!activePayment) {
      return;
    }
    if (!reportPricing) {
      setPaymentError(pricingErrorMessage ?? "Pricing unavailable right now. Please try again later.");
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
        // Host UPI ID where the user should send the money
        upiId: upiSettings?.upiId || "zerovaste@upi",
        reference: upiId.trim(),
      };

      await api.post(`/events/${activePayment.id}/payments`, payload);

      setPaymentStatus("success");

      setSummary((previous) => {
        if (!previous) return previous;
        const upcomingEvents = previous.upcomingEvents.map((event) =>
          event.id === activePayment.id
            ? { ...event, reportStatus: "paid" as const }
            : event
        );
        return { ...previous, upcomingEvents };
      });
    } catch (error) {
      console.error("Payment failed", error);
      const fallbackMessage = "We couldn't process the payment. Please try again.";
      const serverMessage = (error as any)?.response?.data?.message;
      setPaymentError(typeof serverMessage === "string" ? serverMessage : fallbackMessage);
      setPaymentStatus("idle");
    }
  };

  const handleViewReportClick = (eventId: string) => {
    window.alert(
      text.alerts.viewInfoTemplate.replace("{{eventId}}", eventId)
    );
  };

  const isFirstTimeUser = !loading && summary && summary.totals.eventsCount === 0;
  
  const welcomeTitle = isFirstTimeUser
    ? text.welcomeFirstTime.replace("{{name}}", displayName || "there")
    : displayName
    ? text.welcomeWithName.replace("{{name}}", displayName)
    : text.welcomeGeneric;

  const welcomeSubtitle = isFirstTimeUser
    ? text.welcomeFirstTimeDescription
    : null;

  const upcomingText = text.upcoming;
  const tableText = text.table;
  const cardText = text.card;

  // Show simplified UI for first-time users
  if (isFirstTimeUser) {
    return (
      <section className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-orange-50 to-amber-50 p-12 shadow-xl border border-orange-100">
          {/* Decorative background elements */}
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-brand-200/30 to-orange-200/30 blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-amber-200/30 to-yellow-200/30 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-emerald-100/20 to-teal-100/20 blur-3xl"></div>
          
          <div className="relative z-10 text-center">
            <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-orange-400 shadow-lg">
              <svg className="h-14 w-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mb-4 text-6xl font-bold bg-gradient-to-r from-brand-600 via-orange-600 to-amber-600 bg-clip-text text-transparent sm:text-7xl">
              Welcome {displayName || "there"}
            </h1>
            <p className="mb-10 text-3xl font-semibold text-slate-700 sm:text-4xl">
              Congratulations!!! you are fighting against food waste.
            </p>
            <Link
              to="/events/new"
              className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-brand-500 to-orange-500 px-10 py-5 text-lg font-bold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl hover:from-brand-600 hover:to-orange-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create your first event
            </Link>
          </div>
        </div>

        {/* Step-by-Step Guide */}
        <div className="rounded-3xl border border-orange-200 bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">How it works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Step 1: Create Event */}
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-orange-500 text-2xl font-bold text-white shadow-lg">
                1
              </div>
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <svg className="h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Create Event</h3>
              <p className="text-sm text-slate-600">Set up your celebration details, date, and venue</p>
              {summary?.totals.eventsCount === 0 && (
                <div className="absolute -top-2 -right-2 h-4 w-4 animate-pulse rounded-full bg-brand-500"></div>
              )}
            </div>

            {/* Step 2: Share Invitation */}
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-2xl font-bold text-white shadow-lg">
                2
              </div>
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Share QR Code</h3>
              <p className="text-sm text-slate-600">Send invitation link via WhatsApp or QR code to guests</p>
            </div>

            {/* Step 3: Get RSVPs */}
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-2xl font-bold text-white shadow-lg">
                3
              </div>
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Get RSVPs</h3>
              <p className="text-sm text-slate-600">Track guest responses and finalize headcount</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-orange-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Smart Planning</h3>
            <p className="text-sm text-slate-600">AI-powered food estimation reduces waste</p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Real-time RSVP</h3>
            <p className="text-sm text-slate-600">Accurate headcount prevents over-preparation</p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Impact Tracking</h3>
            <p className="text-sm text-slate-600">See your contribution to fighting food waste</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="rounded-3xl bg-white p-8 shadow-sm shadow-orange-100/80">
        <h1 className="text-3xl font-semibold text-slate-900">
          {welcomeTitle}
        </h1>
        {welcomeSubtitle && (
          <p className="mt-3 text-lg text-slate-600">
            {welcomeSubtitle}
          </p>
        )}
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-2 shadow-lg shadow-orange-100/60">
        <div className="absolute inset-y-0 right-0 hidden w-56 translate-x-1/4 rounded-full bg-gradient-to-br from-brand-200/40 via-brand-300/30 to-brand-400/20 blur-3xl md:block" />
        <div className="relative space-y-6 rounded-[26px] border border-white/60 bg-white/80 p-8 backdrop-blur-md">
          <header className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                {upcomingText.sectionLabel}
              </span>
              <h2 className="text-3xl.font-semibold text-slate-900">
                {upcomingEvents.length > 0
                  ? upcomingText.headingWithEvents
                  : upcomingText.headingWithoutEvents}
              </h2>
              <p className="text-sm text-slate-600">
                {upcomingEvents.length > 0
                  ? ""
                  : "Plan your first mindful celebration to unlock tracking, predictions, and premium ZeroVaste reports right here."}
              </p>
            </div>
            <div className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
              <div className="flex overflow-hidden rounded-full border border-brand-200 bg-white text-xs font-semibold uppercase tracking-wide text-brand-600 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-2 px-3 py-2 transition ${
                    viewMode === "list"
                      ? "bg-brand-500 text-white shadow-inner"
                      : "hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  <ListBulletIcon className="h-4 w-4" />
                  {upcomingText.layoutList}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`flex items-center gap-2 px-3 py-2 transition ${
                    viewMode === "card"
                      ? "bg-brand-500 text-white shadow-inner"
                      : "hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  <Squares2X2Icon className="h-4 w-4" />
                  {upcomingText.layoutCard}
                </button>
              </div>
              <Link
                to="/events/new"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-brand-500/40 transition hover:from-brand-600 hover:to-brand-700"
              >
                {upcomingEvents.length > 0
                  ? upcomingText.newButtonExisting
                  : upcomingText.newButtonEmpty}
              </Link>
            </div>
          </header>

          {loading && (
            <div className="rounded-2xl border border-orange-100 bg-white px-6 py-6">
              <div className="space-y-3">
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
                <p className="text-center text-sm text-slate-600">Loading events...</p>
              </div>
              <style>{`
                @keyframes shimmer {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
              `}</style>
            </div>
          )}

          {error && !loading && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {upcomingText.error}
            </p>
          )}

          {!loading && !error && upcomingEvents.length === 0 && (
            <div className="space-y-4 rounded-2xl border border-dashed border-brand-200 bg-white/60 p-6 text-sm text-slate-600">
              <p className="text-lg font-semibold text-slate-900">
                {upcomingText.emptyTitle}
              </p>
              <p>{upcomingText.emptyDescription}</p>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                {text.payCta.fallback}
              </div>
            </div>
          )}

          {!loading && !error && upcomingEvents.length > 0 && viewMode === "list" && (
            <div className="overflow-hidden rounded-2xl border border-white/70 shadow-inner shadow-orange-100/40">
              <table className="min-w-full divide-y divide-orange-100/60 text-sm backdrop-blur">
                <thead className="bg-gradient-to-r from-brand-50 via-white to-brand-50 text-brand-700">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide">
                      {tableText.columns.event}
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide">
                      {tableText.columns.date}
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide">
                      {tableText.columns.plannedFood}
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide">
                      {tableText.columns.expectedGuests}
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide">
                      {tableText.columns.status}
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide">
                      {tableText.columns.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100/60 bg-white/90">
                  {upcomingEvents.map((event, index) => (
                    <tr
                      key={event.id}
                      className={`transition ${
                        index % 2 === 0 ? "bg-white/95" : "bg-orange-50/30"
                      } hover:bg-brand-50/40`}
                    >
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <p className="text-sm.font-semibold text-slate-900">
                            {event.title}
                          </p>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">
                            {formatDate(event.eventDate)} • {event.location}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(event.eventDate)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {event.plannedFoodKg !== null
                          ? `${event.plannedFoodKg} ${text.plannedFoodUnit}`
                          : text.plannedFoodUnknown}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {event.expectedGuests ?? text.guestsUpdating}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                          <span className="h-2 w-2 rounded-full bg-brand-500" />
                          {event.statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/events/${event.id}/overview`}
                            className="rounded-full border border-brand-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600 transition hover:bg-brand-50"
                          >
                            {tableText.actions.view}
                          </Link>
                          {event.reportStatus !== "paid" && (
                            <button
                              type="button"
                              onClick={() => handlePayClick(event)}
                              disabled={!reportPricing || paymentStatus === "processing"}
                              className="rounded-full bg-brand-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                            >
                              {payCtaLabel}
                            </button>
                          )}
                          {event.reportStatus === "paid" && (
                            <button
                              type="button"
                              onClick={() => handleViewReportClick(event.id)}
                              className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow hover:bg-emerald-600"
                            >
                              {tableText.actions.viewReport}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && upcomingEvents.length > 0 && viewMode === "card" && (
            <ul className="grid gap-6 md:grid-cols-2">
              {upcomingEvents.map((event) => (
              <li
                key={event.id}
                className="flex h-full flex-col justify-between rounded-[24px] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-100/40 p-6 text-sm text-slate-700 shadow-sm shadow-orange-100/60 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                      <span className="h-2 w-2 rounded-full bg-brand-500" />
                      {event.statusLabel}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      #{event.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {cardText.eventNameLabel}
                    </p>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {event.title}
                    </h3>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {cardText.eventDateLabel}
                    </p>
                    <p className="text-base font-medium text-slate-800">
                      {formatDate(event.eventDate)}
                    </p>
                    {event.location && (
                      <p className="rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs font-medium text-brand-700">
                        {cardText.locationPrefix}: {event.location}
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-brand-200 bg-white/90 p-4 text-xs text-slate-600">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                      {cardText.statsTitle}
                    </p>
                    <dl className="mt-3 grid gap-2 text-sm text-slate-800">
                      <div className="flex items-center justify-between">
                        <dt>{cardText.plannedFoodLabel}</dt>
                        <dd className="font-semibold">
                          {event.plannedFoodKg !== null
                            ? `${event.plannedFoodKg} ${text.plannedFoodUnit}`
                            : text.plannedFoodUnknown}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt>{cardText.guestsLabel}</dt>
                        <dd className="font-semibold">
                          {event.expectedGuests ?? text.guestsUpdating}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt>{cardText.inviteLabel}</dt>
                        <dd className="font-semibold text-brand-600">
                          {text.inviteReady}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="rounded-2xl border border-brand-200 bg-white px-4 py-3 text-xs text-brand-700">
                    {cardText.reportReadyHeading}
                    <span className="font-semibold">
                      {" "}
                      {formattedPrice ?? tableText.reportReadyFallback}
                    </span>
                    . {cardText.reportDescription}
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {event.reportStatus === "paid" ? (
                    <>
                      <button
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-white shadow hover:bg-emerald-600"
                        onClick={() => handleViewReportClick(event.id)}
                      >
                        <span>{cardText.viewReportButton}</span>
                        <span className="text-[11px] uppercase tracking-wide text-white/80">
                          {cardText.viewReportBadge}
                        </span>
                      </button>
                      <p className="text-center text-[11px] text-slate-500">
                        {cardText.impactNote}
                      </p>
                      {pricingErrorMessage && (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
                          {pricingErrorMessage}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/events/${event.id}/overview`}
                          className="flex-1 rounded-full border border-brand-200 px-4 py-2 text-center hover:bg-brand-50"
                        >
                          {cardText.plannedStatusButton}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleViewReportClick(event.id)}
                          className="flex-1 rounded-full bg-emerald-500 px-4 py-2 text-center text-white shadow hover:bg-emerald-600"
                        >
                          {tableText.actions.viewReport}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/events/${event.id}/overview`}
                          className="flex-1 rounded-full border border-brand-200 px-4 py-2 text-center hover:bg-brand-50"
                        >
                          {cardText.plannedStatusButton}
                        </Link>
                      </div>
                      <button
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-white shadow hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                        onClick={() => handlePayClick(event)}
                        disabled={!reportPricing || paymentStatus === "processing"}
                      >
                        <span>{payCtaLabel}</span>
                        <span className="text-[11px] uppercase tracking-wide text-white/80">
                          {cardText.unlockReportSuffix}
                        </span>
                      </button>
                      <p className="text-center text-[11px] text-slate-500">
                        {cardText.impactNote}
                      </p>
                      {pricingErrorMessage && (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
                          {pricingErrorMessage}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
      </section>

      {activePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Unlock premium report
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {activePayment.title}
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
                    {formattedPrice ?? text.payCta.fallback}
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
                          value={`upi://pay?pa=${upiSettings?.upiId || "zerovaste@upi"}&pn=${encodeURIComponent(upiSettings?.upiName || "Zerovaste")}&am=${reportPricing?.amount ?? 0}&cu=INR&tn=Event Report Payment`}
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
                          {formattedPrice ?? text.payCta.fallback}
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
    </section>
  );
}

export default Dashboard;
