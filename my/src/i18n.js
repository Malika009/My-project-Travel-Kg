import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./locales/ru.json";
import ky from "./locales/ky.json";
import en from "./locales/en.json";

const normalizeLanguage = (value) => {
  if (!value) return "ru";
  if (value === "kg") return "ky";
  return ["ru", "ky", "en"].includes(value) ? value : "ru";
};

const savedLanguage = normalizeLanguage(localStorage.getItem("travel-lang"));

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      ky: { translation: ky },
      en: { translation: en },
    },
    lng: savedLanguage,
    fallbackLng: "ru",
    supportedLngs: ["ru", "ky", "en"],
    defaultNS: "translation",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
export { normalizeLanguage };
