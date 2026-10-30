import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import { useApp } from "../context/AppContext";

export function TravelImage({ src, small, alt, className = "", loading = "lazy", sizes }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <span className={`image-fallback ${className}`} role="img" aria-label={alt}>
        <Icon name="mountain" size={34} />
        <small>{t("common.photoUnavailable")}</small>
      </span>
    );
  }
  return (
    <img
      src={src}
      srcSet={small && small !== src ? `${small} 640w, ${src} 1280w` : undefined}
      sizes={small && small !== src ? sizes || "(max-width: 720px) 100vw, 640px" : undefined}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function Stars({ value = 0, size = 14 }) {
  const full = Math.round(Number(value) || 0);
  return (
    <span className="stars" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} fill={n <= full ? "currentColor" : "none"} className={n <= full ? "on" : ""} />
      ))}
    </span>
  );
}

export function Stat({ value, label }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, accent, text, action, center = false }) {
  return (
    <div className={`section-heading ${center ? "center" : ""}`}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>
          {title} {accent && <em>{accent}</em>}
        </h2>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon = "compass", title, text, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={34} />
      </span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  const { t } = useTranslation();
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label={t("catalog.pagination")}>
      <button disabled={page === 1} onClick={() => onChange(page - 1)} aria-label={t("common.previous")}>
        <Icon name="chevronLeft" />
      </button>
      {Array.from({ length: pages }, (_, i) => (
        <button
          className={page === i + 1 ? "active" : ""}
          key={i}
          onClick={() => onChange(i + 1)}
          aria-current={page === i + 1 ? "page" : undefined}
        >
          {i + 1}
        </button>
      ))}
      <button disabled={page === pages} onClick={() => onChange(page + 1)} aria-label={t("common.next")}>
        <Icon name="chevronRight" />
      </button>
    </nav>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="place-grid">
      {Array.from({ length: count }, (_, x) => (
        <div className="skeleton" key={x}>
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

export function PageLoader() {
  const { t } = useTranslation();
  return (
    <main className="page page-loader" aria-busy="true">
      <span className="spinner" />
      <p>{t("common.loading")}</p>
    </main>
  );
}

export function Toast() {
  const { toast, closeToast } = useApp();
  if (!toast) return null;
  const icon = toast.type === "error" ? "alert" : toast.type === "info" ? "info" : "check";
  return (
    <div className={`toast toast-${toast.type}`} role={toast.type === "error" ? "alert" : "status"} key={toast.id}>
      <Icon name={icon} size={18} />
      <span>{toast.message}</span>
      <button onClick={closeToast} aria-label="×">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

/** Scrolls to the top on page change, or to #anchor when the URL has one. */
export function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      const timer = setTimeout(scroll, 60);
      return () => clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, hash]);
  return null;
}

export function Private({ children, admin = false }) {
  const { user, loggedOut } = useApp();
  const location = useLocation();
  if (!user) return loggedOut ? <Navigate to="/" replace /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && user.role !== "admin") return <NotFound />;
  return children;
}

export function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="page not-found">
      <div className="not-found-code">404</div>
      <div className="eyebrow">{t("common.notFound")}</div>
      <h1>
        {t("common.notFoundTitle")} <em>{t("common.notFoundTitleAccent")}</em>
      </h1>
      <p>{t("common.notFoundText")}</p>
      <div className="button-row center">
        <Link className="button button-primary" to="/">
          <Icon name="home" size={18} /> {t("common.toHome")}
        </Link>
        <Link className="button button-ghost" to="/places">
          {t("nav.destinations")}
        </Link>
      </div>
    </main>
  );
}

export function QtyStepper({ value, min = 1, max = 12, onChange, label }) {
  const { t } = useTranslation();
  return (
    <div className="qty" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={t("common.decrease")}>
        <Icon name="minus" size={16} />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={t("common.increase")}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

export function SkipLink() {
  const { t } = useTranslation();
  return <a className="skip-link" href="#content">{t("common.skipToContent")}</a>;
}
