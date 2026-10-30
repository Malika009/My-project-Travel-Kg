import { resolveAssetUrl } from "./services";
import credits from "./photoCredits.json";

// Real photos of Kyrgyzstan from Wikimedia Commons (see photoCredits.json), in two sizes.
const files = import.meta.glob("../assets/places/*.jpg", { eager: true, query: "?url", import: "default" });

const photos = {};
for (const [path, url] of Object.entries(files)) {
  const match = path.split("/").pop().match(/^(.+)-(\d)(-sm)?\.jpg$/);
  if (!match) continue;
  const [, id, index, small] = match;
  photos[id] ??= [];
  const entry = (photos[id][Number(index) - 1] ??= { id: `${id}-${index}` });
  entry[small ? "small" : "src"] = url;
}

// Tours without their own photo set borrow a fitting one.
const ALIASES = {
  "song-kul-horse": ["horses", 0, "son-kul", 1],
  "horse-steppe": ["horses", 2, "horses", 1],
  paragliding: ["issyk-kul", 2],
  "lenin-trail": ["ala-archa", 1],
};

const ownPhotos = (id) => {
  if (photos[id]) return photos[id];
  const alias = ALIASES[id];
  if (!alias) return [];
  const list = [];
  for (let i = 0; i < alias.length; i += 2) {
    const photo = photos[alias[i]]?.[alias[i + 1]];
    if (photo) list.push(photo);
  }
  return list;
};

// Seed data points at Unsplash / bundled files; anything else was set by an admin and wins.
const isSeedImage = (src = "") => /images\.unsplash\.com|^\/?tours\/|wikimedia\.org/i.test(src);

/** All photos for a tour: [{ src, small }] — never empty. */
export function placePhotos(place) {
  if (!place) return [];
  const own = ownPhotos(place._id);
  const original = place.image ? { id: "original", src: resolveAssetUrl(place.image), small: resolveAssetUrl(place.image) } : null;
  if (original && !isSeedImage(place.image)) return [original, ...own];
  if (own.length) return own;
  return original ? [original] : [];
}

export const coverPhoto = (place) => placePhotos(place)[0];

export const galleryPhotos = [
  ["son-kul", 0], ["jeti-oguz", 0], ["kel-suu", 0], ["issyk-kul", 0], ["ala-kul", 0],
  ["tash-rabat", 0], ["sary-chelek", 0], ["burana", 0], ["skazka", 0], ["altyn-arashan", 0],
  ["horses", 0], ["karakol", 0],
]
  .map(([id, i]) => photos[id]?.[i] && { ...photos[id][i], place: id })
  .filter(Boolean);

export const heroPhotos = [["kel-suu", 0], ["son-kul", 0], ["jeti-oguz", 0]]
  .map(([id, i]) => photos[id]?.[i] && { ...photos[id][i], place: id })
  .filter(Boolean);

export const namedPhoto = (id, index = 0) => photos[id]?.[index];

export const photoCredits = credits;
