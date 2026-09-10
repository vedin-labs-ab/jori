# Chat and files inventory

Discovery only. No runtime files changed. The immutable lead-owned browser driver will measure these candidates before any fix. Read-only means no backend write, including local view state. Mutating means an application write, including the demo's isolated in-memory writes. Every browser context owns its demo workspace and localStorage.

## Entry and reset recipes

Use the populated landing console, scoped to the visible console rather than similarly named landing text. Its links keep production hrefs but plain clicks update `useDemoNavigation`; `page.goto('/chat')` leaves the fixture. Click a visible console link `[href='/chat']`, then `[href='/chat/conversations_renewals']`. Actual accessible text is `Which renewals are at risk this month?`. A fresh page/context resets fixture writes. LocalStorage preferences `jori.chat.hints` and `jori.chat.pane` persist per browser and must reset between attributed items.

The composer is `[role='textbox'][aria-label='Message']`, with `contenteditable`. Use `fill`, `press('Shift+Enter')`, or keyboard typing. Sending text creates a local demo conversation or appends to an existing one. The simulated run works for 900ms, then reveals a chunk every 40ms, first reasoning and then markdown. It ends with a job reference and three questionnaire questions. The lead driver must continue past 3 seconds when completion is the inventory action being measured.

Files have stable hrefs `/files/files_notes`, `/files/files_brief`, `/files/files_forecast`, `/files/files_onboarding`. Names are `Release notes 2.14.md`, `Launch brief.pdf`, `Q3 forecast.xlsx`, `Onboarding flow.png`. Open the Files list through its console navigation, then the file link. The PNG/PDF are real local assets. The markdown file fetches an in-memory data URL and opens CodeMirror. No HTML, audio, video, oversized text, or broken asset is in the initial fixture.

## Checklist

