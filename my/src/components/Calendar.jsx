import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import { dateStatus, isBookable, nextAvailableDate, parseDateKey, toDateKey } from "../data/tourInfo";

/**
 * Month calendar showing which dates of a tour can be booked.
 * value / onChange use "YYYY-MM-DD" strings.
 */
export default function Calendar({ place, value, onChange, booked = {} }) {
  const { t } = useTranslation();
  const [today] = useState(() => new Date());
  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() + 12, 1);

  const [view, setView] = useState(() => {
    const start = parseDateKey(value) || parseDateKey(nextAvailableDate(place, booked, today)) || today;
    return new Date(start.getFullYear(), start.getMonth(), 1);
  });

  const months = t("calendar.months", { returnObjects: true });
  const weekdays = t("calendar.weekdays", { returnObjects: true });

  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
    const total = new Date(year, month + 1, 0).getDate();
    const list = Array.from({ length: offset }, (_, i) => ({ empty: true, key: `e${i}` }));
    for (let day = 1; day <= total; day++) {
      const key = toDateKey(new Date(year, month, day));
      list.push({ day, key, ...dateStatus(place, key, booked, today) });
    }
    return list;
  }, [view, place, booked, today]);

  const canPrev = view > firstMonth;
  const canNext = view < lastMonth;
  const shift = (step) => setView((v) => new Date(v.getFullYear(), v.getMonth() + step, 1));
  const selected = value ? dateStatus(place, value, booked, today) : null;
  const monthHasDates = cells.some((c) => !c.empty && isBookable(c));

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label={t("calendar.prevMonth")}>
          <Icon name="chevronLeft" size={18} />
        </button>
        <strong aria-live="polite">
          {Array.isArray(months) ? months[view.getMonth()] : ""} {view.getFullYear()}
        </strong>
        <button type="button" onClick={() => shift(1)} disabled={!canNext} aria-label={t("calendar.nextMonth")}>
          <Icon name="chevronRight" size={18} />
        </button>
      </div>
      <div className="calendar-grid" role="grid">
        {Array.isArray(weekdays) && weekdays.map((d) => <span className="calendar-weekday" key={d}>{d}</span>)}
        {cells.map((c) =>
          c.empty ? (
            <span key={c.key} />
          ) : (
            <button
              type="button"
              key={c.key}
              className={`calendar-day ${c.status} ${value === c.key ? "selected" : ""}`}
              disabled={!isBookable(c)}
              onClick={() => onChange(c.key)}
              aria-pressed={value === c.key}
              aria-label={`${c.day} ${Array.isArray(months) ? months[view.getMonth()] : ""} — ${t(`calendar.status.${c.status}`)}`}
              title={t(`calendar.status.${c.status}`)}
            >
              {c.day}
            </button>
          ),
        )}
      </div>
      {!monthHasDates && (
        <p className="calendar-note">
          <Icon name="info" size={16} /> {t("calendar.noDatesInMonth")}
        </p>
      )}
      <ul className="calendar-legend">
        <li><i className="available" /> {t("calendar.legend.available")}</li>
        <li><i className="few" /> {t("calendar.legend.few")}</li>
        <li><i className="soldOut" /> {t("calendar.legend.soldOut")}</li>
        <li><i className="offSeason" /> {t("calendar.legend.unavailable")}</li>
      </ul>
      {selected && isBookable(selected) && (
        <p className={`calendar-seats ${selected.status}`}>
          <Icon name="users" size={16} /> {t("calendar.seatsLeft", { count: selected.seatsLeft })}
        </p>
      )}
    </div>
  );
}
