import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import { Brand } from "./Header";
import { CONTACTS } from "../data/contacts";

const POPULAR = ["issyk-kul", "son-kul", "ala-archa", "jeti-oguz", "kel-suu", "sary-chelek"];

export default function Footer() {
  const { t } = useTranslation();
  const year = 2026;
  return (
    <footer className="footer">
      <div className="footer-cta">
        <div>
          <h2>{t("footer.ctaTitle")} <em>{t("footer.ctaAccent")}</em></h2>
          <p>{t("footer.ctaText")}</p>
        </div>
        <div className="button-row">
          <Link className="button button-light" to="/places">
            {t("footer.ctaButton")} <Icon name="arrowRight" size={18} />
          </Link>
          <a className="button button-outline-light" href={`tel:${CONTACTS.phoneLink}`}>
            <Icon name="phone" size={18} /> {CONTACTS.phone}
          </a>
        </div>
      </div>
      <div className="footer-main">
        <div className="footer-about">
          <Brand />
          <p>{t("footer.description")}</p>
          <div className="socials">
            <a href={CONTACTS.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="instagram" /></a>
            <a href={CONTACTS.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp"><Icon name="message" /></a>
            <a href={`mailto:${CONTACTS.email}`} aria-label="Email"><Icon name="mail" /></a>
            <a href={`tel:${CONTACTS.phoneLink}`} aria-label={t("contacts.phone")}><Icon name="phone" /></a>
          </div>
        </div>
        <div>
          <h3>{t("footer.navigation")}</h3>
          <ul>
            <li><Link to="/places">{t("nav.destinations")}</Link></li>
            <li><Link to="/#about">{t("nav.about")}</Link></li>
            <li><Link to="/#gallery">{t("nav.gallery")}</Link></li>
            <li><Link to="/favorites">{t("nav.favorites")}</Link></li>
            <li><Link to="/cart">{t("nav.cart")}</Link></li>
            <li><Link to="/account">{t("nav.account")}</Link></li>
          </ul>
        </div>
        <div>
          <h3>{t("footer.popular")}</h3>
          <ul>
            {POPULAR.map((id) => (
              <li key={id}><Link to={`/places/${id}`}>{t(`tours.${id}.name`)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3>{t("footer.contacts")}</h3>
          <ul className="footer-contacts">
            <li><Icon name="pin" size={18} /> {t("contacts.addressValue")}</li>
            <li><Icon name="phone" size={18} /> <a href={`tel:${CONTACTS.phoneLink}`}>{CONTACTS.phone}</a></li>
            <li><Icon name="mail" size={18} /> <a href={`mailto:${CONTACTS.email}`}>{CONTACTS.email}</a></li>
            <li><Icon name="clock" size={18} /> {t("contacts.hoursValue")}</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {year} Travel KG. {t("footer.rights")}</span>
        <Link to="/credits">{t("footer.photoCredits")}</Link>
        <span>{t("footer.madeIn")}</span>
      </div>
    </footer>
  );
}
