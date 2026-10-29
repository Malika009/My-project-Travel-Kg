import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api, resolveAssetUrl, setToken } from "./data/services";
import { useTranslation } from "react-i18next";
import i18n, { normalizeLanguage } from "./i18n.js";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

const State = createContext(null);
const useApp = () => useContext(State);
const regionKeys = {
  "Чуйская область": "region.chuy",
  "Ошская область": "region.osh",
  "Нарынская область": "region.naryn",
  "Иссык-Кульская область": "region.issyk",
  "Джалал-Абадская область": "region.jalalAbad",
  "Таласская область": "region.talas",
};
const categoryKeys = {
  Горы: "category.mountains",
  "Озёра": "category.lakes",
  Треккинг: "category.trekking",
  Каньоны: "category.canyons",
  Приключения: "category.adventure",
};
const durationKeys = {
  "1 день": "duration.oneDay",
  "2 дня": "duration.twoDays",
  "3 дня": "duration.threeDays",
  "4 дня": "duration.fourDays",
};
const difficultyKeys = {
  Легко: "difficulty.easy",
  Средне: "difficulty.medium",
  Сложно: "difficulty.hard",
};
function localizePlace(place, t) {
  const translated = (key, fallback) => key ? t(key, { defaultValue: fallback }) : fallback;
  return {
    ...place,
    name: translated(`placeData.${place._id}.name`, place.name),
    description: translated(`placeData.${place._id}.description`, place.description),
    tag: translated(`placeData.${place._id}.tag`, place.tag || place.category),
    region: translated(regionKeys[place.region], place.region),
    category: translated(categoryKeys[place.category], place.category),
    duration: translated(durationKeys[place.duration], place.duration),
    difficulty: translated(difficultyKeys[place.difficulty], place.difficulty || ""),
  };
}
const localizedValue = (value, keys, t) => keys[value] ? t(keys[value]) : value;
const numberLocale = () => ({ ru: "ru-RU", ky: "ky-KG", en: "en-US" }[i18n.resolvedLanguage] || "ru-RU");
const formatNumber = (value) => Number(value || 0).toLocaleString(numberLocale());
const localizedStatus = (status, t) => {
  const keys = { pending: "common.statusPending", confirmed: "common.statusConfirmed", cancelled: "common.statusCancelled" };
  return keys[status] ? t(keys[status]) : status;
};
const apiErrorMessage = (error, t, fallback) => {
  const status = error.response?.status;
  if (status === 401) return t(fallback);
  if (status === 403) return t("api.forbidden");
  if (status === 400) return t("api.invalidData");
  if (status === 409) return t("api.conflict");
  if (!error.response) return t("api.networkError");
  return t(fallback);
};
const DEFAULT_PLACE_IMAGE =
  "/tours/photo-1501785888041-af3ef285b470.jpg";

