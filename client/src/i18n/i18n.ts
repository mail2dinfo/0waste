import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enInvite from "./locales/en/invite.json";
import taCommon from "./locales/ta/common.json";
import taAuth from "./locales/ta/auth.json";
import taInvite from "./locales/ta/invite.json";
import teCommon from "./locales/te/common.json";
import teAuth from "./locales/te/auth.json";
import teInvite from "./locales/te/invite.json";
import mlCommon from "./locales/ml/common.json";
import mlAuth from "./locales/ml/auth.json";
import mlInvite from "./locales/ml/invite.json";
import hiCommon from "./locales/hi/common.json";
import hiAuth from "./locales/hi/auth.json";
import hiInvite from "./locales/hi/invite.json";
import knCommon from "./locales/kn/common.json";
import knAuth from "./locales/kn/auth.json";
import knInvite from "./locales/kn/invite.json";

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    invite: enInvite,
  },
  ta: {
    common: taCommon,
    auth: taAuth,
    invite: taInvite,
  },
  te: {
    common: teCommon,
    auth: teAuth,
    invite: teInvite,
  },
  ml: {
    common: mlCommon,
    auth: mlAuth,
    invite: mlInvite,
  },
  hi: {
    common: hiCommon,
    auth: hiAuth,
    invite: hiInvite,
  },
  kn: {
    common: knCommon,
    auth: knAuth,
    invite: knInvite,
  },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "ta",
    supportedLngs: ["ta", "en", "te", "ml", "hi", "kn"],
    defaultNS: "common",
    ns: ["common", "auth", "invite"],
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "nowasteLanguage",
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
