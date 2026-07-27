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
- [x] Verified sending domain. `mail.usejori.com` is verified in Resend, and
      every sender is the one address in `convex/email.ts`
- [x] Abuse controls: per-caller and global token buckets via
      `@convex-dev/rate-limiter`, a honeypot field, and identical responses for
      new and existing addresses so the list cannot be enumerated
- [ ] Console read surface for signups, or an export

## Phase 4 · Production deployment

The commands exist and the targets are provisioned. What is left needs
accounts this repository cannot reach.

- [x] Split every command and resource name by environment, and add
      `pnpm deploy:prod` with its guards and preflight
- [x] Provision the production Convex deployment `insightful-goat-7` in US East,
      inside the existing `jori` project, and deploy the backend to it
- [x] Create the `jori` Vercel project, set its Production build variables, and
      attach `usejori.com` and `www.usejori.com`
- [x] Point the Porkbun DNS at Vercel and deploy the frontend. `usejori.com`
      serves the marketing routes; every other host is refused
- [x] Verify `mail.usejori.com` in Resend and set `RESEND_API_KEY` on the
      production deployment
- [ ] Set `www.usejori.com` to redirect to the apex in the Vercel project's
      domain settings. It currently refuses the request as a wrong host
- [ ] Delete the empty `jori-prod-us` Convex project, created by mistake and
      unused. Convex has no CLI for it
- [ ] Give the development deployment's Resend key sending access to
      `mail.usejori.com`, now that the sender is one hardcoded address
- [ ] Register the production Google and Microsoft OAuth clients against
      `https://usejori.com/api/auth/callback/{google,microsoft}` and set all
      four credentials. Sign-in resolves both providers on every auth request,
      so it stays broken until all four exist
- [ ] Recreate the development deployment in US East so it mirrors production.
      A Convex deployment's region cannot be changed after creation, and the
      current one sits in EU West. This discards development data and needs the
      development deployment variables set again
- [ ] Smoke test: marketing routes, waitlist submission, confirmation email,
      sign-in, the waitlist gate, and one allowlisted address reaching the
      console

Integrations, Trigger.dev, E2B, and Stripe are deliberately **not** part of
this phase. Sign-in is, because the waitlist gate is only visible behind it.

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
  architecture may be described as built; residency may not be promised. The US
  frontend host cannot serve the EU region, so the EU host is an open selection
  and no marketing copy claims either residency or sovereignty
- **The active-workstream / commitment / verification data model.**
  Contract-backed app state already serves as a typed, validated, shared work
  object. Promote fields into a native model only after the same ones recur
  across several real users
- **CRM, ticketing, and customer/account identity.** No account entity exists in
  the schema, and adding one is a semantic layer, not a connector. Out of scope
  until a paying user's process requires it
