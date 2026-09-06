// Returns { open: boolean, label: string } given lojista schedule fields
// Uses São Paulo timezone by default so it works for any client browser.
export function computeOpenStatus(lojista, tz = "America/Sao_Paulo") {
  const days = lojista?.open_days;
  const start = lojista?.open_start;
  const end = lojista?.open_end;
  if (!Array.isArray(days) || days.length === 0 || !start || !end) {
    return { open: null, label: null };
  }
  const now = new Date();
  // Extract weekday + HH:MM in the target tz
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const wdMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const wd = wdMap[parts.find((p) => p.type === "weekday")?.value];
  const hh = parts.find((p) => p.type === "hour")?.value || "00";
  const mm = parts.find((p) => p.type === "minute")?.value || "00";
  const cur = `${hh}:${mm}`;
  const isOpenDay = days.includes(wd);
  const inWindow = cur >= start && cur <= end;
  const open = isOpenDay && inWindow;
  return {
    open,
    label: open ? "Aberto agora" : "Fechado",
  };
}

export const WEEKDAYS = [
  { v: 0, l: "Dom" }, { v: 1, l: "Seg" }, { v: 2, l: "Ter" },
  { v: 3, l: "Qua" }, { v: 4, l: "Qui" }, { v: 5, l: "Sex" }, { v: 6, l: "Sáb" },
];
