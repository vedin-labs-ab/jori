# Validation

This file is the commercial loop, kept in the repo the way the engineering
loop is: hypotheses, script, offer, evidence, and the decision rule, so the
current strategy is always readable from the filesystem and never only in
someone's head. [TODO.md](TODO.md) holds the work; this file holds why, for
whom, and how we will know.

Today's date anchors below: sprint start 2026-08-04.

## Wedge

**Jori writes the Monday pre-read.** A live page assembled from the week's
activity across Slack, GitHub, Linear, and Notion: what moved, what stalled,
what shipped, every line citing its evidence, nothing typed in. Opened by the
leadership team before the weekly sync.

Why this wedge, compressed: it runs on the rarest primitive in the codebase
(the deduction engine), the buyer is the persona the founder network actually
reaches, weekly cadence gives fast habit formation and fast learning, and the
pilot structure validates itself: backfill runs, the founder reviews the
inferred picture, and that meeting is either the sale or the kill signal.

RFS context, checked 2026-08-03: no current YC RFS item covers organizational
awareness, status, or pre-reads. The wedge is adjacent to "Multiplayer AI"
(one shared living surface instead of a thousand private threads) and "A
Cloud for Small Software" (bespoke team tools for "tracking important
numbers") without being the literal reading of either, which is the
right amount of RFS overlap: validated demand shape, not the crowded center.

## Hypotheses

| # | Hypothesis | Persona | Test |
| --- | --- | --- | --- |
| H1 | The Monday pre-read (wedge) | Founder/CEO/COO, 20–80 person product company, runs the weekly leadership sync | "Who assembles the Monday picture, and what did you find out late?" |
| H2 | Launch readiness (named alternate) | Head of Product/PMM, 30–80 B2B SaaS; founder at the small end | "Walk me through your last launch. What nearly slipped through?" |
| H3 | What-shipped, publishable edition | Head of Product/PMM; CS lead as second reader | "How do customers and sales find out what shipped?" |
| C | Cross-boundary client status (contingency) | Founder/account lead at 10–50 person dev shop, consultancy, agency | Runs only if H1–H3 die; two weeks of conversations, no build |

H2 swaps into the wedge slot if launch questions out-wince sync questions
across the first ten calls. H3 ships as a section of the pre-read either way;
its standalone form is the first expansion inside a live account. The
customer-bug pipeline is deliberately not a hypothesis: it is an expansion
playbook, gated in TODO.md behind a paying organization showing the pain.

If C activates (fewer than three pilots on the decision date), its target
is accounting and CFO-services firms serving 10–80-person startups, not
audit upmarket: Fieldguide ($75M Series C, half the US top-100 firms),
Circit (all top-20 global networks), and DataSnipper ($1B) already hold
that field. Qualification test for any C workflow, from the 2026-08-04
multiplayer-AI analysis: asymmetric authority, a trust boundary inside the
loop, a governed artifact as output, and the approval log as evidence,
plus one correction to that thread's litmus: the blocker that keeps the
work out of a free group chat may be structural (privilege, attestation)
or economic (someone still has to do the assembling every week); both
count. Client-side scouting data comes from script probe 7. Shared live
sessions are not part of C in any form; the commoditized surface stays
dead.

## Interview script

Thirty minutes. The first twenty belong to them; the demo is not shown before
the walk-through under any circumstance.

1. "Walk me through last Monday. How does the leadership sync get assembled,
   and by whom?"
2. "What did you find out later than you should have, in the last month?"
   (The wince question. Log the story verbatim.)
