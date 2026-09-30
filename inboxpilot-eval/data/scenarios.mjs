// Single source of truth: 30 synthetic emails (fake people, realistic PII) + ground truth.
// Reference "now" = Mon 28 Sep 2026 09:00 IST. Owner = Kavya Iyer.
export const NOW = "2026-09-28T09:00:00+05:30";
export const OWNER = { name: "Kavya Iyer", email: "kavya.iyer@gmail.com" };

// Calendar fixture (IST). Fri 2 Oct = public holiday (trap for e04).
export const BUSY = [
  { title: "Lecture", start: "2026-09-28T11:00:00+05:30", end: "2026-09-28T12:00:00+05:30" },
  { title: "Lab", start: "2026-09-28T14:00:00+05:30", end: "2026-09-28T16:00:00+05:30" },
  { title: "Client sync", start: "2026-09-29T10:00:00+05:30", end: "2026-09-29T11:30:00+05:30" },
  { title: "Design review", start: "2026-09-29T15:00:00+05:30", end: "2026-09-29T16:00:00+05:30" },
  { title: "Exam prep", start: "2026-09-30T10:00:00+05:30", end: "2026-09-30T12:00:00+05:30" },
  { title: "Team standup", start: "2026-09-30T16:00:00+05:30", end: "2026-09-30T17:00:00+05:30" },
  { title: "Hackathon submission", start: "2026-10-01T10:00:00+05:30", end: "2026-10-01T13:00:00+05:30" },
  { title: "Holiday: Gandhi Jayanti", start: "2026-10-02T00:00:00+05:30", end: "2026-10-02T23:59:00+05:30" },
  { title: "Lab", start: "2026-10-05T14:00:00+05:30", end: "2026-10-05T15:30:00+05:30" },
];

const T = (title, keywords, due = null) => ({ title, keywords, due });
const M = (start, end, durationMin, extra = {}) => ({ window: { start, end, ...extra }, durationMin });

