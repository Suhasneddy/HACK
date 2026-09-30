// Slot validation + reference slot finder (IST). Backend can reuse findSlots().
export const TZ_OFFSET_MIN = 330;
const ist = (ms) => new Date(ms + TZ_OFFSET_MIN * 60000);
export const istHour = (ms) => { const d = ist(ms); return d.getUTCHours() + d.getUTCMinutes() / 60; };
export const istDay = (ms) => ist(ms).toISOString().slice(0, 10);
export const istDow = (ms) => ist(ms).getUTCDay(); // 0=Sun
export const toISO = (ms) => ist(ms).toISOString().slice(0, 19) + "+05:30";
const overlaps = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;

export function validateSlot(slot, { busy, window, durationMin, now, dayFrom = 10, dayTo = 18 }) {
  const reasons = [];
  const s = Date.parse(slot?.start), e = Date.parse(slot?.end);
  if (Number.isNaN(s) || Number.isNaN(e)) return { ok: false, reasons: ["unparseable"] };
  const w0 = Date.parse(window.start), w1 = Date.parse(window.end);
  const from = window.hourFrom ?? dayFrom, to = window.hourTo ?? dayTo;
  if (s < Date.parse(now)) reasons.push("in_past");
  if (s < w0 || e > w1) reasons.push("outside_requested_window");
  if (Math.round((e - s) / 60000) !== durationMin) reasons.push("wrong_duration");
  if (istDay(s) !== istDay(e - 1) || istHour(s) < from || istHour(e - 1) + 1 / 60 > to) reasons.push("outside_hours");
  const dow = istDow(s);
  if (!window.allowWeekend && (dow === 0 || dow === 6)) reasons.push("weekend");
  for (const b of busy) if (overlaps(s, e, Date.parse(b.start), Date.parse(b.end))) reasons.push(`conflict:${b.title}`);
  return { ok: reasons.length === 0, reasons };
}

// Up to n valid slots, one per day first, then fill.
export function findSlots(ctx, n = 3) {
  const w0 = Math.max(Date.parse(ctx.window.start), Date.parse(ctx.now));
  const w1 = Date.parse(ctx.window.end);
  const step = 30 * 60000, dur = ctx.durationMin * 60000;
  const all = [];
  for (let t = Math.ceil(w0 / step) * step; t + dur <= w1; t += step) {
    const slot = { start: toISO(t), end: toISO(t + dur) };
    if (validateSlot(slot, ctx).ok) all.push(slot);
  }
  const days = new Set(), out = [];
  for (const s of all) { const d = s.start.slice(0, 10); if (!days.has(d) && out.length < n) { days.add(d); out.push(s); } }
  for (const s of all) {
    if (out.length >= n) break;
    if (!out.includes(s) && out.every((o) => Math.abs(Date.parse(o.start) - Date.parse(s.start)) >= 3600000)) out.push(s);
  }
  return out.sort((a, b) => Date.parse(a.start) - Date.parse(b.start)).slice(0, n);
}