- [ ] CHAT-001 read-only: navigate into chat home and wait for its lazy chunk and TipTap mount. Drive console `[href='/chat']`. Evidence `src/landing/demo/pages/router.tsx`, `src/shared/console/chat/composer/editor.ts`.
- [ ] CHAT-002 read-only: return from chat home to prior console page through its navigation. Shared shell remains the same.
- [ ] CHAT-003 read-only: open populated conversation from Recent. Drive `[href='/chat/conversations_renewals']`. Evidence `src/shared/console/chat/home.tsx`, `src/landing/demo/pages/chat/index.tsx`.
- [ ] CHAT-004 read-only: return from populated conversation to chat home. Drive `[href='/chat']`.
- [ ] CHAT-005 read-only: enter composer text, including enough wrapped lines to reach its 12rem max height, and inspect post-typing settling. Evidence `src/shared/console/chat/composer/editor.ts`.
- [ ] CHAT-006 read-only: clear the multiline composer, restoring the placeholder and disabled send button.
- [ ] CHAT-007 read-only: hide desktop shortcut band. Drive button `Hide shortcuts`. Evidence `src/shared/console/chat/composer/footer.tsx`.
- [ ] CHAT-008 read-only: restore desktop shortcut band. Drive button `Show shortcuts`. Hidden by CSS below `md`; record mobile as not applicable.
- [ ] CHAT-009 read-only: open attachment popover. Drive button `Mention a resource`. Evidence `src/shared/console/chat/composer/attach.tsx`.
- [ ] CHAT-010 read-only: close attachment popover with Escape.
- [ ] CHAT-011 read-only: attachment kind list to Chats. Drive option `Chats`.
- [ ] CHAT-012 read-only: Chats items back to kind list. Drive option `All resources`.
- [ ] CHAT-013 read-only: attachment kind list to Tables. Drive option `Tables`.
- [ ] CHAT-014 read-only: Tables items back to kind list. Drive option `All resources`.
- [ ] CHAT-015 read-only: attachment kind list to Files. Drive option `Files`.
- [ ] CHAT-016 read-only: Files items back to kind list. Drive option `All resources`.
- [ ] CHAT-017 read-only: attachment kind list to Stores. Drive option `Stores`.
- [ ] CHAT-018 read-only: Stores items back to kind list. Drive option `All resources`.
- [ ] CHAT-019 read-only: attachment kind list to Jobs. Drive option `Jobs`.
- [ ] CHAT-020 read-only: Jobs items back to kind list. Drive option `All resources`.
- [ ] CHAT-021 read-only: attachment kind list to Folders. Drive option `Folders`.
- [ ] CHAT-022 read-only: Folders items back to kind list. Drive option `All resources`.
- [ ] CHAT-023 read-only: attachment kind list to Runs. Drive option `Runs`.
- [ ] CHAT-024 read-only: Runs items back to kind list. Drive option `All resources`.
- [ ] CHAT-025 read-only: attachment search resolves to matches, then no matches. Fill placeholder `Search resources…` with `renewal` and unique impossible text as separate marks.
- [ ] CHAT-026 read-only: clear attachment search back to all kind rows.
- [ ] CHAT-027 read-only: pick resource from attachment results and close popover with an inline chip inserted. Drive `Tables`, option `Customer renewals`. Demo does not open pane on mention; production does.
- [ ] CHAT-028 read-only: remove inline resource chip using Backspace and restore text caret. Production releases unpinned pane preview too.
- [ ] CHAT-029 read-only: type resource sigil `+` and query to open caret suggestion list. Evidence `src/shared/console/mentions/suggest/listbox.tsx`.
- [ ] CHAT-030 read-only: close resource suggestion list with Escape.
- [ ] CHAT-031 read-only: type integration sigil `@` and inspect its populated/empty suggestion list.
- [ ] CHAT-032 read-only: dismiss integration suggestion list.
- [ ] CHAT-033 read-only: type skill sigil `/` and inspect its populated/empty suggestion list.
- [ ] CHAT-034 read-only: dismiss skill suggestion list.
- [ ] CHAT-035 read-only: type tool sigil `#` and inspect its populated/empty suggestion list.
- [ ] CHAT-036 read-only: dismiss tool suggestion list.
- [ ] CHAT-037 read-only: select a caret suggestion with Enter; popup closes and token becomes chip.
- [ ] CHAT-038 read-only: open model dropdown. Drive button whose accessible label starts `Model:`. Evidence `src/shared/console/chat/models/index.tsx`.
- [ ] CHAT-039 read-only: close model dropdown with Escape.
- [ ] CHAT-040 read-only: open vendor submenu OpenAI.
- [ ] CHAT-041 read-only: open vendor submenu Anthropic.
- [ ] CHAT-042 read-only: open Reasoning submenu.
- [ ] CHAT-043 mutating: choose different recommended tier and allow selected label/icon to settle. Local state only in demo, persisted conversation model in production.
- [ ] CHAT-044 mutating: choose a non-recommended model/effort and inspect longer trigger label.
- [ ] CHAT-045 read-only: show context ring tooltip on hover/focus. Drive button label starting `Context:`. Evidence `src/shared/console/chat/context/index.tsx`.
- [ ] CHAT-046 read-only: dismiss context ring tooltip.
- [ ] CHAT-047 read-only: open context breakdown popover by clicking same button.
- [ ] CHAT-048 read-only: close context breakdown popover with Escape.
- [ ] CHAT-049 mutating: send first message from home and observe navigation, pending/working row, reasoning, streamed markdown, stop control, settled reply. Drive composer then `Send message`. Evidence `src/landing/demo/pages/chat/stream.ts`, `src/shared/console/chat/thread/draft.tsx`, `src/shared/console/chat/thread/tail.tsx`.
- [ ] CHAT-050 mutating: send follow-up in existing populated conversation, observing preceding Next steps removal and scroll anchor.
- [ ] CHAT-051 mutating: send a suggestion from home and observe home-to-thread transition. Drive suggestion `Which renewals are at risk?`.
- [ ] CHAT-052 mutating: choose reply Next steps chip, observing chip removal and new turn. Drive `Remind Harbor House`.
- [ ] CHAT-053 read-only: expand Working log during pending/streaming. Drive button `Working`. Evidence `src/shared/console/chat/working.tsx`.
- [ ] CHAT-054 read-only: collapse Working log during pending/streaming.
- [ ] CHAT-055 read-only: expand streaming Thinking or settled Thought. Evidence `src/shared/console/chat/thread/reasoning.tsx`.
- [ ] CHAT-056 read-only: collapse Thinking or Thought.
- [ ] CHAT-057 mutating: stop active stream and observe draft-to-stopped notice plus Stop run removal. Drive button `Stop run` before completion.
- [ ] CHAT-058 read-only: scroll conversation up while stream grows and check anchor preservation after scroll ends. Evidence `src/components/ui/message-scroller` and `src/shared/console/chat/thread/tail.tsx`.
- [ ] CHAT-059 read-only: activate `Scroll to latest` and inspect settling after its deliberate scroll.
- [ ] CHAT-060 mutating: send long person text so its eight-line clamp mounts; observe late measurement. Evidence `src/shared/console/chat/thread/message.tsx`, `src/components/ui/expandable-text`.
- [ ] CHAT-061 read-only: expand clamped person message through its `show more` control.
- [ ] CHAT-062 read-only: collapse clamped person message through its Show less control.
- [ ] CHAT-063 read-only: hover/focus message to reveal reserved action row and timestamp tooltip.
- [ ] CHAT-064 read-only: remove hover/focus from message, hiding actions and tooltip.
- [ ] CHAT-065 read-only: copy message and observe copy/check icon lifecycle. Drive `Copy message` then wait past copied timeout. Evidence `src/shared/console/copy.tsx`.
- [ ] CHAT-066 read-only: open existing table reference pane. Drive reference card button `Customer renewals` from reply, or inline mention. Observe lazy body. Evidence `src/shared/console/chat/pane/index.tsx`, `src/landing/demo/pages/chat/pane/index.tsx`.
- [ ] CHAT-067 read-only: close reference pane via `Close pane` and preserve chat scroll. Mobile is full-screen Sheet with scroll lock.
- [ ] CHAT-068 read-only: reopen previously dismissed pane by clicking same reference card.
- [ ] CHAT-069 read-only: pin preview tab. Drive `Pin Customer renewals` or double-click reference card.
- [ ] CHAT-070 read-only: unpin preview tab. Drive `Unpin Customer renewals`.
- [ ] CHAT-071 read-only: open tab context menu by right-clicking tab in `Open resources` tablist.
- [ ] CHAT-072 read-only: close tab context menu with Escape.
- [ ] CHAT-073 read-only: switch between pinned resource tabs, retaining chosen content. Requires multiple referenced resources, reachable by sending text containing valid resource tokens.
- [ ] CHAT-074 read-only: close active resource tab and inspect adjacent tab activation.
- [ ] CHAT-075 read-only: close inactive resource tab and inspect active body remains stable.
- [ ] CHAT-076 read-only: use tab menu Close others from multi-tab state.
- [ ] CHAT-077 read-only: disable automatic resource opening via context menu `Open new resources automatically`.
- [ ] CHAT-078 read-only: enable automatic resource opening via same menu.
- [ ] CHAT-079 mutating: complete streamed reply with first new job resource and observe automatic desktop pane opening plus one-time hint. Mobile intentionally suppresses automatic Sheet. Evidence `src/shared/console/chat/pane/auto.ts`, `src/shared/console/chat/pane/hint.tsx`.
- [ ] CHAT-080 read-only: dismiss automatic-pane hint with `Keep this`.
- [ ] CHAT-081 read-only: dismiss automatic-pane hint with Open manually.
- [ ] CHAT-082 read-only: hover/focus pane header page link. Observe arrow width/margin animation. Evidence `src/shared/console/chat/pane/header.tsx`.
- [ ] CHAT-083 read-only: navigate from pane header to resource page.
- [ ] CHAT-084 read-only: resize desktop pane with pointer and inspect no drift after drag release. Direct dragging is intentional.
- [ ] CHAT-085 read-only: questionnaire first question to next with answer selected. Drive radio `Yes, post it`, Next. Evidence `src/shared/console/chat/thread/question.tsx`, `src/components/ui/questionnaire`.
- [ ] CHAT-086 read-only: questionnaire second question back to previous.
- [ ] CHAT-087 read-only: questionnaire next without required answer to show validation.
- [ ] CHAT-088 read-only: choose valid answer to clear validation, including freeform `Your own answer` when first question is active.
- [ ] CHAT-089 read-only: navigate second to third question.
- [ ] CHAT-090 mutating: submit Answer on last question, replacing active questionnaire with complete answered summary and author while next run starts.
- [ ] CHAT-091 read-only: open chat title menu and dismiss. Share/move dialogs use generic material controls; lead should assign their contents to shared-dialog owner. Evidence `src/landing/demo/pages/chat/filing.tsx`, `src/shared/console/chat/menu.tsx`.
- [ ] CHAT-092 read-only: return OpenAI submenu to parent menu.
- [ ] CHAT-093 read-only: return Anthropic submenu to parent menu.
- [ ] CHAT-094 read-only: return Reasoning submenu to parent menu.
- [ ] CHAT-095 mutating: restore original model tier selection after CHAT-043.
- [ ] CHAT-096 mutating: restore original model and reasoning effort after CHAT-044.
- [ ] CHAT-097 read-only: switch back to previous pinned resource tab.
- [ ] CHAT-098 read-only: use tab menu Close to the left from reset multi-tab state.
- [ ] CHAT-099 read-only: use tab menu Close to the right from reset multi-tab state.
- [ ] CHAT-100 read-only: use tab menu Close all from reset multi-tab state.
- [ ] CHAT-101 read-only: withdraw hover/focus from pane header page link.
- [ ] CHAT-102 read-only: return from pane header's resource page to conversation via console navigation.
- [ ] CHAT-103 read-only: navigate third questionnaire question back to second.
- [ ] CHAT-104 read-only: open one-time pane hint information popover via `About resources opening beside the chat`.
- [ ] CHAT-105 read-only: close one-time pane hint information popover.
- [ ] FILE-001 read-only: Files list to markdown editor, including lazy FilePage, text fetch, CodeMirror module, editor effect, and language arrival. Drive `Release notes 2.14.md`. Evidence `src/shared/console/files/editor/section.tsx`, `src/shared/console/mirror/view.tsx`.
- [ ] FILE-002 read-only: return markdown editor to Files list.
- [ ] FILE-003 mutating: edit markdown and blur, observing debounced pending/saving/error-or-success/idle breadcrumb icon lifecycle. Drive `.cm-content[contenteditable=true]`. Demo resolves saves immediately, so production pending/error need controlled fixture. Evidence `src/shared/console/files/editor/autosave.ts`.
- [ ] FILE-004 read-only: Files list to PNG viewer cold load, image dimensions and dock enabling. Drive `Onboarding flow.png`. Evidence `src/shared/console/files/viewer/section.tsx`, `src/shared/console/files/viewer/frame.tsx`.
- [ ] FILE-005 read-only: return PNG viewer to Files list.
- [ ] FILE-006 read-only: zoom PNG in using `Zoom in` and inspect after action.
- [ ] FILE-007 read-only: zoom PNG out using `Zoom out`.
- [ ] FILE-008 read-only: zoom PNG then reset with `Fit to view`.
- [ ] FILE-009 read-only: double-click image to zoom.
- [ ] FILE-010 read-only: pan zoomed image and inspect after pointer release. Direct transform motion is intentional.
- [ ] FILE-011 read-only: hover/focus file navigation dock to expand image tools.
- [ ] FILE-012 read-only: leave dock to collapse tools. Evidence `src/shared/console/files/dock.tsx`.
- [ ] FILE-013 read-only: show zoom and file navigation tooltips by hover/focus.
- [ ] FILE-014 read-only: hide those tooltips.
- [ ] FILE-015 read-only: Files list to PDF iframe, including blob fetch and viewer ready transition. Drive `Launch brief.pdf`.
- [ ] FILE-016 read-only: return PDF to Files list.
- [ ] FILE-017 read-only: Files list to unsupported XLSX download fallback. Drive `Q3 forecast.xlsx`.
- [ ] FILE-018 read-only: return XLSX fallback to Files list.
- [ ] FILE-019 read-only: next sibling file via `Next file` or ArrowRight, including preloaded-cache behavior.
- [ ] FILE-020 read-only: previous sibling file via `Previous file` or ArrowLeft. Arrow keys in CodeMirror intentionally edit caret instead.
- [ ] FILE-021 read-only: file page Ask Jori into chat home with context chip.
- [ ] FILE-022 read-only: clear context via `Remove <file name>`, removing context addon from composer.
- [ ] FILE-023 read-only: file title menu open and close; copy text loaded state and tooltip/copy lifecycle. Generic edit/share/move/delete dialogs belong to shared-dialog slice.

