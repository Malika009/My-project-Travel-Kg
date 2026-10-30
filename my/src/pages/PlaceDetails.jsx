import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import { ACTIVITY_ICONS } from "../data/activityIcons";
import Calendar from "../components/Calendar";
import Lightbox from "../components/Lightbox";
import PlaceCard from "../components/PlaceCard";
import { NotFound, QtyStepper, Stars, TravelImage } from "../components/ui";
import { useApp } from "../context/AppContext";
import { formatDateTime, formatPrice, formatTripDate, localizePlace } from "../data/localizePlace";
import { placePhotos } from "../data/placeMedia";
import {
  GROUP_DISCOUNT_FROM, MAX_GUESTS, activitiesOf, dateStatus, durationOptions, isBookable, priceFor, seasonKeyOf,
} from "../data/tourInfo";
import { api } from "../data/services";
import { errorText } from "../data/errors";
import { buildProgram } from "../data/program";

export default function PlaceDetails() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { places, loading, addCart, favorites, toggleFavorite, booked, loadBooked } = useApp();
  const raw = places.find((x) => x._id === id);
  const p = raw ? localizePlace(raw, t) : null;
  const bookedDates = booked[id] || {};

  const [lightbox, setLightbox] = useState(null);
  const [date, setDate] = useState(() => params.get("date") || "");
  const [guests, setGuests] = useState(2);
  const [days, setDays] = useState(0);

  useEffect(() => {
    if (id) loadBooked(id);
  }, [id, loadBooked]);

  if (!p) return loading ? null : <NotFound />;

  const photos = placePhotos(raw).map((ph) => ({ ...ph, alt: p.name, caption: p.name }));
  const status = date ? dateStatus(raw, date, bookedDates) : null;
  const validDate = status && isBookable(status) ? date : "";
  const maxGuests = validDate ? Math.min(MAX_GUESTS, status.seatsLeft) : MAX_GUESTS;
  const guestCount = Math.min(guests, maxGuests);
  const chosenDays = days || p.days;
  const price = priceFor(raw, guestCount, chosenDays);
  const program = buildProgram(p, chosenDays, t);
  const similar = places.filter((x) => x._id !== id && x.category === raw.category).slice(0, 3);
  const liked = favorites.includes(p._id);
  const multiDay = chosenDays > 1;

  const selection = { guests: guestCount, date: validDate, days: chosenDays === p.days ? 0 : chosenDays };
  const bookNow = () => {
    if (!validDate) {
      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    navigate("/checkout", { state: { items: [{ key: "direct", placeId: p._id, ...selection }] } });
  };

  return (
    <main className="page detail-page">
      <nav className="breadcrumbs" aria-label={t("common.breadcrumbs")}>
        <Link to="/">{t("nav.home")}</Link>
        <Icon name="chevronRight" size={14} />
        <Link to="/places">{t("nav.destinations")}</Link>
        <Icon name="chevronRight" size={14} />
        <span>{p.name}</span>
      </nav>

      <header className="detail-head">
        <div>
          <span className="tag">{p.tag}</span>
          <h1>{p.name}</h1>
          <ul className="detail-meta">
            <li><Icon name="pin" size={16} /> {p.region}</li>
            <li><Icon name="star" size={16} fill="currentColor" /> {Number(p.rating).toFixed(1)}</li>
            <li><Icon name="clock" size={16} /> {p.duration}</li>
            <li className={`difficulty ${p.difficultyKey}`}><Icon name="mountain" size={16} /> {p.difficulty}</li>
            <li><Icon name="sun" size={16} /> {t(`season.${seasonKeyOf(raw)}`)}</li>
          </ul>
        </div>
        <button className={`button button-ghost ${liked ? "liked" : ""}`} onClick={() => toggleFavorite(p._id)} aria-pressed={liked}>
          <Icon name="heart" size={18} fill={liked ? "currentColor" : "none"} />
          {liked ? t("catalog.favoriteRemove") : t("catalog.favoriteAdd")}
        </button>
      </header>

      <div className={`detail-gallery count-${Math.min(photos.length, 3)}`}>
        {photos.slice(0, 3).map((ph, i) => (
          <button key={ph.id} className={i === 0 ? "main" : ""} onClick={() => setLightbox(i)} aria-label={`${t("gallery.open")} ${i + 1}`}>
            <TravelImage src={ph.src} small={ph.small} alt={`${p.name} — ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} sizes={i === 0 ? "(max-width: 900px) 100vw, 66vw" : "33vw"} />
          </button>
        ))}
        {photos.length > 1 && (
          <button className="gallery-count" onClick={() => setLightbox(0)}>
            <Icon name="camera" size={16} /> {t("gallery.allPhotos", { count: photos.length })}
          </button>
        )}
      </div>
      {lightbox != null && <Lightbox photos={photos} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />}

      <div className="detail-columns">
        <article className="detail-content">
          <nav className="detail-tabs" aria-label={t("detail.sections")}>
            {["overview", "activities", "program", "included", "conditions", "reviews"].map((k) => (
              <a key={k} href={`#${k}`}>{t(`detail.tabs.${k}`)}</a>
            ))}
          </nav>

          <section id="overview" className="detail-section">
            <h2>{t("detail.overviewTitle")}</h2>
            <p className="lead">{p.description}</p>
            <p>{t(`detail.categoryText.${p.categoryKey}`)}</p>
            <div className="fact-grid">
              <div><Icon name="clock" /><span><small>{t("detail.facts.duration")}</small><b>{p.duration}</b></span></div>
              <div><Icon name="mountain" /><span><small>{t("detail.facts.difficulty")}</small><b>{p.difficulty}</b></span></div>
              <div><Icon name="users" /><span><small>{t("detail.facts.group")}</small><b>{t("detail.facts.groupValue", { count: MAX_GUESTS })}</b></span></div>
              <div><Icon name="sun" /><span><small>{t("detail.facts.season")}</small><b>{t(`season.${seasonKeyOf(raw)}`)}</b></span></div>
            </div>
          </section>

          <section id="activities" className="detail-section">
            <h2>{t("detail.activitiesTitle")}</h2>
            <ul className="activity-grid">
              {activitiesOf(raw).map((a) => (
                <li key={a}>
                  <span><Icon name={ACTIVITY_ICONS[a] || "compass"} size={22} /></span>
                  {t(`activities.${a}`)}
                </li>
              ))}
            </ul>
          </section>

          <section id="program" className="detail-section">
            <h2>{t("detail.programTitle")}</h2>
            <p className="muted">{t("detail.programNote", { count: chosenDays })}</p>
            <ol className="timeline">
              {program.map((day) => (
                <li key={day.title}>
                  <span className="timeline-day">{day.title}</span>
                  {day.steps ? (
                    <ul className="timeline-steps">
                      {day.steps.map((s) => (
                        <li key={s.time}><b>{s.time}</b> <span><strong>{s.title}</strong> {s.text}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <div><h3>{day.heading}</h3><p>{day.text}</p></div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section id="included" className="detail-section two-lists">
            <div>
              <h2>{t("detail.includedTitle")}</h2>
              <ul className="check-list">
                {["guide", "transport", "fees", "water", ...(multiDay ? ["stay", "meals"] : ["lunch"])].map((k) => (
                  <li key={k}><Icon name="check" size={18} /> {t(`detail.included.${k}`)}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2>{t("detail.notIncludedTitle")}</h2>
              <ul className="cross-list">
                {["insurance", "personal", "tips"].map((k) => (
                  <li key={k}><Icon name="close" size={18} /> {t(`detail.notIncluded.${k}`)}</li>
                ))}
              </ul>
            </div>
          </section>

          <section id="conditions" className="detail-section">
            <h2>{t("detail.conditionsTitle")}</h2>
            <ul className="conditions">
              {["payment", "cancel", "group", "age", "meeting", "bring"].map((k) => (
                <li key={k}>
                  <b>{t(`detail.conditions.${k}.title`)}</b>
                  <span>{t(`detail.conditions.${k}.text`, { count: GROUP_DISCOUNT_FROM })}</span>
                </li>
              ))}
            </ul>
          </section>

          <ReviewSection placeId={p._id} />
        </article>

        <aside className="booking-box" id="booking">
          <div className="booking-price">
            <span>{t("catalog.from")}</span>
            <b>{formatPrice(p.price)} {t("common.currency")}</b>
            <small>/ {t("catalog.perPerson")}</small>
          </div>

          <div className="booking-step">
            <h3><span>1</span> {t("booking.chooseDate")}</h3>
            <Calendar place={raw} value={validDate} onChange={setDate} booked={bookedDates} />
            {date && !validDate && <p className="field-error">{t("booking.dateUnavailable")}</p>}
          </div>

          <div className="booking-step">
            <h3><span>2</span> {t("booking.guests")}</h3>
            <div className="booking-row">
              <QtyStepper value={guestCount} max={maxGuests} onChange={setGuests} label={t("booking.guests")} />
              <small>{t("booking.discountHint", { count: GROUP_DISCOUNT_FROM })}</small>
            </div>
          </div>

          <div className="booking-step">
            <h3><span>3</span> {t("booking.duration")}</h3>
            <div className="segmented wrap">
              {durationOptions(raw).map((d) => (
                <button type="button" key={d} className={chosenDays === d ? "active" : ""} onClick={() => setDays(d === p.days ? 0 : d)}>
                  {t("duration.days", { count: d })}
                </button>
              ))}
            </div>
          </div>

          <dl className="price-breakdown">
            <div><dt>{t("booking.perPersonFor", { days: t("duration.days", { count: chosenDays }) })}</dt><dd>{formatPrice(price.perPerson)} {t("common.currency")}</dd></div>
            <div><dt>× {t("booking.guestsCount", { count: guestCount })}</dt><dd>{formatPrice(price.subtotal)} {t("common.currency")}</dd></div>
            {price.discount > 0 && <div className="discount"><dt>{t("booking.groupDiscount")}</dt><dd>−{formatPrice(price.discount)} {t("common.currency")}</dd></div>}
            <div className="total"><dt>{t("booking.total")}</dt><dd>{formatPrice(price.total)} {t("common.currency")}</dd></div>
          </dl>

          {validDate && (
            <p className="booking-summary-line">
              <Icon name="calendar" size={16} /> {formatTripDate(validDate, t)} · {t("booking.guestsCount", { count: guestCount })}
            </p>
          )}

          <button className="button button-primary full large" onClick={bookNow}>
            <Icon name="check" size={18} /> {validDate ? t("booking.bookNow") : t("booking.pickDateFirst")}
          </button>
          <button
            className="button button-ghost full"
            onClick={() => addCart(raw, selection)}
          >
            <Icon name="bag" size={18} /> {t("catalog.addToCart")}
          </button>
          <ul className="booking-notes">
            <li><Icon name="shield" size={16} /> {t("booking.noteCancel")}</li>
            <li><Icon name="phone" size={16} /> {t("booking.noteConfirm")}</li>
          </ul>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="similar">
          <h2>{t("detail.similar")}</h2>
          <div className="place-grid">
            {similar.map((s) => <PlaceCard key={s._id} place={s} />)}
          </div>
        </section>
      )}

      <div className="mobile-book-bar">
        <span>
          <small>{validDate ? formatTripDate(validDate, t) : t("catalog.from")}</small>
          <b>{formatPrice(validDate ? price.total : p.price)} {t("common.currency")}</b>
        </span>
        <button className="button button-primary" onClick={validDate ? bookNow : () => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}>
          {validDate ? t("booking.bookNow") : t("booking.chooseDate")}
        </button>
      </div>
    </main>
  );
}

function ReviewSection({ placeId }) {
  const { t } = useTranslation();
  const { user, notify, lang } = useApp();
  const [reviews, setReviews] = useState([]);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get("/reviews", { params: { placeId } })
      .then((r) => alive && setReviews(Array.isArray(r.data) ? r.data : []))
      .catch(() => alive && setReviews([]));
    return () => {
      alive = false;
    };
  }, [placeId]);

  const average = useMemo(
    () => (reviews.length ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length : 0),
    [reviews],
  );

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await api.post("/reviews", { placeId, rating, text });
      setReviews((r) => [{ ...data, userName: data.userName || user?.name }, ...r]);
      setText("");
      notify(t("reviews.thanks"));
    } catch (err) {
      notify(errorText(err, t, "reviews.sendFail"), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="reviews" className="detail-section reviews-panel">
      <div className="review-heading">
        <h2>{t("reviews.tourTitle")}</h2>
        {reviews.length > 0 && (
          <span><Stars value={average} /> {average.toFixed(1)} · {t("reviews.count", { count: reviews.length })}</span>
        )}
      </div>
      {user ? (
        <form className="review-form" onSubmit={submit}>
          <div className="rating-picker" role="radiogroup" aria-label={t("reviews.yourRating")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} className={n <= rating ? "on" : ""} aria-label={`${n}`} aria-checked={rating === n} role="radio">
                <Icon name="star" size={22} fill={n <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("reviews.placeholder")} minLength={5} maxLength={1000} required />
          <button className="button button-primary" disabled={sending || text.trim().length < 5}>
            {t("reviews.publish")}
          </button>
        </form>
      ) : (
        <p className="login-hint">
          <Icon name="user" size={18} /> {t("reviews.loginToWrite")} <Link to="/login">{t("nav.signIn")}</Link>
        </p>
      )}
      <div className="review-list">
        {reviews.length ? (
          reviews.map((r) => (
            <article className="review-card" key={r._id}>
              <div className="review-person small">
                <span className="avatar">{(r.userName || "?").slice(0, 1)}</span>
                <span>
                  <b>{r.userName || t("reviews.traveler")}</b>
                  <small>{formatDateTime(r.createdAt, lang)}</small>
                </span>
                <Stars value={r.rating} />
              </div>
              <p>{r.text}</p>
            </article>
          ))
        ) : (
          <p className="muted">{t("reviews.beFirst")}</p>
        )}
      </div>
    </section>
  );
}
