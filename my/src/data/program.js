const fill = (text, vars) => String(text || "").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");

/** Day-by-day programme built from translated templates for the tour's category. */
export function buildProgram(place, days, t) {
  const vars = { place: place.name, region: place.region };
  const list = (key) => {
    const v = t(key, { returnObjects: true });
    return Array.isArray(v) ? v : [];
  };
  if (days <= 1) {
    return [{ title: t("program.dayLabel", { n: 1 }), steps: list("program.oneDay").map((s) => ({ ...s, title: fill(s.title, vars), text: fill(s.text, vars) })) }];
  }
  const middle = list(`program.middle.${place.categoryKey}`);
  const fallback = list("program.middle.nature");
  const days_ = [];
  for (let n = 1; n <= days; n++) {
    let item;
    if (n === 1) item = t("program.first", { returnObjects: true });
    else if (n === days) item = t("program.last", { returnObjects: true });
    else item = (middle.length ? middle : fallback)[(n - 2) % (middle.length || fallback.length || 1)];
    days_.push({ title: t("program.dayLabel", { n }), heading: fill(item?.title, vars), text: fill(item?.text, vars) });
  }
  return days_;
}
