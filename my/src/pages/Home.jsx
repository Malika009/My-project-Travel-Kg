import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import PlaceCard from "../components/PlaceCard";
import Lightbox from "../components/Lightbox";
import { SectionHeading, Stars, TravelImage } from "../components/ui";
import { useApp } from "../context/AppContext";
import { galleryPhotos, heroPhotos, namedPhoto } from "../data/placeMedia";
import { CATEGORY_KEYS, REGION_KEYS } from "../data/tourInfo";
import { CONTACTS } from "../data/contacts";
import { api } from "../data/services";
import { errorText } from "../data/errors";

const FEATURED = ["issyk-kul", "son-kul", "jeti-oguz", "kel-suu", "ala-archa", "sary-chelek"];
const CATEGORY_TILES = [
  ["lakes", "kel-suu"], ["mountains", "ala-archa"], ["canyons", "skazka"],
  ["history", "tash-rabat"], ["trekking", "ala-kul"], ["adventures", "horses"],
];
const ADVANTAGES = [
  ["guides", "compass"], ["groups", "users"], ["prices", "ticket"],
  ["cancel", "shield"], ["support", "phone"], ["eco", "leaf"],
];

export default function Home() {
  return (
    <main>
      <Hero />
      <SearchStrip />
      <Advantages />
      <Popular />
      <Categories />
      <About />
      <Gallery />
      <Reviews />
      <BookingBanner />
      <Faq />
      <Contacts />
    </main>
  );
}

