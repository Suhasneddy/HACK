// Step 5: Evaluation. Usage: node scripts/evaluate.mjs [--outputs results/agent_outputs.json] [--out results/report]
import fs from "node:fs";
import { similarity, median, percentile, prf, pct } from "../lib/text.mjs";
import { validateSlot } from "../lib/slots.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const outputsPath = arg("outputs", "results/agent_outputs.json");
const outBase = arg("out", "results/report");
const dataset = JSON.parse(fs.readFileSync("data/test_dataset.json", "utf8"));
const expected = JSON.parse(fs.readFileSync("data/expected_results.json", "utf8")).items;
const outputs = new Map(JSON.parse(fs.readFileSync(outputsPath, "utf8")).outputs.map((o) => [o.email_id, o]));

const TARGETS = { category_acc: 0.85, urgency_acc: 0.75, reply_f1: 0.85, task_precision: 0.8, task_recall: 0.8, slot_validity: 0.9, usable_draft_rate: 0.7, must_not_violations: 0, queue_minutes: 7 };
const MINOR_EDIT_SIM = 0.85, TASK_MATCH_FRAC = 0.6;
const ids = dataset.emails.map((e) => e.id);
const fails = Object.fromEntries(ids.map((id) => [id, []]));
const out = (id) => outputs.get(id) ?? { email_id: id, missing: true };

// 1. Triage
const cats = ["urgent", "meeting", "action", "fyi", "promo"];
let catOk = 0, urgOk = 0;
const confusion = Object.fromEntries(cats.map((c) => [c, Object.fromEntries([...cats, "missing"].map((k) => [k, 0]))]));
for (const id of ids) {
  const e = expected[id], o = out(id), pc = cats.includes(o.category) ? o.category : "missing";
  confusion[e.category][pc]++;
  if (pc === e.category) catOk++; else fails[id].push(`category: got ${o.category ?? "none"}, want ${e.category}`);
  if (o.urgency === e.urgency) urgOk++; else fails[id].push(`urgency: got ${o.urgency ?? "none"}, want ${e.urgency}`);
}
const perCat = Object.fromEntries(cats.map((c) => {
  const tp = confusion[c][c];
  const fp = ids.filter((id) => expected[id].category !== c && out(id).category === c).length;
  return [c, prf(tp, fp, cats.concat("missing").reduce((n, k) => n + (k === c ? 0 : confusion[c][k]), 0))];
}));
const triage = { category_acc: catOk / ids.length, urgency_acc: urgOk / ids.length, macro_f1: cats.reduce((s, c) => s + perCat[c].f1, 0) / cats.length, per_category: perCat, confusion };

// 2. Reply detection
let rtp = 0, rfp = 0, rfn = 0;
for (const id of ids) {
  const want = expected[id].needs_reply, got = !!out(id).needs_reply;
  if (want && got) rtp++; else if (!want && got) { rfp++; fails[id].push("reply: flagged as needs-reply, should not be"); } else if (want && !got) { rfn++; fails[id].push("reply: missed, needs reply"); }
}
const reply = prf(rtp, rfp, rfn);

// 3. Task extraction (greedy 1:1 keyword match)
let ttp = 0, tfp = 0, tfn = 0, dueOk = 0;
for (const id of ids) {
  const E = expected[id].tasks, P = [...(out(id).tasks ?? [])], used = new Set();
  for (const e of E) {
    const need = Math.ceil(e.keywords.length * TASK_MATCH_FRAC);
    let best = -1, bestHits = 0;
    P.forEach((p, i) => {
      if (used.has(i)) return;
      const hits = e.keywords.filter((k) => (p.title || "").toLowerCase().includes(k)).length;
      if (hits >= need && hits > bestHits) { best = i; bestHits = hits; }
    });
    if (best > -1) { used.add(best); ttp++; if (e.due && (P[best].due || "").slice(0, 10) === e.due) dueOk++; else if (e.due) fails[id].push(`task due: "${e.title}" want ${e.due}, got ${P[best].due ?? "none"}`); }
    else { tfn++; fails[id].push(`task missed: "${e.title}"`); }
  }
  P.forEach((p, i) => { if (!used.has(i)) { tfp++; fails[id].push(`task spurious: "${p.title}"`); } });
}
const tasks = { ...prf(ttp, tfp, tfn), due_date_acc: ttp ? dueOk / ttp : 0, expected_total: ttp + tfn };