- [ ] FILE-024 read-only: double-click zoomed image to reset.

## Runtime boundaries absent from landing fixture

Each entry remains in coverage, with a reason if no safe test fixture can drive it. Unit tests alone are not browser evidence.

- [ ] CHAT-G01 read-only: authenticated live conversation loading to ready, unauthorized, or not_found. `src/console/chat/thread.tsx` gates the thread on `api.conversations.console.live`; demo missing conversation returns null instead.
- [ ] CHAT-G02 read-only: message loading placeholder to first page and Show earlier messages loading to prepended history, preserving scroll. `src/console/chat/messages.ts`, `src/shared/console/chat/thread/index.tsx`; demo hasMore=false and isLoading=false.
- [ ] CHAT-G03 read-only: reference resolver undefined/unavailable to resolved name/detail/card and pane header. `src/console/chat/references.ts`, `src/shared/console/chat/thread/reference.tsx`; demo references are synchronous.
- [ ] CHAT-G04 read-only: available model list loading/unavailable to composer enabled, reason removed, hints restored, model picker enabled. `src/console/chat/models.ts`, `src/console/chat/thread.tsx`; demo always has full catalog.
- [ ] CHAT-G05 mutating: send promise pending to resolve and pending to reject with draft kept and error toast. `src/shared/console/chat/composer/input.ts`, `src/console/chat/send.ts`; demo send is synchronous.
- [ ] CHAT-G06 read-only: live progress query loading/empty to ActivityTimeline and late approval/offer callouts. `src/console/chat/progress.tsx`; demo chat has synchronous three-row log with no requests.
- [ ] CHAT-G07 read-only: automatic reasoning tail collapse when text first starts; completed draft replaced by settled message with reasoning/Working removed. Demo stream covers this within CHAT-049/050 but action-time segmentation must retain every occurrence.
- [ ] CHAT-G08 read-only: condensed-context notice arrives and run failed/error notice replaces draft. `src/shared/console/chat/thread/notice.tsx`; only stopped notice is reachable in demo.
- [ ] CHAT-G09 read-only: empty recent loading skeleton to zero, one, four, or more rows, including See all picker appearance. `src/shared/console/chat/home.tsx`; default demo contains one synchronous row. More than four chats can be created locally for the picker.
- [ ] CHAT-G10 read-only: code fence plaintext fallback to lazy highlighted spans, streaming incomplete fence to completed fence. `src/shared/console/markdown/highlight.tsx`, `parse.ts`. Demo fixed reply has no fence but echoes supplied text inside its markdown reply, so send a multiline fenced code input to exercise it.
- [ ] CHAT-G11 read-only: wide markdown table streaming header/body and horizontal scrollbar. Populated reply has full table; streamed reply can echo markdown input. Markdown image tokens become links and never fetch media, per `src/shared/console/markdown/inline.tsx`.
- [ ] CHAT-G12 read-only: resource pane async bodies for job, run, folder, chat, table. File/store demo pane intentionally uses fallback Open the page to see it in full; production loads `src/console/chat/pane/{file,store}.tsx`.
- [ ] CHAT-G13 read-only: run pane timeline grouped tools expand/collapse, error dialog open/close, token usage/metadata overflow tooltip open/close. Same shared components as Activity page; lead should reuse that slice's measurements plus pane-width occurrence. `src/shared/console/runs/activity/{item,error}.tsx`.
- [ ] CHAT-G14 mutating: run pane approval allow/deny and offer cancel/connect, pending states, previous/next request carousel. Same shared controls as Activity. Demo actions are local; production sends external side effects and must not be driven without isolated scope.
- [ ] FILE-G01 read-only: HTML preview/code view swap in both directions. `src/shared/console/files/viewer/html.tsx`; no HTML demo fixture.
- [ ] FILE-G02 read-only: audio/video media metadata and playback readiness, pause/play and dock behavior. `src/shared/console/files/viewer/section.tsx`; no audio/video demo fixture.
- [ ] FILE-G03 read-only: failed text fetch to error fallback, failed image/blob fetch to viewer error, slow PDF ready timeout. Can abort only test page asset requests, never change backend data. `src/shared/console/files/{editor/document,viewer/status,cache/blob}.ts`.
- [ ] FILE-G04 read-only: oversized text or missing URL download fallback; file authorized/missing/unauthorized data resolution. `src/shared/console/files/body.tsx`, `src/console/files/view.tsx`; no such initial demo fixture.

