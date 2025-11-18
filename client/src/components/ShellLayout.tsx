import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import api from "../hooks/useApi";
import logo from "../assets/zerowaste-logo.svg";
import ScrollToTop from "./ScrollToTop";
import ChatWidget from "./ChatWidget";

const formatName = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const getNavItems = () => {
  return [
    { path: "/events", labelKey: "nav.events", exact: true },
    { path: "/events/new", labelKey: "nav.planEvent" },
  ];
};

type AuthState = { name: string | null; userId: string | null; role: string | null };
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

function ShellLayout() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("common");
  const [auth, setAuth] = useState<AuthState>({ name: null, userId: null, role: null });
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

  const translatedNavItems = useMemo(
    () =>
      getNavItems().map((item) => ({
        ...item,
        label: t(item.labelKey),
      })),
    [t]
  );

  const syncAuth = useCallback(() => {
    const userId = window.localStorage.getItem("nowasteUserId");
    const name = window.localStorage.getItem("nowasteUserName");
    const role = window.localStorage.getItem("nowasteUserRole");
    setAuth({ name: formatName(name), userId, role });
    if (!userId) {
      delete api.defaults.headers.common["x-user-id"];
    }
  }, []);

  const syncLocale = useCallback(() => {
    const country = window.localStorage.getItem("nowasteCountry") || "IN";
    const language = window.localStorage.getItem("nowasteLanguage") || "ta";
    setLocale({ country, language });
    void i18n.changeLanguage(language);
  }, [i18n]);

  useEffect(() => {
    syncAuth();
    syncLocale();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key.startsWith("nowaste")) {
        syncAuth();
        syncLocale();
      }
    };

    const handleAuthChange = () => syncAuth();
    const handleLocaleChange = () => syncLocale();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("nowaste-auth-changed", handleAuthChange as EventListener);
    window.addEventListener("nowaste-locale-changed", handleLocaleChange as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("nowaste-auth-changed", handleAuthChange as EventListener);
      window.removeEventListener("nowaste-locale-changed", handleLocaleChange as EventListener);
    };
  }, [syncAuth, syncLocale]);

  const handleLogout = () => {
    window.localStorage.removeItem("nowasteUserId");
    window.localStorage.removeItem("nowasteUserName");
    delete api.defaults.headers.common["x-user-id"];
    window.dispatchEvent(new Event("nowaste-auth-changed"));
    navigate("/login");
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
    <div className="min-h-screen bg-orange-50 text-slate-900">
      <header className="border-b border-orange-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-3">
          {/* Top row: logo left, country/language right */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={logo} alt="Zerovaste logo" className="h-7 w-7" />
              <span className="text-2xl font-bold">
                <span className="text-brand-600">Zero</span>
                <span className="text-slate-900">vaste</span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold tracking-wide text-brand-600">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-slate-600">
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
            </div>
          </div>
          {/* Second row: nav centered, auth actions on the right */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm font-medium">
            <div className="flex-1 flex justify-center">
              <nav className="flex flex-wrap.items-center gap-2">
                {translatedNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact ?? false}
                    className={({ isActive }) =>
                      clsx(
                        "rounded-full px-4 py-2 transition-colors",
                        isActive
                          ? "bg-brand-500 text-white shadow"
                          : "text-slate-600 hover:bg-brand-100 hover:text-brand-700"
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-brand-600">
              {auth.userId && (
                <div className="mr-2">
                  <ChatWidget />
                </div>
              )}
              {auth.userId ? (
                <>
                  {auth.name && (
                    <span className="rounded-full bg-brand-100 px-4 py-1.5 text-[11px] font-semibold normal-case text-brand-700">
                      {t("greeting", { name: auth.name })}
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="rounded-full border border-brand-200 px-4 py-1.5 text-[11px] font-semibold text-brand-600 transition hover:bg-brand-50"
                  >
                    {t("auth.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded-full border border-brand-200 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-600 transition hover:bg-brand-50"
                  >
                    {t("auth.login")}
                  </Link>
                  <Link
                    to="/signup"
                    className="rounded-full bg-brand-500 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow transition hover:bg-brand-600"
                  >
                    {t("auth.signup")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
      <ScrollToTop />
    </div>
  );
}

export default ShellLayout;