function Hero() {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);
  const count = heroPhotos.length;

  useEffect(() => {
    if (count < 2) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % count), 6500);
    return () => clearInterval(id);
  }, [count]);

  return (
    <section className="hero">
      <div className="hero-slides" aria-hidden="true">
        {heroPhotos.map((p, i) => (
          <img
            key={p.id}
            src={p.src}
            alt=""
            className={i === slide ? "active" : ""}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
          />
        ))}
      </div>
      <div className="hero-shade" />
      <div className="hero-content">
        <div className="eyebrow light">
          <span className="eyebrow-line" /> {t("home.tagline")}
        </div>
        <h1>
          {t("home.title")} <em>{t("home.titleAccent")}</em>
        </h1>
        <p>{t("home.subtitle")}</p>
        <div className="button-row">
          <Link className="button button-primary large" to="/places">
            {t("home.ctaPrimary")} <Icon name="arrowRight" size={18} />
          </Link>
          <a className="button button-outline-light large" href="#popular">
            {t("home.ctaSecondary")}
          </a>
        </div>
        <ul className="hero-facts">
          <li><b>30+</b> {t("home.factRoutes")}</li>
          <li><b>4.9</b> {t("home.factRating")}</li>
          <li><b>7</b> {t("home.factRegions")}</li>
        </ul>
      </div>
      {count > 1 && (
        <div className="hero-dots">
          <span className="hero-place">
            <Icon name="pin" size={14} /> {t(`tours.${heroPhotos[slide].place}.name`)}
          </span>
          <div>
            {heroPhotos.map((p, i) => (
              <button
                key={p.id}
                className={i === slide ? "active" : ""}
                onClick={() => setSlide(i)}
                aria-label={`${t("home.slide")} ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SearchStrip() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [minDate] = useState(() => new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10));

  return (
    <form
      className="search-strip"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (region) params.set("region", region);
        if (category) params.set("category", category);
        if (date) params.set("date", date);
        navigate(`/places${params.size ? `?${params}` : ""}`);
      }}
    >
      <label>
        <Icon name="search" />
        <span>
          <small>{t("search.where")}</small>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search.placeholder")} />
        </span>
      </label>
      <label>
        <Icon name="pin" />
        <span>
          <small>{t("search.region")}</small>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">{t("search.allRegions")}</option>
            {Object.values(REGION_KEYS).map((k) => (
              <option key={k} value={k}>{t(`regions.${k}`)}</option>
            ))}
          </select>
        </span>
      </label>
      <label>
        <Icon name="compass" />
        <span>
          <small>{t("search.type")}</small>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t("search.anyType")}</option>
            {Object.values(CATEGORY_KEYS).map((k) => (
              <option key={k} value={k}>{t(`categories.${k}`)}</option>
            ))}
          </select>
        </span>
      </label>
      <label>
        <Icon name="calendar" />
        <span>
          <small>{t("search.when")}</small>
          <input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
        </span>
      </label>
      <button className="button button-primary">
        <Icon name="search" size={18} /> {t("search.findTour")}
      </button>
    </form>
  );
}

function Advantages() {
  const { t } = useTranslation();
  return (
    <section className="section" id="advantages">
      <SectionHeading eyebrow={t("advantages.eyebrow")} title={t("advantages.title")} accent={t("advantages.accent")} center />
      <div className="advantages-grid">
        {ADVANTAGES.map(([key, icon]) => (
          <article className="advantage" key={key}>
            <span className="advantage-icon"><Icon name={icon} size={26} /></span>
            <h3>{t(`advantages.items.${key}.title`)}</h3>
            <p>{t(`advantages.items.${key}.text`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Popular() {
  const { t } = useTranslation();
  const { places } = useApp();
  const featured = useMemo(() => {
    const picked = FEATURED.map((id) => places.find((p) => p._id === id)).filter(Boolean);
    const rest = [...places].sort((a, b) => b.rating - a.rating).filter((p) => !picked.includes(p));
    return [...picked, ...rest].slice(0, 6);
  }, [places]);

  return (
    <section className="section section-tinted" id="popular">
      <SectionHeading
        eyebrow={t("home.featured")}
        title={t("home.featuredTitle")}
        accent={t("home.featuredTitleAccent")}
        text={t("home.featuredText")}
        action={
          <Link className="text-link" to="/places">
            {t("home.allDirections")} <Icon name="arrowRight" size={18} />
          </Link>
        }
      />
      <div className="place-grid">
        {featured.map((p) => (
          <PlaceCard key={p._id} place={p} />
        ))}
      </div>
    </section>
  );
}

function Categories() {
  const { t } = useTranslation();
  const { places } = useApp();
  return (
    <section className="section" id="categories">
      <SectionHeading eyebrow={t("home.categoriesEyebrow")} title={t("home.categoriesTitle")} accent={t("home.categoriesAccent")} />
      <div className="category-grid">
        {CATEGORY_TILES.map(([key, photoId]) => {
          const photo = namedPhoto(photoId);
          const count = places.filter((p) => CATEGORY_KEYS[p.category] === key).length;
          return (
            <Link className="category-tile" key={key} to={`/places?category=${key}`}>
              <TravelImage src={photo?.src} small={photo?.small} alt={t(`categories.${key}`)} sizes="(max-width: 720px) 50vw, 33vw" />
              <span>
                <b>{t(`categories.${key}`)}</b>
                <small>{t("catalog.toursCount", { count })}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function About() {
  const { t } = useTranslation();
  const { places } = useApp();
  const a = namedPhoto("son-kul", 1);
  const b = namedPhoto("tash-rabat");
  const c = namedPhoto("altyn-arashan");
  return (
    <section className="section about" id="about">
      <div className="about-collage">
        <TravelImage src={a?.src} small={a?.small} alt={t("tours.son-kul.name")} className="about-main" />
        <TravelImage src={b?.src} small={b?.small} alt={t("tours.tash-rabat.name")} className="about-side" />
        <TravelImage src={c?.src} small={c?.small} alt={t("tours.altyn-arashan.name")} className="about-small" />
        <div className="about-stamp">
          <b>10</b>
          <span>{t("about.years")}</span>
        </div>
      </div>
      <div className="about-copy">
        <div className="eyebrow">{t("about.eyebrow")}</div>
        <h2>
          {t("about.title")} <em>{t("about.accent")}</em>
        </h2>
        <p className="lead">{t("about.lead")}</p>
        <p>{t("about.text")}</p>
        <ul className="check-list">
          {["one", "two", "three"].map((k) => (
            <li key={k}><Icon name="check" size={18} /> {t(`about.points.${k}`)}</li>
          ))}
        </ul>
        <div className="stats">
          <div className="stat"><b>{places.length}+</b><span>{t("stats.routes")}</span></div>
          <div className="stat"><b>4.9</b><span>{t("stats.rating")}</span></div>
          <div className="stat"><b>2 400+</b><span>{t("stats.guests")}</span></div>
        </div>
        <Link className="button button-primary" to="/places">
          {t("about.button")} <Icon name="arrowRight" size={18} />
        </Link>
      </div>
    </section>
  );
}

function Gallery() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(null);
  const photos = galleryPhotos.map((p) => ({ ...p, caption: t(`tours.${p.place}.name`, { defaultValue: t("gallery.nomads") }), alt: t(`tours.${p.place}.name`, { defaultValue: t("gallery.nomads") }) }));
  return (
    <section className="section section-dark" id="gallery">
      <SectionHeading eyebrow={t("gallery.eyebrow")} title={t("gallery.title")} accent={t("gallery.accent")} text={t("gallery.text")} />
      <div className="gallery-grid">
        {photos.map((p, i) => (
          <button key={p.id} className={`gallery-item g${i}`} onClick={() => setOpen(i)} aria-label={`${t("gallery.open")}: ${p.caption}`}>
            <TravelImage src={p.small || p.src} alt={p.alt} />
            <span><Icon name="camera" size={16} /> {p.caption}</span>
          </button>
        ))}
      </div>
      {open != null && <Lightbox photos={photos} index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Reviews() {
  const { t } = useTranslation();
  const items = t("reviews.items", { returnObjects: true });
  const list = Array.isArray(items) ? items : [];
  const [index, setIndex] = useState(0);
  const current = list[index] || list[0];
  const average = list.length ? (list.reduce((s, r) => s + Number(r.rating), 0) / list.length).toFixed(1) : "5.0";
  if (!current) return null;

  return (
    <section className="section reviews-section" id="reviews">
      <SectionHeading eyebrow={t("reviews.eyebrow")} title={t("reviews.title")} accent={t("reviews.accent")} />
      <div className="reviews-layout">
        <div className="review-feature">
          <Icon name="message" size={34} className="quote-icon" />
          <blockquote key={index}>{current.text}</blockquote>
          <div className="review-person">
            <span className="avatar" style={{ "--hue": (index * 47) % 360 }}>{current.name.slice(0, 1)}</span>
            <span>
              <b>{current.name}</b>
              <small>{current.meta}</small>
            </span>
            <Stars value={current.rating} size={16} />
          </div>
          <div className="review-controls">
            <button onClick={() => setIndex((index - 1 + list.length) % list.length)} aria-label={t("reviews.prev")}>
              <Icon name="arrowLeft" size={18} />
            </button>
            <span>{String(index + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}</span>
            <button onClick={() => setIndex((index + 1) % list.length)} aria-label={t("reviews.next")}>
              <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </div>
        <aside className="review-summary">
          <b>{average}</b>
          <Stars value={Number(average)} size={20} />
          <p>{t("reviews.summary", { count: list.length })}</p>
          <ul>
            {[5, 4].map((star) => {
              const n = list.filter((r) => Number(r.rating) === star).length;
              return (
                <li key={star}>
                  <span>{star} <Icon name="star" size={12} fill="currentColor" /></span>
                  <i><em style={{ width: `${(n / list.length) * 100}%` }} /></i>
                  <span>{n}</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
      <div className="review-grid">
        {list.map((r, i) => (
          <article className={`review-card ${i === index ? "active" : ""}`} key={r.name} onClick={() => setIndex(i)}>
            <Stars value={r.rating} />
            <p>{r.text}</p>
            <div className="review-person small">
              <span className="avatar" style={{ "--hue": (i * 47) % 360 }}>{r.name.slice(0, 1)}</span>
              <span>
                <b>{r.name}</b>
                <small>{r.meta}</small>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BookingBanner() {
  const { t } = useTranslation();
  const photo = namedPhoto("ala-kul");
  return (
    <section className="booking-banner">
      <TravelImage src={photo?.src} small={photo?.small} alt="" sizes="100vw" />
      <div className="booking-banner-shade" />
      <div className="booking-banner-content">
        <div className="eyebrow light">{t("home.travelNext")}</div>
        <h2>
          {t("home.travelNextTitle")} <em>{t("home.travelNextTitleAccent")}</em>
        </h2>
        <p>{t("home.travelNextText")}</p>
        <div className="button-row">
          <Link className="button button-primary large" to="/places">
            <Icon name="calendar" size={18} /> {t("home.travelNextButton")}
          </Link>
          <a className="button button-outline-light large" href="#contacts">
            {t("home.askQuestion")}
          </a>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useTranslation();
  const items = t("faq.items", { returnObjects: true });
  return (
    <section className="section faq" id="faq">
      <SectionHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")} accent={t("faq.accent")} />
      <div className="faq-list">
        {(Array.isArray(items) ? items : []).map((item, i) => (
          <details key={i} open={i === 0}>
            <summary>
              {item.q}
              <Icon name="chevronDown" size={20} />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Contacts() {
  const { t } = useTranslation();
  const { notify, user } = useApp();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setSending(true);
    try {
      await api.post("/messages", data);
      setSent(true);
      form.reset();
      notify(t("contacts.sent"));
    } catch (err) {
      notify(errorText(err, t, "contacts.sendFail"), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="section contacts" id="contacts">
      <SectionHeading eyebrow={t("contacts.eyebrow")} title={t("contacts.title")} accent={t("contacts.accent")} text={t("contacts.text")} />
      <div className="contacts-layout">
        <div className="contact-cards">
          <a className="contact-card" href={`tel:${CONTACTS.phoneLink}`}>
            <Icon name="phone" /><span><small>{t("contacts.phone")}</small><b>{CONTACTS.phone}</b></span>
          </a>
          <a className="contact-card" href={CONTACTS.whatsapp} target="_blank" rel="noreferrer">
            <Icon name="message" /><span><small>WhatsApp</small><b>{CONTACTS.phone}</b></span>
          </a>
          <a className="contact-card" href={`mailto:${CONTACTS.email}`}>
            <Icon name="mail" /><span><small>Email</small><b>{CONTACTS.email}</b></span>
          </a>
          <div className="contact-card">
            <Icon name="clock" /><span><small>{t("contacts.hours")}</small><b>{t("contacts.hoursValue")}</b></span>
          </div>
          <a className="contact-card wide" href={CONTACTS.mapLink} target="_blank" rel="noreferrer">
            <Icon name="pin" /><span><small>{t("contacts.address")}</small><b>{t("contacts.addressValue")}</b></span>
          </a>
          <iframe className="contact-map" title={t("contacts.map")} src={CONTACTS.mapEmbed} loading="lazy" />
        </div>
        <form className="contact-form card" onSubmit={submit}>
          <h3>{t("contacts.formTitle")}</h3>
          {sent && (
            <p className="form-success" role="status">
              <Icon name="check" size={18} /> {t("contacts.sentLong")}
            </p>
          )}
          <label>
            {t("form.name")}
            <input name="name" required minLength={2} maxLength={80} defaultValue={user?.name || ""} autoComplete="name" />
          </label>
          <label>
            {t("form.contact")}
            <input name="contact" required minLength={5} maxLength={120} defaultValue={user?.email || ""} placeholder={t("form.contactPlaceholder")} />
          </label>
          <label>
            {t("form.message")}
            <textarea name="message" required minLength={10} maxLength={1500} placeholder={t("form.messagePlaceholder")} />
          </label>
          <button className="button button-primary full" disabled={sending}>
            {sending ? t("common.sending") : t("contacts.send")} <Icon name="send" size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}
