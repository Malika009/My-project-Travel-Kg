import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import PlaceCard from "../components/PlaceCard";
import { EmptyState, Pagination, SkeletonGrid } from "../components/ui";
import { useApp } from "../context/AppContext";
import { localizePlace, formatPrice } from "../data/localizePlace";
import { CATEGORY_KEYS, REGION_KEYS, DIFFICULTY_KEYS } from "../data/tourInfo";

const PER_PAGE = 9;
// Old links used Russian names (?region=Чуйская область) — keep them working.
const toKey = (value, map) => (value && map[value]) || value || "";

export default function Catalog() {
  const { places, loading } = useApp();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);

  const q = params.get("q") || "";
  const region = toKey(params.get("region"), REGION_KEYS);
  const category = toKey(params.get("category"), CATEGORY_KEYS);
  const difficulty = params.get("difficulty") || "";
  const length = params.get("length") || "";
  const rating = Number(params.get("rating") || 0);
  const sort = params.get("sort") || "popular";
  const date = params.get("date") || "";
  const page = Math.max(1, Number(params.get("page") || 1));

  const localized = useMemo(() => places.map((p) => localizePlace(p, t)), [places, t]);
  const priceCeiling = useMemo(() => Math.ceil(Math.max(1000, ...places.map((p) => Number(p.price) || 0)) / 500) * 500, [places]);
  const maxPrice = Math.min(priceCeiling, Number(params.get("maxPrice")) || priceCeiling);

  const update = (patch, keepPage = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === "" || v == null || v === 0 || (k === "maxPrice" && v >= priceCeiling) || (k === "sort" && v === "popular")) next.delete(k);
      else next.set(k, String(v));
    }
    if (!keepPage) next.delete("page");
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return localized
      .filter(
        (p) =>
          (!query || `${p.name} ${p.description} ${p.region}`.toLowerCase().includes(query)) &&
          (!region || p.regionKey === region) &&
          (!category || p.categoryKey === category) &&
          (!difficulty || p.difficultyKey === difficulty) &&
          (!length || (length === "3" ? p.days >= 3 : p.days === Number(length))) &&
          Number(p.rating) >= rating &&
          Number(p.price) <= maxPrice,
      )
      .sort((a, b) => {
        if (sort === "cheap") return a.price - b.price;
        if (sort === "expensive") return b.price - a.price;
        if (sort === "short") return a.days - b.days;
        return b.rating - a.rating || a.price - b.price;
      });
  }, [localized, q, region, category, difficulty, length, rating, maxPrice, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const items = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const activeCount = [q, region, category, difficulty, length, rating, maxPrice < priceCeiling].filter(Boolean).length;

  useEffect(() => {
    document.body.classList.toggle("no-scroll", drawer);
    return () => document.body.classList.remove("no-scroll");
  }, [drawer]);

  const reset = () => setParams(date ? { date } : {}, { replace: true });

  return (
    <main className="page catalog-page">
      <header className="page-hero">
        <div className="eyebrow">{t("catalog.eyebrow")}</div>
        <h1>
          {t("catalog.title")} <em>{t("catalog.titleAccent")}</em>
        </h1>
        <p>{t("catalog.subtitle")}</p>
        <div className="chip-row" role="group" aria-label={t("catalog.tripType")}>
          <button className={!category ? "chip active" : "chip"} onClick={() => update({ category: "" })}>
            {t("catalog.allTypes")}
          </button>
          {Object.values(CATEGORY_KEYS).map((k) => (
            <button key={k} className={category === k ? "chip active" : "chip"} onClick={() => update({ category: category === k ? "" : k })}>
              {t(`categories.${k}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="catalog-layout">
        <aside className={`filters ${drawer ? "open" : ""}`} aria-label={t("catalog.filters")}>
          <div className="filters-head">
            <h2><Icon name="filter" size={18} /> {t("catalog.filters")}</h2>
            <button type="button" className="text-button" onClick={reset} disabled={!activeCount}>
              {t("catalog.reset")}
            </button>
            <button type="button" className="icon-button drawer-close" onClick={() => setDrawer(false)} aria-label={t("common.close")}>
              <Icon name="close" />
            </button>
          </div>
          <label className="filter-field">
            <span>{t("catalog.search")}</span>
            <div className="input-icon">
              <Icon name="search" size={18} />
              <input type="search" value={q} onChange={(e) => update({ q: e.target.value })} placeholder={t("catalog.searchPlaceholder")} />
            </div>
          </label>
          <label className="filter-field">
            <span>{t("catalog.region")}</span>
            <select value={region} onChange={(e) => update({ region: e.target.value })}>
              <option value="">{t("catalog.anyRegion")}</option>
              {Object.values(REGION_KEYS).map((k) => (
                <option key={k} value={k}>{t(`regions.${k}`)}</option>
              ))}
            </select>
          </label>
          <fieldset className="filter-field">
            <legend>{t("catalog.difficulty")}</legend>
            <div className="segmented">
              <button type="button" className={!difficulty ? "active" : ""} onClick={() => update({ difficulty: "" })}>{t("catalog.any")}</button>
              {Object.values(DIFFICULTY_KEYS).map((k) => (
                <button type="button" key={k} className={difficulty === k ? "active" : ""} onClick={() => update({ difficulty: k })}>
                  {t(`difficulty.${k}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="filter-field">
            <legend>{t("catalog.length")}</legend>
            <div className="segmented">
              <button type="button" className={!length ? "active" : ""} onClick={() => update({ length: "" })}>{t("catalog.any")}</button>
              <button type="button" className={length === "1" ? "active" : ""} onClick={() => update({ length: "1" })}>{t("duration.days", { count: 1 })}</button>
              <button type="button" className={length === "2" ? "active" : ""} onClick={() => update({ length: "2" })}>{t("duration.days", { count: 2 })}</button>
              <button type="button" className={length === "3" ? "active" : ""} onClick={() => update({ length: "3" })}>{t("catalog.threePlus")}</button>
            </div>
          </fieldset>
          <label className="filter-field">
            <span>
              {t("catalog.maxPrice")}: <b>{formatPrice(maxPrice)} {t("common.currency")}</b>
            </span>
            <input
              type="range"
              min={1000}
              max={priceCeiling}
              step={500}
              value={maxPrice}
              onChange={(e) => update({ maxPrice: Number(e.target.value) })}
            />
          </label>
          <fieldset className="filter-field">
            <legend>{t("catalog.rating")}</legend>
            <div className="segmented">
              {[0, 4.8, 4.9].map((r) => (
                <button type="button" key={r} className={rating === r ? "active" : ""} onClick={() => update({ rating: r })}>
                  {r ? `${r}+ ★` : t("catalog.any")}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="button" className="button button-primary full drawer-apply" onClick={() => setDrawer(false)}>
            {t("catalog.showResults", { count: filtered.length })}
          </button>
        </aside>
        {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)} />}

        <section className="catalog-results">
          <div className="results-head">
            <span>{t("catalog.toursFound", { count: filtered.length })}</span>
            <div className="results-tools">
              <button type="button" className="button button-ghost small filters-toggle" onClick={() => setDrawer(true)}>
                <Icon name="filter" size={16} /> {t("catalog.filters")} {activeCount > 0 && <span className="badge inline">{activeCount}</span>}
              </button>
              <label className="sort-select">
                <span className="sr-only">{t("catalog.sort")}</span>
                <select value={sort} onChange={(e) => update({ sort: e.target.value }, true)}>
                  <option value="popular">{t("catalog.sortPopular")}</option>
                  <option value="cheap">{t("catalog.sortCheap")}</option>
                  <option value="expensive">{t("catalog.sortExpensive")}</option>
                  <option value="short">{t("catalog.sortShort")}</option>
                </select>
              </label>
            </div>
          </div>
          {loading && !places.length ? (
            <SkeletonGrid />
          ) : items.length ? (
            <div className="place-grid">
              {items.map((p, i) => (
                <PlaceCard place={places.find((x) => x._id === p._id)} key={p._id} date={date} eager={i < 3} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="search"
              title={t("catalog.notFound")}
              text={t("catalog.notFoundText")}
              action={<button className="button button-primary" onClick={reset}>{t("catalog.reset")}</button>}
            />
          )}
          <Pagination
            page={current}
            pages={pages}
            onChange={(n) => {
              update({ page: n > 1 ? n : "" }, true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </section>
      </div>
    </main>
  );
}
