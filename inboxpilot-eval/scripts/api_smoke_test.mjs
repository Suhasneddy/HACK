// API smoke tests. Offline tests always run. Live tests run only when creds exist.
//   Live LLM:     GEMINI_API_KEY=... [GEMINI_MODEL=gemini-2.5-flash]
//   Live Google:  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and .tokens.json {refresh_token,...}   (npm i googleapis)
import fs from "node:fs";
import { buildRawMime, toBase64Url, fromBase64Url } from "../lib/mime.mjs";
import { validateSlot } from "../lib/slots.mjs";

let pass = 0, fail = 0, skip = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log(`PASS  ${name}`); } catch (e) { fail++; console.log(`FAIL  ${name} :: ${e.message}`); } };
const sk = (name, why) => { skip++; console.log(`SKIP  ${name} (${why})`); };
const assert = (c, m) => { if (!c) throw new Error(m); };
const dataset = JSON.parse(fs.readFileSync("data/test_dataset.json", "utf8"));

// ---------- offline ----------
await t("MIME -> base64url has no + / = and round-trips", () => {
  const raw = buildRawMime({ from: "a@example.com", to: "b@example.com", subject: "Re: Old logo — launch?", body: "Hi ₹500 ✓\nLine 2", inReplyTo: "<x@mail>" });
  const enc = toBase64Url(raw);
  assert(!/[+/=]/.test(enc), "not url-safe");
  assert(fromBase64Url(enc) === raw, "round-trip mismatch");
  assert(/Subject: =\?UTF-8\?B\?/.test(raw), "non-ASCII subject not RFC2047-encoded");
  assert(raw.includes("\r\n\r\n"), "missing header/body separator");
});
await t("MIME rejects header injection", () => {
  let threw = false;
  try { buildRawMime({ from: "a@example.com", to: "b@example.com\r\nBcc: evil@x.com", subject: "s", body: "b" }); } catch { threw = true; }
  assert(threw, "CRLF in header accepted");
});
await t("Calendar: holiday slot is rejected", () => {
  const m = JSON.parse(fs.readFileSync("data/expected_results.json", "utf8")).items.e04.meeting;
  const v = validateSlot({ start: "2026-10-02T11:00:00+05:30", end: "2026-10-02T11:45:00+05:30" }, { busy: dataset.calendar, now: dataset.meta.now, ...m });
  assert(!v.ok && v.reasons.some((r) => r.startsWith("conflict:Holiday")), "holiday not caught");
});
await t("Dataset: 30 emails, unique ids, no raw PII patterns", () => {
  assert(dataset.emails.length === 30, "count != 30");
  assert(new Set(dataset.emails.map((e) => e.id)).size === 30, "duplicate ids");
  assert(!/\+91|https?:\/\//.test(JSON.stringify(dataset.emails)), "PII pattern found");
});

// ---------- live: LLM function calling (standalone, fixed sample email) ----------
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) sk("Gemini function-calling", "GEMINI_API_KEY not set");
else await t("Gemini function-calling returns valid triage JSON", async () => {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const e = dataset.emails.find((x) => x.id === "e02");
  const body = {
    contents: [{ role: "user", parts: [{ text: `Triage this email.\nFrom: ${e.from.name}\nSubject: ${e.subject}\n\n${e.body}` }] }],
    tools: [{ functionDeclarations: [{ name: "triage_email", description: "Classify an email and extract actions", parameters: { type: "OBJECT", properties: {
      category: { type: "STRING", enum: ["urgent", "meeting", "action", "fyi", "promo"] },
      urgency: { type: "STRING", enum: ["high", "medium", "low"] },
      needs_reply: { type: "BOOLEAN" },
      tasks: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, due: { type: "STRING" } }, required: ["title"] } } },
      required: ["category", "urgency", "needs_reply", "tasks"] } }] }],
    toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["triage_email"] } },
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": KEY }, body: JSON.stringify(body) });
  assert(res.ok, `HTTP ${res.status}`);
  const call = (await res.json()).candidates?.[0]?.content?.parts?.find((p) => p.functionCall)?.functionCall;
  assert(call?.name === "triage_email", "no function call");
  assert(["urgent", "meeting", "action", "fyi", "promo"].includes(call.args.category), "bad category");
  assert(Array.isArray(call.args.tasks), "tasks not array");
});

// ---------- live: Gmail + Calendar (safe: drafts not sends; temp event deleted) ----------
const { GOOGLE_CLIENT_ID: cid, GOOGLE_CLIENT_SECRET: sec } = process.env;
if (!cid || !sec || !fs.existsSync(".tokens.json")) sk("Gmail/Calendar live", "GOOGLE_* env or .tokens.json missing");
else {
  let google;
  try { ({ google } = await import("googleapis")); } catch { sk("Gmail/Calendar live", "run: npm i googleapis"); }
  if (google) {
    const auth = new google.auth.OAuth2(cid, sec);
    auth.setCredentials(JSON.parse(fs.readFileSync(".tokens.json", "utf8")));
    const gmail = google.gmail({ version: "v1", auth }), cal = google.calendar({ version: "v3", auth });
    let me;
    await t("Gmail getProfile", async () => { me = (await gmail.users.getProfile({ userId: "me" })).data; assert(me.emailAddress, "no address"); });
    await t("Gmail draft create (base64url MIME) + delete", async () => {
      const raw = toBase64Url(buildRawMime({ from: me.emailAddress, to: me.emailAddress, subject: "[InboxPilot test]", body: "smoke test" }));
      const d = await gmail.users.drafts.create({ userId: "me", requestBody: { message: { raw } } });
      assert(d.data.id, "no draft id");
      await gmail.users.drafts.delete({ userId: "me", id: d.data.id });
    });
    await t("Calendar freebusy", async () => {
      const r = await cal.freebusy.query({ requestBody: { timeMin: new Date().toISOString(), timeMax: new Date(Date.now() + 7 * 864e5).toISOString(), timeZone: "Asia/Kolkata", items: [{ id: "primary" }] } });
      assert(r.data.calendars?.primary, "no primary calendar");
    });
    await t("Calendar event insert + delete", async () => {
      const s = new Date(Date.now() + 3 * 864e5);
      const ev = await cal.events.insert({ calendarId: "primary", requestBody: { summary: "[InboxPilot test]", start: { dateTime: s.toISOString() }, end: { dateTime: new Date(+s + 15 * 60000).toISOString() } } });
      assert(ev.data.id, "no event id");
      await cal.events.delete({ calendarId: "primary", eventId: ev.data.id });
    });
  }
}
console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
process.exit(fail ? 1 : 0);
