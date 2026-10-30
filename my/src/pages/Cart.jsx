import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import Calendar from "../components/Calendar";
import { EmptyState, QtyStepper, TravelImage } from "../components/ui";
import { useApp } from "../context/AppContext";
import { formatPrice, formatTripDate, localizePlace } from "../data/localizePlace";
import { coverPhoto } from "../data/placeMedia";
import { durationOptions } from "../data/tourInfo";
import { describeItem } from "../data/cartLine";

export default function Cart() {
  const { cart, placeById, booked, loadBooked, updateCartItem, removeCartItem, clearCart } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openCalendar, setOpenCalendar] = useState(null);

  const ids = [...new Set(cart.map((i) => i.placeId))].join(",");
  useEffect(() => {
    ids.split(",").filter(Boolean).forEach(loadBooked);
  }, [ids, loadBooked]);

  const lines = cart.map((item) => ({ item, ...describeItem(item, placeById[item.placeId], booked) }));
  const valid = lines.filter((l) => !l.missing);
  const totals = valid.reduce(
    (s, l) => ({ guests: s.guests + l.guests, subtotal: s.subtotal + l.price.subtotal, discount: s.discount + l.price.discount, total: s.total + l.price.total }),
    { guests: 0, subtotal: 0, discount: 0, total: 0 },
  );
  const problems = lines.filter((l) => l.missing || l.problem).length;

  if (!cart.length) {
    return (
      <main className="page">
        <header className="page-hero compact">
          <div className="eyebrow">{t("cart.eyebrow")}</div>
          <h1>{t("cart.title")}</h1>
        </header>
        <EmptyState
          icon="bag"
          title={t("cart.emptyTitle")}
          text={t("cart.emptyText")}
          action={
            <div className="button-row center">
              <Link className="button button-primary" to="/places"><Icon name="compass" size={18} /> {t("cart.emptyAction")}</Link>
              <Link className="button button-ghost" to="/favorites"><Icon name="heart" size={18} /> {t("nav.favorites")}</Link>
            </div>
          }
        />
      </main>
    );
  }

  return (
    <main className="page">
      <header className="page-hero compact">
        <div className="eyebrow">{t("cart.eyebrow")}</div>
        <h1>{t("cart.title")} <em>{t("cart.accent")}</em></h1>
        <p>{t("cart.text")}</p>
      </header>

      <div className="cart-layout">
        <section className="cart-items" aria-label={t("cart.title")}>
          <div className="cart-toolbar">
            <span>{t("cart.toursCount", { count: cart.length })}</span>
            <button type="button" className="text-button danger" onClick={() => window.confirm(t("cart.clearConfirm")) && clearCart()}>
              <Icon name="trash" size={16} /> {t("cart.clear")}
            </button>
          </div>

          {lines.map(({ item, missing, place, dateOk, maxGuests, guests, price, problem }) => {
            if (missing) {
              return (
                <article className="cart-item missing" key={item.key}>
                  <p><Icon name="alert" size={18} /> {t("cart.tourMissing")}</p>
                  <button className="text-button danger" onClick={() => removeCartItem(item.key)}>{t("cart.remove")}</button>
                </article>
              );
            }
            const p = localizePlace(place, t);
            const photo = coverPhoto(place);
            const chosenDays = item.days || p.days;
            return (
              <article className={`cart-item ${problem ? "has-problem" : ""}`} key={item.key}>
                <Link to={`/places/${p._id}`} className="cart-image">
                  <TravelImage src={photo?.small || photo?.src} alt={p.name} />
                </Link>
                <div className="cart-item-body">
                  <div className="cart-item-head">
                    <div>
                      <small><Icon name="pin" size={14} /> {p.region}</small>
                      <h3><Link to={`/places/${p._id}`}>{p.name}</Link></h3>
                    </div>
                    <button className="icon-button" onClick={() => removeCartItem(item.key)} aria-label={`${t("cart.remove")}: ${p.name}`}>
                      <Icon name="trash" size={18} />
                    </button>
                  </div>

                  <div className="cart-controls">
                    <div className="cart-control">
                      <span>{t("booking.date")}</span>
                      <button
                        type="button"
                        className={`date-button ${dateOk ? "" : "empty"}`}
                        onClick={() => setOpenCalendar(openCalendar === item.key ? null : item.key)}
                        aria-expanded={openCalendar === item.key}
                      >
                        <Icon name="calendar" size={16} />
                        {dateOk ? formatTripDate(item.date, t) : t("cart.chooseDate")}
                        <Icon name="chevronDown" size={16} />
                      </button>
                    </div>
                    <div className="cart-control">
                      <span>{t("booking.guests")}</span>
                      <QtyStepper value={guests} max={maxGuests} onChange={(n) => updateCartItem(item.key, { guests: n })} label={t("booking.guests")} />
                    </div>
                    <div className="cart-control">
                      <span>{t("booking.duration")}</span>
                      <select value={chosenDays} onChange={(e) => updateCartItem(item.key, { days: Number(e.target.value) === p.days ? 0 : Number(e.target.value) })}>
                        {durationOptions(place).map((d) => (
                          <option key={d} value={d}>{t("duration.days", { count: d })}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {openCalendar === item.key && (
                    <div className="cart-calendar">
                      <Calendar
                        place={place}
                        value={dateOk ? item.date : ""}
                        booked={booked[place._id] || {}}
                        onChange={(d) => {
                          updateCartItem(item.key, { date: d });
                          setOpenCalendar(null);
                        }}
                      />
                    </div>
                  )}

                  {problem && (
                    <p className="field-error"><Icon name="alert" size={16} /> {t(`cart.problem.${problem}`)}</p>
                  )}

                  <div className="cart-item-price">
                    <span>{formatPrice(price.perPerson)} {t("common.currency")} × {guests}{price.discount > 0 && <em> · −10%</em>}</span>
                    <b>{formatPrice(price.total)} {t("common.currency")}</b>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="cart-summary booking-box">
          <h2>{t("cart.summary")}</h2>
          <dl className="price-breakdown">
            <div><dt>{t("cart.tours")}</dt><dd>{valid.length}</dd></div>
            <div><dt>{t("cart.guestsTotal")}</dt><dd>{totals.guests}</dd></div>
            <div><dt>{t("cart.subtotal")}</dt><dd>{formatPrice(totals.subtotal)} {t("common.currency")}</dd></div>
            {totals.discount > 0 && <div className="discount"><dt>{t("booking.groupDiscount")}</dt><dd>−{formatPrice(totals.discount)} {t("common.currency")}</dd></div>}
            <div className="total"><dt>{t("booking.total")}</dt><dd>{formatPrice(totals.total)} {t("common.currency")}</dd></div>
          </dl>
          {problems > 0 && <p className="field-error"><Icon name="alert" size={16} /> {t("cart.fixProblems", { count: problems })}</p>}
          <button className="button button-primary full large" disabled={problems > 0} onClick={() => navigate("/checkout")}>
            <Icon name="check" size={18} /> {t("cart.checkout")}
          </button>
          <Link className="button button-ghost full" to="/places">{t("cart.continue")}</Link>
          <ul className="booking-notes">
            <li><Icon name="shield" size={16} /> {t("booking.noteCancel")}</li>
            <li><Icon name="ticket" size={16} /> {t("cart.notePay")}</li>
          </ul>
        </aside>
      </div>
      <div className="mobile-book-bar">
        <span>
          <small>{t("booking.total")}</small>
          <b>{formatPrice(totals.total)} {t("common.currency")}</b>
        </span>
        <button className="button button-primary" disabled={problems > 0} onClick={() => navigate("/checkout")}>{t("cart.checkoutShort")}</button>
      </div>
    </main>
  );
}
