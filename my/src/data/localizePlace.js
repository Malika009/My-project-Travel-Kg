import i18n from "../i18n.js";
import { CATEGORY_KEYS, DIFFICULTY_KEYS, REGION_KEYS, baseDaysOf } from "./tourInfo";

/**
 * Returns the tour with every visible text in the current language.
 * Raw API values stay available as regionKey / categoryKey / difficultyKey (use them for filtering).
 */
export function localizePlace(place, t) {
  if (!place) return place;
  const id = place._id;
  const categoryKey = CATEGORY_KEYS[place.category] || "nature";
  const regionKey = REGION_KEYS[place.region] || "";
  const difficultyKey = DIFFICULTY_KEYS[place.difficulty] || "medium";
  const days = baseDaysOf(place);
  // Tours added in the admin panel carry their own translations.
  const own = (i18n.language !== "ru" && place.translations?.[i18n.language]) || {};
  return {
    ...place,
    categoryKey,
    regionKey,
    difficultyKey,
    days,
    name: t(`tours.${id}.name`, { defaultValue: own.name || place.name }),
    description: t(`tours.${id}.description`, { defaultValue: own.description || place.description }),
    region: regionKey ? t(`regions.${regionKey}`) : place.region,
    category: t(`categories.${categoryKey}`, { defaultValue: place.category }),
    tag: t(`tours.${id}.tag`, { defaultValue: own.tag || (i18n.language === "ru" && place.tag) || t(`categories.${categoryKey}`) }),
    difficulty: t(`difficulty.${difficultyKey}`),
    duration: t("duration.days", { count: days }),
  };
}

export const localizeRegion = (region, t) =>
  REGION_KEYS[region] ? t(`regions.${REGION_KEYS[region]}`) : region;

export const localizeCategory = (category, t) =>
  CATEGORY_KEYS[category] ? t(`categories.${CATEGORY_KEYS[category]}`) : category;

const INTL_LOCALES = { ru: "ru-RU", ky: "ky-KG", en: "en-GB" };
export const intlLocale = (lang) => INTL_LOCALES[lang] || "ru-RU";

export const formatPrice = (value) => Math.round(Number(value) || 0).toLocaleString("ru-RU");

/** "12 июля 2026" — month names come from our own locale files so Kyrgyz is always correct. */
export function formatTripDate(key, t) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
  if (!m) return "";
  const months = t("calendar.monthsGenitive", { returnObjects: true });
  const month = Array.isArray(months) ? months[Number(m[2]) - 1] : m[2];
  return t("calendar.dateFormat", { day: Number(m[3]), month, year: m[1] });
}

export const formatDateTime = (value, lang) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : date.toLocaleDateString(intlLocale(lang), { day: "numeric", month: "short", year: "numeric" });
};