function App() {
  const { t } = useTranslation();
  const [places, setPlaces] = useState([]),
    [user, setUser] = useState(() =>
      JSON.parse(localStorage.getItem("travel-user") || "null"),
    );
  const [favorites, setFavorites] = useState(() =>
      JSON.parse(localStorage.getItem("travel-favorites") || "[]"),
    ),
    [cart, setCart] = useState(() =>
      JSON.parse(localStorage.getItem("travel-cart") || "[]"),
    );
  const [theme, setTheme] = useState(
      localStorage.getItem("travel-theme") || "light",
    ),
    [lang, setLang] = useState(() =>
      normalizeLanguage(localStorage.getItem("travel-lang")),
    );
  const [toast, setToast] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get("/places")
      .then((r) => {
        const data = Array.isArray(r.data)
          ? r.data
          : Array.isArray(r.data?.places)
            ? r.data.places
            : [];
        setPlaces(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("travel-theme", theme);
  }, [theme]);
  useEffect(() => {
    const normalized = normalizeLanguage(lang);
    if (normalized !== lang) {
      setLang(normalized);
      return;
    }
    localStorage.setItem("travel-lang", normalized);
    if (i18n.resolvedLanguage !== normalized) i18n.changeLanguage(normalized);
    document.documentElement.lang = normalized;
  }, [lang]);
  useEffect(() => {
    document.title = t("meta.title");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.description"));
  }, [t]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(id);
  }, [toast]);
  const notify = (message) => setToast(message);
  const toggleFavorite = (id) =>
    setFavorites((v) => {
      const n = v.includes(id) ? v.filter((x) => x !== id) : [...v, id];
      localStorage.setItem("travel-favorites", JSON.stringify(n));
      return n;
    });
  const addCart = (place, qty = 1, date = "") => {
    setCart((v) => {
      const n = [
        ...v,
        { ...place, qty, date, key: `${place._id}-${Date.now()}` },
      ];
      localStorage.setItem("travel-cart", JSON.stringify(n));
      return n;
    });
    notify(t("catalog.addedToCart"));
  };
  const value = useMemo(
    () => ({
      places,
      setPlaces,
      user,
      setUser,
      favorites,
      toggleFavorite,
      cart,
      setCart,
      addCart,
      theme,
      setTheme,
      lang,
      setLang,
      notify,
      loading,
    }),
    [places, user, favorites, cart, theme, lang, loading],
  );
  return (
    <State.Provider value={value}>
      <div className="app-shell">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/places" element={<Catalog />} />
          <Route path="/places/:id" element={<PlaceDetails />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/auth/oauth/:provider" element={<OAuthCallback />} />
          <Route
            path="/account"
            element={
              <Private>
                <Account />
              </Private>
            }
          />
          <Route
            path="/admin"
            element={
              <Private admin>
                <Admin />
              </Private>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
        <ChatWidget />
        {toast && <Toast message={toast} />}
      </div>
    </State.Provider>
  );
}

function Header() {
  const { user, favorites, cart, theme, setTheme, lang, setLang } = useApp();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <header className="header">
      <Link className="brand" to="/">
        <span className="brand-mark">t</span>
        <span>
          travel<span className="brand-accent">kg</span>
          <small>{t("brand.tagline")}</small>
        </span>
      </Link>
      <button
        className="burger"
        onClick={() => setOpen(!open)}
        aria-label={t("nav.openMenu")}
      >
        <i />
        <i />
        <i />
      </button>
      <nav className={open ? "nav open" : "nav"}>
        <NavLink to="/places">{t("nav.destinations")}</NavLink>
        <a href="/#about">{t("nav.about")}</a>
        <a href="/#reviews">{t("nav.reviews")}</a>
        <div className="mobile-links">
          <Link to="/favorites">{t("nav.favorites")} ({favorites.length})</Link>
          <Link to="/cart">{t("nav.cart")} ({cart.length})</Link>
        </div>
      </nav>
      <div className="header-actions">
        <button
          className="icon-button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={t("nav.themeToggle")}
        >
          {theme === "light" ? "☾" : "☀"}
        </button>
        <div className="language-switch" aria-label={t("nav.language")}>
          <button
            type="button"
            className={lang === "ru" ? "language-option active ru" : "language-option ru"}
            onClick={() => setLang("ru")}
            aria-label="Русский"
          >
            <span className="language-flag">🇷🇺</span>
            <span className="language-code">RU</span>
          </button>
          <button
            type="button"
            className={lang === "ky" ? "language-option active ky" : "language-option ky"}
            onClick={() => setLang("ky")}
            aria-label="Кыргызский"
          >
            <span className="language-flag">🇰🇬</span>
            <span className="language-code">KG</span>
          </button>
          <button
            type="button"
            className={lang === "en" ? "language-option active en" : "language-option en"}
            onClick={() => setLang("en")}
            aria-label="English"
          >
            <span className="language-flag">🇬🇧</span>
            <span className="language-code">EN</span>
          </button>
        </div>
        <Link className="header-icon" to="/favorites" aria-label={t("nav.favorites")}>
          ♡<sup>{favorites.length}</sup>
        </Link>
        <Link className="header-icon" to="/cart" aria-label={t("nav.cart")}>
          ♧<sup>{cart.length}</sup>
        </Link>
        <Link className="profile-link" to={user ? "/account" : "/login"}>
          <span>♙</span>
          {user?.name?.split(" ")[0] || t("nav.signIn")}
        </Link>
      </div>
    </header>
  );
}
function Home() {
  const { places } = useApp();
  const { t } = useTranslation();
  const availablePlaces = Array.isArray(places) ? places : [];
  return (
    <>
      <main>
        <section className="hero">
          <TravelImage
            src="https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=2200&q=90"
            alt={t("image.heroAlt")}
            loading="eager"
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <div className="eyebrow">
              <span /> {t("home.tagline")}
            </div>
            <h1>
              {t("home.title")}
              <br />
              <em>{t("home.titleAccent")}</em>
            </h1>
            <p>{t("home.subtitle")}</p>
            <div className="hero-buttons">
              <Link className="button button-light" to="/places">
                {t("home.cta.primary")} <span>↗</span>
              </Link>
              <a className="watch-link" href="#popular">
                <span>▶</span> {t("home.cta.secondary")}
              </a>
            </div>
          </div>
          <div className="hero-note">
            <span className="note-line" /> 40° 30' 00" N &nbsp; 74° 30' 00" E{" "}
            <b>{t("home.travelNext")}</b>
          </div>
          <div className="hero-count">
            01 <span>/</span> 04
          </div>
        </section>
        <SearchStrip />
        <section className="section popular" id="popular">
          <div className="section-heading">
            <div>
              <div className="eyebrow dark">{t("home.featured")}</div>
              <h2>
                {t("home.featuredTitle")}
                <br />
                <em>{t("home.featuredTitleAccent")}</em>
              </h2>
            </div>
            <Link className="text-link" to="/places">
              {t("home.allDirections")} <span>↗</span>
            </Link>
          </div>
          <div className="place-grid">
            {availablePlaces.slice(0, 3).map((p, i) => (
              <PlaceCard key={p._id} place={p} featured={i === 0} />
            ))}
          </div>
        </section>
        <section className="story" id="about">
          <div className="story-image">
            <TravelImage
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85"
              alt={t("image.storyAlt")}
            />
            <div className="story-stamp">
              100%
              <small>
                {t("home.localExperience")}
              </small>
            </div>
          </div>
          <div className="story-copy">
            <div className="eyebrow dark">{t("home.storyEyebrow")}</div>
            <h2>
              {t("home.storyTitle")}
              <br />
              <em>{t("home.storyTitleAccent")}</em>
            </h2>
            <p>{t("home.storyText")}</p>
            <div className="stats">
              <Stat value="120+" label={t("stats.routes")} />
              <Stat value="4.9" label={t("stats.rating")} />
              <Stat value="2 400+" label={t("stats.guests")} />
            </div>
            <Link className="button button-dark" to="/places">
              {t("home.storyButton")} <span>↗</span>
            </Link>
          </div>
        </section>
        <section className="testimonial" id="reviews">
          <div className="eyebrow">{t("home.reviewsEyebrow")}</div>
          <div className="quote-mark">“</div>
          <blockquote>
            {t("home.testimonialQuote")}
          </blockquote>
          <div className="quote-person">
            <TravelImage
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
              alt={t("image.guestAlt")}
            />
            <span>
              <b>{t("home.testimonialName")}</b>
              <small>{t("home.testimonialMeta")}</small>
            </span>
            <span className="stars">★★★★★</span>
          </div>
          <div className="quote-arrows">
            <button aria-label={t("home.reviewPrev")}>←</button>
            <button aria-label={t("home.reviewNext")}>→</button>
          </div>
        </section>
        <section className="cta">
          <TravelImage
            src="https://images.unsplash.com/photo-1464278533981-50106e6176b1?auto=format&fit=crop&w=1600&q=85"
            alt={t("image.trailsAlt")}
          />
          <div className="cta-overlay" />
          <div>
            <div className="eyebrow">{t("home.travelNext")}</div>
            <h2>
              {t("home.travelNextTitle")}
              <br />
              <em>{t("home.travelNextTitleAccent")}</em>
            </h2>
            <Link className="button button-light" to="/places">
              {t("home.travelNextButton")} <span>↗</span>
            </Link>
          </div>
        </section>
      </main>
      <FooterSpacer />
    </>
  );
}
function SearchStrip() {
  const [q, setQ] = useState(""),
    [region, setRegion] = useState(""),
    [date, setDate] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <form
      className="search-strip"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (region) params.set("region", region);
        if (date) params.set("date", date);
        navigate(`/places${params.size ? `?${params}` : ""}`);
      }}
    >
      <label>
        <span>⌕</span>
        <div>
          <small>{t("search.heading")}</small>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
          />
        </div>
      </label>
      <label>
        <span>⌖</span>
        <div>
          <small>{t("search.region")}</small>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">{t("search.allRegions")}</option>
            <option value="Чуйская область">{t("search.regionChuy")}</option>
            <option value="Иссык-Кульская область">{t("search.regionIssyk")}</option>
            <option value="Нарынская область">{t("search.regionNaryn")}</option>
          </select>
        </div>
      </label>
      <label>
        <span>◷</span>
        <div>
          <small>{t("search.when")}</small>
          <input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </label>
      <button className="button button-dark">
        {t("search.findTour")} <span>↗</span>
      </button>
    </form>
  );
}
function Catalog() {
  const { places, loading } = useApp();
  const location = useLocation();
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQ(params.get("q") || "");
    setRegion(params.get("region") || "");
    setDate(params.get("date") || "");
    setCategory(params.get("category") || "");
    setRating(Number(params.get("rating") || 0));
    setMaxPrice(Number(params.get("maxPrice") || 10000));
    setPage(1);
  }, [location.search]);

  const filtered = places.filter(
      (p) => {
        const localized = localizePlace(p, t);
        const searchableText = [
          p.name, p.description, localized.name, localized.description,
          localized.region, localized.category, localized.tag,
        ].join(" ").toLocaleLowerCase();
        return searchableText.includes(q.trim().toLocaleLowerCase()) &&
        (!region || p.region === region) &&
        (!category || p.category === category) &&
        p.rating >= rating &&
        Number(p.price) <= Number(maxPrice);
      },
    ).sort((a, b) => {
      if (sort === "cheap") return Number(a.price) - Number(b.price);
      if (sort === "expensive") return Number(b.price) - Number(a.price);
      if (sort === "rating") return Number(b.rating) - Number(a.rating);
      return Number(b.rating) - Number(a.rating);
    }),
    items = filtered.slice((page - 1) * 6, page * 6);
  return (
    <main className="page">
      <div className="page-title">
        <div className="eyebrow dark">{t("catalog.eyebrow")}</div>
        <h1>
          {t("catalog.title")} <em>{t("catalog.titleAccent")}</em>
        </h1>
        <p>{t("catalog.subtitle")}</p>
      </div>
      <div className="catalog-layout">
        <aside className="filters">
          <h3>
            {t("catalog.filters")} {" "}
            <button
              onClick={() => {
                setQ("");
                setRegion("");
                setCategory("");
                setRating(0);
                setMaxPrice(10000);
                setPage(1);
              }}
            >
              {t("catalog.reset")}
            </button>
          </h3>
          <FilterField label={t("catalog.search")}>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={t("catalog.searchPlaceholder")}
            />
          </FilterField>
          <FilterField label={t("catalog.region")}>
            <select value={region} onChange={(e) => { setRegion(e.target.value); setPage(1); }}>
              <option value="">{t("catalog.anyRegion")}</option>
              {[...new Set(places.map((p) => p.region))].map((x) => (
                <option key={x} value={x}>{localizedValue(x, regionKeys, t)}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label={t("catalog.tripType")}>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            >
              <option value="">{t("catalog.anyCategory")}</option>
              {[...new Set(places.map((p) => p.category))].map((x) => (
                <option key={x} value={x}>{localizedValue(x, categoryKeys, t)}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label={t("catalog.rating")}>
            <select value={rating} onChange={(e) => { setRating(+e.target.value); setPage(1); }}>
              <option value="0">{t("catalog.anyRating")}</option>
              <option value="4.8">{t("catalog.minRating48")}</option>
              <option value="4.9">{t("catalog.minRating49")}</option>
            </select>
          </FilterField>
          <FilterField label={t("catalog.maxPrice")}>
            <select value={maxPrice} onChange={(e) => { setMaxPrice(Number(e.target.value)); setPage(1); }}>
              <option value="10000">{t("catalog.anyPrice")}</option>
              <option value="3000">{t("catalog.price3000")}</option>
              <option value="5000">{t("catalog.price5000")}</option>
              <option value="7000">{t("catalog.price7000")}</option>
            </select>
          </FilterField>
        </aside>
        <div>
          <div className="results-head">
            <span>{filtered.length} {t("catalog.routesCount")}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t("catalog.sortPopular")}>
              <option value="popular">{t("catalog.sortPopular")}</option>
              <option value="cheap">{t("catalog.sortCheap")}</option>
              <option value="expensive">{t("catalog.sortExpensive")}</option>
              <option value="rating">{t("catalog.sortRating")}</option>
            </select>
          </div>
          {loading ? (
            <SkeletonGrid />
          ) : items.length ? (
            <div className="place-grid catalog-grid">
              {items.map((p) => (
                <PlaceCard place={p} key={p._id} date={date} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("catalog.notFound")}
              text={t("catalog.notFoundText")}
            />
          )}
          <Pagination
            page={page}
            pages={Math.max(1, Math.ceil(filtered.length / 6))}
            onChange={setPage}
          />
        </div>
      </div>
    </main>
  );
}
function PlaceDetails() {
  const { id } = useParams(),
    { places, addCart, favorites, toggleFavorite } = useApp(),
    originalPlace = places.find((x) => x._id === id),
    [date, setDate] = useState(new URLSearchParams(location.search).get("date") || ""),
    [qty, setQty] = useState(2);
  const { t } = useTranslation();
  if (!originalPlace) return <NotFound />;
  const p = localizePlace(originalPlace, t);
  return (
    <main className="page detail-page">
      <Link className="back-link" to="/places">
        {t("catalog.back")}
      </Link>
      <div className="detail-hero">
        <TravelImage src={p.image} alt={t("image.placeAlt", { name: p.name })} />
        <div className="detail-overlay" />
        <div className="detail-title">
          <span className="tag">{p.tag || p.category}</span>
          <h1>{p.name}</h1>
          <p>
            ⌖ {p.region} &nbsp; · &nbsp; ★ {p.rating} &nbsp; · &nbsp; ◷{" "}
            {p.duration}
          </p>
        </div>
      </div>
      <div className="detail-columns">
        <article>
          <div className="eyebrow dark">{t("catalog.detailRoute")}</div>
          <h2>
            {t("catalog.detailTitle")} <em>{t("catalog.detailTitleAccent")}</em>
          </h2>
          <p>{p.description}</p>
          <p>
            {t("catalog.detailIncludedText")}
          </p>
          <h3>{t("catalog.detailIncludes")}</h3>
          <ul className="included">
            <li>✓ {t("catalog.detailIncluded1")}</li>
            <li>✓ {t("catalog.detailIncluded2")}</li>
            <li>✓ {t("catalog.detailIncluded3")}</li>
          </ul>
          <ReviewSection placeId={p._id} />
        </article>
        <BookingBox
          place={p}
          date={date}
          setDate={setDate}
          qty={qty}
          setQty={setQty}
          onBook={() => addCart(p, qty, date)}
          favorite={favorites.includes(p._id)}
          onFavorite={() => toggleFavorite(p._id)}
          t={t}
        />
      </div>
    </main>
  );
}
function BookingBox({
  place,
  date,
  setDate,
  qty,
  setQty,
  onBook,
  favorite,
  onFavorite,
  t,
}) {
  return (
    <aside className="booking-box">
      <div className="price">
        {formatNumber(place.price)} {t("catalog.currency")} <small>/{t("catalog.perPerson")}</small>
      </div>
      <label>
        {t("catalog.bookingDate")}
        <input
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label>
        {t("catalog.guests")}
        <div className="qty">
          <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <span>
            {qty} {qty === 1 ? t("catalog.guestOne") : t("catalog.guestMany")}
          </span>
          <button onClick={() => setQty(qty + 1)}>+</button>
        </div>
      </label>
      <div className="total">
        {t("catalog.total")} <b>{formatNumber(place.price * qty)} {t("catalog.currency")}</b>
      </div>
      <button className="button button-dark full" onClick={onBook}>
        {t("catalog.bookNow")} <span>↗</span>
      </button>
      <button className="favorite-action" onClick={onFavorite}>
        {favorite ? `♥ ${t("catalog.favoriteRemove")}` : `♡ ${t("catalog.favoriteAdd")}`}
      </button>
      <small className="booking-note">
        {t("catalog.safePayment")}
      </small>
    </aside>
  );
}
function ReviewSection({ placeId }) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    api
      .get("/reviews", { params: { placeId } })
      .then((r) => setReviews(r.data))
      .catch(() => {});
  }, [placeId]);
  return (
    <section className="reviews-panel">
      <div className="review-heading">
        <h3>{t("catalog.reviewTitle")}</h3>
        <span>
          ★{" "}
          {reviews.length
            ? (
                reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
              ).toFixed(1)
            : "—"}{" "}
          · {reviews.length}
        </span>
      </div>
      <ReviewForm
        placeId={placeId}
        onAdded={(review) => setReviews((r) => [review, ...r])}
      />
      {reviews.length ? (
        reviews.map((r) => <ReviewCard key={r._id} review={r} />)
      ) : (
        <p className="muted">{t("catalog.beFirst")}</p>
      )}
    </section>
  );
}
function ReviewForm({ placeId, onAdded }) {
  const { user, notify } = useApp(),
    [text, setText] = useState(""),
    [rating, setRating] = useState(5);
  const { t } = useTranslation();
  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/reviews", { placeId, rating, text });
      onAdded(data);
      setText("");
      notify(t("catalog.reviewThanks"));
    } catch (err) {
      notify(apiErrorMessage(err, t, "catalog.reviewDisabled"));
    }
  };
  return (
    <form className="review-form" onSubmit={submit}>
      <div className="rating-picker" aria-label={t("catalog.rating")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setRating(n)}
            className={n <= rating ? "on" : ""}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={user ? t("catalog.reviewPlaceholder") : t("catalog.reviewDisabled")}
        minLength={5}
        required
        disabled={!user}
      />
      <button className="button button-dark" disabled={!user}>
        {t("catalog.publish")} ↗
      </button>
    </form>
  );
}
function ReviewCard({ review }) {
  return (
    <article className="review-card">
      <div className="review-avatar">
        {(review.user?.name || "G").slice(0, 1)}
      </div>
      <div>
        <b>{review.user?.name || "Traveler"}</b>
        <span className="stars">{"★".repeat(review.rating)}</span>
        <p>{review.text}</p>
      </div>
    </article>
  );
}
function Favorites() {
  const { places, favorites } = useApp(),
    items = places.filter((p) => favorites.includes(p._id));
  const { t } = useTranslation();
  return (
    <main className="page">
      <div className="page-title">
        <div className="eyebrow dark">{t("nav.favorites")}</div>
        <h1>{t("nav.favorites")}</h1>
      </div>
      {items.length ? (
        <div className="place-grid catalog-grid">
          {items.map((p) => (
            <PlaceCard key={p._id} place={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("catalog.favoriteEmptyTitle")}
          text={t("catalog.favoriteEmptyText")}
          action={
            <Link className="button button-dark" to="/places">
              {t("catalog.favoriteAction")} ↗
            </Link>
          }
        />
      )}
    </main>
  );
}
function Cart() {
  const { cart, setCart, user, notify } = useApp(),
    nav = useNavigate(),
    total = cart.reduce((a, p) => a + p.price * p.qty, 0);
  const { t } = useTranslation();
  const remove = (key) => {
    const n = cart.filter((p) => p.key !== key);
    setCart(n);
    localStorage.setItem("travel-cart", JSON.stringify(n));
  };
  const order = async () => {
    if (!user) {
      nav("/login");
      return;
    }
    try {
      await api.post("/orders", {
        items: cart.map((x) => ({
          placeId: x._id,
          name: t(`placeData.${x._id}.name`, { defaultValue: x.name }),
          date: x.date,
          quantity: x.qty,
          price: x.price,
        })),
        total,
      });
      notify(t("cart.orderSuccess"));
      setCart([]);
      localStorage.removeItem("travel-cart");
    } catch (e) {
      notify(apiErrorMessage(e, t, "cart.orderFail"));
    }
  };
  return (
    <main className="page">
      <div className="page-title">
        <div className="eyebrow dark">{t("catalog.cartTitle")}</div>
        <h1>{t("catalog.cartHeader")}</h1>
      </div>
      {cart.length ? (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.map((p) => {
              const trip = localizePlace(p, t);
              return <div className="cart-item" key={p.key}>
                <TravelImage src={p.image} alt={t("image.placeAlt", { name: trip.name })} />
                <div>
                  <Link to={`/places/${p._id}`}>
                    <b>{trip.name}</b>
                  </Link>
                  <p>
                    {p.date || t("catalog.noDate")} · {p.qty} {p.qty === 1 ? t("catalog.guestOne") : t("catalog.guestMany")}
                  </p>
                </div>
                <strong>{formatNumber(p.price * p.qty)} {t("catalog.currency")}</strong>
                <button onClick={() => remove(p.key)} aria-label={t("admin.delete")}>
                  ×
                </button>
              </div>;
            })}
          </div>
          <aside className="booking-box">
            <h3>{t("catalog.yourOrder")}</h3>
            <div className="total">
              {t("catalog.total")} <b>{formatNumber(total)} {t("catalog.currency")}</b>
            </div>
            <button className="button button-dark full" onClick={order}>
              {t("catalog.checkout")} ↗
            </button>
            <small className="booking-note">
              {t("catalog.checkoutNote")}
            </small>
          </aside>
        </div>
      ) : (
        <EmptyState
          title={t("catalog.cartEmptyTitle")}
          text={t("catalog.cartEmptyText")}
          action={
            <Link className="button button-dark" to="/places">
              {t("catalog.cartEmptyAction")} ↗
            </Link>
          }
        />
      )}
    </main>
  );
}
function AuthPage({ mode }) {
  const { setUser, notify } = useApp(),
    nav = useNavigate(),
    register = mode === "register";
  const { t } = useTranslation();
  const socialLogin = async (provider) => {
    try {
      const { data } = await api.get(`/auth/oauth/${provider}`);
      if (!data.configured) {
        notify(
          t("auth.oauthNotConfigured", {
            provider: provider === "google" ? "Google" : "GitHub",
            callback: data.callbackUrl || t("auth.callbackMissing"),
          }),
        );
        if (data.docsUrl) {
          window.open(data.docsUrl, "_blank", "noopener,noreferrer");
        }
        return;
      }
      notify(t("auth.oauthRedirect", { provider: provider === "google" ? "Google" : "GitHub" }));
      if (data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      window.location.href = data.callbackUrl || "/";
    } catch (error) {
      notify(t("auth.oauthUnavailable"));
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const { data } = await api.post(
        `/auth/${register ? "register" : "login"}`,
        Object.fromEntries(f),
      );
      setToken(data.token);
      localStorage.setItem("travel-user", JSON.stringify(data.user));
      setUser(data.user);
      notify(register ? t("auth.welcome") : t("auth.loginSuccess"));
      nav("/account");
    } catch (err) {
      notify(apiErrorMessage(err, t, "auth.loginFailure"));
    }
  };
  return (
    <main className="auth-page">
      <div className="auth-image">
        <TravelImage
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85"
          alt={t("image.storyAlt")}
        />
        <div>
          <div className="eyebrow">{t("auth.heroEyebrow")}</div>
          <h2>
            {t("auth.heroTitle")}
            <br />
            <em>{t("auth.heroTitleAccent")}</em>
          </h2>
        </div>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <div className="eyebrow dark">TRAVEL KG</div>
        <h1>{register ? t("auth.titleRegister") : t("auth.titleLogin")}</h1>
        <p>
          {register
            ? t("auth.subtitleRegister")
            : t("auth.subtitleLogin")}
        </p>
        {register && (
          <label>
            {t("auth.name")}
            <input
              name="name"
              required
              minLength="2"
              placeholder={t("auth.namePlaceholder")}
            />
          </label>
        )}
        <label>
          {t("auth.email")}
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
          />
        </label>
        <label>
          {t("auth.password")}
          <input
            name="password"
            type="password"
            required
            minLength="6"
            placeholder={t("auth.passwordPlaceholder")}
          />
        </label>
        <button className="button button-dark full">
          {register ? t("auth.registerButton") : t("auth.loginButton")} ↗
        </button>
        <div className="auth-divider">
          <span>{t("auth.divider")}</span>
        </div>
        <div className="social-auth">
          <button type="button" className="button button-light full" onClick={() => socialLogin("google")}>
            Google
          </button>
          <button type="button" className="button button-light full" onClick={() => socialLogin("github")}>
            GitHub
          </button>
        </div>
        <div className="auth-switch">
          {register ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
          <Link to={register ? "/login" : "/register"}>
            {register ? t("auth.switchLogin") : t("auth.switchRegister")}
          </Link>
        </div>
      </form>
    </main>
  );
}
function OAuthCallback() {
  const { provider } = useParams();
  const navigate = useNavigate();
  const { setUser, notify } = useApp();
  const { t } = useTranslation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      notify(t("auth.oauthRejected"));
      navigate("/login");
      return;
    }

    if (!code) {
      notify(t("auth.oauthMissingCode"));
      navigate("/login");
      return;
    }

    api
      .get(`/auth/oauth/${provider}/callback`, { params: { code } })
      .then(({ data }) => {
        setToken(data.token);
        localStorage.setItem("travel-user", JSON.stringify(data.user));
        setUser(data.user);
        notify(t("auth.oauthSuccess"));
        navigate("/account");
      })
      .catch((err) => {
        notify(apiErrorMessage(err, t, "auth.oauthFailure"));
        navigate("/login");
      });
  }, [provider, navigate, notify, setUser, t]);

  return (
    <main className="page">
      <div className="page-title">
        <div className="eyebrow dark">{t("auth.oauthEyebrow")}</div>
        <h1>{t("auth.oauthConnecting")}</h1>
      </div>
    </main>
  );
}

function Account() {
  const { user, setUser, notify } = useApp(),
    [orders, setOrders] = useState([]);
  const { t } = useTranslation();
  useEffect(() => {
    api
      .get("/orders")
      .then((r) => setOrders(r.data))
      .catch(() => {});
  }, []);
  return (
    <main className="page">
      <div className="page-title">
        <div className="eyebrow dark">{t("account.title")}</div>
        <h1>
          {t("account.greeting")} <em>{user?.name?.split(" ")[0]}</em>
        </h1>
        <p>{t("account.subtitle")}</p>
      </div>
      <div className="account-box">
        <h2>
          {t("account.orders")} <span>{orders.length}</span>
        </h2>
        {orders.length ? (
          orders.map((o) => (
            <div className="order-row" key={o._id}>
              <span>{t("account.orderPrefix")} #{String(o._id).slice(-6)}</span>
              <b>{o.items?.map((x) => t(`placeData.${x.placeId}.name`, { defaultValue: x.name })).join(", ")}</b>
              <span>{localizedStatus(o.status, t)}</span>
              <strong>{formatNumber(o.total)} {t("catalog.currency")}</strong>
            </div>
          ))
        ) : (
          <p>
            {t("account.noOrders")} {" "}
            <Link to="/places">{t("account.exploreTrips")} ↗</Link>
          </p>
        )}
        <button
          className="text-button"
          onClick={() => {
            setToken("");
            localStorage.removeItem("travel-user");
            setUser(null);
            notify(t("account.logoutSuccess"));
          }}
        >
          {t("account.logout")} ↗
        </button>
      </div>
    </main>
  );
}
function StatsChart({ orders }) {
  const { t } = useTranslation();
  const data = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    const month = d.toLocaleString(numberLocale(), { month: "short" });
    return {
      month,
      count: orders.filter(
        (o) =>
          new Date(o.createdAt || Date.now()).getMonth() === d.getMonth() &&
          new Date(o.createdAt || Date.now()).getFullYear() === d.getFullYear(),
      ).length,
    };
  });
  return (
    <section className="chart-card">
      <div>
        <h2>{t("admin.salesTrend")}</h2>
        <p>{t("admin.lastSixMonths")}</p>
      </div>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--line)"
            />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip />
            <Bar
              dataKey="count"
              name={t("admin.orders")}
              fill="#496a50"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
function AdminManagement({ users, reload }) {
  const { notify } = useApp();
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    api
      .get("/reviews")
      .then((r) => setReviews(r.data))
      .catch(() => {});
  }, []);
  const role = async (id, value) => {
    try {
      await api.patch(`/admin/users/${id}`, { role: value });
      notify(t("admin.roleUpdated"));
      reload();
    } catch (e) {
      notify(apiErrorMessage(e, t, "admin.roleUpdateFail"));
    }
  };
  const remove = async (id) => {
    if (!confirm(t("admin.deleteReview"))) return;
    try {
      await api.delete(`/reviews/${id}`);
      setReviews((r) => r.filter((x) => x._id !== id));
      notify(t("admin.reviewDeleted"));
    } catch (e) {
      notify(t("admin.reviewDeleteFail"));
    }
  };
  return (
    <>
      <div className="admin-heading">
        <h2>{t("admin.usersTitle")}</h2>
        <span>{users.length} {t("admin.accounts")}</span>
      </div>
      <UserManagement users={users} onRole={role} />
      <div className="admin-heading">
        <h2>{t("admin.reviews")}</h2>
        <span>{reviews.length} {t("admin.reviewCount")}</span>
      </div>
      <ReviewManagement reviews={reviews} onRemove={remove} />
    </>
  );
}
function UserManagement({ users, onRole }) {
  const { t } = useTranslation();
  return (
    <div className="admin-table">
      {users.map((u) => (
        <div className="user-row" key={u._id}>
          <b>{u.name}</b>
          <span>{u.email}</span>
          <select
            value={u.role}
            onChange={(e) => onRole(u._id, e.target.value)}
          >
            <option value="user">{t("admin.userRoleUser")}</option>
            <option value="admin">{t("admin.userRoleAdmin")}</option>
          </select>
        </div>
      ))}
    </div>
  );
}
function ReviewManagement({ reviews, onRemove }) {
  const { t } = useTranslation();
  return (
    <div className="admin-table">
      {reviews.length ? (
        reviews.map((r) => (
          <div className="moderation-row" key={r._id}>
            <span>★ {r.rating}</span>
            <b>{r.text}</b>
            <button onClick={() => onRemove(r._id)}>{t("admin.delete")}</button>
          </div>
        ))
      ) : (
        <p className="muted">{t("admin.reviewsNone")}</p>
      )}
    </div>
  );
}
function Admin() {
  const { places, setPlaces, notify } = useApp(),
    [orders, setOrders] = useState([]),
    [users, setUsers] = useState([]),
    [form, setForm] = useState(false),
    [editingId, setEditingId] = useState(null),
    [draft, setDraft] = useState({
      name: "",
      region: "",
      category: "Горы",
      price: "",
      rating: "4.8",
      duration: "1 день",
      difficulty: "Средне",
      image: "",
      description: "",
    });
  const { t } = useTranslation();
  const load = () =>
    Promise.all([api.get("/orders"), api.get("/admin/users")])
      .then(([o, u]) => {
        setOrders(o.data);
        setUsers(u.data);
      })
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const save = async (e) => {
    e.preventDefault();
    try {
      const currentPlace = places.find((place) => place._id === editingId);
      const imageValue = String(draft.image ?? "").trim();
      const payload = {
        ...draft,
        image: editingId && !imageValue ? currentPlace?.image || "" : imageValue,
        price: Number(draft.price),
        rating: Number(draft.rating),
      };
      if (editingId) {
        const { data } = await api.put(`/places/${editingId}`, payload);
        setPlaces((p) => p.map((place) => (place._id === editingId ? data : place)));
        notify(t("admin.placeUpdated"));
      } else {
        const { data } = await api.post("/places", payload);
        setPlaces((p) => [data, ...p]);
        notify(t("admin.placeAdded"));
      }
      setDraft({
        name: "",
        region: "",
        category: "Горы",
        price: "",
        rating: "4.8",
        duration: "1 день",
        difficulty: "Средне",
        image: "",
        description: "",
      });
      setEditingId(null);
      setForm(false);
    } catch (e) {
      notify(apiErrorMessage(e, t, "admin.saveFail"));
    }
  };
  const deletePlace = async (p) => {
    if (!confirm(t("admin.deletePlaceConfirm", { name: p.name }))) return;
    try {
      await api.delete(`/places/${p._id}`);
      setPlaces((x) => x.filter((y) => y._id !== p._id));
      notify(t("admin.placeDeleted"));
    } catch (e) {
      notify(t("admin.placeDeleteFail"));
    }
  };
  const editPlace = (place) => {
    setEditingId(place._id);
    setDraft({
      name: place.name,
      region: place.region,
      category: place.category,
      price: String(place.price),
      rating: String(place.rating ?? 4.8),
      duration: place.duration,
      difficulty: place.difficulty || "Средне",
      image: place.image,
      description: place.description,
    });
    setForm(true);
  };
  return (
    <main className="page admin-page">
      <div className="page-title">
        <div className="eyebrow dark">TRAVEL KG · {t("admin.title")}</div>
        <h1>
          {t("admin.title")}
        </h1>
      </div>
      <div className="admin-stats">
        <Stat value={users.length} label={t("admin.users")} />
        <Stat value={orders.length} label={t("admin.orders")} />
        <Stat
          value={orders.filter((x) => x.status === "confirmed").length}
          label={t("admin.bookings")}
        />
        <Stat value={places.length} label={t("admin.routes")} />
      </div>
      <StatsChart orders={orders} />
      <div className="admin-heading">
        <h2>{t("admin.places")}</h2>
        <button
          className="button button-dark"
          onClick={() => {
            setForm(!form);
            if (form) {
              setEditingId(null);
              setDraft({
                name: "",
                region: "",
                category: "Горы",
                price: "",
                rating: "4.8",
                duration: "1 день",
                difficulty: "Средне",
                image: "",
                description: "",
              });
            }
          }}
        >
          {form ? t("admin.close") : `＋ ${t("admin.addPlace")}`}
        </button>
      </div>
      {form && (
        <form className="admin-form" onSubmit={save}>
          {[
            ["name", t("admin.name")],
            ["region", t("admin.region")],
            ["category", t("admin.category")],
            ["price", t("admin.price")],
            ["duration", t("admin.duration")],
            ["difficulty", t("admin.difficulty")],
            ["image", t("admin.image")],
          ].map(([k, l]) => (
            <label key={k}>
              {l}
              <input
                required={!editingId && k === "image" ? true : k !== "image"}
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            </label>
          ))}
          <label className="wide">
            {t("admin.description")}
            <textarea
              required
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
          <button className="button button-dark">{editingId ? `${t("admin.saveChanges")} ↗` : `${t("admin.savePlace")} ↗`}</button>
        </form>
      )}
      <div className="admin-table">
        {places.map((p) => {
          const display = localizePlace(p, t);
          return (
            <div className="admin-row" key={p._id}>
              <TravelImage src={p.image} alt={t("image.placeAlt", { name: display.name })} />
              <b>{display.name}</b>
              <span>{display.region}</span>
              <span>{formatNumber(p.price)} {t("catalog.currency")}</span>
              <div className="admin-row-actions">
                <button onClick={() => editPlace(p)}>{t("admin.edit")}</button>
                <button onClick={() => deletePlace(p)}>{t("admin.delete")}</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="admin-heading">
        <h2>{t("admin.lastOrders")}</h2>
      </div>
      <div className="admin-table">
        {orders.map((o) => (
          <div className="admin-row" key={o._id}>
            <b>#{String(o._id).slice(-6)}</b>
            <span>{o.user?.name || o.user?.email || t("admin.userRoleUser")}</span>
            <span>{localizedStatus(o.status, t)}</span>
            <strong>{formatNumber(o.total)} {t("catalog.currency")}</strong>
          </div>
        ))}
      </div>
      <AdminManagement users={users} reload={load} />
    </main>
  );
}
function Private({ children, admin = false }) {
  const { user } = useApp();
  return user ? (
    admin && user.role !== "admin" ? (
      <NotFound />
    ) : (
      children
    )
  ) : (
    <AuthRedirect />
  );
}
function AuthRedirect() {
  const n = useNavigate();
  const { t } = useTranslation();
  useEffect(() => n("/login"), [n]);
  return (
    <div className="page">
      <p>{t("common.redirect")}</p>
    </div>
  );
}
function TravelImage({ src, alt, className, loading = "lazy" }) {
  const { t } = useTranslation();
  const imageSrc = resolveAssetUrl(src || DEFAULT_PLACE_IMAGE);
  const fallbackSrc = resolveAssetUrl(DEFAULT_PLACE_IMAGE);
  const [failedSource, setFailedSource] = useState(false);
  const [failedFallback, setFailedFallback] = useState(false);

  useEffect(() => {
    setFailedSource(false);
    setFailedFallback(false);
  }, [imageSrc]);

  if (failedFallback) {
    return (
      <span className={`image-fallback ${className || ""}`} role="img" aria-label={alt}>
        <span>TRAVEL KG<small>{t("helper.travelShort")}</small></span>
      </span>
    );
  }

  return (
    <img
      src={failedSource ? fallbackSrc : imageSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => {
        if (failedSource) setFailedFallback(true);
        else setFailedSource(true);
      }}
    />
  );
}

function PlaceCard({ place, featured = false, date = "" }) {
  const { favorites, toggleFavorite } = useApp();
  const { t } = useTranslation();
  const displayPlace = localizePlace(place, t);
  const detailsUrl = `/places/${place._id}${date ? `?date=${encodeURIComponent(date)}` : ""}`;
  return (
    <article className={`place-card ${featured ? "featured" : ""}`}>
      <Link to={detailsUrl} className="card-image">
        <TravelImage src={place.image} alt={t("image.placeAlt", { name: displayPlace.name })} />
        <span className="tag">{displayPlace.tag}</span>
      </Link>
      <button
        className={`heart ${favorites.includes(place._id) ? "selected" : ""}`}
        onClick={() => toggleFavorite(place._id)}
        aria-label={t("catalog.favoriteAdd")}
      >
        {favorites.includes(place._id) ? "♥" : "♡"}
      </button>
      <div className="card-body">
        <div className="card-meta">
          <span>⌖ {displayPlace.region}</span>
          <span>★ {place.rating}</span>
        </div>
        <Link className="card-title" to={detailsUrl}>
          {displayPlace.name}
        </Link>
        <div className="card-bottom">
          <span>◷ {displayPlace.duration}</span>
          <b>
            {t("catalog.from")} {formatNumber(place.price)} <small>{t("catalog.currency")}</small>
          </b>
        </div>
      </div>
    </article>
  );
}
function Stat({ value, label }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
function FilterField({ label, children }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Pagination({ page, pages, onChange }) {
  return pages > 1 ? (
    <div className="pagination">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>
        ←
      </button>
      {Array.from({ length: pages }, (_, i) => (
        <button
          className={page === i + 1 ? "active" : ""}
          key={i}
          onClick={() => onChange(i + 1)}
        >
          {i + 1}
        </button>
      ))}
      <button disabled={page === pages} onClick={() => onChange(page + 1)}>
        →
      </button>
    </div>
  ) : null;
}
function SkeletonGrid() {
  return (
    <div className="place-grid catalog-grid">
      {[1, 2, 3].map((x) => (
        <div className="skeleton" key={x}>
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <span>⌖</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Toast({ message }) {
  return (
    <div className="toast">
      ✓ <span>{message}</span>
    </div>
  );
}
function ChatWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false),
    [question, setQuestion] = useState(""),
    [messages, setMessages] = useState([
      {
        from: "bot",
        text: t("helper.chatGreeting"),
      },
    ]);
  const answer = () => {
    if (!question.trim()) return;
    const q = question.toLowerCase();
    const isPriceQuestion = ["цена", "стоим", "price", "cost", "baasy", "baar", "baasyk", "narx", "samttag", "taryh"].some((keyword) => q.includes(keyword));
    const isSeasonQuestion = ["сезон", "season", "when", "best time", "time", "мезгил", "узундук", "когда"].some((keyword) => q.includes(keyword));
    const isPaymentQuestion = ["оплат", "payment", "pay", "tolov", "to'lov", "tolog"].some((keyword) => q.includes(keyword));
    let a =
      isPriceQuestion
        ? t("helper.chatPrice")
        : isSeasonQuestion
          ? t("helper.chatSeason")
          : isPaymentQuestion
            ? t("helper.chatPayment")
            : t("helper.chatDefault");
    setMessages((m) => [
      ...m,
      { from: "me", text: question },
      { from: "bot", text: a },
    ]);
    setQuestion("");
  };
  return (
    <div className="chat-widget">
      <button
        className="chat-trigger"
        onClick={() => setOpen(!open)}
        aria-label="Chat with Travel KG"
      >
        {open ? "×" : "✳"}
        <span>{t("footer.chat")}</span>
      </button>
      {open && (
        <div className="chat-panel">
          <header>
            <span className="chat-avatar">t</span>
            <span>
              <b>{t("footer.chatAssistant")}</b>
              <small>{t("footer.chatOnline")}</small>
            </span>
            <button onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div className={`chat-message ${m.from}`} key={i}>
                {m.text}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              answer();
            }}
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("footer.chatPlaceholder")}
            />
            <button>{t("footer.chatSend")}</button>
          </form>
        </div>
      )}
    </div>
  );
}
function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="brand footer-brand">
          <span className="brand-mark">t</span>
          <span>
            travel<span className="brand-accent">kg</span>
            <small>{t("brand.tagline")}</small>
          </span>
        </div>
        <p>
          {t("footer.description")}
          <br />
          {t("footer.motto")}
        </p>
        <div className="footer-links">
          <Link to="/places">{t("nav.destinations")}</Link>
          <Link to="/favorites">{t("nav.favorites")}</Link>
          <Link to="/account">{t("nav.account")}</Link>
          <a href="mailto:hello@travelkg.kg">{t("footer.contact")}</a>
        </div>
        <div className="footer-social">
          {t("footer.instagram")} ↗<br />
          +996 700 123 456
        </div>
      </div>
      <div className="footer-bottom">
        <span>{t("footer.footerNote")}</span>
        <span>{t("footer.madeIn")} ⛰</span>
      </div>
    </footer>
  );
}
function FooterSpacer() {
  return null;
}
function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="page not-found">
      <div className="eyebrow dark">{t("common.notFound")}</div>
      <h1>
        {t("common.notFoundTitle")}
        <br />
        <em>{t("common.notFoundTitleAccent")}</em>
      </h1>
      <Link className="button button-dark" to="/">
        {t("common.toHome")} ↗
      </Link>
    </main>
  );
}

export default App;






















