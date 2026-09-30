// Step 1: sample 30 emails -> raw (PRIVATE) + expected results (ground truth)
import fs from "node:fs";
import { SCENARIOS, NOW, OWNER, BUSY } from "../data/scenarios.mjs";

fs.mkdirSync("data/private", { recursive: true });
const raw = { meta: { now: NOW, owner: OWNER, timezone: "Asia/Kolkata" }, calendar: BUSY, emails: SCENARIOS.map((s) => s.raw) };
fs.writeFileSync("data/raw_emails.json", JSON.stringify(raw, null, 2));

const expected = {
  meta: { now: NOW, count: SCENARIOS.length, note: "Ground truth. Tasks match by keyword overlap; see evaluate.mjs." },
  items: Object.fromEntries(SCENARIOS.map((s) => [s.raw.id, s.truth])),
};
fs.writeFileSync("data/expected_results.json", JSON.stringify(expected, null, 2));

const dist = {};
for (const s of SCENARIOS) dist[s.truth.category] = (dist[s.truth.category] || 0) + 1;
const nTasks = SCENARIOS.reduce((n, s) => n + s.truth.tasks.length, 0);
console.log(`built ${SCENARIOS.length} emails | categories`, dist, `| tasks ${nTasks} | reply-needed ${SCENARIOS.filter((s) => s.truth.needs_reply).length} | meetings ${SCENARIOS.filter((s) => s.truth.meeting).length}`);
