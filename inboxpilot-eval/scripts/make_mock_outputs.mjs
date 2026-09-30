// Generates sample agent outputs to sanity-check the harness.
//   node scripts/make_mock_outputs.mjs oracle  -> results/agent_outputs.oracle.json (should score ~100%)
//   node scripts/make_mock_outputs.mjs noisy   -> results/agent_outputs.noisy.json  (realistic mistakes)
import fs from "node:fs";
import { findSlots, toISO } from "../lib/slots.mjs";

const mode = process.argv[2] || "oracle";
const dataset = JSON.parse(fs.readFileSync("data/test_dataset.json", "utf8"));
const expected = JSON.parse(fs.readFileSync("data/expected_results.json", "utf8")).items;
let seed = 42;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const cats = ["urgent", "meeting", "action", "fyi", "promo"], urgs = ["high", "medium", "low"];
const noisy = mode === "noisy";

const outputs = dataset.emails.map((em) => {
  const t = expected[em.id];
  const ctx = t.meeting ? { busy: dataset.calendar, now: dataset.meta.now, ...t.meeting } : null;
  let slots = ctx ? findSlots(ctx, 3) : [];
  let category = t.category, urgency = t.urgency, needs_reply = t.needs_reply;
  let tasks = t.tasks.map((k) => ({ title: k.title, due: k.due }));
  let draft = null, status = "approved", final_text = null, reject_reason = null, review_ms = 6000 + Math.round(rnd() * 4000);

  if (needs_reply) {
    draft = `Hi ${em.from.name.split(" ")[0]},\n\nThanks for your message. ${t.draft_must_include.join(" ")}. ` + (slots.length ? `I could do: ${slots.map((s) => s.start).join(", ")}.` : "I will get back to you shortly.") + "\n\nBest";
  }
  if (noisy) {
    if (rnd() < 0.15) category = cats[Math.floor(rnd() * cats.length)];
    if (rnd() < 0.2) urgency = urgs[Math.floor(rnd() * urgs.length)];
    if (rnd() < 0.08) needs_reply = !needs_reply;
    tasks = tasks.filter(() => rnd() > 0.2);
    if (rnd() < 0.12) tasks.push({ title: "Follow up on this email", due: null });
    if (slots.length && rnd() < 0.2) slots = [{ start: "2026-10-02T11:00:00+05:30", end: toISO(Date.parse("2026-10-02T11:00:00+05:30") + t.meeting.durationMin * 60000) }, ...slots.slice(0, 1)];
    if (needs_reply && draft && rnd() < 0.25) { final_text = "Completely rewritten reply with different words and structure entirely."; status = "edited"; }
    if (needs_reply && rnd() < 0.08) { status = "rejected"; reject_reason = "tone off"; }
    if (!t.needs_reply && needs_reply) draft = "Thanks, noted.";
    review_ms = 12000 + Math.round(rnd() * 50000);
  }
  return { email_id: em.id, category, urgency, needs_reply, draft, tasks, proposed_slots: slots, status, final_text, review_ms, reject_reason };
});
fs.mkdirSync("results", { recursive: true });
fs.writeFileSync(`results/agent_outputs.${mode}.json`, JSON.stringify({ outputs }, null, 2));
console.log(`wrote results/agent_outputs.${mode}.json (${outputs.length})`);
