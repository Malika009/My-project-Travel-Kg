// Tour details, pricing and availability rules.
// Pricing and availability are mirrored in server/src/booking.js — keep both in sync.

export const CATEGORY_KEYS = {
  Горы: "mountains",
  Озёра: "lakes",
  Треккинг: "trekking",
  Каньоны: "canyons",
  Приключения: "adventures",
  Природа: "nature",
  История: "history",
  Город: "city",
};

export const REGION_KEYS = {
  "Чуйская область": "chuy",
  "Иссык-Кульская область": "issykKul",
  "Нарынская область": "naryn",
  "Ошская область": "osh",
  "Джалал-Абадская область": "jalalAbad",
  "Таласская область": "talas",
  "Баткенская область": "batken",
};

export const DIFFICULTY_KEYS = { Легко: "easy", Средне: "medium", Сложно: "hard" };

const invert = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
export const CATEGORY_VALUES = invert(CATEGORY_KEYS);
export const REGION_VALUES = invert(REGION_KEYS);
export const DIFFICULTY_VALUES = invert(DIFFICULTY_KEYS);

// Activities shown on the tour page (labels live in locales under "activities.*").
const CATEGORY_ACTIVITIES = {
  mountains: ["hiking", "viewpoints", "photo", "picnic"],
  lakes: ["lakeWalk", "yurt", "photo", "sunset"],
  trekking: ["hiking", "camping", "viewpoints", "photo"],
  canyons: ["hiking", "photo", "sunset", "picnic"],
  adventures: ["adrenaline", "photo", "viewpoints", "localFood"],
  nature: ["hiking", "waterfall", "photo", "picnic"],
  history: ["excursion", "museum", "photo", "localFood"],
  city: ["excursion", "bazaar", "localFood", "photo"],
};

const TOUR_ACTIVITIES = {
  "issyk-kul": ["swimming", "beach", "boat", "localFood", "sunset", "photo"],
  "son-kul": ["yurt", "horse", "stars", "localFood", "lakeWalk", "photo"],
  "ala-archa": ["hiking", "waterfall", "viewpoints", "picnic", "photo"],
  karakol: ["excursion", "localFood", "hiking", "hotSprings", "photo"],
  "jeti-oguz": ["hiking", "viewpoints", "horse", "photo", "picnic"],
  skazka: ["hiking", "photo", "sunset", "swimming"],
  "kel-suu": ["boat", "lakeWalk", "yurt", "viewpoints", "photo"],
  "sary-chelek": ["lakeWalk", "boat", "hiking", "photo", "picnic"],
  arslanbob: ["hiking", "waterfall", "localFood", "excursion", "photo"],
  "tash-rabat": ["excursion", "yurt", "horse", "stars", "photo"],
  "ala-kul": ["hiking", "camping", "hotSprings", "viewpoints", "photo"],
  chunkurchak: ["hiking", "horse", "picnic", "viewpoints", "photo"],
  burana: ["excursion", "museum", "photo", "localFood"],
  "altyn-arashan": ["hiking", "hotSprings", "yurt", "horse", "photo"],
  barskoon: ["waterfall", "hiking", "viewpoints", "picnic", "photo"],
  "song-kul-horse": ["horse", "yurt", "localFood", "photo"],
  "horse-steppe": ["horse", "yurt", "stars", "localFood"],
  paragliding: ["adrenaline", "viewpoints", "beach", "photo"],
  "rafting-chui": ["adrenaline", "swimming", "picnic", "photo"],
  "mountain-bike": ["adrenaline", "camping", "viewpoints", "photo"],
  "chatyr-kul": ["lakeWalk", "yurt", "stars", "photo"],
  "pio-peak": ["hiking", "camping", "viewpoints", "photo"],
  bishkek: ["excursion", "bazaar", "museum", "localFood"],
};

