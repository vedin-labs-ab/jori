# TODO

High-level work to get Jori from "positioned, unsold" to "three paying pilot
organizations or a documented kill". A truthful public promise remains the
gate for marketing copy; a paying organization is the gate for everything
else, including new product surface.

Position: **Jori writes the Monday pre-read: a live page assembled from the
week's activity across the team's tools, opened before the leadership sync,
every line cited.**

Wedge ICP: founders, COOs, and operations-minded leads at software companies
of roughly 10–80 people running Slack, GitHub, and Linear, reached warm
through the Stockholm network first.

[VALIDATION.md](VALIDATION.md) holds the hypotheses, personas, interview
script, outreach playbook, pilot offer, competition notes, and the evidence
log. This file holds the work. The positioning, marketing-site, waitlist, and
deployment phases that preceded this file's current shape are done and their
history lives in git.

## Phase 0 · Validation sprint

Build gates, smallest honest versions, in order:

- [ ] **History backfill.** The deduction engine feeds on webhook events only,
      so day one of any pilot shows an empty roster. Add a backfill pass that
      runs effort/workstream deduction over historical GitHub, Linear, Slack,
      and Notion activity, so "connect, then see your company mapped" is true
      within the first hour. This is the demo, so it goes first
- [ ] **The pre-read app.** A first-party app authored by us, running on the
      apps platform: week header, moved/stalled/shipped, attention rows with
      citations, refreshed by a weekly automation, delivered through the
      existing playbook preference channels. No conversation-to-app
      generation on this path
- [ ] **Dogfood accuracy check.** Run backfill against one friendly
      organization's real workspace before any sales conversation, and review
      the inferred roster together. The engine has never digested a real
      organization; that first contact happens in private, not in a pilot
- [ ] **Pilot legal.** A real privacy policy and a lightweight DPA template.
      Placeholder legal pages block connecting anyone's workspace

Sales work, which is the actual sprint:

- [ ] **Network audit.** The 40 warmest reachable people, with company, size,
      and persona fit, logged in VALIDATION.md. Decides outreach order, and
      tests whether the ICP matches the network or needs revisiting
- [ ] **Outreach.** 25 conversations against the interview script. Every one
      logged in the evidence log, verbatim where it stings
- [ ] **Pilot offers.** Paid from day one, terms per VALIDATION.md, success
      metric written down with the pilot organization before it starts
- [ ] **Kill or commit.** Three paid pilots by the decision date in
      VALIDATION.md, or the wedge is dead and the cross-boundary variant gets
      its two weeks of conversations before anything new is built

## Parked · Marketing polish

Deliberately parked until pilots convert: the OG image, and a console read
surface or export for waitlist signups. During the sprint the site's only job
is to not embarrass warm outreach.

## Parked · Production smoke test

- [ ] Smoke test: marketing routes, waitlist submission, confirmation email,
      sign-in, the waitlist gate, and one allowlisted address reaching the
      console

The rest of the deployment phase is done. Integrations, Trigger.dev, E2B, and
Stripe stay out of it.

## Phase 5 · Product gaps, reordered for the wedge

Ordered by how much each blocks the pre-read promise. Nothing below the first
item gets built without a pilot organization asking.

- [ ] **History backfill** is the sharpest gap now (Phase 0)
- [ ] **PostHog read connector.** The numbers half of the pre-read. Built for
      the first pilot that wants metrics in the picture, not before
- [ ] **Stripe read connector.** Same rule, for revenue in the picture
- [ ] **Linear write depth.** Create and update issue. Gated behind the
      customer-bug pipeline playbook, which is gated behind a paying
      organization showing the pain in its own support channels
- [ ] **Apps as a first-class object** and **app creation from a
      conversation.** Explicitly deferred: the pre-read ships as a
      first-party app, so the generative path is a later chapter rather than
      a launch gate
- [ ] **Multi-user presence.** Deferred until pilot teams ask who changed what
- [ ] **The playbook catalog.** Morning brief, meeting briefing, follow-up
      sweep, and week in review are retired: nothing lists or markets them.
      Their code leaves when removal is free. The forward catalog is the
      pre-read, the publishable what-shipped edition, and the gated
      customer-bug pipeline
- [ ] **Email and calendar as observed events.** Unchanged: built when a real
      user's process demands it

## Explicitly not now

- **Open source.** Real commitment (license, open-core boundary, contribution
  surface, support load, security disclosure) that buys nothing at pilot
  stage. Easier to do later than to undo
- **EU residency claims.** `EU.md` is the gate. EU is disabled, Trigger.dev is
  blocking, and roughly ten provider rows are unverified. Region-isolated
  architecture may be described as built; residency may not be promised
- **The active-workstream / commitment / verification data model.**
  Contract-backed app state already serves as a typed, validated, shared work
  object. Promote fields into a native model only after the same ones recur
  across several real pilots
- **CRM, ticketing, and customer/account identity.** No account entity exists
  in the schema, and adding one is a semantic layer, not a connector. Out of
  scope until a paying organization's process requires it
