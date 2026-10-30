import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import { TravelImage } from "./ui";
import { useApp } from "../context/AppContext";
import { localizePlace, formatPrice } from "../data/localizePlace";
import { coverPhoto } from "../data/placeMedia";

export default function PlaceCard({ place, date = "", eager = false }) {
  const { favorites, toggleFavorite, addCart } = useApp();
  const { t } = useTranslation();
  const p = localizePlace(place, t);
  const photo = coverPhoto(place);
  const liked = favorites.includes(p._id);
  const detailsUrl = `/places/${p._id}${date ? `?date=${encodeURIComponent(date)}` : ""}`;

  return (
    <article className="place-card">
      <div className="card-media">
        <Link to={detailsUrl} className="card-image" tabIndex={-1} aria-hidden="true">
          <TravelImage
            src={photo?.src}
            small={photo?.small}
            alt={p.name}
            loading={eager ? "eager" : "lazy"}
            sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 420px"
          />
        </Link>
        <span className="tag">{p.tag}</span>
        <button
          type="button"
          className={`heart ${liked ? "selected" : ""}`}
          onClick={() => toggleFavorite(p._id)}
          aria-label={liked ? t("catalog.favoriteRemove") : t("catalog.favoriteAdd")}
          aria-pressed={liked}
        >
          <Icon name="heart" size={20} fill={liked ? "currentColor" : "none"} />
        </button>
        <span className="card-rating">
          <Icon name="star" size={14} fill="currentColor" /> {Number(p.rating).toFixed(1)}
        </span>
      </div>
      <div className="card-body">
        <div className="card-meta">
          <span><Icon name="pin" size={15} /> {p.region}</span>
        </div>
        <h3 className="card-title">
          <Link to={detailsUrl}>{p.name}</Link>
        </h3>
        <p className="card-text">{p.description}</p>
        <div className="card-chips">
          <span><Icon name="clock" size={15} /> {p.duration}</span>
          <span className={`difficulty ${p.difficultyKey}`}><Icon name="mountain" size={15} /> {p.difficulty}</span>
        </div>
        <div className="card-bottom">
          <div className="card-price">
            <small>{t("catalog.from")}</small>
            <b>{formatPrice(p.price)} {t("common.currency")}</b>
            <small>/ {t("catalog.perPerson")}</small>
          </div>
        </div>
        <div className="card-actions">
          <Link className="button button-ghost small" to={detailsUrl}>
            {t("catalog.details")}
          </Link>
          <button type="button" className="button button-primary small" onClick={() => addCart(place, { date })}>
            <Icon name="bag" size={16} /> {t("catalog.addToCart")}
          </button>
        </div>
      </div>
    </article>
  );
}