- [ ] CHAT-G15 read-only: earlier-message pagination needs history beyond initial page; the authenticated hello conversation has one turn and demo hard-codes hasMore=false.

## Motion classification to review after evidence

Existing deliberate motion includes Sheet transform/opacity entry and exit, message action opacity, user-driven image transforms and pane dragging, 200ms shortcut band grid-row expansion, 150ms header arrow width/margin, 200ms file dock grid-column expansion, and viewer media opacity in a reserved full frame. Existing code animates some layout properties despite the hunt's recommended remedy. Leave these alone pending review; do not silently redesign them.

Streaming bottom growth is allowed only when existing viewport content stays anchored. Reasoning tail removal when text starts, automatic desktop pane opening when a reply completes, and questionnaire page replacement are not automatically allowed just because they were coded deliberately. Measure delayed movement and retain these as review questions.

## Evidence source groups

Chat composition and loading: `src/shared/console/chat`, `src/console/chat`, `src/landing/demo/pages/chat`, `src/landing/demo/state/chat.ts`, `src/landing/demo/fixtures/chat.ts`.

Scrolling and overlays: `src/components/ui/message-scroller`, `src/components/ui/expandable-text`, `src/components/ui/questionnaire`, `src/shared/console/task.tsx`.

Rich text and files: `src/shared/console/markdown`, `src/shared/console/files`, `src/shared/console/mirror`, `src/landing/demo/pages/materials/file.tsx`, `src/landing/demo/fixtures/materials/files.ts`.

Runs in the pane reuse `src/shared/console/runs` and `src/landing/demo/pages/slots.tsx`.

## Selector preflight

The bundled fixture passed chat menus, model picker, table pane, multi-tab setup, questionnaires, file loading, editor, zoom and image gestures in exploratory Playwright. Both widths passed the focused multi-tab, model restore, table pane, image toolbar and questionnaire smoke. The demo intentionally hides sidebar triggers below md via `src/landing/demo/console.tsx`, so sidebar-only return navigation CHAT-002, CHAT-004 and CHAT-102 runs at desktop in this slice. Production mobile shell navigation requires the authenticated app and is assigned to shell coverage. Desktop shortcut bands and automatic-pane hint actions are also excluded at mobile by design.

A few final reverse variants share validated selectors but have not each had a separate preflight. The complete immutable-driver run still must attempt every enabled manifest item. Earlier exploratory connection failures came from the two fixture-server rebuilds, not product findings.
