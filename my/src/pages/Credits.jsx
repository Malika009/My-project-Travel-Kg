import { useTranslation } from "react-i18next";
import { photoCredits } from "../data/placeMedia";

export default function Credits() {
  const { t } = useTranslation();
  return (
    <main className="page credits-page">
      <header className="page-hero compact">
        <div className="eyebrow">{t("credits.eyebrow")}</div>
        <h1>{t("credits.title")}</h1>
        <p>{t("credits.text")}</p>
      </header>
      <div className="card">
        <table className="credits-table">
          <thead>
            <tr><th>{t("credits.place")}</th><th>{t("credits.author")}</th><th>{t("credits.license")}</th><th>{t("credits.source")}</th></tr>
          </thead>
          <tbody>
            {Object.entries(photoCredits).flatMap(([id, list]) =>
              list.map((c) => (
                <tr key={c.file}>
                  <td>{t(`tours.${id}.name`, { defaultValue: t("gallery.nomads") })}</td>
                  <td>{c.author || "—"}</td>
                  <td>{c.license}</td>
                  <td><a href={c.source} target="_blank" rel="noreferrer">Wikimedia Commons</a></td>
                </tr>
              )),
            )}
          </tbody>
        </table>
        <p className="muted">{t("credits.unsplash")}</p>
      </div>
    </main>
  );
}
