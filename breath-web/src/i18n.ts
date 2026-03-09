import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import de from './locales/de.json'
import ro from './locales/ro.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import pt from './locales/pt.json'
import it from './locales/it.json'
import pl from './locales/pl.json'
import ru from './locales/ru.json'
import ja from './locales/ja.json'
import zh from './locales/zh.json'
import hi from './locales/hi.json'

const LOCALE_KEY = 'breath-locale'

const resources = {
  en: { translation: en },
  de: { translation: de },
  ro: { translation: ro },
  es: { translation: es },
  fr: { translation: fr },
  pt: { translation: pt },
  it: { translation: it },
  pl: { translation: pl },
  ru: { translation: ru },
  ja: { translation: ja },
  zh: { translation: zh },
  hi: { translation: hi },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'ro', 'es', 'fr', 'pt', 'it', 'pl', 'ru', 'ja', 'zh', 'hi'],
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LOCALE_KEY,
      caches: ['localStorage'],
      convertDetectedLanguage: (lng) => lng.split('-')[0],
    },
  })

export default i18n