// Months (1–12) when a tour runs. Most high-altitude trips are summer-only.
const SEASONS = { summer: [6, 7, 8, 9], warm: [5, 6, 7, 8, 9, 10], all: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] };
const TOUR_SEASON = {
  "son-kul": "summer", "chatyr-kul": "summer", "kel-suu": "summer", "ala-kul": "summer",
  "tash-rabat": "warm", "pio-peak": "summer", "song-kul-horse": "summer", "horse-steppe": "summer",
  "sary-chet": "warm", "asan-basky": "warm", "seren-peak": "summer", "mountain-bike": "warm",
  "altyn-arashan": "warm", "rafting-chui": "warm", paragliding: "warm", "sary-chelek": "warm",
  "lenin-trail": "summer", jyrgalan: "warm", arslanbob: "warm", "kara-mazar": "warm",
  barskoon: "warm", "myn-tala": "warm", toraygyr: "warm",
};

export const MAX_GUESTS = 12;
export const GROUP_DISCOUNT_FROM = 5;
export const GROUP_DISCOUNT = 0.1;
export const MIN_LEAD_DAYS = 2;
export const BOOKING_HORIZON_DAYS = 365;

export const baseDaysOf = (place) =>
  Math.max(1, Number.parseInt(String(place?.duration || "1").match(/\d+/)?.[0] || "1", 10));

export const categoryKeyOf = (place) => CATEGORY_KEYS[place?.category] || "nature";
export const activitiesOf = (place) => TOUR_ACTIVITIES[place?._id] || CATEGORY_ACTIVITIES[categoryKeyOf(place)];
export const seasonKeyOf = (place) => TOUR_SEASON[place?._id] || "all";
export const seasonMonthsOf = (place) => SEASONS[seasonKeyOf(place)];

// Duration choices: the standard length plus up to two extra days (never longer than 7).
export const durationOptions = (place) => {
  const base = baseDaysOf(place);
  return [base, base + 1, base + 2].filter((d) => d <= Math.max(7, base));
};

export const extraDayPrice = (place) =>
  Math.round(((Number(place?.price) || 0) / baseDaysOf(place)) * 0.7 / 50) * 50;

export function priceFor(place, guests = 1, days) {
  const base = baseDaysOf(place);
  const chosenDays = days || base;
  const perPerson = (Number(place?.price) || 0) + Math.max(0, chosenDays - base) * extraDayPrice(place);
  const subtotal = perPerson * guests;
  const discount = guests >= GROUP_DISCOUNT_FROM ? Math.round(subtotal * GROUP_DISCOUNT) : 0;
  return { perPerson, subtotal, discount, total: subtotal - discount };
}

// ---------- dates ----------
export const toDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parseDateKey = (key) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

const hash = (text) => {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h;
};

// Multi-day tours depart only on some weekdays (0 = Sunday).
const departureDays = (days) => (days >= 3 ? [1, 4, 6] : days === 2 ? [2, 4, 6, 0] : [0, 1, 2, 3, 4, 5, 6]);

// Seats already taken by other operators' groups — simulated but stable for a date.
const preBookedSeats = (placeId, key) => {
  const h = hash(`${placeId}:${key}`) % 100;
  if (h < 8) return MAX_GUESTS; // sold out
  return h % 9;
};

/**
 * Status of one date for a tour.
 * status: "available" | "few" | "soldOut" | "offSeason" | "noDeparture" | "past"
 */
export function dateStatus(place, key, booked = {}, today = new Date()) {
  const date = parseDateKey(key);
  if (!date || !place) return { status: "past", seatsLeft: 0 };
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + MIN_LEAD_DAYS);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + BOOKING_HORIZON_DAYS);
  if (date < start || date > end) return { status: "past", seatsLeft: 0 };
  if (!seasonMonthsOf(place).includes(date.getMonth() + 1)) return { status: "offSeason", seatsLeft: 0 };
  if (!departureDays(baseDaysOf(place)).includes(date.getDay())) return { status: "noDeparture", seatsLeft: 0 };
  const seatsLeft = Math.max(0, MAX_GUESTS - preBookedSeats(place._id, key) - (Number(booked[key]) || 0));
  if (!seatsLeft) return { status: "soldOut", seatsLeft: 0 };
  return { status: seatsLeft <= 4 ? "few" : "available", seatsLeft };
}

export const isBookable = (s) => s.status === "available" || s.status === "few";

export function nextAvailableDate(place, booked = {}, today = new Date()) {
  for (let i = MIN_LEAD_DAYS; i < BOOKING_HORIZON_DAYS; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const key = toDateKey(d);
    if (isBookable(dateStatus(place, key, booked, today))) return key;
  }
  return "";
}
