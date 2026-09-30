# InboxPilot — Test data & evaluation pipeline

```
Sample 30 emails -> Anonymisation -> Test dataset -> Expected results -> Evaluation
 build_dataset      anonymise        test_dataset    expected_results     evaluate
```

## Run
```bash
npm run all        # build, anonymise, mock agent outputs, evaluate, audit
npm run audit      # ground-truth integrity + harness trap tests
npm run smoke      # API smoke tests (offline always; live if keys set)
```
Node 18+. Zero dependencies (`googleapis` only for live Gmail/Calendar smoke tests).

## Files
| File | Purpose |
|---|---|
| `data/scenarios.mjs` | 30 synthetic emails + ground truth. Single source of truth. Edit here. |
| `data/raw_emails.json` | Raw emails with fake PII. **Gitignored.** |
| `data/test_dataset.json` | **Anonymised dataset. Commit and use this.** |
| `data/expected_results.json` | Ground truth per email. |
| `data/private/mapping.json` | Real -> surrogate map. **Gitignored.** |
| `scripts/anonymise.mjs` | Pseudonymise names/emails/handles; mask phones, URLs, IDs, card digits, addresses. Fails on any leak. |
| `scripts/evaluate.mjs` | Scores agent outputs. Writes `results/report.md` + `.json`. |
| `scripts/run_agent.mjs` | Sends each email to your agent over HTTP. Merges dashboard review log. |
| `scripts/make_mock_outputs.mjs` | `oracle` (perfect) and `noisy` outputs to validate harness. |
| `scripts/api_smoke_test.mjs` | Gmail base64url MIME, Calendar, Gemini function-calling checks. |
| `lib/slots.mjs` | `validateSlot()` + reference `findSlots()`. Backend can reuse. |
| `lib/mime.mjs` | `buildRawMime()` + base64url helpers. Backend can reuse. |

## Dataset design
- Persona: student/freelancer, fixed "now" = Mon 28 Sep 2026 09:00 IST.
- 30 emails: 6 urgent, 6 meeting, 8 action, 6 FYI, 4 promo. 19 tasks. 14 need replies. 6 meeting requests.
- Traps built in: holiday on Fri 2 Oct (e04); bank alert must not get a reply (e16); FYI mentions "midterm" but no task (e23); promo says "Register" but not user's task (e28); invoice asks for GST number, draft must not invent one (e10); quote request, draft must not invent price (e30); "resume by Friday", draft must not claim attachment (e09); two tasks in one email (e10, e11, e12, e14, e29).
- Calendar fixture: 9 busy blocks incl. holiday. Slot windows: "afternoons only" (e05), Saturday-only (e08), "tomorrow" (e06).

## Agent output contract
```json
{ "email_id":"e02", "category":"urgent|meeting|action|fyi|promo", "urgency":"high|medium|low",
  "needs_reply":true, "draft":"...", "tasks":[{"title":"...","due":"2026-09-28"}],
  "proposed_slots":[{"start":"2026-09-29T11:30:00+05:30","end":"..."}],
  "status":"approved|edited|rejected|pending", "final_text":null, "review_ms":8200, "reject_reason":null }
```
`status`, `final_text`, `review_ms`, `reject_reason` come from your approval dashboard log. Log `review_ms` = card shown -> click.

## Metrics (match deck slide 6)
| Deck claim | Metric | How |
|---|---|---|
| % drafts no/minor edit | `usable_draft_rate` | approved/edited AND word-level similarity(draft, final) >= 0.85, over 14 reply-needed emails |
| Time-to-approve per item | median / p90 / queue minutes | `review_ms`. Target queue <= 7 min vs 35 min baseline |
| Task precision / recall | greedy 1:1 keyword match | >= 60% of expected keywords in predicted title |
| Rejected action log | failure log | `reject_reason` listed in report |
| Extra | category / urgency accuracy, reply F1, slot validity, forbidden-content violations | see `evaluate.mjs` |

Targets live in `TARGETS` at top of `evaluate.mjs`. Tune before demo.

## Limits
- Emails are synthetic, not real inbox data. Say so in the deck ("~30 anonymised emails" is true only if you also replace these with your own).
- Live Gmail/Calendar/Gemini smoke tests are written but not run here (no network/keys). Run `npm run smoke` with keys.
- `review_ms` in mock outputs is simulated. Report real timings from real sessions.
- Draft quality is proxy-scored (coverage, forbidden content, edit distance). Add human rating for final numbers.
