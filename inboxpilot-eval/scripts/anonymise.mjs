// Step 2: anonymise raw emails -> data/test_dataset.json (+ private mapping) + leak audit
import fs from "node:fs";

const raw = JSON.parse(fs.readFileSync("data/raw_emails.json", "utf8"));
const EXTRA_NAMES = fs.existsSync("data/extra_names.txt")
  ? fs.readFileSync("data/extra_names.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean) : [];
const ORG_LOCALS = /^(team|library|accounts|alerts|billing|registrar|notifications|calendar-notification|deals|newsletter|offers|hello|noreply|no-reply|support|info)$/i;
const FIRST = ["Sam", "Riley", "Jordan", "Taylor", "Casey", "Morgan", "Jamie", "Avery", "Quinn", "Drew", "Parker", "Reese", "Skyler", "Rowan", "Emerson", "Harper"];
const LAST = ["Carter", "Bennett", "Hayes", "Foster", "Ellis", "Brooks", "Reed", "Sullivan", "Warren", "Fisher", "Holland", "Prescott", "Whitaker", "Norris", "Lawson", "Dalton"];
const TITLES = /^(dr|prof|mr|mrs|ms)\.?$/i;

// 1. person registry (org senders are kept as-is: fictional orgs, not personal data)
const people = new Map(); // email -> {name, orig}
const addPerson = (name, email) => { if (!people.has(email)) people.set(email, { name, email }); };
addPerson(raw.meta.owner.name, raw.meta.owner.email);
for (const e of raw.emails) {
  const local = e.from.email.split("@")[0];
  if (!ORG_LOCALS.test(local) && !/^(github|google)$/i.test(e.from.name)) addPerson(e.from.name, e.from.email);
}
const list = [...people.values()];
list.forEach((p, i) => {
  const [f, l] = p.name.split(/\s+/).filter((w) => !TITLES.test(w));
  const sf = FIRST[i % FIRST.length], sl = LAST[(i * 5 + 3) % LAST.length];
  Object.assign(p, { first: f, last: l, sFirst: sf, sLast: sl, sName: `${sf} ${sl}`, sEmail: `${sf}.${sl}@example.com`.toLowerCase() });
});
list.forEach((p, i) => list.forEach((q, j) => { if (i !== j && p.last === q.last) p.lastShared = true; }));

// 2. replacement rules, ordered
const rules = [];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const p of list) {
  rules.push([new RegExp(esc(p.email), "gi"), p.sEmail]);
}
rules.push([/https?:\/\/[^\s)>\]]+/g, "[URL]"]);
rules.push([/\+91[\s-]?\d{5}[\s-]?\d{5}/g, "[PHONE]"]);
rules.push([/\b1800[\s-]?\d{3}[\s-]?\d{4}\b/g, "[PHONE]"]);
rules.push([/\b\d{10}\b/g, "[PHONE]"]);
rules.push([/\b\d[A-Z]{2}\d{2}[A-Z]{2}\d{3}\b/g, "[STUDENT_ID]"]);
rules.push([/\b[A-Z]{2,4}-\d{4,}\b/g, "[REF_ID]"]);
rules.push([/(card ending\s*)\d{4}/gi, "$1XXXX"]);
rules.push([/flat \d+,[^.\n]*?\b\d{6}\b/gi, "[ADDRESS]"]);
for (const p of list) {
  for (const sep of [" ", ".", "-", "_"])
    rules.push([new RegExp(esc(`${p.first}${sep}${p.last}`), "gi"), (m) => { const r = `${p.sFirst}${sep}${p.sLast}`; return m === m.toLowerCase() ? r.toLowerCase() : r; }]);
  rules.push([new RegExp(`\\b${esc(p.first)}\\b`, "g"), p.sFirst]);
  if (p.last && !p.lastShared && p.last.length > 3) rules.push([new RegExp(`\\b${esc(p.last)}\\b`, "g"), p.sLast]);
}
EXTRA_NAMES.forEach((n, i) => rules.push([new RegExp(`\\b${esc(n)}\\b`, "g"), `Person${i + 1}`]));

const anon = (s) => rules.reduce((t, [re, to]) => t.replace(re, to), s || "");
const byEmail = new Map(list.map((p) => [p.email, p]));
const anonAddr = (a) => { const p = byEmail.get(a.email); return p ? { name: p.sName, email: p.sEmail } : { name: a.name, email: a.email }; };

const out = {
  meta: { now: raw.meta.now, timezone: raw.meta.timezone, owner: anonAddr(raw.meta.owner), count: raw.emails.length, anonymised: true },
  calendar: raw.calendar,
  emails: raw.emails.map((e) => ({ id: e.id, thread_id: e.thread_id, from: anonAddr(e.from), to: e.to.map(anonAddr), subject: anon(e.subject), date: e.date, body: anon(e.body) })),
};
fs.writeFileSync("data/test_dataset.json", JSON.stringify(out, null, 2));
fs.mkdirSync("data/private", { recursive: true });
fs.writeFileSync("data/private/mapping.json", JSON.stringify(list, null, 2));

// 3. leak audit: no original names / emails / phones / URLs / IDs may remain
const blob = JSON.stringify(out.emails) + JSON.stringify(out.meta);
const leaks = [];
for (const p of list) {
  for (const t of [p.email, p.name, p.first, p.last && !p.lastShared ? p.last : null].filter(Boolean))
    if (new RegExp(`\\b${esc(t)}\\b`, "i").test(blob)) leaks.push(`name/email: ${t}`);
}
const patterns = { phone: /\+91[\s-]?\d{5}|\b\d{10}\b|\b1800\b/, url: /https?:\/\//, usn: /\b\d[A-Z]{2}\d{2}[A-Z]{2}\d{3}\b/, ref: /\b[A-Z]{2,4}-\d{4,}\b/, card: /ending\s*\d{4}/i, pin: /\b\d{6}\b/ };
for (const [k, re] of Object.entries(patterns)) if (re.test(blob)) leaks.push(`pattern: ${k}`);
if (leaks.length) { console.error("LEAKS FOUND:", leaks); process.exit(1); }
console.log(`anonymised ${out.emails.length} emails | people mapped ${list.length} | leaks 0 -> data/test_dataset.json`);
