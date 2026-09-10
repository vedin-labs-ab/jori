# Shell findings — inventory closeout

The user reduced scope to finish the inventory and implement best effort fixes. Broad supplemental measurement stopped before the V3 shell queue began. Eight shell product commits are now supplied for integration and targeted review; see the implementation handoff below. Confirmed causes below can inform the fix pass; candidates and authored motions retain their limits.

The main sweep reviewed141 inventory IDs,563 recorded attempts out of564 profile slots, and2566 PNGs. This count includes explicit blocked/invalid attempts, so it is not a claim of complete intended-state coverage. The V2 partial adds10 attempts,7 completed and47 reviewed PNGs. Total shell image review:2613 PNGs. The separate delegated list review covers18 IDs/72 profiles/432 PNGs.

Authoritative profile ledgers and all occurrences: [main review](/Users/albin/Code/jori/dist/layout-hunt/before/shell/reviewed.json), [V2 review](/Users/albin/Code/jori/dist/layout-hunt/SHELL_V2_REVIEW.json), [all shell causes](/Users/albin/Code/jori/dist/layout-hunt/SHELL_CAUSES.json), [closeout data](/Users/albin/Code/jori/dist/layout-hunt/SHELL_CLOSEOUT.json). The previous detailed report is preserved as [historical findings](/Users/albin/Code/jori/dist/layout-hunt/SHELL_FINDINGS_PRE_CLOSEOUT.md).

Native event times start before action dispatch; screenshot times start after the action returns. Document performance clocks reset on navigation. Do not equate these clocks or treat a computed geometry bracket as a visible PNG bracket.

## Confirmed causes

### SF1 — Font fallback metric mismatch

Geist fallback metrics change: CTA row (24,496,327,42)→(24,522,327,94), demo +78px; native6770ms, value0.116866308. Preload and font-face use the exact same built font URL.

Sources: [styles.css](/Users/albin/Code/jori/src/styles.css), [__root.tsx](/Users/albin/Code/jori/src/routes/__root.tsx).

Strongest record: [shell-route-home-enter/cold-375](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-route-home-enter/cold-375/record.json); [250.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-route-home-enter/cold-375/250.png), [1000.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-route-home-enter/cold-375/1000.png).

### SF2 — Initially open demo sidebar group mount height

Initially open Chats40→72px, Resources +32px at136ms. SSR mount animates height before Radix measurement; user expansion is a separate authored motion.

Sources: [group.tsx](/Users/albin/Code/jori/src/shared/console/shell/group.tsx).

Strongest record: [shell-route-home-enter/warm-1440](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-route-home-enter/warm-1440/record.json); [0.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-route-home-enter/warm-1440/0.png), [250.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-route-home-enter/warm-1440/250.png).

### SF3 — Recent placeholder changes centered chat group height

Recent180px skeleton→one-row60px causes retained centered controls +60px at3202ms. Later two/three-row occurrences differ; retain actual counts. Shared with chat findings.

Sources: [home.tsx](/Users/albin/Code/jori/src/shared/console/chat/home.tsx).

Strongest record: [shell-protected-02-enter/warm-1440](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-protected-02-enter/warm-1440/record.json); [3000.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-protected-02-enter/warm-1440/3000.png), [settled.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-protected-02-enter/warm-1440/settled.png).

### SF4 — Model readiness changes composer footer geometry

Unoccluded composer82→111px, heading−14.5px at591ms. Mobile label155.64×16→icon28×28 at378ms. Shared with chat findings.

Sources: [footer.tsx](/Users/albin/Code/jori/src/shared/console/chat/composer/footer.tsx).

Strongest record: [shell-nested-missing-chat/warm-1440](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-nested-missing-chat/warm-1440/record.json); [250.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-nested-missing-chat/warm-1440/250.png), [1000.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-nested-missing-chat/warm-1440/1000.png).

### SF6 — Execution clock hydration text mismatch and tree rebuild

React#418 and86 replaced retained nodes; equal rectangles do not make a tree rebuild stable. Actual Record hydration diagnostic proves server4m/client4m1s from independently initialized clocks. Minified production error does not identify its first differing label.

Sources: [runs.tsx](/Users/albin/Code/jori/src/landing/demo/pages/runs.tsx), [time.ts](/Users/albin/Code/jori/src/shared/console/runs/time.ts).

Strongest record: [shell-route-pricing-back/cold-375](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-route-pricing-back/cold-375/record.json); [0.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-route-pricing-back/cold-375/0.png), [settled.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell/shell-route-pricing-back/cold-375/settled.png).

