import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Bundle translations so they work in Electron (file://) where fetch() cannot load /locales/...
import enTranslation from '../public/locales/en/translation.json';
import frTranslation from '../public/locales/fr/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: ['fr', 'en'],
    debug: false,
    lng: 'fr',
    resources: {
      en: { translation: enTranslation as Record<string, unknown> },
      fr: { translation: frTranslation as Record<string, unknown> },
    },
    detection: {
      order: ['localStorage', 'cookie', 'querystring'],
      caches: ['localStorage', 'cookie'],
      lookupLocalStorage: 'i18nextLng',
      lookupCookie: 'i18next',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
