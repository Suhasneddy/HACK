// Audit: ground-truth integrity + harness trap tests. Run: npm run audit
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { findSlots, validateSlot } from "../lib/slots.mjs";

const ds = JSON.parse(fs.readFileSync("data/test_dataset.json", "utf8"));
const exp = JSON.parse(fs.readFileSync("data/expected_results.json", "utf8")).items;
let bad = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " :: " + extra : ""}`); if (!ok) bad++; };

// 1. ground-truth integrity
check("all 30 ids have ground truth", ds.emails.every((e) => exp[e.id]));
check("enums valid", ds.emails.every((e) => ["urgent", "meeting", "action", "fyi", "promo"].includes(exp[e.id].category) && ["high", "medium", "low"].includes(exp[e.id].urgency)));
check("task due dates valid", Object.values(exp).flatMap((x) => x.tasks).every((k) => !k.due || !Number.isNaN(Date.parse(k.due))));
check("meeting emails <-> category=meeting", ds.emails.every((e) => !!exp[e.id].meeting === (exp[e.id].category === "meeting")));
check("needs_reply => draft rubric exists", ds.emails.filter((e) => exp[e.id].needs_reply).every((e) => exp[e.id].draft_must_include.length));
const ambiguous = [];
for (const [id, x] of Object.entries(exp)) x.tasks.forEach((a, i) => x.tasks.forEach((b, j) => { if (i !== j && a.keywords.filter((k) => b.title.toLowerCase().includes(k)).length >= Math.ceil(a.keywords.length * 0.6)) ambiguous.push(`${id}:${i}/${j}`); }));
check("task keywords unambiguous within email", !ambiguous.length, ambiguous.join(","));
const slotIssues = [];
for (const [id, x] of Object.entries(exp)) if (x.meeting) { const s = findSlots({ busy: ds.calendar, now: ds.meta.now, ...x.meeting }, 3); if (s.length < 2 || !s.every((v) => validateSlot(v, { busy: ds.calendar, now: ds.meta.now, ...x.meeting }).ok)) slotIssues.push(id); }
check("every meeting has >=2 valid solvable slots", !slotIssues.length, slotIssues.join(","));
check("e04 has no Oct-2 (holiday) slot in solution", findSlots({ busy: ds.calendar, now: ds.meta.now, ...exp.e04.meeting }, 3).every((s) => !s.start.startsWith("2026-10-02")));

// 2. anonymisation audit (independent of anonymise.mjs)
const map = JSON.parse(fs.readFileSync("data/private/mapping.json", "utf8"));
const blob = JSON.stringify(ds);
const leaked = map.flatMap((p) => [p.name, p.email, p.first]).filter((t) => t && blob.toLowerCase().includes(t.toLowerCase()));
check("no original names/emails/first names in dataset", !leaked.length, leaked.join(","));
check("dataset marked anonymised", ds.meta.anonymised === true);
check("dataset has no phones/urls/ids/cards", !/\+91|\b\d{10}\b|https?:\/\/|\b\d[A-Z]{2}\d{2}[A-Z]{2}\d{3}\b|[A-Z]{2,4}-\d{4,}|ending\s*\d{4}/.test(blob));

// 3. harness trap tests (mutate oracle outputs, expect the right failure)
const evalWith = (mut, tag) => {
  const o = JSON.parse(fs.readFileSync("results/agent_outputs.oracle.json", "utf8"));
  mut(o.outputs);
  fs.writeFileSync(`results/_in_${tag}.json`, JSON.stringify(o));
  execFileSync("node", ["scripts/evaluate.mjs", "--outputs", `results/_in_${tag}.json`, "--out", `results/_rep_${tag}`], { stdio: "pipe" });
  return JSON.parse(fs.readFileSync(`results/_rep_${tag}.json`, "utf8"));
};
const get = (arr, id) => arr.find((x) => x.email_id === id);
let r = evalWith((a) => (get(a, "e10").draft += " My GSTIN is 29ABCDE1234F1Z5."), "gst");
check("trap: invented GSTIN caught", r.results.draft.must_not_violations === 1);
r = evalWith((a) => (get(a, "e30").draft += " The quote is Rs 45000."), "price");
check("trap: invented price caught", r.results.draft.must_not_violations === 1);
r = evalWith((a) => (get(a, "e09").draft += " See attached."), "attach");
check("trap: fake attachment claim caught", r.results.draft.must_not_violations === 1);
r = evalWith((a) => (get(a, "e04").proposed_slots = [{ start: "2026-10-02T11:00:00+05:30", end: "2026-10-02T11:45:00+05:30" }, ...get(a, "e04").proposed_slots.slice(0, 1)]), "holiday");
check("trap: holiday slot caught", r.results.meetings.invalid_reasons.conflict >= 1);
r = evalWith((a) => a.forEach((x) => (x.tasks = [])), "notasks");
check("trap: zero tasks => recall 0", r.results.tasks.recall === 0);
r = evalWith((a) => { get(a, "e25").needs_reply = true; get(a, "e25").draft = "Thanks!"; }, "promo");
check("trap: reply to promo => FP + unnecessary draft", r.results.reply.precision < 1 && r.results.draft.unnecessary_drafts === 1);
r = evalWith((a) => { get(a, "e02").status = "edited"; get(a, "e02").final_text = "Totally different text that shares nothing with the draft at all."; }, "heavy");
check("trap: heavy edit not counted as usable", r.results.draft.usable_draft_rate < 1);
r = evalWith((a) => a.splice(0, 5), "missing");
check("trap: missing outputs handled (no crash, acc drops)", r.results.triage.category_acc < 1);
fs.readdirSync("results").filter((f) => /^_(in|rep|t)_/.test(f)).forEach((f) => fs.unlinkSync(`results/${f}`));

console.log(bad ? `\n${bad} AUDIT FAILURES` : "\nAUDIT CLEAN");
process.exit(bad ? 1 : 0);