// [id, fromName, fromEmail, date, subject, body, truth]
const rows = [
  ["e01", "Ramesh Kulkarni", "ramesh.kulkarni@lakeview-univ.edu", "2026-09-28T08:10:00+05:30",
    "URGENT: Assignment 3 deadline moved to today",
    "Hi Kavya,\n\nDue to the lab schedule change, Assignment 3 must now be submitted today by 5 PM. No extensions will be given. Upload your PDF at https://lms.lakeview-univ.edu/courses/ml/a3 with your USN (1LV22CS145) in the filename.\n\nIf the portal fails, call me on +91 98450 12345.\n\nProf. Ramesh Kulkarni",
    { category: "urgent", urgency: "high", needs_reply: false, tasks: [T("Submit Assignment 3", ["assignment", "submit"], "2026-09-28")] }],

  ["e02", "Ananya Bhat", "ananya@brightpixel.co", "2026-09-28T08:40:00+05:30",
    "Old logo still live - launch at 6 PM",
    "Hi Kavya,\n\nThe staging site still shows the old logo and our launch is at 6 PM today. Could you push the updated logo assets (SVG + PNG) as soon as possible? I'll be on a call with investors until 4.\n\nThanks,\nAnanya Bhat\nBrightPixel | +91 99001 45678",
    { category: "urgent", urgency: "high", needs_reply: true, tasks: [T("Push updated logo assets", ["logo", "assets"], "2026-09-28")],
      draft_must_include: ["logo"], draft_must_not: ["already (pushed|updated|done|uploaded)"] }],

  ["e03", "Meera Joshi", "meera.joshi@lakeview-univ.edu", "2026-09-27T18:20:00+05:30",
    "Project review meeting",
    "Hi Kavya,\n\nI'd like a 30-minute review of your capstone project progress. I'm free on Tuesday or Wednesday this week - please suggest a time that works for you.\n\nRegards,\nDr. Meera Joshi",
    { category: "meeting", urgency: "medium", needs_reply: true, tasks: [], meeting: M("2026-09-29T10:00:00+05:30", "2026-09-30T18:00:00+05:30", 30), draft_must_include: ["review"] }],

  ["e04", "Rohit Nambiar", "rohit@greenleaf.studio", "2026-09-25T16:05:00+05:30",
    "Kickoff call for landing page project",
    "Hi Kavya,\n\nGreat to be working together. Can we do a 45-minute kickoff call on Thursday or Friday? Let me know what suits you.\n\nRohit Nambiar\nGreenleaf Studio",
    { category: "meeting", urgency: "medium", needs_reply: true, tasks: [], meeting: M("2026-10-01T10:00:00+05:30", "2026-10-02T18:00:00+05:30", 45), draft_must_include: ["kickoff"] }],

  ["e05", "Divya Menon", "divya.menon@nimbuslabs.io", "2026-09-28T07:55:00+05:30",
    "Intro call - Product Design Intern",
    "Hi Kavya,\n\nThanks for applying to Nimbus Labs. We'd love to schedule a 20-minute intro call next week. Afternoons work best for our team (2-6 PM IST). Please share your availability.\n\nDivya Menon\nTalent Team, Nimbus Labs",
    { category: "meeting", urgency: "medium", needs_reply: true, tasks: [], meeting: M("2026-10-05T14:00:00+05:30", "2026-10-09T18:00:00+05:30", 20, { hourFrom: 14, hourTo: 18 }), draft_must_include: ["call"] }],

  ["e06", "Vikram Shetty", "vikram.shetty@outlook.com", "2026-09-28T08:45:00+05:30",
    "Demo rehearsal tomorrow?",
    "Kavya! We need a full run-through of the demo before Thursday. Can we do a 1-hour rehearsal tomorrow? Any time works for me.\n\n- Vikram",
    { category: "meeting", urgency: "medium", needs_reply: true, tasks: [], meeting: M("2026-09-29T10:00:00+05:30", "2026-09-29T18:00:00+05:30", 60), draft_must_include: ["rehearsal"] }],

  ["e07", "Sunil Prabhu", "sunil.prabhu@mentorloop.org", "2026-09-27T11:30:00+05:30",
    "Coffee chat",
    "Hi Kavya,\n\nHappy to catch up on your career plans. I have a free 30 minutes any day this week - pick whatever suits you.\n\nBest,\nSunil Prabhu\nMentorLoop",
    { category: "meeting", urgency: "low", needs_reply: true, tasks: [], meeting: M("2026-09-28T10:00:00+05:30", "2026-10-02T18:00:00+05:30", 30), draft_must_include: ["chat"] }],

  ["e08", "Gopal Hegde", "gopal.hegde@gmail.com", "2026-09-26T19:10:00+05:30",
    "Lease renewal - quick call",
    "Hello Kavya,\n\nRegarding renewal of your lease for flat 204, Palm Residency, JP Nagar, Bengaluru 560078. Can we have a quick 15-minute video call on Saturday morning? You can reach me at +91 98860 77123.\n\nGopal Hegde",
    { category: "meeting", urgency: "low", needs_reply: true, tasks: [], meeting: M("2026-10-03T10:00:00+05:30", "2026-10-03T12:00:00+05:30", 15, { allowWeekend: true }), draft_must_include: ["lease"] }],

  ["e09", "Karthik Rao", "karthik.rao@stackforge.dev", "2026-09-27T14:00:00+05:30",
    "Internship application - documents",
    "Hi Kavya,\n\nWe're impressed with your profile. Please send your updated resume and portfolio link by Friday so we can move you to the next round.\n\nKarthik Rao\nStackForge",
    { category: "action", urgency: "medium", needs_reply: true, tasks: [T("Send updated resume and portfolio link", ["resume", "portfolio"], "2026-10-02")],
      draft_must_include: ["resume", "portfolio"], draft_must_not: ["attached"] }],

  ["e10", "Ananya Bhat", "ananya@brightpixel.co", "2026-09-26T12:15:00+05:30",
    "Invoice draft for review",
    "Hi Kavya,\n\nAttaching the invoice draft for the branding project (INV-20458). Please review it and confirm your GST number by Wednesday so accounts can process the payment.\n\nAnanya",
    { category: "action", urgency: "medium", needs_reply: true,
      tasks: [T("Review invoice draft", ["invoice", "review"], "2026-09-30"), T("Confirm GST number", ["gst", "confirm"], "2026-09-30")],
      draft_must_include: ["invoice"], draft_must_not: ["\\b\\d{2}[A-Z]{5}\\d{4}[A-Z]\\d[Z][A-Z\\d]\\b"] }],

  ["e11", "HackVerse Team", "team@hackverse.dev", "2026-09-24T10:00:00+05:30",
    "Action required: complete your team registration",
    "Hi Team Deep Think,\n\nComplete the team registration form and upload your pitch deck before 1 Oct, 11:59 PM IST. Submissions after the deadline will not be considered.\n\nHackVerse Team",
    { category: "action", urgency: "high", needs_reply: false,
      tasks: [T("Complete team registration form", ["registration", "form"], "2026-10-01"), T("Upload pitch deck", ["pitch", "deck"], "2026-10-01")] }],

  ["e12", "Pooja Rao", "pooja.rao@gmail.com", "2026-09-28T08:20:00+05:30",
    "Figma access",
    "hey Kavya, can you share the Figma file with edit access and export all the icons as SVG by tomorrow? need them for the deck. thanks!\n\n- Pooja",
    { category: "action", urgency: "medium", needs_reply: true,
      tasks: [T("Share Figma file with edit access", ["figma", "share"], "2026-09-29"), T("Export icons as SVG", ["export", "icons"], "2026-09-29")],
      draft_must_include: ["figma"] }],

  ["e13", "Lakeview Library", "library@lakeview-univ.edu", "2026-09-25T09:00:00+05:30",
    "Reminder: book due",
    "Dear Kavya Iyer,\n\nYour borrowed book 'Deep Learning' (Acc. No. LV-88231) is due on 3 Oct 2026. Please return or renew it online to avoid a fine of Rs 5 per day.\n\nLakeview Library",
    { category: "action", urgency: "low", needs_reply: false, tasks: [T("Return or renew library book", ["book", "renew"], "2026-10-03")] }],

  ["e14", "Meghana Pillai", "meghana.pillai@gmail.com", "2026-09-27T20:30:00+05:30",
    "Amma's birthday",
    "Kavya, amma's birthday is next Sunday (4 Oct)! Can you pick up a gift on your way home and order the cake from that bakery near us? I'll handle decorations.\n\n- Meghana",
    { category: "action", urgency: "medium", needs_reply: true,
      tasks: [T("Buy birthday gift", ["gift", "birthday"], "2026-10-04"), T("Order birthday cake", ["cake", "order"], "2026-10-04")],
      draft_must_include: ["gift"] }],

  ["e15", "Lakeview Accounts", "accounts@lakeview-univ.edu", "2026-09-28T08:00:00+05:30",
    "Final reminder: exam fee payment",
    "Dear Student (USN 1LV22CS145),\n\nYour semester exam fee of Rs 2,350 is unpaid. Pay through the student portal by 30 Sep 2026 to avoid being barred from exams. Ref: TXN-778812.\n\nAccounts Office",
    { category: "urgent", urgency: "high", needs_reply: false, tasks: [T("Pay exam fee", ["exam", "fee"], "2026-09-30")] }],

  ["e16", "UnionFirst Alerts", "alerts@unionfirst-bank.com", "2026-09-28T08:30:00+05:30",
    "Suspicious transaction alert",
    "Dear Customer,\n\nA transaction of Rs 18,499 on your debit card ending 4821 at ELECTRO-MART was flagged. If this was not you, call 1800 123 4567 immediately. Reply YES to confirm or NO to block.\n\nUnionFirst Bank",
    { category: "urgent", urgency: "high", needs_reply: false, tasks: [T("Verify flagged card transaction", ["verify", "transaction"], "2026-09-28")] }],

  ["e17", "CloudNest Billing", "billing@cloudnest.io", "2026-09-28T07:30:00+05:30",
    "Action needed: payment failed",
    "Hi Kavya,\n\nYour payment for the Pro plan failed. Update your payment method within 24 hours or your projects will be suspended.\n\nCloudNest Billing",
    { category: "urgent", urgency: "high", needs_reply: false, tasks: [T("Update hosting payment method", ["payment", "update"], "2026-09-29")] }],

  ["e18", "Vikram Shetty", "vikram.shetty@outlook.com", "2026-09-28T08:50:00+05:30",
    "build broken on main",
    "Kavya, the build on main is failing since your last merge. Can you fix it before we demo? Please look at it today.\n\n- Vikram",
    { category: "urgent", urgency: "high", needs_reply: true, tasks: [T("Fix broken build on main", ["build", "fix"], "2026-09-28")], draft_must_include: ["build"] }],

  ["e19", "Lakeview Registrar", "registrar@lakeview-univ.edu", "2026-09-24T15:00:00+05:30",
    "Holiday notice",
    "Dear students,\n\nThe campus and library will remain closed on 2 October 2026 on account of Gandhi Jayanti. Regular classes resume on 3 October.\n\nOffice of the Registrar",
    { category: "fyi", urgency: "low", needs_reply: false, tasks: [] }],

  ["e20", "Vikram Shetty", "vikram.shetty@outlook.com", "2026-09-26T22:10:00+05:30",
    "docs pushed",
    "FYI I pushed the README and architecture docs to the repo. Nothing needed from you.\n\n- Vikram",
    { category: "fyi", urgency: "low", needs_reply: false, tasks: [] }],

  ["e21", "Ananya Bhat", "ananya@brightpixel.co", "2026-09-25T17:45:00+05:30",
    "Thank you!",
    "Hi Kavya,\n\nJust wanted to say thanks for delivering the brand kit. The team loved it!\n\nAnanya",
    { category: "fyi", urgency: "low", needs_reply: false, tasks: [] }],

  ["e22", "GitHub", "notifications@github.com", "2026-09-27T16:00:00+05:30",
    "[deepthink/inboxpilot] Pull request #42 merged",
    "vikram-shetty merged pull request #42: Add approval queue UI.\n\nView it on GitHub: https://github.com/deepthink/inboxpilot/pull/42",
    { category: "fyi", urgency: "low", needs_reply: false, tasks: [] }],

  ["e23", "Ramesh Kulkarni", "ramesh.kulkarni@lakeview-univ.edu", "2026-09-27T10:00:00+05:30",
    "Week 4 notes and midterm syllabus",
    "Hi all,\n\nWeek 4 lecture notes are on the LMS. The midterm syllabus is attached for reference; no submission is required.\n\nRegards,\nProf. Ramesh Kulkarni",
    { category: "fyi", urgency: "low", needs_reply: false, tasks: [] }],

  ["e24", "Google Calendar", "calendar-notification@google.com", "2026-09-28T07:00:00+05:30",
    "Accepted: Client sync @ Tue 29 Sep, 10:00 - 11:30",
    "Ananya Bhat has accepted this invitation.\n\nClient sync\nTuesday 29 September 2026, 10:00 - 11:30 (IST)",
    { category: "fyi", urgency: "low", needs_reply: false, tasks: [] }],

  ["e25", "QuickBite", "deals@quickbite.in", "2026-09-28T06:00:00+05:30",
    "50% off your next 3 orders",
    "Hungry? Get 50% off your next 3 orders with code FEAST50. Valid till Sunday. Order now in the app!\n\nUnsubscribe anytime.",
    { category: "promo", urgency: "low", needs_reply: false, tasks: [] }],

  ["e26", "LearnSphere", "newsletter@learnsphere.com", "2026-09-27T09:00:00+05:30",
    "New this week: 12 courses to level up",
    "This week on LearnSphere: Intro to Prompt Engineering, Advanced SQL, UX Research Basics and 9 more. Start learning today!\n\nUnsubscribe anytime.",
    { category: "promo", urgency: "low", needs_reply: false, tasks: [] }],

  ["e27", "ShopKart", "offers@shopkart.in", "2026-09-28T07:15:00+05:30",
    "FLASH SALE ends tonight!",
    "Up to 70% off on electronics, fashion and more. Sale ends at midnight - act now!\n\nUnsubscribe anytime.",
    { category: "promo", urgency: "low", needs_reply: false, tasks: [] }],

  ["e28", "GrowthHackers", "hello@growthhackers.io", "2026-09-26T13:00:00+05:30",
    "Free webinar: 10x your freelance income",
    "Register now to reserve your seat for our free webinar this Friday. Limited spots. Learn the secrets top freelancers use.\n\nUnsubscribe anytime.",
    { category: "promo", urgency: "low", needs_reply: false, tasks: [] }],

  ["e29", "Meera Joshi", "meera.joshi@lakeview-univ.edu", "2026-09-28T08:05:00+05:30",
    "Capstone proposal",
    "Hi Kavya,\n\nPlease send me your project proposal draft (maximum 2 pages) along with the names of your team members by 3 Oct.\n\nRegards,\nDr. Meera Joshi",
    { category: "action", urgency: "medium", needs_reply: true,
      tasks: [T("Send project proposal draft", ["proposal", "send"], "2026-10-03"), T("Share team member names with professor", ["team", "member"], "2026-10-03")],
      draft_must_include: ["proposal"] }],

  ["e30", "Rohit Nambiar", "rohit@greenleaf.studio", "2026-09-28T08:25:00+05:30",
    "Quote request",
    "Hi Kavya,\n\nCould you send over a quote for the landing page revamp by Monday? We'd like to finalize the budget next week.\n\nRohit",
    { category: "action", urgency: "medium", needs_reply: true, tasks: [T("Send quote for landing page revamp", ["quote", "landing"], "2026-10-05")],
      draft_must_include: ["quote"], draft_must_not: ["(₹|rs\\.?|inr)\\s?\\d"] }],
];

export const SCENARIOS = rows.map(([id, fromName, fromEmail, date, subject, body, truth]) => ({
  raw: { id, thread_id: `t_${id}`, from: { name: fromName, email: fromEmail }, to: [OWNER], subject, date, body },
  truth: { tasks: [], draft_must_include: [], draft_must_not: [], meeting: null, ...truth },
}));