// 4. Meeting slots
let slotsTotal = 0, slotsValid = 0, meetOk = 0, meetN = 0, slotFp = 0;
const slotReasons = {};
for (const id of ids) {
  const m = expected[id].meeting, slots = out(id).proposed_slots ?? [];
  if (!m) { if (slots.length) { slotFp++; fails[id].push("slots proposed for non-meeting email"); } continue; }
  meetN++;
  let allValid = slots.length >= 2 && slots.length <= 3;
  if (!allValid) fails[id].push(`slots: need 2-3, got ${slots.length}`);
  for (const s of slots) {
    slotsTotal++;
    const v = validateSlot(s, { busy: dataset.calendar, window: m.window, durationMin: m.durationMin, now: dataset.meta.now });
    if (v.ok) slotsValid++; else { allValid = false; fails[id].push(`slot ${s.start}: ${v.reasons.join(",")}`); v.reasons.forEach((r) => (slotReasons[r.split(":")[0]] = (slotReasons[r.split(":")[0]] || 0) + 1)); }
  }
  if (allValid) meetOk++;
}
const meetings = { emails: meetN, fully_valid_emails: meetOk, fully_valid_rate: meetN ? meetOk / meetN : 0, slot_validity: slotsTotal ? slotsValid / slotsTotal : 0, slots_total: slotsTotal, invalid_reasons: slotReasons, slots_on_non_meeting: slotFp };

// 5. Draft quality
const needReply = ids.filter((id) => expected[id].needs_reply);
let usable = 0, covSum = 0, violations = 0, unnecessary = 0;
for (const id of needReply) {
  const e = expected[id], o = out(id), d = (o.draft || "").toLowerCase();
  if (!d) { fails[id].push("draft: missing"); continue; }
  const cov = e.draft_must_include.length ? e.draft_must_include.filter((k) => d.includes(k.toLowerCase())).length / e.draft_must_include.length : 1;
  covSum += cov;
  if (cov < 1) fails[id].push(`draft: missing points ${e.draft_must_include.filter((k) => !d.includes(k.toLowerCase())).join(",")}`);
  for (const pat of e.draft_must_not) if (new RegExp(pat, "i").test(o.draft)) { violations++; fails[id].push(`draft: forbidden content /${pat}/`); }
  const sim = o.final_text ? similarity(o.draft, o.final_text) : 1;
  const accepted = o.status === "approved" || o.status === "edited";
  if (accepted && sim >= MINOR_EDIT_SIM) usable++; else fails[id].push(accepted ? `draft: heavy edit (sim ${sim.toFixed(2)})` : `draft: ${o.status ?? "no status"}`);
}
for (const id of ids) if (!expected[id].needs_reply && (out(id).draft || "").trim()) { unnecessary++; fails[id].push("draft: unnecessary reply drafted"); }
const draft = { usable_draft_rate: needReply.length ? usable / needReply.length : 0, must_include_coverage: needReply.length ? covSum / needReply.length : 0, must_not_violations: violations, unnecessary_drafts: unnecessary, drafts_expected: needReply.length };

// 6. Approval time + rejection log
const times = ids.map((id) => out(id).review_ms).filter((x) => typeof x === "number");
const approval = { items_timed: times.length, median_s: (median(times) ?? 0) / 1000, p90_s: (percentile(times, 90) ?? 0) / 1000, queue_minutes: times.reduce((a, b) => a + b, 0) / 60000, baseline_minutes: 35, target_minutes: 7 };
const rejected = ids.filter((id) => out(id).status === "rejected").map((id) => ({ id, reason: out(id).reject_reason ?? "(none logged)" }));

