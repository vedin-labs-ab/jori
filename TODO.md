# TODO

High-level work to get Jori from "built, unpositioned" to "positioned, deployed,
collecting qualified waitlist signups". Product completeness is not a launch
gate; a truthful public promise is.

Position: **Jori runs the recurring work your team does by hand, and leaves
behind a live app the team can open instead of a message.**

ICP: founders, engineering leads, and operations-minded people at software
companies of roughly 10–80 people running Slack, GitHub, and Linear.

## Phase 1 · Positioning source of truth

- [x] Rewrite `PRODUCT.md` around the new job (team ops, app-first)
- [x] Create this file
- [x] Settle the public vocabulary: "app" replaces "artifact" everywhere,
      internals included, so the concept reads the same in the UI, the schema,
      the tool names, and the SDK
- [ ] Decide whether the `workstreams` console page survives the repositioning
      or becomes internal-only context grounding

## Phase 2 · Marketing site

- [x] **Hero prop**: a live Release readiness app replaces the morning brief
- [x] Home sections: `Day` and `Context` retired, `Apps` added as the substance
      section, `Threads` reframed to one-off mentions, `Control` restaged on the
      new fiction
- [x] Home copy against the new promise, meta description and page titles
- [x] Trust page: receipts and approvals restaged, subprocessor list corrected,
      nothing claimed that does not ship
- [x] Pricing page: tiers replaced with the pricing *shape* plus an honest
      "numbers at launch" note. `contracts/billing.ts` is untouched
- [ ] OG image against the new promise (currently text-only metadata)
- [ ] Legal and privacy review for waitlist data collection

## Phase 3 · Waitlist

- [x] `waitlist` table, public `join` mutation, one shared validation path in
      `contracts/waitlist.ts` so the form and the server agree
- [x] Form on every marketing page: email, team size, and the qualifying
      question. Provider-free, so public pages stay outside the Convex and auth
      runtime
- [x] Confirmation email through a shared `convex/email` edge, reused by
      organization invitations
- [x] Field-level validation: rejections name their field, so the form marks
      that input invalid instead of printing one notice under the whole thing
- [ ] Verified sending domain. Both senders currently fall back to
      `onboarding@resend.dev`, which is Resend's test domain and only delivers
      to the account owner. Set `JORI_EMAIL_FROM` once a domain is verified
- [x] Abuse controls: per-caller and global token buckets via
      `@convex-dev/rate-limiter`, a honeypot field, and identical responses for
      new and existing addresses so the list cannot be enumerated
- [ ] Console read surface for signups, or an export

## Phase 4 · Production deployment

No production target exists today. `pnpm deploy` only targets the development
Convex deployment, and no hosting provider is configured.

- [ ] Register the domain
- [ ] Provision a production Convex deployment, separate from the existing
      personal development deployment
- [ ] Create the Railway project (see the 2026-07-24 decision in `EU.md`) and
      wire `VITE_JORI_REGION`, `VITE_JORI_ENABLED_REGIONS`,
      `VITE_JORI_PUBLIC_ORIGIN`, `VITE_JORI_US_ORIGIN`, `VITE_JORI_EU_ORIGIN`,
      `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`
- [ ] Set deployment-local `JORI_APP_URL`, `JORI_REGION`, `BETTER_AUTH_SECRET`,
      `JORI_EMAIL_FROM`, and the Resend credentials
- [ ] Add a `deploy:production` script alongside `deploy:development`
- [ ] Smoke test: marketing routes, waitlist submission, confirmation email

Sign-in, integrations, Trigger.dev, E2B, and Stripe are deliberately **not**
part of this phase. The waitlist launch needs none of them in production.

## Phase 5 · Product gaps for the new positioning

Ordered by how much each one blocks the promise.

- [ ] **Linear write depth.** `contracts/permissions/catalog/linear.ts` has
      search, read, comment, and react. There is no create or update issue. For
      a product about moving work, this is the sharpest gap. GitHub is already
      far deeper
- [ ] **Apps as a first-class object.** Today an app is mostly a byproduct of a
      playbook. It needs to be something a user asks for, browses, shares with
      the team, and returns to
- [ ] **App creation from a conversation.** The home page stakes the pitch on
      one thread turning into a published, automation-backed app. The
      primitives exist; the path has never been proven end to end. Prove it,
      then make it reliable
- [ ] **Multi-user presence.** Shared state exists; "who else is looking at
      this, who changed what, what did the last run do" does not. This is where
      the multiplayer claim becomes visible instead of asserted
- [ ] **The playbook catalog is the old positioning.** Morning brief, meeting
      briefing, follow-up sweep, and week in review are personal-assistant
      playbooks. They still work and are deliberately not marketed. Decide
      whether they become team-shaped app templates or retire
- [ ] **Email and calendar as observed events.** `convex/events/schema.ts`
      models Slack, GitHub, Linear, and Notion only. Fine for engineering-shaped
      processes; a hard limit the moment a process is email-driven. Do not build
      this until a real user's process demands it

## Explicitly not now

- **Open source.** Real commitment (license, open-core boundary, contribution
  surface, support load, security disclosure) that buys nothing at waitlist
  stage. Easier to do later than to undo
- **EU residency claims.** `EU.md` is the gate. EU is disabled, Trigger.dev is
  blocking, and roughly ten provider rows are unverified. Region-isolated
  architecture may be described as built; residency may not be promised. Railway
  improves residency but not sovereignty, and no marketing copy claims either
- **The active-workstream / commitment / verification data model.**
  Contract-backed app state already serves as a typed, validated, shared work
  object. Promote fields into a native model only after the same ones recur
  across several real users
- **CRM, ticketing, and customer/account identity.** No account entity exists in
  the schema, and adding one is a semantic layer, not a connector. Out of scope
  until a paying user's process requires it
