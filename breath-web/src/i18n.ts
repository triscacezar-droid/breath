import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import de from './locales/de.json'
import ro from './locales/ro.json'

const LOCALE_KEY = 'breath-locale'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, de: { translation: de }, ro: { translation: ro } },
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'ro'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LOCALE_KEY,
      caches: ['localStorage'],
    },
  })

export { LOCALE_KEY }
export default i18n
