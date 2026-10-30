import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import PlaceCard from "../components/PlaceCard";
import { EmptyState } from "../components/ui";
import { useApp } from "../context/AppContext";
import { formatPrice } from "../data/localizePlace";

export default function Favorites() {
  const { places, favorites, clearFavorites, addCart, notify } = useApp();
  const { t } = useTranslation();
  const items = favorites.map((id) => places.find((p) => p._id === id)).filter(Boolean);
  const cheapest = items.length ? Math.min(...items.map((p) => Number(p.price))) : 0;

  const addAll = () => {
    items.forEach((p) => addCart(p, { silent: true }));
    notify(t("favorites.allAdded", { count: items.length }));
  };

  return (
    <main className="page">
      <header className="page-hero compact">
        <div className="eyebrow">{t("favorites.eyebrow")}</div>
        <h1>
          {t("favorites.title")} <em>{t("favorites.accent")}</em>
        </h1>
        <p>{t("favorites.text")}</p>
      </header>
      {items.length ? (
        <>
          <div className="summary-bar">
            <div className="summary-stats">
              <span><Icon name="heart" size={18} fill="currentColor" /> <b>{t("favorites.count", { count: items.length })}</b></span>
              <span><Icon name="ticket" size={18} /> {t("favorites.fromPrice", { price: formatPrice(cheapest) })} {t("common.currency")}</span>
            </div>
            <div className="button-row">
              <button className="button button-ghost small" onClick={() => window.confirm(t("favorites.clearConfirm")) && clearFavorites()}>
                <Icon name="trash" size={16} /> {t("favorites.clear")}
              </button>
              <button className="button button-primary small" onClick={addAll}>
                <Icon name="bag" size={16} /> {t("favorites.addAll")}
              </button>
            </div>
          </div>
          <div className="place-grid">
            {items.map((p) => (
              <PlaceCard key={p._id} place={p} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon="heart"
          title={t("favorites.emptyTitle")}
          text={t("favorites.emptyText")}
          action={
            <Link className="button button-primary" to="/places">
              <Icon name="compass" size={18} /> {t("favorites.emptyAction")}
            </Link>
          }
        />
      )}
    </main>
  );
}
