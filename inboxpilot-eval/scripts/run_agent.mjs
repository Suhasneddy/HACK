// Runs every test email through YOUR agent over HTTP, writes results/agent_outputs.json.
//   AGENT_URL=http://localhost:3001/api/process node scripts/run_agent.mjs
//   node scripts/run_agent.mjs --merge results/review_log.json   (merge dashboard review log)
// Agent must return JSON: { category, urgency, needs_reply, draft, tasks:[{title,due}], proposed_slots:[{start,end}] }
// Review log rows: { email_id, status: approved|edited|rejected, final_text, review_ms, reject_reason }
import fs from "node:fs";
const dataset = JSON.parse(fs.readFileSync("data/test_dataset.json", "utf8"));
const OUT = "results/agent_outputs.json";
fs.mkdirSync("results", { recursive: true });

const mi = process.argv.indexOf("--merge");
if (mi > -1) {
  const log = JSON.parse(fs.readFileSync(process.argv[mi + 1], "utf8"));
  const cur = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const by = new Map((Array.isArray(log) ? log : log.rows).map((r) => [r.email_id, r]));
  cur.outputs = cur.outputs.map((o) => ({ ...o, ...(by.get(o.email_id) ?? {}) }));
  fs.writeFileSync(OUT, JSON.stringify(cur, null, 2));
  console.log(`merged ${by.size} review rows -> ${OUT}`);
  process.exit(0);
}

const URL_ = process.env.AGENT_URL || "http://localhost:3001/api/process";
const outputs = [];
for (const email of dataset.emails) {
  const t0 = Date.now();
  try {
    const res = await fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, calendar: dataset.calendar, now: dataset.meta.now }) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    outputs.push({ email_id: email.id, status: "pending", final_text: null, review_ms: null, reject_reason: null, latency_ms: Date.now() - t0, ...(await res.json()) });
    console.log(`ok   ${email.id} ${Date.now() - t0}ms`);
  } catch (err) {
    outputs.push({ email_id: email.id, status: "pending", error: String(err), latency_ms: Date.now() - t0 });
    console.log(`FAIL ${email.id} ${err}`);
  }
}
fs.writeFileSync(OUT, JSON.stringify({ outputs }, null, 2));
console.log(`wrote ${OUT}`);