const results = {
  triage: { category_acc: triage.category_acc, urgency_acc: triage.urgency_acc, macro_f1: triage.macro_f1 },
  reply: { precision: reply.precision, recall: reply.recall, f1: reply.f1 },
  tasks, meetings, draft, approval, rejected,
};
const checks = [
  ["Category accuracy", triage.category_acc, TARGETS.category_acc, ">=", pct],
  ["Urgency accuracy", triage.urgency_acc, TARGETS.urgency_acc, ">=", pct],
  ["Reply-needed F1", reply.f1, TARGETS.reply_f1, ">=", pct],
  ["Task precision", tasks.precision, TARGETS.task_precision, ">=", pct],
  ["Task recall", tasks.recall, TARGETS.task_recall, ">=", pct],
  ["Slot validity", meetings.slot_validity, TARGETS.slot_validity, ">=", pct],
  ["Drafts no/minor edit", draft.usable_draft_rate, TARGETS.usable_draft_rate, ">=", pct],
  ["Forbidden-content violations", draft.must_not_violations, TARGETS.must_not_violations, "<=", (x) => String(x)],
  ["Queue time (min)", approval.queue_minutes, TARGETS.queue_minutes, "<=", (x) => x.toFixed(1)],
].map(([name, val, target, op, f]) => ({ name, value: val, shown: f(val), target: op === ">=" ? f(target) : String(target), op, pass: op === ">=" ? val >= target : val <= target }));

const report = { generated: new Date().toISOString(), outputs_file: outputsPath, emails: ids.length, checks, results, confusion: triage.confusion, per_category: perCat, failures: Object.fromEntries(Object.entries(fails).filter(([, v]) => v.length)) };
fs.mkdirSync("results", { recursive: true });
fs.writeFileSync(`${outBase}.json`, JSON.stringify(report, null, 2));

const md = [
  `# InboxPilot evaluation report`, ``, `Emails: ${ids.length} | Outputs: \`${outputsPath}\``, ``,
  `## Scorecard`, ``, `| Metric | Result | Target | Pass |`, `|---|---|---|---|`,
  ...checks.map((c) => `| ${c.name} | ${c.shown} | ${c.op} ${c.target} | ${c.pass ? "PASS" : "FAIL"} |`), ``,
  `## Detail`, ``,
  `- Macro-F1 (category): ${pct(triage.macro_f1)}`,
  `- Task extraction: TP ${tasks.tp}, FP ${tasks.fp}, FN ${tasks.fn}; due-date accuracy ${pct(tasks.due_date_acc)}`,
  `- Meetings: ${meetings.fully_valid_emails}/${meetings.emails} emails fully valid; invalid reasons ${JSON.stringify(meetings.invalid_reasons)}`,
  `- Drafts: must-include coverage ${pct(draft.must_include_coverage)}; unnecessary drafts ${draft.unnecessary_drafts}`,
  `- Approval time: median ${approval.median_s.toFixed(1)}s, p90 ${approval.p90_s.toFixed(1)}s, queue ${approval.queue_minutes.toFixed(1)} min vs baseline ${approval.baseline_minutes} min`,
  `- Rejected actions: ${rejected.length}${rejected.length ? " -> " + rejected.map((r) => `${r.id} (${r.reason})`).join("; ") : ""}`, ``,
  `## Category confusion (rows = truth)`, ``, `| truth \\ pred | ${[...cats, "missing"].join(" | ")} |`, `|---|${[...cats, "missing"].map(() => "---").join("|")}|`,
  ...cats.map((c) => `| ${c} | ${[...cats, "missing"].map((k) => triage.confusion[c][k]).join(" | ")} |`), ``,
  `## Failure log`, ``,
  ...(Object.keys(report.failures).length ? Object.entries(report.failures).map(([id, v]) => `- **${id}**: ${v.join("; ")}`) : ["None."]), ``,
];
fs.writeFileSync(`${outBase}.md`, md.join("\n"));

console.log(checks.map((c) => `${c.pass ? "PASS" : "FAIL"}  ${c.name.padEnd(30)} ${c.shown.padStart(8)}  (target ${c.op} ${c.target})`).join("\n"));
console.log(`\n${checks.filter((c) => c.pass).length}/${checks.length} checks passed -> ${outBase}.md`);
