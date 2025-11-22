import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpIcon } from "@heroicons/react/24/outline";
import logo from "../assets/zerowaste-logo.svg";
import { useApi } from "../hooks/useApi";

type LocaleState = { country: string; language: string };

const supportedCountries = [
  { code: "IN", label: "India", flag: "🇮🇳" },
  { code: "SG", label: "Singapore", flag: "🇸🇬" },
  { code: "AE", label: "United Arab Emirates", flag: "🇦🇪" },
  { code: "US", label: "United States", flag: "🇺🇸" },
];

const supportedLanguages = [
  { code: "ta", label: "தமிழ்" },
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "te", label: "తెలుగు" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
];

// userTypes will be generated from translations in component

const rotatingEvents = [
  {
    title: "Megha & Arjun Wedding",
    date: "December 18",
    location: "Goa",
    plannedGuests: 850,
    actualGuests: 650,
    savedGuests: 200,
    type: "Wedding",
  },
  {
    title: "Rajesh Housewarming",
    date: "December 19",
    location: "Hyderabad",
    plannedGuests: 500,
    actualGuests: 380,
    savedGuests: 120,
    type: "Housewarming",
  },
  {
    title: "Corporate Annual Meet",
    date: "December 20",
    location: "Delhi",
    plannedGuests: 1200,
    actualGuests: 950,
    savedGuests: 250,
    type: "Corporate",
  },
  {
    title: "Community Kitchen Feast",
    date: "December 21",
    location: "Chennai",
    plannedGuests: 400,
    actualGuests: 320,
    savedGuests: 80,
    type: "Community Gathering",
  },
  {
    title: "Priya & Vikram Reception",
    date: "December 22",
    location: "Jaipur",
    plannedGuests: 600,
    actualGuests: 480,
    savedGuests: 120,
    type: "Reception",
  },
  {
    title: "Temple Festival Lunch",
    date: "December 23",
    location: "Coimbatore",
    plannedGuests: 300,
    actualGuests: 240,
    savedGuests: 60,
    type: "Community Gathering",
  },
];

