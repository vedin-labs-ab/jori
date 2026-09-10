# Layout shift findings

## Scope and decision

On 2026-09-10 the user shortened the task: finish the inventory, implement best effort fixes, and skip an extensive verification/fix loop. This report closes the broad hunt with explicit coverage limits. It does not claim exhaustive measurement or that every confirmed cause will be fixed. Product UI changes begin only after this findings file is presented.

The source inventory contains 1,101 transitions and four planned profiles per transition: cold and warm at 1440×900 and 375×812. Authentication succeeded with the authorized development account. Real account reads and isolated shared-component fixtures are distinguished in the inventory. No production deployment or shared-account administrative changes were performed.

The latest frozen recorder is V3 (`b8088f41`, SHA256 `7bd0f4b7935def55b1b1686eb0ab475f9ae4ccc8f473d2069a9df9e40f7f6b21`). Earlier valid evidence is retained with its recorded digest. Warm fragment visits from older recorders are not accepted as complete; pending repeats remain a coverage limit. Interrupted captures, failed recipes and unreviewed frames are not passes.

## Fix priorities

| Cause | Observed behavior | Planned best effort treatment |
| --- | --- | --- |
| Dialog state lifetime | Rename/create drafts clear, schema bodies collapse and Settings switches panels during exit. | Retain the displayed state through exit; initialize drafts when opening. |
| Variable labels and indicators | Spinner, Stop, model/effort labels and duration digits move adjacent controls. | Reserve intrinsic label/icon slots; use tabular digits for clocks. |
| Validation | Error messages add 27.5px and push existing fields. | Reserve an accessible error slot in the affected form layouts. |
| Loading geometry | Recent lists, composer hints, activity and usage placeholders resolve to different sizes. | Match placeholders to the visible content structure and keep resolved content during refetch where possible. |
| Font loading | Fallback text wraps differently when Geist arrives. | Preserve text geometry without silently introducing animation. |
| Data-dependent table sizing | Filtering and renaming redistribute existing column widths and menu anchors. | Stabilize shared column sizing where it can preserve the existing responsive layout. |
| Facet and pagination footers | A conditional footer adds/removes 33px; narrow pager loses 28px. | Reserve the existing footer slots. |

The fix commits and targeted after evidence will be recorded separately. A source change alone is not reported as a measured zero. Required repository checks remain in scope; the full inventory rerun and repeated fix loop are waived by the user's later instruction.

## Evidence and coverage

[Inventory](LAYOUT_SHIFT_INVENTORY.md) lists all transitions. [Per-profile coverage](LAYOUT_SHIFT_COVERAGE.csv) records reviewed, partial, unavailable and unmeasured cases. [Every recorded cause occurrence](LAYOUT_SHIFT_OCCURRENCES.csv) retains the inventory ID, profile, recorded action timing, before/after pair and original trace location. Native traces include recent-input events. Detailed rect/scroll changes, element selectors and visibility limits remain in the area reports and raw JSON records:

- [Shell findings](SHELL_FINDINGS.md)
- [Chat findings](CHAT_FINDINGS.md)
- [Controls findings](CONTROLS_FINDINGS.md)
- [Lists findings](LISTS_FINDINGS.md)

Raw JSON and PNGs stay together under the ignored `dist/layout-hunt` directory in the primary checkout because real account captures may include development data. Each occurrence links to those local artifacts. Snapshot and PNG clocks are distinct; a native event between two geometry samples does not by itself prove both screenshot times bracket it.

## Intentional motion and open questions

Existing Dialog/Drawer/Popover transform and opacity entrances/exits, user scrolling and dragging, direct text editing, caret/spinner animation, and bottom-anchored streaming growth are accepted when their neighboring layout stays stable. Requested collection/disclosure changes, hover padding, sidebar expansion, focus-driven grid scrolling and mobile dock changes remain review questions where source intent is ambiguous. No new motion is silently added. A question or candidate below remains open unless a fix entry explicitly resolves it.

## Root causes

Cases sharing the same source cause are merged, with original cause IDs retained. Similar symptoms at different source sites remain separate.

