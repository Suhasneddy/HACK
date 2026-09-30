# InboxPilot evaluation report

Emails: 30 | Outputs: `results/agent_outputs.noisy.json`

## Scorecard

| Metric | Result | Target | Pass |
|---|---|---|---|
| Category accuracy | 83.3% | >= 85.0% | FAIL |
| Urgency accuracy | 90.0% | >= 75.0% | PASS |
| Reply-needed F1 | 88.9% | >= 85.0% | PASS |
| Task precision | 81.3% | >= 80.0% | PASS |
| Task recall | 68.4% | >= 80.0% | FAIL |
| Slot validity | 93.8% | >= 90.0% | PASS |
| Drafts no/minor edit | 85.7% | >= 70.0% | PASS |
| Forbidden-content violations | 0 | <= 0 | PASS |
| Queue time (min) | 19.0 | <= 7 | FAIL |

## Detail

- Macro-F1 (category): 82.5%
- Task extraction: TP 13, FP 3, FN 6; due-date accuracy 100.0%
- Meetings: 5/6 emails fully valid; invalid reasons {"conflict":1}
- Drafts: must-include coverage 100.0%; unnecessary drafts 1
- Approval time: median 36.5s, p90 56.0s, queue 19.0 min vs baseline 35 min
- Rejected actions: 0

## Category confusion (rows = truth)

| truth \ pred | urgent | meeting | action | fyi | promo | missing |
|---|---|---|---|---|---|---|
| urgent | 5 | 1 | 0 | 0 | 0 | 0 |
| meeting | 1 | 4 | 0 | 1 | 0 | 0 |
| action | 0 | 0 | 8 | 0 | 0 | 0 |
| fyi | 0 | 1 | 0 | 5 | 0 | 0 |
| promo | 1 | 0 | 0 | 0 | 3 | 0 |

## Failure log

- **e01**: task missed: "Submit Assignment 3"
- **e03**: task spurious: "Follow up on this email"; draft: heavy edit (sim 0.00)
- **e04**: reply: missed, needs reply
- **e05**: reply: missed, needs reply; task spurious: "Follow up on this email"
- **e07**: category: got fyi, want meeting; slot 2026-10-02T11:00:00+05:30: conflict:Holiday: Gandhi Jayanti
- **e08**: category: got urgent, want meeting; draft: heavy edit (sim 0.00)
- **e09**: task missed: "Send updated resume and portfolio link"
- **e11**: task missed: "Complete team registration form"
- **e12**: task missed: "Export icons as SVG"
- **e14**: urgency: got low, want medium; task missed: "Buy birthday gift"
- **e16**: category: got meeting, want urgent
- **e20**: category: got meeting, want fyi; urgency: got medium, want low
- **e24**: reply: flagged as needs-reply, should not be; task spurious: "Follow up on this email"; draft: unnecessary reply drafted
- **e28**: category: got urgent, want promo
- **e29**: urgency: got high, want medium; task missed: "Send project proposal draft"
