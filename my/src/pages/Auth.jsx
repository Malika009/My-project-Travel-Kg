import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import { TravelImage } from "../components/ui";
import { useApp } from "../context/AppContext";
import { namedPhoto } from "../data/placeMedia";
import { api } from "../data/services";
import { errorText } from "../data/errors";

export default function AuthPage({ mode }) {
  const { login, notify } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const register = mode === "register";
  const [sending, setSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const photo = namedPhoto(register ? "son-kul" : "kel-suu", register ? 2 : 1);
  const after = location.state?.from || "/account";

  const socialLogin = async (provider) => {
    const name = provider === "google" ? "Google" : "GitHub";
    try {
      const { data } = await api.get(`/auth/oauth/${provider}`);
      if (!data.configured || !data.authUrl) {
        notify(t("auth.oauthNotConfigured", { provider: name }), "info");
        return;
      }
      // Random state protects against forged sign-in links; checked on return in OAuthCallback.
      const state = crypto.getRandomValues(new Uint32Array(4)).join("-");
      sessionStorage.setItem("oauth-state", state);
      sessionStorage.setItem("oauth-from", after);
      notify(t("auth.oauthRedirect", { provider: name }), "info");
      window.location.href = `${data.authUrl}&state=${encodeURIComponent(state)}`;
    } catch (err) {
      notify(err.response?.status === 400 ? t("auth.oauthNotConfigured", { provider: name }) : errorText(err, t, "auth.oauthUnavailable"), "info");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    setSending(true);
    try {
      const { data } = await api.post(`/auth/${register ? "register" : "login"}`, body);
      login(data.token, data.user);
      notify(register ? t("auth.welcome") : t("auth.loginSuccess"));
      navigate(after, { replace: true });
    } catch (err) {
      notify(errorText(err, t, "auth.loginFailure"), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-image">
        <TravelImage src={photo?.src} small={photo?.small} alt="" loading="eager" sizes="50vw" />
        <div className="auth-image-copy">
          <div className="eyebrow light">{t("auth.heroEyebrow")}</div>
          <h2>{t("auth.heroTitle")} <em>{t("auth.heroTitleAccent")}</em></h2>
          <ul>
            <li><Icon name="heart" size={18} /> {t("auth.perk1")}</li>
            <li><Icon name="calendar" size={18} /> {t("auth.perk2")}</li>
            <li><Icon name="star" size={18} /> {t("auth.perk3")}</li>
          </ul>
        </div>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <div className="eyebrow">Travel KG</div>
        <h1>{register ? t("auth.titleRegister") : t("auth.titleLogin")}</h1>
        <p className="muted">{register ? t("auth.subtitleRegister") : t("auth.subtitleLogin")}</p>
        {register && (
          <label className="field">
            <span>{t("form.name")}</span>
            <input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder={t("auth.namePlaceholder")} />
          </label>
        )}
        <label className="field">
          <span>{t("form.email")}</span>
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </label>
        <label className="field">
          <span>{t("form.password")}</span>
          <span className="password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete={register ? "new-password" : "current-password"}
              placeholder={t("auth.passwordPlaceholder")}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? t("auth.hide") : t("auth.show")}
            </button>
          </span>
        </label>
        <button className="button button-primary full large" disabled={sending}>
          {sending ? t("common.sending") : register ? t("auth.registerButton") : t("auth.loginButton")}
        </button>
        <div className="auth-divider"><span>{t("auth.divider")}</span></div>
        <div className="social-auth">
          <button type="button" className="button button-ghost full" onClick={() => socialLogin("google")}>Google</button>
          <button type="button" className="button button-ghost full" onClick={() => socialLogin("github")}>GitHub</button>
        </div>
        <p className="auth-switch">
          {register ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
          <Link to={register ? "/login" : "/register"} state={location.state}>
            {register ? t("auth.switchLogin") : t("auth.switchRegister")}
          </Link>
        </p>
      </form>
    </main>
  );
}

export function OAuthCallback() {
  const { provider } = useParams();
  const navigate = useNavigate();
  const { login, notify } = useApp();
  const { t } = useTranslation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice; the code can be used only once
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const expected = sessionStorage.getItem("oauth-state");
    const from = sessionStorage.getItem("oauth-from") || "/account";
    sessionStorage.removeItem("oauth-state");
    sessionStorage.removeItem("oauth-from");
    if (params.get("error") || !code || !expected || params.get("state") !== expected) {
      // No code → nothing came back; a code with an error or a wrong state → the sign-in was rejected.
      notify(code || params.get("error") ? t("auth.oauthRejected") : t("auth.oauthMissingCode"), "error");
      navigate("/login", { replace: true });
      return;
    }
    api
      .get(`/auth/oauth/${provider}/callback`, { params: { code } })
      .then(({ data }) => {
        login(data.token, data.user);
        notify(t("auth.oauthSuccess"));
        navigate(from, { replace: true });
      })
      .catch((err) => {
        notify(errorText(err, t, "auth.oauthFailure"), "error");
        navigate("/login", { replace: true });
      });
  }, [provider, navigate, notify, login, t]);

  return (
    <main className="page page-loader">
      <span className="spinner" />
      <p>{t("auth.oauthConnecting")}</p>
    </main>
  );
}
