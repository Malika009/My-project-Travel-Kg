import { MAX_GUESTS, dateStatus, isBookable, priceFor } from "./tourInfo";

/** Price, date status and limits for one cart line. Shared with the checkout page. */
export function describeItem(item, place, booked) {
  if (!place) return { missing: true };
  const status = item.date ? dateStatus(place, item.date, booked[place._id] || {}) : null;
  const dateOk = Boolean(status && isBookable(status));
  const maxGuests = dateOk ? Math.min(MAX_GUESTS, status.seatsLeft) : MAX_GUESTS;
  const guests = Math.min(item.guests, maxGuests);
  const days = item.days || undefined;
  return { place, status, dateOk, maxGuests, guests, price: priceFor(place, guests, days), problem: !item.date ? "noDate" : !dateOk ? "dateUnavailable" : null };
}