3. "What does the assembly cost?" (Chase a number: hours per week, whose
   hours, what they'd be doing instead.)
4. "What have you tried?" (Dashboards, standup bots, a Notion page someone
   stopped updating. Log the graveyard; it prices the problem.)
5. H2 probe: "Walk me through your last launch. What nearly slipped?"
6. H3 probe: "How do customers find out what you shipped?"
7. C probe, when time allows: "Who does your accounting and audit prep,
   and what does that back-and-forth look like?" Every founder is some
   accounting firm's client, so the 25 calls scout the contingency from
   the client side for free.
8. Only if a wince appeared: five-minute demo of the pre-read on our own
   workspace, then the offer, verbatim from the section below.
9. Always, regardless of fit: "Who do you know who runs a heavier Monday
   than you?" Two names or a pilot step; no call ends with neither.

Scoring per call, logged the same hour: wince 0–2, hours number if given,
graveyard entries, objections verbatim, next step. "Interesting" scores 0.
A calendar invite or money scores.

## Outreach playbook

- **List.** 40 names from the network audit, ranked warmth times persona
  fit: warm (worked together), half-warm (met, mutual, same community), cold
  (Stockholm ecosystem: founders of 10–80 person software companies).
- **Message.** Two sentences, personal, no deck, and the ask is their
  process, not a demo: "Building something new and trying to falsify an idea
  about how leadership teams keep track of what's actually going on. Can I
  get 25 minutes on how your Monday works?" Cold variant adds one line of
  who I am. No mass mail; every message references something true about
  them.
- **Cadence.** 8–10 calls a week for three weeks. Conversations 1–5 are
  script rehearsal against the friendliest names, and their data counts.
- **Follow-up.** A winced call gets the one-page pilot offer and the DPA
  within 24 hours and a proposed date for the connect-the-workspace session.
  Everyone else gets a thank-you and is asked again only when the product
  can show their company something true.
- **Rules.** Never free. Never demo first. Never pitch the platform; pitch
  the Monday. The wedge is the sentence, the platform is the roadmap.

## Pilot offer

- **Price: 400 EUR per month, flat for the organization, model usage
  included up to a fair cap, paid from day one.** Anchors from the
  2026-08-03 scan: Bond charges $99 per seat, so a five-person leadership
  circle costs about $500 a month; seat-priced agent platforms land around
  20–40 EUR per seat across a company. One flat 400 EUR slightly undercuts
  both for a typical 20–80-person team without reading as a hobby tool.
  After week four it converts to the standard shape: one organization
  price plus usage at provider list rates. `contracts/billing.ts` stays
  untouched until launch numbers are settled.
- The price is never discounted to zero. An organization that resists
  400 EUR for the thing its leadership opens weekly is evidence about the
  wedge, not an invitation to negotiate.
- Four weeks, paid from day one, cancel anytime, no card games.
- Week one: connect Slack, GitHub, Linear, Notion; backfill runs; we review
  the inferred picture together and correct it. That meeting is the setup
  and the accuracy test at once.
- Success metric written down together before the pilot starts, default:
  "by week two, the leadership sync opens with the pre-read on screen."
- End of week four: converts to a plain subscription or dies. Either
  outcome is logged in the evidence log with the reason.

## Competition

Scanned 2026-08-03. What matters for the sprint:

**The platform collision: Stilla (stilla.ai, Stockholm).** Out of stealth
January 2026 with a $5M General Catalyst pre-seed; founders ex-Shopify
(built Shop and Shop Pay). "One teammate for the whole company. Knows your
context. Follows your permissions. Does the work." Mentions in Slack and
Teams threads, GitHub PRs, meeting notes, automations, sandboxed coding,
cross-tool search; press frames it as a shared brain aggregating Slack,
GitHub, Linear, and Notion signals. Cited customers include Spotify, Ramp,
Lovable, and Legora. Pricing is org-flat plus credit tiers: $50 per
organization per month base ($40 billed yearly) at 40k credits, scaling at
roughly $1.25 per 1,000 credits, Team plan capped at 29 members.

Consequence: the horizontal "AI teammate for your company" lane in
Stockholm is funded, live, and already selling into the same network this
sprint will call. Jori does not pitch that lane, ever, in any call. The
wedge is the answer to the inevitable question, kept in every call's back
pocket: "Stilla is a teammate you mention when you think of it; the
pre-read is the page your leadership opens Monday morning, every line
cited, nobody had to remember to ask."

**Platform pricing mechanics** (for launch shape, not the pilot): every
surviving platform meters usage in credits. Dust dropped flat fair-use for
$30/seat plus 8k credits in June 2026; Town sells personal tiers $15–199
and team seats from $59; Relay.app shut down this quarter. Stilla is
org-flat plus marked-up credits. Jori's existing shape, one organization
price with usage at provider list rates and no markup, matches Stilla's
structure and undercuts its credit margin, and the in-code Starter number
already sits under Stilla's base. Nothing about the pilot price changes
because of this; the pilot sells the artifact and the setup, and converts
to the standard shape afterwards.

**Closest three on the wedge itself.**

- **Bond (YC X25).** "AI chief of staff for CEOs": connects Slack, Gmail,
  Calendar, Linear, Notion, CRM; daily prioritized brief; pitched as killing
  status meetings. $99/seat/mo. Same buyer, same promise family. Differs:
  daily personal to-do versus weekly org narrative; no GitHub and no
  product or revenue data among its connectors; citations not evident.
- **Linear Pulse, plus agent-assisted project updates.** The native
  encroachment: an auto-inferred update feed, now drafting project updates
  from activity and linked Slack channels, free on every Linear plan.
  Linear-data-only, framed as a feed rather than a meeting artifact. The
  trajectory to watch most closely.
- **Stepsize AI (acquired by ClickUp).** The purest prior implementation of
  a zero-input weekly narrative with sources; issue-tracker-only, and
  strategically parked since the acquisition. Proof the mechanism works and
  the demand existed.

**The real day-one competitor** in most accounts is none of these: it is
the DIY digest. Junior, UpdateMate, Notion 3.0 agents, and n8n templates
let a motivated ops person assemble a weekly summary, and someone then
babysits it forever. The pilot is priced against the babysitter.

**Whitespace the wedge claims.** No product spans dev activity and business
metrics in one narrative. Citations are almost universally absent; every
native AI summary is trust-me prose. Nothing anchors to the leadership sync
as a ritual artifact. Nobody models the negative space, "what stalled",
which is the thing a sync exists to catch. And the 20–80-person flat-price
slot is open: standup bots at $3–8/user need humans to type, exec tools
start at $99/seat, Glean and Jellyfish are enterprise-sized.

**Positioning consequences.** The pitch never says "AI chief of staff"
(Bond's frame) and never says "status updates" (the graveyard's frame). It
says the pre-read, the sync, the citations, and what stalled. Objection
prep: "Linear Pulse does this" gets "Pulse reads Linear; your week happens
in five tools, and the sync needs one picture, not a feed." "We could build
this with Notion agents" gets "you can, and someone babysits it; the pilot
costs less than the babysitter." "How is this not Stilla?" gets "Stilla is
a teammate you ask; the pre-read arrives without being asked, holds the
whole week in one page, and cites every line. If you already run Stilla,
the pre-read still lands Monday."

## Kill / commit

- **Decision date: 2026-09-18.**
- **Commit** means three or more organizations with a signed paid pilot by
  the decision date. Then: narrow to what pilots use, build the PostHog
  connector for the first account that wants numbers, and begin the
  what-shipped expansion.
- **Kill** means fewer than three. Then the wedge is dead as led; the
  contingency (cross-boundary client status) gets exactly two weeks of
  conversations, ending 2026-10-02, using the same script reshaped for
  agencies and consultancies, before any new build or any new positioning.
- The metric that counts is signed paid pilots. Waitlist entries, warm
  words, and "send me a deck" count for nothing in this file.

## Evidence log

Append per conversation, newest first. Verbatim beats summary.

| Date | Who (role, company size) | Warmth | Wince | Hours | Quote | Next step |
| --- | --- | --- | --- | --- | --- | --- |

## Network audit

40 rows before outreach begins: name, company, size, persona (H1/H2/H3/C),
warmth, path to them. Lives here so the ICP claim stays testable: if the
list will not fill with H1 personas, the ICP is wrong, and that is evidence
too.

| Name | Company | Size | Persona | Warmth | Path |
| --- | --- | --- | --- | --- | --- |

## Co-founder

The open question this sprint does not answer but must not lose: four
products with zero users is a missing commercial function, not an idea
problem. Approach, in order:

- Run this sprint solo first. The founder must be able to sell the wedge
  unassisted before anyone else can be evaluated on selling it, and a
  co-founder who joins after evidence joins a company, not a build.
- Audition inside the sprint: invite promising commercial people to run
  three to five of the 25 calls together. Chemistry under real calls beats
  any coffee chat.
- Channels, in parallel with the sprint's back half: the fintech alumni
  diaspora first (operators who sold product-led tools and know the
  Stockholm buyer), then YC co-founder matching with an explicit
  "commercial, EU timezone" filter, then Stockholm ecosystem surfaces
  (SUP46, Sting, Norrsken events) as background cadence.
- Terms when it gets real: standard four-year vesting with a one-year
  cliff for both sides, and a split close enough to equal that the
  commercial half is a founder, not an early hire with a title.
