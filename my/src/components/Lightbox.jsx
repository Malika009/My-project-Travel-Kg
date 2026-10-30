import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";

/** Full-screen photo viewer. photos: [{ src, alt }]. Arrow keys / Esc / swipe. */
export default function Lightbox({ photos, index, onChange, onClose }) {
  const { t } = useTranslation();
  const count = photos.length;
  const touchX = useRef(null);
  const go = (step) => onChange((index + step + count) % count);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onChange((index + 1) % count);
      if (e.key === "ArrowLeft") onChange((index - 1 + count) % count);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [index, count, onChange, onClose]);

  if (index == null || !photos[index]) return null;
  const photo = photos[index];

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={t("gallery.viewer")}
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <button className="lightbox-close" onClick={onClose} aria-label={t("common.close")}>
        <Icon name="close" size={26} />
      </button>
      {count > 1 && (
        <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label={t("common.previous")}>
          <Icon name="chevronLeft" size={30} />
        </button>
      )}
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={photo.src} alt={photo.alt || ""} />
        {(photo.caption || count > 1) && (
          <figcaption>
            <span>{photo.caption}</span>
            <span>{index + 1} / {count}</span>
          </figcaption>
        )}
      </figure>
      {count > 1 && (
        <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label={t("common.next")}>
          <Icon name="chevronRight" size={30} />
        </button>
      )}
    </div>
  );
}
