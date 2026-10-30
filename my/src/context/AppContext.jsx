import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { normalizeLanguage } from "../i18n.js";
import { api, getToken, setToken } from "../data/services";
import placesFallback from "../data/placesFallback.json";
import { MAX_GUESTS } from "../data/tourInfo";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const readJson = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage can be unavailable (private mode) — the app keeps working in memory */
  }
};

const makeKey = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const clampGuests = (n) => Math.min(MAX_GUESTS, Math.max(1, Math.round(Number(n) || 1)));

// Accepts both the current cart format and the older one ({...place, qty, date, key}).
const normalizeCart = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((item) => ({
      key: item.key || makeKey(),
      placeId: item.placeId || item._id,
      date: typeof item.date === "string" ? item.date : "",
      guests: clampGuests(item.guests ?? item.qty),
      days: Number(item.days) || 0,
    }))
    .filter((item) => item.placeId);

const initialTheme = () => {
  const saved = (() => {
    try {
      return localStorage.getItem("travel-theme");
    } catch {
      return null;
    }
  })();
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export function AppProvider({ children }) {
  const { t } = useTranslation();
  const [places, setPlaces] = useState(placesFallback);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);
  const [user, setUserState] = useState(() => (getToken() ? readJson("travel-user", null) : null));
  const [favorites, setFavorites] = useState(() => {
    const list = readJson("travel-favorites", []);
    return Array.isArray(list) ? [...new Set(list.filter((x) => typeof x === "string"))] : [];
  });
  const [cart, setCartState] = useState(() => normalizeCart(readJson("travel-cart", [])));
  const [theme, setTheme] = useState(initialTheme);
  const [lang, setLangState] = useState(() => normalizeLanguage(i18n.language));
  const [toast, setToast] = useState(null);
  const [booked, setBooked] = useState({});
  // true after the visitor signs out themselves — protected pages then send them home, not to the login form.
  const [loggedOut, setLoggedOut] = useState(false);
  const toastTimer = useRef(null);

  // Tours from the API; the bundled list stays if the API is unreachable.
  useEffect(() => {
    api
      .get("/places")
      .then((r) => {
        if (Array.isArray(r.data) && r.data.length) setPlaces(r.data);
        setApiOnline(true);
      })
      .catch(() => setApiOnline(false))
      .finally(() => setLoading(false));
  }, []);

  // Refresh the saved session so a changed role or a deleted account is noticed.
  useEffect(() => {
    if (!getToken()) return;
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUserState(data.user);
        writeJson("travel-user", data.user);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          setToken("");
          writeJson("travel-user", null);
          setUserState(null);
        }
      });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeJson("travel-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t("meta.title");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.description"));
  }, [lang, t]);

  const setLang = useCallback((value) => {
    const next = normalizeLanguage(value);
    try {
      localStorage.setItem("travel-lang", next);
    } catch {
      /* ignore */
    }
    i18n.changeLanguage(next);
    setLangState(next);
  }, []);

  const notify = useCallback((message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  const setUser = useCallback((next) => {
    setUserState(next);
    writeJson("travel-user", next);
  }, []);

  const login = useCallback(
    (token, nextUser) => {
      setToken(token);
      setUser(nextUser);
      setLoggedOut(false);
    },
    [setUser],
  );

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
    setLoggedOut(true);
  }, [setUser]);

  const toggleFavorite = useCallback(
    (id) => {
      const exists = favorites.includes(id);
      const next = exists ? favorites.filter((x) => x !== id) : [...favorites, id];
      setFavorites(next);
      writeJson("travel-favorites", next);
      notify(exists ? t("toast.favoriteRemoved") : t("toast.favoriteAdded"), exists ? "info" : "success");
    },
    [favorites, notify, t],
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    writeJson("travel-favorites", []);
  }, []);

  const setCart = useCallback((updater) => {
    setCartState((current) => {
      const next = normalizeCart(typeof updater === "function" ? updater(current) : updater);
      writeJson("travel-cart", next);
      return next;
    });
  }, []);

  const addCart = useCallback(
    (place, { guests = 1, date = "", days = 0, silent = false } = {}) => {
      setCart((items) => {
        const same = items.findIndex((i) => i.placeId === place._id && i.date === date && (i.days || 0) === (days || 0));
        if (same >= 0) {
          return items.map((i, idx) => (idx === same ? { ...i, guests: clampGuests(i.guests + guests) } : i));
        }
        return [...items, { key: makeKey(), placeId: place._id, date, guests: clampGuests(guests), days }];
      });
      if (!silent) notify(t("toast.addedToCart"));
    },
    [notify, setCart, t],
  );

  const updateCartItem = useCallback(
    (key, patch) => setCart((items) => items.map((i) => (i.key === key ? { ...i, ...patch } : i))),
    [setCart],
  );
  const removeCartItem = useCallback((key) => setCart((items) => items.filter((i) => i.key !== key)), [setCart]);
  const clearCart = useCallback(() => setCart([]), [setCart]);

  // Seats already booked through our own site (per tour and date).
  const loadBooked = useCallback((placeId) => {
    api
      .get(`/availability/${encodeURIComponent(placeId)}`)
      .then(({ data }) => setBooked((b) => ({ ...b, [placeId]: data?.booked || {} })))
      .catch(() => {});
  }, []);

  const placeById = useMemo(() => Object.fromEntries(places.map((p) => [p._id, p])), [places]);

  const value = useMemo(
    () => ({
      places, setPlaces, placeById, loading, apiOnline,
      user, setUser, login, logout, loggedOut,
      favorites, toggleFavorite, clearFavorites,
      cart, setCart, addCart, updateCartItem, removeCartItem, clearCart,
      theme, setTheme, lang, setLang,
      toast, notify, closeToast,
      booked, loadBooked,
    }),
    [places, placeById, loading, apiOnline, user, setUser, login, logout, loggedOut, favorites, toggleFavorite, clearFavorites,
      cart, setCart, addCart, updateCartItem, removeCartItem, clearCart, theme, lang, setLang, toast, notify, closeToast,
      booked, loadBooked],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
