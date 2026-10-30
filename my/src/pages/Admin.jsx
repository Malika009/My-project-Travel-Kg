import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import i18n from "../i18n.js";
import Icon from "../components/Icon";
import { Stat, TravelImage } from "../components/ui";
import { useApp } from "../context/AppContext";
import { formatDateTime, formatPrice, formatTripDate, localizePlace } from "../data/localizePlace";
import { coverPhoto } from "../data/placeMedia";
import { CATEGORY_KEYS, DIFFICULTY_KEYS, REGION_KEYS, baseDaysOf } from "../data/tourInfo";
import { api, resolveAssetUrl } from "../data/services";
import { errorText } from "../data/errors";
import { StatusBadge } from "./Account";

const STATUSES = ["pending", "confirmed", "cancelled"];
const LANGS = ["ru", "ky", "en"];
const emptyDraft = () => ({
  region: "Чуйская область", category: "Горы", difficulty: "Средне", price: "", rating: "4.8", days: "1", image: "",
  text: { ru: { name: "", description: "", tag: "" }, ky: { name: "", description: "", tag: "" }, en: { name: "", description: "", tag: "" } },
});

function OrdersChart({ orders }) {
  const { t } = useTranslation();
  const [now] = useState(() => new Date());
  const months = t("calendar.months", { returnObjects: true });
  const data = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const inMonth = orders.filter((o) => {
      const c = new Date(o.createdAt);
      return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
    });
    return {
      month: Array.isArray(months) ? months[d.getMonth()].slice(0, 3) : d.getMonth() + 1,
      count: inMonth.length,
    };
  });
  return (
    <section className="card chart-card">
      <div>
        <h2>{t("admin.salesTrend")}</h2>
        <p className="muted">{t("admin.lastSixMonths")}</p>
      </div>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)" }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)" }} width={28} />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }} />
            <Bar dataKey="count" name={t("admin.ordersLabel")} fill="var(--primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  const { places, setPlaces, notify, lang } = useApp();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState("orders");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [draftLang, setDraftLang] = useState("ru");

  const load = useCallback(() => {
    Promise.allSettled([api.get("/orders"), api.get("/admin/users"), api.get("/reviews"), api.get("/admin/messages")]).then(
      ([o, u, r, m]) => {
        if (o.status === "fulfilled") setOrders(o.value.data);
        if (u.status === "fulfilled") setUsers(u.value.data);
        if (r.status === "fulfilled") setReviews(r.value.data);
        if (m.status === "fulfilled") setMessages(m.value.data);
        if (o.status === "rejected") notify(errorText(o.reason, t), "error");
      },
    );
  }, [notify, t]);

  useEffect(() => {
    load();
  }, [load]);

  const ruT = i18n.getFixedT("ru");
  const placeName = (id) => t(`tours.${id}.name`, { defaultValue: places.find((p) => p._id === id)?.name || id });

  const save = async (e) => {
    e.preventDefault();
    const { ru, ky, en } = draft.text;
    const payload = {
      name: ru.name.trim(),
      description: ru.description.trim(),
      tag: ru.tag.trim(),
      region: draft.region,
      category: draft.category,
      difficulty: draft.difficulty,
      price: Number(draft.price),
      rating: Number(draft.rating),
      duration: ruT("duration.days", { count: Number(draft.days) || 1 }),
      image: draft.image.trim(),
      translations: { ky, en },
    };
    try {
      if (editingId) {
        const { data } = await api.put(`/places/${editingId}`, payload);
        setPlaces((list) => list.map((p) => (p._id === editingId ? data : p)));
        notify(t("admin.placeUpdated"));
      } else {
        const { data } = await api.post("/places", payload);
        setPlaces((list) => [data, ...list]);
        notify(t("admin.placeAdded"));
      }
      setFormOpen(false);
      setEditingId(null);
      setDraft(emptyDraft());
    } catch (err) {
      notify(errorText(err, t, "admin.saveFail"), "error");
    }
  };

  const edit = (place) => {
    const tr = place.translations || {};
    // Built-in tours are translated in locale files — prefill those texts.
    const fromLocale = (l, k) => i18n.getFixedT(l)(`tours.${place._id}.${k}`, { defaultValue: tr[l]?.[k] || "" });
    setEditingId(place._id);
    setDraft({
      region: place.region, category: place.category, difficulty: place.difficulty || "Средне",
      price: String(place.price), rating: String(place.rating ?? 4.8), days: String(baseDaysOf(place)),
      image: place.image || "",
      text: {
        ru: { name: place.name, description: place.description, tag: place.tag || "" },
        ky: { name: fromLocale("ky", "name"), description: fromLocale("ky", "description"), tag: fromLocale("ky", "tag") },
        en: { name: fromLocale("en", "name"), description: fromLocale("en", "description"), tag: fromLocale("en", "tag") },
      },
    });
    setDraftLang("ru");
    setFormOpen(true);
    window.scrollTo({ top: document.getElementById("places-admin")?.offsetTop - 80 || 0, behavior: "smooth" });
  };

  const remove = async (place) => {
    if (!window.confirm(t("admin.deletePlaceConfirm", { name: localizePlace(place, t).name }))) return;
    try {
      await api.delete(`/places/${place._id}`);
      setPlaces((list) => list.filter((p) => p._id !== place._id));
      notify(t("admin.placeDeleted"));
    } catch (err) {
      notify(errorText(err, t, "admin.placeDeleteFail"), "error");
    }
  };

  const setStatus = async (order, status) => {
    try {
      const { data } = await api.patch(`/orders/${order._id}`, { status });
      setOrders((list) => list.map((o) => (o._id === order._id ? { ...o, status: data.status } : o)));
      notify(t("admin.statusUpdated"));
    } catch (err) {
      notify(errorText(err, t), "error");
    }
  };

  const setRole = async (u, role) => {
    try {
      await api.patch(`/admin/users/${u._id}`, { role });
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, role } : x)));
      notify(t("admin.roleUpdated"));
    } catch (err) {
      notify(errorText(err, t, "admin.roleUpdateFail"), "error");
    }
  };

  const removeReview = async (id) => {
    if (!window.confirm(t("admin.deleteReview"))) return;
    try {
      await api.delete(`/reviews/${id}`);
      setReviews((r) => r.filter((x) => x._id !== id));
      notify(t("admin.reviewDeleted"));
    } catch (err) {
      notify(errorText(err, t, "admin.reviewDeleteFail"), "error");
    }
  };

  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + (Number(o.total) || 0), 0);
  const setText = (k, v) => setDraft((d) => ({ ...d, text: { ...d.text, [draftLang]: { ...d.text[draftLang], [k]: v } } }));

  return (
    <main className="page admin-page">
      <header className="page-hero compact">
        <div className="eyebrow">Travel KG</div>
        <h1>{t("admin.title")}</h1>
      </header>

      <div className="admin-stats">
        <Stat value={users.length} label={t("admin.users")} />
        <Stat value={orders.length} label={t("admin.orders")} />
        <Stat value={orders.filter((x) => x.status === "confirmed").length} label={t("admin.bookings")} />
        <Stat value={`${formatPrice(revenue)}`} label={t("admin.revenue")} />
        <Stat value={places.length} label={t("admin.routes")} />
      </div>

      <OrdersChart orders={orders} />

      <div className="tabs" role="tablist">
        {[["orders", orders.length], ["places", places.length], ["users", users.length], ["reviews", reviews.length], ["messages", messages.length]].map(([k, n]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
            {t(`admin.tabs.${k}`)} <span>{n}</span>
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <section className="admin-list">
          {orders.length ? orders.map((o) => (
            <article className="card order-card admin-order" key={o._id}>
              <header>
                <span><b>{o.code || `#${String(o._id).slice(-6)}`}</b> <small>{formatDateTime(o.createdAt, lang)}</small></span>
                <StatusBadge status={o.status} />
              </header>
              <p className="order-contact">
                <Icon name="user" size={16} /> {o.contact?.name || o.user?.name || t("admin.guest")}
                {o.contact?.phone && <> · <a href={`tel:${o.contact.phone}`}>{o.contact.phone}</a></>}
                {(o.contact?.email || o.user?.email) && <> · <a href={`mailto:${o.contact?.email || o.user?.email}`}>{o.contact?.email || o.user?.email}</a></>}
              </p>
              {o.contact?.comment && <p className="muted">“{o.contact.comment}”</p>}
              <ul>
                {o.items?.map((it, i) => (
                  <li key={i}>
                    <Link to={`/places/${it.placeId}`}>{placeName(it.placeId)}</Link>
                    <small>{it.date ? formatTripDate(it.date, t) : "—"} · {t("booking.guestsCount", { count: it.quantity })}{it.days ? ` · ${t("duration.days", { count: it.days })}` : ""}</small>
                  </li>
                ))}
              </ul>
              <footer>
                <label className="inline-select">
                  {t("admin.status")}
                  <select value={o.status} onChange={(e) => setStatus(o, e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                  </select>
                </label>
                <b>{formatPrice(o.total)} {t("common.currency")}</b>
              </footer>
            </article>
          )) : <p className="muted">{t("admin.noOrders")}</p>}
        </section>
      )}

      {tab === "places" && (
        <section id="places-admin">
          <div className="admin-heading">
            <h2>{t("admin.places")}</h2>
            <button
              className="button button-primary"
              onClick={() => {
                setFormOpen(!formOpen);
                setEditingId(null);
                setDraft(emptyDraft());
              }}
            >
              <Icon name={formOpen ? "close" : "plus"} size={18} /> {formOpen ? t("admin.close") : t("admin.addPlace")}
            </button>
          </div>
          {formOpen && (
            <form className="card admin-form" onSubmit={save}>
              <h3 className="wide">{editingId ? t("admin.editing") : t("admin.addPlace")}</h3>
              <div className="wide lang-tabs">
                {LANGS.map((l) => (
                  <button type="button" key={l} className={draftLang === l ? "active" : ""} onClick={() => setDraftLang(l)}>
                    {l.toUpperCase()} {l === "ru" && "*"}
                  </button>
                ))}
                <small className="muted">{t("admin.translationsHint")}</small>
              </div>
              <label className="field">
                <span>{t("admin.name")} ({draftLang.toUpperCase()})</span>
                <input required={draftLang === "ru"} minLength={draftLang === "ru" ? 3 : undefined} value={draft.text[draftLang].name} onChange={(e) => setText("name", e.target.value)} />
              </label>
              <label className="field">
                <span>{t("admin.tag")} ({draftLang.toUpperCase()})</span>
                <input value={draft.text[draftLang].tag} onChange={(e) => setText("tag", e.target.value)} maxLength={40} />
              </label>
              <label className="field wide">
                <span>{t("admin.description")} ({draftLang.toUpperCase()})</span>
                <textarea required={draftLang === "ru"} value={draft.text[draftLang].description} onChange={(e) => setText("description", e.target.value)} />
              </label>
              <label className="field">
                <span>{t("admin.region")}</span>
                <select value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })}>
                  {Object.entries(REGION_KEYS).map(([v, k]) => <option key={k} value={v}>{t(`regions.${k}`)}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{t("admin.category")}</span>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {Object.entries(CATEGORY_KEYS).map(([v, k]) => <option key={k} value={v}>{t(`categories.${k}`)}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{t("admin.difficulty")}</span>
                <select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })}>
                  {Object.entries(DIFFICULTY_KEYS).map(([v, k]) => <option key={k} value={v}>{t(`difficulty.${k}`)}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{t("admin.durationDays")}</span>
                <input type="number" min={1} max={14} required value={draft.days} onChange={(e) => setDraft({ ...draft, days: e.target.value })} />
              </label>
              <label className="field">
                <span>{t("admin.price")}</span>
                <input type="number" min={0} step={50} required value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              </label>
              <label className="field">
                <span>{t("admin.rating")}</span>
                <input type="number" min={0} max={5} step={0.1} required value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: e.target.value })} />
              </label>
              <label className="field wide">
                <span>{t("admin.image")}</span>
                <input type="url" required={!editingId} value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="https://…" />
              </label>
              {draft.image && <img className="admin-image-preview wide" src={resolveAssetUrl(draft.image)} alt={t("admin.imagePreview")} />}
              <button className="button button-primary wide">
                <Icon name="check" size={18} /> {editingId ? t("admin.saveChanges") : t("admin.savePlace")}
              </button>
            </form>
          )}
          <div className="admin-table">
            {places.map((place) => {
              const p = localizePlace(place, t);
              return (
                <div className="admin-row" key={p._id}>
                  <TravelImage src={coverPhoto(place)?.small} alt={p.name} />
                  <b>{p.name}</b>
                  <span>{p.region}</span>
                  <span>{formatPrice(p.price)} {t("common.currency")}</span>
                  <div className="admin-row-actions">
                    <button className="button button-ghost small" onClick={() => edit(place)}>{t("admin.edit")}</button>
                    <button className="button button-danger small" onClick={() => remove(place)}>{t("admin.delete")}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === "users" && (
        <section className="admin-table">
          {users.map((u) => (
            <div className="user-row" key={u._id}>
              <span className="avatar">{u.name?.slice(0, 1)}</span>
              <b>{u.name}</b>
              <span>{u.email}</span>
              <select value={u.role} onChange={(e) => setRole(u, e.target.value)} aria-label={t("admin.role")}>
                <option value="user">{t("admin.roleUser")}</option>
                <option value="admin">{t("admin.roleAdmin")}</option>
              </select>
            </div>
          ))}
        </section>
      )}

      {tab === "reviews" && (
        <section className="admin-table">
          {reviews.length ? reviews.map((r) => (
            <div className="moderation-row" key={r._id}>
              <span className="status status-confirmed">★ {r.rating}</span>
              <div>
                <b>{r.userName || t("reviews.traveler")}</b> · <Link to={`/places/${r.placeId}`}>{placeName(r.placeId)}</Link>
                <p>{r.text}</p>
              </div>
              <button className="button button-danger small" onClick={() => removeReview(r._id)}>{t("admin.delete")}</button>
            </div>
          )) : <p className="muted">{t("admin.reviewsNone")}</p>}
        </section>
      )}

      {tab === "messages" && (
        <section className="admin-list">
          {messages.length ? messages.map((m) => (
            <article className="card message-card" key={m._id}>
              <header><b>{m.name}</b> <small>{formatDateTime(m.createdAt, lang)}</small></header>
              <p className="muted">{m.contact}</p>
              <p>{m.message}</p>
            </article>
          )) : <p className="muted">{t("admin.noMessages")}</p>}
        </section>
      )}
    </main>
  );
}
