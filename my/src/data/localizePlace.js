const categoryMap = {
  Горы: "mountains",
  Озёра: "lakes",
  Треккинг: "trekking",
  Каньоны: "canyons",
  Приключения: "adventures",
  Природа: "nature",
  История: "history",
  Город: "city",
};

const regionMap = {
  "Чуйская область": "chuy",
  "Иссык-Кульская область": "issykKul",
  "Нарынская область": "naryn",
  "Ошская область": "osh",
  "Джалал-Абадская область": "jalalAbad",
  "Таласская область": "talas",
  "Баткенская область": "batken",
};

const difficultyMap = {
  Легко: "easy",
  Средне: "medium",
  Сложно: "hard",
};

export function localizePlace(place, t) {
  if (!place) return place;

  const daysMatch = Number.parseInt(String(place.duration || "1").match(/\d+/)?.[0] || "1", 10);
  const localizedCategoryKey = categoryMap[place.category] || "nature";
  const localized = {
    ...place,
    name: t(`tours.${place._id}.name`, { defaultValue: place.name }),
    description: t(`tours.${place._id}.description`, { defaultValue: place.description }),
    region: t(`regions.${regionMap[place.region] || "unknown"}`, { defaultValue: place.region }),
    category: t(`categories.${localizedCategoryKey}`, { defaultValue: place.category }),
    tag: t(`categories.${localizedCategoryKey}`, { defaultValue: place.tag || place.category }),
    difficulty: t(`difficulty.${difficultyMap[place.difficulty] || "medium"}`, { defaultValue: place.difficulty }),
    duration: t("duration.days", { count: daysMatch, defaultValue: place.duration }),
  };

  return localized;
}
