import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import { useApp } from "../context/AppContext";

const LANGS = [
  { code: "ky", label: "KG", name: "Кыргызча", flag: "🇰🇬" },
  { code: "ru", label: "RU", name: "Русский", flag: "🇷🇺" },
  { code: "en", label: "EN", name: "English", flag: "🇬🇧" },
];

export function LanguageSwitch({ className = "" }) {
  const { lang, setLang } = useApp();
  const { t } = useTranslation();
  return (
    <div className={`language-switch ${className}`} role="group" aria-label={t("nav.language")}>
      {LANGS.map((l) => (
        <button
          type="button"
          key={l.code}
          className={lang === l.code ? "active" : ""}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          lang={l.code}
          title={l.name}
        >
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Brand({ to = "/" }) {
  const { t } = useTranslation();
  return (
    <Link className="brand" to={to} aria-label="Travel KG">
      <span className="brand-mark" aria-hidden="true">
        <Icon name="mountain" size={20} strokeWidth={2.2} />
      </span>
      <span className="brand-text">
        travel<b>kg</b>
        <small>{t("brand.tagline")}</small>
      </span>
    </Link>
  );
}

const NAV = [
  { to: "/places", key: "nav.destinations", route: true },
  { to: "/#about", key: "nav.about" },
  { to: "/#gallery", key: "nav.gallery" },
  { to: "/#reviews", key: "nav.reviews" },
  { to: "/#contacts", key: "nav.contacts" },
];

export default function Header() {
  const { user, favorites, cart, theme, setTheme } = useApp();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const overHero = pathname === "/" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [open]);

  const close = () => setOpen(false);
  const cartCount = cart.length;

  return (
    <header className={`header ${overHero ? "over-hero" : ""} ${scrolled ? "scrolled" : ""}`}>
      <div className="header-inner">
        <Brand />
        <nav className="nav-desktop" aria-label={t("nav.main")}>
          {NAV.map((item) =>
            item.route ? (
              <NavLink key={item.key} to={item.to}>{t(item.key)}</NavLink>
            ) : (
              <Link key={item.key} to={item.to}>{t(item.key)}</Link>
            ),
          )}
        </nav>
        <div className="header-actions">
          <LanguageSwitch className="hide-mobile" />
          <button
            className="icon-button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={t("nav.themeToggle")}
            title={t("nav.themeToggle")}
          >
            <Icon name={theme === "light" ? "moon" : "sun"} />
          </button>
          <Link className="icon-button hide-mobile" to="/favorites" aria-label={`${t("nav.favorites")}: ${favorites.length}`}>
            <Icon name="heart" />
            {favorites.length > 0 && <span className="badge">{favorites.length}</span>}
          </Link>
          <Link className="icon-button" to="/cart" aria-label={`${t("nav.cart")}: ${cartCount}`}>
            <Icon name="bag" />
            {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </Link>
          <Link className="profile-link hide-mobile" to={user ? "/account" : "/login"}>
            <Icon name="user" size={18} />
            <span>{user?.name?.split(" ")[0] || t("nav.signIn")}</span>
          </Link>
          <button
            className="icon-button burger"
            onClick={() => setOpen(!open)}
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
      <div id="mobile-menu" className={`mobile-menu ${open ? "open" : ""}`} aria-hidden={!open}>
        <nav aria-label={t("nav.main")}>
          <Link to="/" onClick={close}><Icon name="home" /> {t("nav.home")}</Link>
          {NAV.map((item) => (
            <Link key={item.key} to={item.to} onClick={close}>
              <Icon name={{ "nav.destinations": "compass", "nav.about": "info", "nav.gallery": "camera", "nav.reviews": "star", "nav.contacts": "phone" }[item.key]} />
              {t(item.key)}
            </Link>
          ))}
          <Link to="/favorites" onClick={close}><Icon name="heart" /> {t("nav.favorites")} <span className="count">{favorites.length}</span></Link>
          <Link to="/cart" onClick={close}><Icon name="bag" /> {t("nav.cart")} <span className="count">{cartCount}</span></Link>
          <Link to={user ? "/account" : "/login"} onClick={close}><Icon name="user" /> {user ? t("nav.account") : t("nav.signIn")}</Link>
          {user?.role === "admin" && <Link to="/admin" onClick={close}><Icon name="settings" /> {t("admin.title")}</Link>}
        </nav>
        <div className="mobile-menu-footer">
          <span>{t("nav.language")}</span>
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const { favorites, cart, user } = useApp();
  const { t } = useTranslation();
  return (
    <nav className="tabbar" aria-label={t("nav.quick")}>
      <NavLink to="/" end><Icon name="home" /><span>{t("nav.home")}</span></NavLink>
      <NavLink to="/places"><Icon name="compass" /><span>{t("nav.tours")}</span></NavLink>
      <NavLink to="/favorites">
        <Icon name="heart" />
        {favorites.length > 0 && <i className="badge">{favorites.length}</i>}
        <span>{t("nav.saved")}</span>
      </NavLink>
      <NavLink to="/cart">
        <Icon name="bag" />
        {cart.length > 0 && <i className="badge">{cart.length}</i>}
        <span>{t("nav.cart")}</span>
      </NavLink>
      <NavLink to={user ? "/account" : "/login"}><Icon name="user" /><span>{user ? t("nav.profile") : t("nav.signIn")}</span></NavLink>
    </nav>
  );
}
