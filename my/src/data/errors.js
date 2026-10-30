// Turns an API error into a message in the current language.
// The server sends a stable `code`; its Russian `message` is never shown directly.
export function errorText(err, t, fallbackKey = "errors.generic") {
  const code = err?.response?.data?.code;
  if (code) return t(`errors.${code}`, { defaultValue: t(fallbackKey) });
  if (!err?.response) return t("errors.network");
  if (err.response.status === 401) return t("errors.UNAUTHORIZED");
  if (err.response.status === 403) return t("errors.FORBIDDEN");
  return t(fallbackKey);
}