function Landing() {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const api = useApi();
  
  const userTypes = [
    {
      title: t("landing.whoUsing.individualUser.title"),
      description: t("landing.whoUsing.individualUser.description"),
    },
    {
      title: t("landing.whoUsing.eventPlanners.title"),
      description: t("landing.whoUsing.eventPlanners.description"),
    },
    {
      title: t("landing.whoUsing.caterers.title"),
      description: t("landing.whoUsing.caterers.description"),
    },
  ];
  const [locale, setLocale] = useState<LocaleState>(() => {
    const storedCountry = window.localStorage.getItem("nowasteCountry");
    const storedLanguage = window.localStorage.getItem("nowasteLanguage");
    const nextCountry = storedCountry ?? "IN";
    const nextLanguage = storedLanguage ?? "ta";
    if (!storedCountry) {
      window.localStorage.setItem("nowasteCountry", nextCountry);
    }
    if (!storedLanguage) {
      window.localStorage.setItem("nowasteLanguage", nextLanguage);
    }
    return { country: nextCountry, language: nextLanguage };
  });

  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const syncLocale = useCallback(() => {
    const country = window.localStorage.getItem("nowasteCountry") || "IN";
    const language = window.localStorage.getItem("nowasteLanguage") || "ta";
    setLocale({ country, language });
    void i18n.changeLanguage(language);
  }, [i18n]);

  useEffect(() => {
    syncLocale();
    const handler = () => syncLocale();
    window.addEventListener("nowaste-locale-changed", handler);
    return () => window.removeEventListener("nowaste-locale-changed", handler);
  }, [syncLocale]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEventIndex((prev) => (prev + 1) % rotatingEvents.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreateEvent = async () => {
    // Navigate to event form - it will check authentication and show modal if needed
    navigate("/events/new");
  };


  const handleCountryChange = (value: string) => {
    setLocale((current) => ({ ...current, country: value }));
    window.localStorage.setItem("nowasteCountry", value);
    window.dispatchEvent(new Event("nowaste-locale-changed"));
  };

  const handleLanguageChange = (value: string) => {
    setLocale((current) => ({ ...current, language: value }));
    window.localStorage.setItem("nowasteLanguage", value);
    void i18n.changeLanguage(value);
    window.dispatchEvent(new Event("nowaste-locale-changed"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-100">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src={logo} alt="Zerovaste logo" className="h-7 w-7 sm:h-9 sm:w-9" />
          <div className="leading-tight">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
              <span className="text-brand-600">Zero</span>
              <span className="text-slate-900">vaste</span>
            </div>
            <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-brand-700">
              {t("landing.tagline")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-semibold tracking-wide text-slate-600 sm:flex">
            <label className="flex items-center gap-1 text-[10px]">
              <span>{t("countryLabel")}</span>
              <select
                value={locale.country}
                onChange={(event) => handleCountryChange(event.target.value)}
                className="rounded-full border border-orange-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {supportedCountries.map((option) => (
                  <option key={option.code} value={option.code}>
                    {`${option.flag} ${option.label}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-[10px]">
              <span>{t("languageLabel")}</span>
              <select
                value={locale.language}
                onChange={(event) => handleLanguageChange(event.target.value)}
                className="rounded-full border border-orange-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {supportedLanguages.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-semibold text-slate-600">
            <Link to="/login" className="px-3 py-1.5 sm:px-0 sm:py-0 hover:text-brand-600">
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-brand-500 px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm text-white shadow hover:bg-brand-600"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 pb-24 pt-8 sm:pt-12">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[-120px] top-[-60px] h-64 w-64 rounded-full bg-brand-300/30 blur-3xl"></div>
          <div className="absolute right-[-80px] top-[140px] h-72 w-72 rounded-full bg-brand-500/20 blur-3xl"></div>
          <div className="absolute bottom-[-100px] left-[20%] h-56 w-56 rounded-full bg-orange-200/40 blur-3xl"></div>
        </div>
        <section className="grid gap-8 lg:grid-cols-2 items-start">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight">
                <span className="text-brand-600">{t("landing.hero.titlePart1")}</span>{" "}
                <span className="text-slate-900">{t("landing.hero.titlePart2")}</span>
              </h1>
            </div>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: t("landing.hero.description") }} />
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <button
                onClick={handleCreateEvent}
                className="w-full sm:w-auto rounded-full bg-brand-500 px-6 sm:px-8 py-2.5 sm:py-3 text-sm font-semibold normal-case text-white shadow-lg shadow-brand-500/40 transition hover:bg-brand-600"
              >
                {t("landing.hero.createEvent")}
              </button>
              <Link
                to="/login"
                className="w-full sm:w-auto rounded-full border border-brand-300 px-6 py-2.5 sm:py-3 text-sm font-semibold normal-case text-brand-600 hover:bg-brand-50 text-center"
              >
                {t("landing.hero.haveAccount")}
              </Link>
            </div>
          </div>
          <div className="relative mt-8 lg:mt-0">
            <div className="absolute -left-6 top-6 h-32 w-32 sm:h-64 sm:w-64 rounded-full bg-brand-200/40 blur-3xl" />
            <div className="relative mx-auto lg:ml-auto rounded-2xl sm:rounded-3xl border border-orange-100 bg-white p-4 sm:p-5 shadow-2xl shadow-orange-200/60 max-w-md lg:max-w-md transition-all duration-500">
              {(() => {
                const currentEvent = rotatingEvents[currentEventIndex];
                return (
                  <>
                    <div className="rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-600 p-6 text-white shadow-xl">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">{currentEvent.type}</p>
                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-2xl font-bold">{currentEvent.title}</p>
                      <p className="mt-2 text-sm text-white/90 font-medium">
                        {currentEvent.date} • {currentEvent.location}
                      </p>
                      
                      {/* Visual Analytics Card - Horizontal Layout */}
                      <div className="mt-5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 p-4 shadow-lg">
                        <div className="grid grid-cols-4 gap-3 items-center">
                          {/* Planned */}
                          <div className="text-center">
                            <p className="text-xs font-semibold text-white/80 mb-1">{t("landing.eventCard.planned")}</p>
                            <p className="text-lg font-bold text-white">{currentEvent.plannedGuests}</p>
                            <p className="text-[10px] text-white/70">{t("landing.eventCard.guests")}</p>
                          </div>
                          
                          {/* Arrow */}
                          <div className="flex flex-col items-center justify-center">
                            <svg className="w-5 h-5 text-white/90 mb-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <p className="text-[9px] font-bold text-white/80 text-center">{t("landing.eventCard.viaAnalytics")}</p>
                          </div>
                          
                          {/* Actual */}
                          <div className="text-center">
                            <p className="text-xs font-semibold text-white/80 mb-1">{t("landing.eventCard.actual")}</p>
                            <p className="text-lg font-bold text-green-200">{currentEvent.actualGuests}</p>
                            <p className="text-[10px] text-white/70">{t("landing.eventCard.guests")}</p>
                          </div>
                          
                          {/* Saved */}
                          <div className="text-center bg-gradient-to-br from-green-500/50 to-emerald-500/50 rounded-lg p-2 border border-green-300/40">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <svg className="w-4 h-4 text-green-200" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <p className="text-xs font-bold text-green-100">{t("landing.eventCard.saved")}</p>
                            </div>
                            <p className="text-xl font-extrabold text-white drop-shadow-md">
                              {currentEvent.savedGuests}
                            </p>
                            <p className="text-[10px] text-green-100 font-semibold">{t("landing.eventCard.meals")}</p>
                          </div>
                        </div>
                        
                        {/* Progress Bar Comparison */}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/70 w-12">{t("landing.eventCard.planned")}</span>
                            <div className="flex-1 h-2.5 bg-white/25 rounded-full overflow-hidden shadow-inner">
                              <div 
                                className="h-full bg-gradient-to-r from-white/50 to-white/40 rounded-full"
                                style={{ width: '100%' }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-white w-12 text-right">{currentEvent.plannedGuests}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/70 w-12">{t("landing.eventCard.actual")}</span>
                            <div className="flex-1 h-2.5 bg-white/25 rounded-full overflow-hidden shadow-inner">
                              <div 
                                className="h-full bg-gradient-to-r from-green-400 to-green-300 rounded-full shadow-sm"
                                style={{ width: `${(currentEvent.actualGuests / currentEvent.plannedGuests) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-green-200 w-12 text-right">{currentEvent.actualGuests}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-center gap-1.5">
                      {rotatingEvents.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setCurrentEventIndex(index)}
                          className={`h-1.5 rounded-full transition-all ${
                            index === currentEventIndex
                              ? "w-6 bg-brand-500"
                              : "w-1.5 bg-brand-200"
                          }`}
                          aria-label={`Go to event ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </section>

        <section className="mt-12 sm:mt-16">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
              <span className="text-brand-600">{t("landing.howItWorks.titlePart1")}</span>{" "}
              <span className="text-slate-900">{t("landing.howItWorks.titlePart2")}</span>
            </h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-600 px-2">{t("landing.howItWorks.subtitle")}</p>
          </div>
          <div className="grid gap-4 sm:gap-6 rounded-2xl sm:rounded-3xl bg-white/80 p-4 sm:p-6 shadow-lg shadow-orange-100/70 backdrop-blur-sm sm:grid-cols-3">
            <article className="flex flex-col items-center text-center rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h10a2 2 0 0 1 2 2v2H5V5a2 2 0 0 1 2-2zm12 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9h14zm-9 3h6v2H10v-2z"/></svg>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">{t("landing.howItWorks.step1.title")}</h3>
              <p className="text-sm text-slate-600">{t("landing.howItWorks.step1.description")}</p>
            </article>
            <article className="flex flex-col items-center text-center rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">{t("landing.howItWorks.step2.title")}</h3>
              <p className="text-sm text-slate-600">{t("landing.howItWorks.step2.description")}</p>
            </article>
            <article className="flex flex-col items-center text-center rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7 3h4v11h-4V10z"/></svg>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">{t("landing.howItWorks.step3.title")}</h3>
              <p className="text-sm text-slate-600">{t("landing.howItWorks.step3.description")}</p>
            </article>
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-gradient-to-br from-brand-50 to-orange-50 p-10 shadow-lg shadow-orange-100/70">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
              {t("landing.whoUsing.title")}
            </h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-600 px-2">{t("landing.whoUsing.subtitle")}</p>
          </div>
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {userTypes.map((userType, index) => (
              <article key={userType.title} className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {userType.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-600">{userType.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 sm:mt-16 rounded-2xl sm:rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-50 to-brand-50 p-6 sm:p-8 lg:p-10 text-center shadow-md">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
            <span className="text-brand-600">{t("landing.cta.titlePart1")}</span>{" "}
            <span className="text-slate-900">{t("landing.cta.titlePart2")}</span>
          </h3>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-slate-600 px-2">{t("landing.cta.description")}</p>
          <div className="mt-4 sm:mt-5">
            <Link
              to="/signup"
              className="inline-flex items-center rounded-full bg-brand-600 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-700"
            >
              {t("landing.cta.button")}
            </Link>
          </div>
        </section>

        <footer className="mt-12 sm:mt-16 border-t border-orange-200 bg-white/80 py-8 sm:py-12">
          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Company Info */}
            <div className="space-y-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <img src={logo} alt="Zerovaste logo" className="h-8 w-8" />
                <span className="text-xl font-bold">
                  <span className="text-brand-600">Zero</span>
                  <span className="text-slate-900">vaste</span>
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {t("landing.footer.tagline")}
              </p>
              <p className="text-xs text-slate-500">
                {t("landing.footer.copyright", { year: new Date().getFullYear() })}
              </p>
            </div>

            {/* Contact Us */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">{t("landing.footer.contactUs")}</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div>
                  <p className="font-medium text-slate-700">{t("landing.footer.address")}</p>
                  <p className="mt-1">123 Food Waste Street<br />Bengaluru, Karnataka 560001<br />India</p>
                </div>
                <div className="mt-4">
                  <p className="font-medium text-slate-700">{t("landing.footer.phone")}</p>
                  <a
                    href="https://wa.me/919942393231"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-2 text-brand-600 hover:text-brand-700"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    +91 99423 93231
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Quick Links</h3>
              <div className="space-y-2 text-sm">
                <Link to="/login" className="block text-slate-600 hover:text-brand-600">
                  {t("auth.login")}
                </Link>
                <Link to="/signup" className="block text-slate-600 hover:text-brand-600">
                  {t("auth.signup")}
                </Link>
                <a href="#" className="block text-slate-600 hover:text-brand-600">
                  Privacy Policy
                </a>
                <a href="#" className="block text-slate-600 hover:text-brand-600">
                  Terms of Service
                </a>
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Follow Us</h3>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-brand-100 hover:text-brand-600"
                  aria-label="Facebook"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-brand-100 hover:text-brand-600"
                  aria-label="Instagram"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-brand-100 hover:text-brand-600"
                  aria-label="LinkedIn"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-brand-100 hover:text-brand-600"
                  aria-label="Twitter"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition hover:bg-brand-600 hover:shadow-xl"
            aria-label="Scroll to top"
          >
            <ArrowUpIcon className="h-6 w-6" />
          </button>
        )}

      </main>
    </div>
  );
}

export default Landing;