### SF9 — Activity skeleton lane count and description metrics

Visible Activity skeleton3lanes→4, with wrapped mobile description: first list y373.38→420.88 (+47.5px), desktop+28px. Native566ms recent=true; PNG capture453→1157ms uses the separate sample clock.

Sources: [lane.tsx](/Users/albin/Code/jori/src/console/context/workstreams/activity/lane.tsx).

Strongest record: [C163-workstreams/warm-375](/Users/albin/Code/jori/dist/layout-hunt/before/controls/C163-workstreams/warm-375/record.json); [250.png](/Users/albin/Code/jori/dist/layout-hunt/before/controls/C163-workstreams/warm-375/250.png), [1000.png](/Users/albin/Code/jori/dist/layout-hunt/before/controls/C163-workstreams/warm-375/1000.png).

### SF10 — Usage loading detail rows omitted

Visible summary207→156→207px on mobile; desktop108→82.5→108px. Omitted detail lines remove25.5px per row. Both live range directions reproduce in all4profiles.

Sources: [stats.tsx](/Users/albin/Code/jori/src/shared/console/folders/usage/stats.tsx).

Strongest record: [shell-live-usage-30-to-7/warm-375](/Users/albin/Code/jori/dist/layout-hunt/before/shell-resume/shell-live-usage-30-to-7/warm-375/record.json); [before.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell-resume/shell-live-usage-30-to-7/warm-375/before.png), [0.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell-resume/shell-live-usage-30-to-7/warm-375/0.png), [250.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell-resume/shell-live-usage-30-to-7/warm-375/250.png).

### SF11 — Integration checking/action provisional metrics

Checking Google Calendar→Not connected pulls Outlook card y575→559 (−16px), native316ms recent=true. Organization return Connect→Reconnect reduces action118.13→96.31px and mobile card188→168px, following cards−20px. Controls ledger retains all4profiles for each direction.

Sources: [index.tsx](/Users/albin/Code/jori/src/console/integrations/card/index.tsx), [headline.ts](/Users/albin/Code/jori/src/console/integrations/card/headline.ts).

Strongest record: [C156-personal/warm-375](/Users/albin/Code/jori/dist/layout-hunt/before/controls/C156-personal/warm-375/record.json); [0.png](/Users/albin/Code/jori/dist/layout-hunt/before/controls/C156-personal/warm-375/0.png), [250.png](/Users/albin/Code/jori/dist/layout-hunt/before/controls/C156-personal/warm-375/250.png).

### SF14 — Waitlist field and form error bands unreserved

Email error adds27.5px and moves retained fields; native95ms,value0.013056644. Clearing reverses it. Generic form-level error adds31.5px; original intended response cases were invalid build-config paths.

Sources: [form.tsx](/Users/albin/Code/jori/src/landing/waitlist/form.tsx), [field.tsx](/Users/albin/Code/jori/src/components/ui/field.tsx).

Strongest record: [shell-waitlist-email-error/cold-375](/Users/albin/Code/jori/dist/layout-hunt/before/shell-resume/shell-waitlist-email-error/cold-375/record.json); [before.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell-resume/shell-waitlist-email-error/cold-375/before.png), [0.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell-resume/shell-waitlist-email-error/cold-375/0.png).

### SF16 — Provider spinner widens raw text content group

ProviderSVG14px→spinner16px widens centered group2px and shifts existing text1px. All16 original profiles show the pixel registration; cold evidence is valid, warm cache repeat skipped.

Sources: [provider-button.tsx](/Users/albin/Code/jori/src/components/auth/provider-button.tsx), [button.tsx](/Users/albin/Code/jori/src/components/ui/button.tsx).

Strongest record: [shell-auth-google-pending/cold-375](/Users/albin/Code/jori/dist/layout-hunt/before/shell-resume/shell-auth-google-pending/cold-375/record.json); [before.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell-resume/shell-auth-google-pending/cold-375/before.png), [0.png](/Users/albin/Code/jori/dist/layout-hunt/before/shell-resume/shell-auth-google-pending/cold-375/0.png).

## Candidates and authored motion

