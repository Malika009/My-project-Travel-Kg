import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import { TravelImage } from "../components/ui";
import { useApp } from "../context/AppContext";
import { formatPrice, formatTripDate, localizePlace } from "../data/localizePlace";
import { coverPhoto } from "../data/placeMedia";
import { describeItem } from "../data/cartLine";
import { api } from "../data/services";
import { errorText } from "../data/errors";

const PHONE_RE = /^\+?[\d\s()-]{9,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Checkout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { cart, placeById, booked, loadBooked, user, clearCart, notify, lang } = useApp();
  const direct = location.state?.items;
  const source = direct || cart;
  const [form, setForm] = useState({ name: user?.name || "", phone: "", email: user?.email || "", comment: "", agree: false });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);

  const ids = [...new Set(source.map((i) => i.placeId))].join(",");
  useEffect(() => {
    ids.split(",").filter(Boolean).forEach(loadBooked);
  }, [ids, loadBooked]);

  if (done) return <Confirmation order={done} />;
  if (!source.length) return <Navigate to="/cart" replace />;

  const lines = source.map((item) => ({ item, ...describeItem(item, placeById[item.placeId], booked) }));
  const blocked = lines.some((l) => l.missing || l.problem);
  const total = lines.reduce((s, l) => s + (l.price?.total || 0), 0);
  const discount = lines.reduce((s, l) => s + (l.price?.discount || 0), 0);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = t("checkout.errors.name");
    if (!PHONE_RE.test(form.phone.trim())) next.phone = t("checkout.errors.phone");
    if (!EMAIL_RE.test(form.email.trim())) next.email = t("checkout.errors.email");
    if (!form.agree) next.agree = t("checkout.errors.agree");
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (blocked || !validate()) return;
    setSending(true);
    try {
      const { data } = await api.post("/orders", {
        items: lines.map(({ item, guests }) => ({ placeId: item.placeId, date: item.date, guests, days: item.days || 0 })),
        contact: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), comment: form.comment.trim() },
        lang,
      });
      if (!direct) clearCart();
      ids.split(",").filter(Boolean).forEach(loadBooked);
      setDone(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      notify(errorText(err, t, "checkout.fail"), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="page">
      <nav className="steps" aria-label={t("checkout.steps")}>
        <span className="done"><Icon name="check" size={14} /> {t("checkout.stepChoose")}</span>
        <i />
        <span className="current">2. {t("checkout.stepContacts")}</span>
        <i />
        <span>3. {t("checkout.stepDone")}</span>
      </nav>
      <header className="page-hero compact">
        <div className="eyebrow">{t("checkout.eyebrow")}</div>
        <h1>{t("checkout.title")} <em>{t("checkout.accent")}</em></h1>
      </header>

      <div className="cart-layout">
        <form className="checkout-form card" onSubmit={submit} noValidate>
          <h2>{t("checkout.contacts")}</h2>
          <p className="muted">{t("checkout.contactsText")}</p>
          <div className="form-grid">
            <Field label={t("form.name")} error={errors.name}>
              <input value={form.name} onChange={set("name")} autoComplete="name" required maxLength={80} />
            </Field>
            <Field label={t("form.phone")} error={errors.phone}>
              <input value={form.phone} onChange={set("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="+996 700 000 000" required />
            </Field>
            <Field label={t("form.email")} error={errors.email} wide>
              <input value={form.email} onChange={set("email")} type="email" autoComplete="email" placeholder="you@example.com" required />
            </Field>
            <Field label={`${t("form.comment")} (${t("form.optional")})`} wide>
              <textarea value={form.comment} onChange={set("comment")} maxLength={1000} placeholder={t("checkout.commentPlaceholder")} />
            </Field>
          </div>
          <label className={`checkbox ${errors.agree ? "invalid" : ""}`}>
            <input type="checkbox" checked={form.agree} onChange={set("agree")} />
            <span>{t("checkout.agree")}</span>
          </label>
          {errors.agree && <p className="field-error">{errors.agree}</p>}
          {!user && (
            <p className="login-hint">
              <Icon name="info" size={18} /> {t("checkout.guestHint")} <Link to="/login" state={{ from: "/checkout" }}>{t("nav.signIn")}</Link>
            </p>
          )}
          {blocked && <p className="field-error"><Icon name="alert" size={16} /> {t("checkout.blocked")} <Link to="/cart">{t("nav.cart")}</Link></p>}
          <button className="button button-primary full large" disabled={sending || blocked}>
            {sending ? t("common.sending") : <><Icon name="check" size={18} /> {t("checkout.confirm", { total: formatPrice(total) })} {t("common.currency")}</>}
          </button>
        </form>

        <aside className="cart-summary booking-box">
          <h2>{t("checkout.yourTrip")}</h2>
          <ul className="checkout-lines">
            {lines.map(({ item, place, guests, price }) =>
              place ? (
                <li key={item.key}>
                  <TravelImage src={coverPhoto(place)?.small} alt="" />
                  <span>
                    <b>{localizePlace(place, t).name}</b>
                    <small>
                      {item.date ? formatTripDate(item.date, t) : t("cart.chooseDate")} · {t("booking.guestsCount", { count: guests })} ·{" "}
                      {t("duration.days", { count: item.days || localizePlace(place, t).days })}
                    </small>
                  </span>
                  <strong>{formatPrice(price.total)}</strong>
                </li>
              ) : null,
            )}
          </ul>
          <dl className="price-breakdown">
            {discount > 0 && <div className="discount"><dt>{t("booking.groupDiscount")}</dt><dd>−{formatPrice(discount)} {t("common.currency")}</dd></div>}
            <div className="total"><dt>{t("booking.total")}</dt><dd>{formatPrice(total)} {t("common.currency")}</dd></div>
          </dl>
          <ul className="booking-notes">
            <li><Icon name="shield" size={16} /> {t("booking.noteCancel")}</li>
            <li><Icon name="ticket" size={16} /> {t("cart.notePay")}</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}

function Field({ label, error, wide, children }) {
  return (
    <label className={`field ${wide ? "wide" : ""} ${error ? "invalid" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function Confirmation({ order }) {
  const { t } = useTranslation();
  const { placeById, user } = useApp();
  return (
    <main className="page confirmation">
      <nav className="steps" aria-label={t("checkout.steps")}>
        <span className="done"><Icon name="check" size={14} /> {t("checkout.stepChoose")}</span>
        <i />
        <span className="done"><Icon name="check" size={14} /> {t("checkout.stepContacts")}</span>
        <i />
        <span className="current">3. {t("checkout.stepDone")}</span>
      </nav>
      <div className="confirmation-card card">
        <span className="confirmation-icon"><Icon name="check" size={40} strokeWidth={2.4} /></span>
        <h1>{t("checkout.doneTitle")}</h1>
        <p>{t("checkout.doneText", { email: order.contact?.email })}</p>
        <div className="booking-code">
          <small>{t("checkout.code")}</small>
          <b>{order.code}</b>
        </div>
        <ul className="checkout-lines">
          {order.items.map((it, i) => (
            <li key={i}>
              <span>
                <b>{placeById[it.placeId] ? t(`tours.${it.placeId}.name`, { defaultValue: placeById[it.placeId].name }) : it.name}</b>
                <small>{formatTripDate(it.date, t)} · {t("booking.guestsCount", { count: it.quantity })} · {t("duration.days", { count: it.days })}</small>
              </span>
              <strong>{formatPrice(it.total)} {t("common.currency")}</strong>
            </li>
          ))}
        </ul>
        <div className="confirmation-total">
          <span>{t("booking.total")}</span>
          <b>{formatPrice(order.total)} {t("common.currency")}</b>
        </div>
        <p className="muted">{t("checkout.nextSteps")}</p>
        <div className="button-row center">
          {user ? (
            <Link className="button button-primary" to="/account">{t("checkout.toAccount")}</Link>
          ) : (
            <Link className="button button-primary" to="/register">{t("checkout.createAccount")}</Link>
          )}
          <Link className="button button-ghost" to="/places">{t("checkout.moreTours")}</Link>
        </div>
      </div>
    </main>
  );
}
