import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import { EmptyState } from "../components/ui";
import { useApp } from "../context/AppContext";
import { formatDateTime, formatPrice, formatTripDate } from "../data/localizePlace";
import { api } from "../data/services";
import { errorText } from "../data/errors";

export function StatusBadge({ status }) {
  const { t } = useTranslation();
  return <span className={`status status-${status}`}>{t(`status.${status}`, { defaultValue: status })}</span>;
}

export default function Account() {
  const { user, logout, notify, favorites, cart, lang } = useApp();
  const { t } = useTranslation();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api
      .get("/orders")
      .then((r) => setOrders(Array.isArray(r.data) ? r.data : []))
      .catch((err) => {
        setOrders([]);
        notify(errorText(err, t, "account.loadFail"), "error");
      });
  }, [notify, t]);

  const tourName = (it) => t(`tours.${it.placeId}.name`, { defaultValue: it.name });

  return (
    <main className="page">
      <header className="page-hero compact account-hero">
        <span className="avatar large">{user?.name?.slice(0, 1)}</span>
        <div>
          <div className="eyebrow">{t("account.title")}</div>
          <h1>{t("account.greeting")} <em>{user?.name?.split(" ")[0]}</em></h1>
          <p>{user?.email} {user?.role === "admin" && <span className="status status-confirmed">{t("admin.roleAdmin")}</span>}</p>
        </div>
      </header>

      <div className="account-stats">
        <Link to="/favorites" className="card"><Icon name="heart" /><b>{favorites.length}</b><span>{t("nav.favorites")}</span></Link>
        <Link to="/cart" className="card"><Icon name="bag" /><b>{cart.length}</b><span>{t("nav.cart")}</span></Link>
        <div className="card"><Icon name="ticket" /><b>{orders?.length ?? "…"}</b><span>{t("account.orders")}</span></div>
        {user?.role === "admin" && <Link to="/admin" className="card"><Icon name="settings" /><b>→</b><span>{t("admin.title")}</span></Link>}
      </div>

      <section className="card account-box">
        <h2>{t("account.orders")}</h2>
        {orders === null ? (
          <p className="muted">{t("common.loading")}</p>
        ) : orders.length ? (
          <div className="order-list">
            {orders.map((o) => (
              <article className="order-card" key={o._id}>
                <header>
                  <span><b>{o.code || `#${String(o._id).slice(-6)}`}</b> <small>{formatDateTime(o.createdAt, lang)}</small></span>
                  <StatusBadge status={o.status} />
                </header>
                <ul>
                  {o.items?.map((it, i) => (
                    <li key={i}>
                      <Link to={`/places/${it.placeId}`}>{tourName(it)}</Link>
                      <small>
                        {it.date ? formatTripDate(it.date, t) : "—"} · {t("booking.guestsCount", { count: it.quantity })}
                        {it.days ? ` · ${t("duration.days", { count: it.days })}` : ""}
                      </small>
                    </li>
                  ))}
                </ul>
                <footer>
                  <span>{t("booking.total")}</span>
                  <b>{formatPrice(o.total)} {t("common.currency")}</b>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="ticket"
            title={t("account.noOrders")}
            text={t("account.noOrdersText")}
            action={<Link className="button button-primary" to="/places">{t("account.exploreTrips")}</Link>}
          />
        )}
      </section>

      <button
        className="button button-ghost"
        onClick={() => {
          // Leave the protected page first, otherwise it would redirect to the login form.
          logout();
          notify(t("account.logoutSuccess"), "info");
        }}
      >
        <Icon name="logout" size={18} /> {t("account.logout")}
      </button>
    </main>
  );
}