- SF5 late folder breadcrumb (+125.47px), SF7 recent sidebar group (actual72/105/138px; later chat V3 reports136px), SF8 organization sections (+176.5px mobile), SF12 folder row (+16px), SF13 instructions placeholder (+16px), and SF19 invitations have source/native geometry evidence but lack a definitive unoccluded pair in the shell slice. The initial opaque loader may conceal their movement.
- SF15 legal hash navigation briefly shows the hero before the waitlist in one warm desktop pair; the repaired-driver/observer control was skipped. Cold original forward/reverse attempts were incomplete.
- SF17 lazy editor and SF18 sharing placeholder differ from final height, but the measured change was below the viewport. The attempted text-fragment recipe reset to the top after hydration; it is not valid visible coverage.
- Q1 breadcrumb padding, Q2 requested sidebar/group animation, Q3 selected label font weight, and Q4 range-select label width are authored movement questions. Stock popup translation/scale/fade and content publication inside a reserved header are not automatically defects.
- The early native-button style flash was caused by pre-paint probe reads. Observer-only control removed it while reproducing SF1/SF2. Do not fix product button styling for that artifact.

## Coverage limits

- Main record count includes blocked, failed and invalid intended-state recipes; use profile ledger, not record existence, for coverage.
- Stale-error warm375 stalled and is unmeasured. Invitation keyboard recipes, legal SPA completion, toast expiry and missing-chat cold375 repeats were not completed.
- Six intended waitlist response outcomes hit invalid dev public-URL config before fetch. Config is repaired in current build; intended outcomes remain unmeasured.
- Original response interception invalidated warm HTTP cache. Final CDP transport is proven cache preserving, but the response-mocked warm cases were not recaptured.
- V1 warm initial #waitlist/#share recipes can preserve primer document. All17IDs/34warm slots listed in SHELL_WARM_HASH_REPEATS.json remain without V3 replacement records.
- V3 planned17transport plus30ordinary cases were not started after scope reduction. Earlier valid V1/V2 observations remain separate evidence.
- Overlay visibility, in-view sharing/editor and legal wrong-top flash controls were skipped. These candidates are not promoted to visible defects.
- Scoped auth/share/recovery/signout recipes passed bounded selector/transport proofs, not complete four-profile visual measurement. Google full OAuth was completed interactively once; repeated external-provider flows are outside measured coverage.

Warm hash inventory: [17 IDs/34 warm slots](/Users/albin/Code/jori/dist/layout-hunt/SHELL_WARM_HASH_REPEATS.json). The final manifests preserve reachable recipes; a prepared recipe is not a measured pass.

## Tooling handoff

The durable fixture transport is in `scripts/layout/transport/` (11 files). It uses exact CDP Fetch interception, context-only auth fixtures and exact WebSocket query responses. It leaves the eight frozen measurement files unchanged. V3 digest: `7bd0f4b7935def55b1b1686eb0ab475f9ae4ccc8f473d2069a9df9e40f7f6b21`. Biome, five transport tests, structure and dependency checks pass. The final focused proof confirms JS/CSS cache reuse, real permission responses and fresh-document warm fragment entry. No broad sweep followed this proof.

Proofs: [cache and real permission](/Users/albin/Code/jori/dist/layout-hunt/controls-review-final/cache-preflight.json), [warm fragment](/Users/albin/Code/jori/dist/layout-hunt/transport-integration-preflight.json). Full helper hashes are in the closeout JSON. All shell browsers are closed; no shared account reads or writes remain queued.

## Best effort implementation handoff

- SF1: `677c8143` — Use font-display:optional; late fonts no longer swap into the first painted page. Slow visits keep the system fallback.
- SF2: `551920db` — Enable group height animation only after user toggle; initial SSR content uses natural height.
- SF6: `4a078f61` — Seed all three demo execution clock call sites from fixture time; preserve live interval behavior.
- SF9: `ac83e91d` — Partial: render the known description during loading so its wrapping matches. Variable lane-count reservation remains unresolved.
- SF10: `ec8add72` — Keep one comparison line per stat reserved even when detail cannot be stated.
- SF11: `1f99eeed` — Reserve maximum intrinsic install-label width and pending icon size/position; prevent dot shrink. Followup `6eea46e5` preserves the original loading headline, so its variable line count remains unresolved (partial).
- SF14: `95589670` — Reserve error lines at each editable field and below submission; preserve conditional live alerts and focus behavior.
- SF16: `1e563262` — Followup `f7a17fd6` preserves the original provider SVG and makes its pending spinner14px to match the measured default button.

The six focused test files pass22tests, including the new anchored-clock regression. TypeScript, focused Biome and whitespace checks pass. The lead will integrate once and perform a representative browser review. SF9 and SF11 remain partial; candidates and authored motions remain untouched. Exact commits, validation and six representative scenario IDs are in the closeout JSON.