| ID | Finding | Status | Recorded occurrences | Source |
| --- | --- | --- | ---: | --- |
| SF1 | Font fallback metric mismatch | confirmed | 20 | `src/routes/__root.tsx`, `src/styles.css` |
| SF2 | Initially open demo sidebar group mount height | confirmed | 19 | `src/shared/console/shell/group.tsx` |
| CHAT-F03 / SF3 | Recent placeholder changes centered chat group height | confirmed | 66 | `src/console/chat/home.tsx`, `src/shared/console/chat/home.tsx`, `src/shared/console/chat/home.tsx` |
| CHAT-F04 / SF4 | Model readiness changes composer footer geometry | confirmed | 84 | `src/console/chat/models.ts`, `src/shared/console/chat/composer/footer.tsx`, `src/shared/console/chat/composer/index.tsx`, `src/shared/console/chat/composer/footer.tsx` |
| CHAT-F05 / SF5 | Late chat folder breadcrumb trail | confirmed | 20 | `src/console/chat/filing/index.tsx`, `src/shared/console/shell/frame.tsx`, `src/console/chat/filing/index.tsx` |
| SF6 | Execution clock hydration text mismatch and tree rebuild | confirmed | 3 | `src/landing/demo/pages/runs.tsx`, `src/shared/console/runs/time.ts` |
| SF7 | Async recent-chat sidebar group insertion | confirmed | 82 | `src/console/chat/recent.ts`, `src/shared/console/shell/navigation.tsx` |
| SF8 | Organization website and sources reservation | confirmed | 3 | `src/console/context/organization/index.tsx`, `src/console/context/organization/profile/index.tsx`, `src/console/context/organization/profile/sources.tsx` |
| SF9 | Activity skeleton lane count and description metrics | confirmed | 12 | `src/console/context/workstreams/activity/lane.tsx`, `src/console/context/workstreams/activity/pulse.tsx` |
| SF10 | Usage loading detail rows omitted | confirmed | 12 | `src/shared/console/folders/usage/stats.tsx` |
| CF-15 / SF11 | Integration checking/action provisional metrics | confirmed | 16 | `src/console/integrations/card/headline.ts`, `src/console/integrations/card/index.tsx` |
| SF12 | Job folder query grows stacked detail row | candidate | 2 | `src/shared/console/materials/cells/folder.tsx` |
| SF13 | Job instruction skeleton height mismatch | candidate | 2 | `src/shared/console/jobs/detail/instructions/index.tsx` |
| SF14 | Waitlist field and form error bands unreserved | confirmed | 36 | `src/components/ui/field.tsx`, `src/landing/waitlist/form.tsx` |
| SF15 | Legal hash navigation shows home top before anchor | candidate | 1 | `src/landing/cta.tsx` |
| SF16 | Provider spinner widens raw text content group | confirmed | 16 | `src/components/auth/provider-button.tsx`, `src/components/ui/button.tsx` |
| SF17 | Landing editor placeholder height mismatch | candidate | 2 | `src/landing/home/mocks/jobs.tsx` |
| SF18 | Sharing ClientOnly placeholder document extent mismatch | candidate | 32 | `src/landing/home/mocks/sharing.tsx` |
| Q1 | Authored material breadcrumb padding animation | question | 20 | `src/shared/console/shell/frame.tsx` |
| Q2 | Authored user sidebar and group expansion | question | 12 | `src/components/ui/sidebar.tsx`, `src/shared/console/shell/group.tsx` |
| Q4 | Selected range label changes retained calendar position | question | 8 | `src/components/ui/select.tsx` |
| CHAT-F01 | Attachment result page intrinsic height | confirmed | 68 | `src/components/ui/command.tsx`, `src/components/ui/popover.tsx`, `src/shared/console/chat/composer/attach.tsx` |
| CHAT-F02 | Live duration proportional digits | confirmed | 1 | `src/shared/console/runs/row/index.tsx`, `src/shared/console/runs/row/status.tsx`, `src/shared/console/time.ts` |
| CHAT-F06 | Inline mention baseline adds1.3px | confirmed | 12 | `src/shared/console/chat/composer/node.tsx`, `src/shared/console/mentions/chip.tsx` |
| CHAT-F07 | Model and effort label lengths resize controls | confirmed | 16 | `src/shared/console/chat/composer/footer.tsx`, `src/shared/console/chat/models/index.tsx` |
| CHAT-F08 | Submenu selection scrolls parent model menu | confirmed | 2 | `src/components/ui/dropdown-menu.tsx`, `src/shared/console/chat/models/index.tsx` |
| CHAT-F09 | Run Stop control adds unreserved32px | confirmed | 32 | `src/shared/console/chat/composer/footer.tsx` |
| CHAT-F11 | Working disclosure shifts Thinking148px | confirmed | 8 | `src/shared/console/chat/working.tsx`, `src/shared/console/task.tsx` |
| CHAT-F12 | Transcript shrink clamps scroll before anchor recomputation | confirmed | 10 | `src/components/ui/message-scroller.tsx`, `src/shared/console/chat/thread/reasoning.tsx` |
| CHAT-F13 | Questionnaire page intrinsic sizes move actions | confirmed | 16 | `src/components/ui/questionnaire.tsx`, `src/shared/console/chat/thread/question.tsx` |
| CHAT-F14 | Validation inserts unreserved error row | confirmed | 8 | `src/components/ui/questionnaire.tsx`, `src/shared/console/chat/thread/question.tsx` |
| CHAT-F15 | Removing context removes composer addon36px | confirmed | 4 | `src/components/ui/input-group.tsx`, `src/shared/console/chat/composer/index.tsx` |
| CHAT-F16 | Approval action removal shifts following Log36px | confirmed | 4 | `src/shared/console/runs/request/approval.tsx`, `src/shared/console/runs/request/section.tsx` |
| CHAT-Q1 | Authored breadcrumb hover padding | question | 18 | `src/shared/console/shell/frame.tsx` |
| CHAT-Q2 | Resource pane changes existing conversation width | question | 19 | `src/shared/console/chat/pane/index.tsx` |
| CHAT-Q3 | Authored last-three-line reasoning tail | question | 37 | `src/shared/console/chat/thread/reasoning.tsx` |
| CHAT-Q4 | Long message unanimated Show more disclosure | question | 8 | `src/components/ui/expandable-text.tsx`, `src/shared/console/chat/thread/message.tsx` |
| CHAT-Q5 | Closing inactive tab moves remaining tabs | question | 4 | `src/shared/console/chat/pane/header.tsx`, `src/shared/console/chat/pane/tabs.ts` |
| CHAT-Q6 | Answered questionnaire becomes summary | question | 4 | `src/components/ui/questionnaire.tsx`, `src/shared/console/chat/thread/question.tsx` |
| CHAT-Q7 | CodeMirror line-number digit boundary changes gutter width | question | 4 | `src/shared/console/files/editor/section.tsx` |
| CHAT-Q8 | Mobile file-kind dock height moves navigation37px | question | 4 | `src/shared/console/files/dock.tsx` |
| CHAT-Q9 | Run grouped activity explicitly disables content animation | question | 4 | `src/shared/console/runs/activity/item.tsx`, `src/shared/console/task.tsx` |
| CHAT-C01 | Content-visibility intrinsic estimate resolves before sampled paint | candidate | 4 | `src/components/ui/message-scroller.tsx` |
| CHAT-C02 | Final streamed code/pane anchoring requires closer completion capture | candidate | 1 | `src/components/ui/message-scroller.tsx`, `src/shared/console/chat/pane/index.tsx` |
| CF-01 | Validation error has no reserved slot | confirmed | 30 | `src/components/ui/field.tsx`, `src/console/organization/create.tsx`, `src/shared/console/folders/dialogs/name.tsx`, `src/shared/console/jobs/editor/fields/name.tsx`, `src/shared/console/stores/schema/fields.tsx`, `src/shared/console/stores/value/fields.tsx` |
| CF-02 | Schema form teardown precedes modal exit | confirmed | 12 | `src/shared/console/stores/schema/dialog.tsx` |
| CF-03 | Unreserved requested collection expansion or removal | question | 38 | `src/console/billing/activity.tsx`, `src/console/context/organization/profile/sources.tsx`, `src/console/context/paging.tsx`, `src/landing/demo/dialogs/folders.tsx`, `src/shared/console/folders/row.tsx`, `src/shared/console/stores/value/arrays.tsx`, `src/shared/console/stores/value/fields.tsx` |
| CF-04 | Unreserved schema field groups resize the modal | question | 12 | `src/shared/console/stores/schema/dialog.tsx`, `src/shared/console/stores/schema/fields.tsx` |
| CF-05 | Declared filter layout width animation reflows content | question | 4 | `src/shared/console/filters/layout.tsx` |
| CF-06 | Lazy one-time controls differ from fallback size | confirmed | 4 | `src/shared/console/jobs/editor/fields/timing.tsx` |
| CF-07 / LF-07 | Conditional job editor groups resize the modal | question | 56 | `src/shared/console/jobs/editor/fields/index.tsx`, `src/shared/console/jobs/editor/fields/timing.tsx`, `src/shared/console/jobs/editor/schedule/recurring.tsx`, `src/shared/console/materials/form.tsx` |
| CF-08 | Active filter count expands the header | question | 4 | `src/shared/console/filters/button.tsx` |
| CF-09 / LF-02 | Automatic table layout reacts to changed data | confirmed | 58 | `src/components/ui/table.tsx`, `src/console/billing/activity.tsx`, `src/shared/console/folders/usage/ranked.tsx`, `src/shared/console/jobs/list/cells.tsx`, `src/shared/console/list/frame.tsx`, `src/shared/console/list/frame.tsx`, `src/shared/console/materials/list.tsx` |
| CF-10 | Sidebar folder children push sibling rows | question | 4 | `src/shared/console/folders/row.tsx` |
| CF-11 | Folder creation clears draft during exit | confirmed | 3 | `src/shared/console/folders/dialogs/name.tsx` |
| CF-12 | Breadcrumb hover and focus changes padding | question | 12 | `src/shared/console/folders/usage/hint.tsx`, `src/shared/console/shell/frame.tsx` |
| CF-13 | Delete action label moves Cancel | confirmed | 4 | `src/shared/console/folders/dialogs/delete.tsx` |
| CF-14 | File dock changes width on hover | question | 4 | `src/shared/console/files/dock.tsx` |
| CF-16 | Permissions content immediately expands card | question | 8 | `src/console/permissions/section.tsx` |
| CF-17 | Flush row hover changes padding | question | 1 | `src/shared/console/flush.ts` |
| CF-18 | Website editor unmounts before closed state | question | 4 | `src/console/context/organization/discovery/edit.tsx`, `src/console/context/organization/profile/index.tsx` |
| CF-19 | Inline domain form increases grid minimum width | confirmed | 4 | `src/console/context/organization/profile/domains/add.tsx`, `src/console/context/organization/profile/index.tsx` |
| CF-20 | Billing filter button does not reserve widest label | confirmed | 12 | `src/console/billing/activity.tsx` |
| CF-21 | Context detail clears its body during sheet exit | confirmed | 4 | `src/console/context/places/detail.tsx`, `src/console/context/workstreams/detail/index.tsx` |
| CF-22 | Timeline entry expands without reserved height | question | 8 | `src/console/context/workstreams/detail/timeline.tsx` |
| CF-23 | Receipt placeholder differs from resolved content | confirmed | 4 | `src/console/context/workstreams/detail/receipt.tsx`, `src/console/context/workstreams/detail/timeline.tsx` |
| CF-24 | Autofocus copy tooltip tracks an entering sheet | question | 4 | `src/components/ui/sheet.tsx`, `src/components/ui/tooltip.tsx`, `src/shared/console/copy/index.tsx` |
| CF-25 | Settings active view resets before dialog exit completes | confirmed | 14 | `src/console/shell/settings/shell.tsx` |
| LF-01 | Table header padding | question | 66 | `src/shared/console/list/head.tsx` |
| LF-03 | Conditional facet footer | confirmed | 16 | `src/shared/console/list/head.tsx` |
| LF-04 | Rename draft reset before exit | confirmed | 24 | `src/shared/console/materials/dialogs/edit.tsx` |
| LF-05 | Lazy route header gap in reserved slot | question | 12 | `src/landing/demo/pages/router.tsx` |
| LF-06 | CodeMirror estimated initial gutter metrics | candidate | 8 | `src/shared/console/mirror/view.tsx` |
| LF-08 | Unreserved material validation error | confirmed | 12 | `src/shared/console/materials/form.tsx` |
| LF-09 | Creation draft reset before exit | confirmed | 8 | `src/shared/console/materials/dialogs/create.tsx` |
| LF-10 | Conditional visibility grant picker | question | 16 | `src/shared/console/visibility/field.tsx` |
| LF-11 | Grid keyboard focus scroll | question | 8 | `src/shared/console/tables/grid/cell.tsx`, `src/shared/console/tables/grid/index.tsx` |
| LF-12 | Row draft reset before exit | confirmed | 4 | `src/shared/console/tables/add.tsx` |
| LF-13 | Column sheet draft and mode reset before exit | confirmed | 16 | `src/shared/console/tables/column.ts`, `src/shared/console/tables/sheet.tsx` |
| LF-14 | Trailing controls after collection edits | question | 24 | `src/shared/console/tables/grid/index.tsx` |
| LF-15 | Conditional pagination label shrinks footer | confirmed | 16 | `src/shared/console/list/pager.tsx` |
| LF-16 | Removal confirmation unmounts before exit | question | 24 | `src/shared/console/list/bar.tsx`, `src/shared/console/tables/grid/row.tsx` |

## Remaining limits

The broad supplemental queues were stopped at the user’s scope change. Prepared but unmeasured fixture states and incomplete live mutations remain listed, including the later People variants, recovery/share/hash repeats, large-data states, delayed-error/retry states and most additional media states. Successful ordinary preflights prove a recipe can reach its state; they do not replace four-profile measurements. Billing changes, external provider authorization and destructive shared-organization actions were not performed.

The native CodeMirror gutter correction is still a visibility candidate: compositor recordings at both widths show the first painted gutter already correctly spaced. They do show an unhighlighted-to-highlighted text flash during asynchronous language loading; this supplemental observation is retained with the lists evidence. There is no claim of a complete zero-shift product.
