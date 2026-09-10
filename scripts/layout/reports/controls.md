# Controls discovery

Phase 2 only. No product fixes have been made. The source paths below are relative to the repository root. Every transition includes reverse behavior where it exists. `R` means read-only, including unsaved local draft edits. `M` means a committed data change. Demo mutations are isolated in React state, so a new page resets them. `L` means this needs the live authenticated console. `D` means the populated landing demo drives the same shared view.

## Evidence and reach

The demo router in `src/landing/demo/pages/router.tsx` covers folders, runs, chat, tables, stores, files, and jobs. Store, file, job-detail, and chat pages use lazy imports with `ConsoleListLoading` fallbacks. Store and file bodies add a `ClientOnly` boundary. `src/landing/demo/pages/platform.tsx` renders static explanatory pages for context, integrations, and skills. The demo has no account, organization, people, teams, or billing settings. Those are live-only; rendering their placeholder is not coverage of their controls.

The demo starts from `src/landing/demo/fixtures`. It contains 4 tables, 2 stores, 4 files, 8 jobs, and 5 folders, including Finance → Renewals. Concrete hrefs include `/tables/collections_renewals`, `/tables/collections_flaky`, `/stores/collections_release`, `/stores/collections_watch`, `/files/files_notes`, `/folders/folders_engineering`, and `/folders/folders_finance`. The internal demo navigation is React state and leaves the browser URL unchanged. Use the appropriate demo instance as the locator root and select its `a[href]`, then operate its shared controls. New mutations are per-instance and reset by reloading.

Stable recipes derived from code: list checkboxes are named `Select all rows` and `Select <name>`; row menu triggers are named `<name> actions`; table grid cell buttons are `Edit <column name>`, editable inputs `<column name> value`, column buttons `<name> column details`, and grid checkboxes `Select all loaded rows` and `Select row <number>`. Folder inputs are `#folder-name`; material create inputs are `#table-create-name` and `#store-create-name`; column input is `#column-sheet-name`. Scope popovers and dialogs through their roles to avoid matching repeated landing demos.

All entries require cold 1440×900, warm 1440×900, cold 375×812, warm 375×812. A warm run must be the second visit. For pending, loading, failure, and authorization branches marked L, local demo success does not exercise the async state.

## Shared list transitions

Evidence: `src/shared/console/list/head.tsx`, `bar.tsx`, `frame.tsx`, `pager.tsx`; `src/shared/console/materials/list.tsx`; each domain's `list/index.tsx`, `list/config.ts`, and `list/cells.tsx`.

- [ ] C001 R D Tables list → table detail; return via Tables breadcrumb or sidebar.
- [ ] C002 R D Stores list → store detail; return via Stores breadcrumb or sidebar.
- [ ] C003 R D Files list → file detail; return via Files breadcrumb or sidebar.
- [ ] C004 R D Jobs list → job detail; return via Jobs breadcrumb or sidebar.
- [ ] C005 R D Folders root list → folder detail → root list; nested folder → parent → nested folder.
- [ ] C006 R D Hover each list header button, then move away; keyboard focus, then blur. `headButtonClassName` changes horizontal padding from 0 to 8px.
- [ ] C007 R D Tables sort header cycles absent → ascending → descending → absent. Repeat for every sortable header in tableListConfig.
- [ ] C008 R D Stores sort header cycles absent → ascending → descending → absent. Repeat for every sortable header in storeListConfig.
- [ ] C009 R D Files sort header cycles absent → ascending → descending → absent. Repeat for every sortable header in fileListConfig.
- [ ] C010 R D Jobs sort header cycles absent → ascending → descending → absent. Repeat for every sortable header in jobListConfig.
- [ ] C011 R D Folder root and contents list sort cycles in both directions. Derivation in `folders/list/controls.ts`.
- [ ] C012 R D Tables header facet popover open → close. Select option → deselect; Clear selection → All; search matches → no matches → clear query.
- [ ] C013 R D Stores header facet popover open → close. Select option → deselect; Clear selection → All; search matches → no matches → clear query.
- [ ] C014 R D Files header facet popover open → close. Select option → deselect; Clear selection → All; search matches → no matches → clear query.
- [ ] C015 R D Jobs header facet popover open → close. Select option → deselect; Clear selection → All; search matches → no matches → clear query.
- [ ] C016 R D Folder list header facet popover open → close. Select option → deselect; Clear selection → All; search matches → no matches → clear query.
- [ ] C017 R D Search tables text → matching rows → no results → clear. `ConsoleSearch` label Search tables.
- [ ] C018 R D Search stores text → matching rows → no results → clear. `ConsoleSearch` label Search stores.
- [ ] C019 R D Search jobs text → matching rows → no results → clear. `ConsoleSearch` label Search jobs.
- [ ] C020 R D Tables selection none → one → multiple → all → cleared; floating Selection actions dock appears and disappears.
- [ ] C021 R D Stores selection none → one → multiple → all → cleared.
- [ ] C022 R D Files selection none → one → multiple → all → cleared.
- [ ] C023 R D Jobs selection none → one → multiple → all → cleared.
- [ ] C024 R D Folder selection none → one → multiple → cleared; folder selection dock.
- [ ] C025 R D Tables selection dock Move opens → cancel/escape closes; Archive confirmation opens → Cancel closes.
- [ ] C026 R D Stores selection dock Move opens → cancel/escape closes; Archive confirmation opens → Cancel closes.
- [ ] C027 R D Files selection dock Move opens → cancel/escape closes; Delete confirmation opens → Cancel closes.
- [ ] C028 R D Jobs selection dock Move opens → cancel/escape closes; Delete confirmation opens → Cancel closes.
- [ ] C029 R D Folder selection dock Move opens → cancel/escape closes; removal confirmation opens → Cancel closes.
- [ ] C030 M D Bulk tables/stores archive and bulk files/jobs/folders deletion commit → rows/counts/dock update. Demo removes outright; L required for archive→restore→permanent-delete cycle.
- [ ] C031 R L List initial loading → rows, empty, unauthorized, error. Demo passes isLoading=false and fixture arrays.
- [ ] C032 R L List next page → loading spinner appended to Next label → new rows/count → previous page; preserve scroll anchor. Demo initial fixtures fit one page; create enough local items for D paging if needed.
- [ ] C033 R L Refetch while list has visible rows → updated/removed rows and footer count, including selected row disappearing.
- [ ] C034 R D Owner/visibility avatars fallback → image and owner/visibility tooltips open → close. `materials/cells/owner.tsx`, `visibility/badge.tsx`.

## Material actions and forms

Evidence: `src/shared/console/materials/actions/{index,list,menu,confirm}.tsx`, `materials/dialogs/{create,edit}.tsx`, `materials/{fields,form}.tsx`, `visibility/{dialog,field,grants,audience}.tsx`, `folders/{field,picker}.tsx`; bindings in `src/landing/demo/dialogs/{creation,materials,visibility,move}.tsx`.

- [ ] C035 R D Tables row menu open → close; Edit dialog open → cancel/escape close.
- [ ] C036 R D Stores row menu open → close; Edit dialog open → cancel/escape close.
- [ ] C037 R D Files row menu open → close; Edit file dialog open → cancel/escape close.
- [ ] C038 R D Tables/Stores detail title menu open → close; same material Edit dialog open → close.
- [ ] C039 M D Rename table/store/file → save → dialog closes and table row/breadcrumb label updates. Use a long name and restore via second save.
- [ ] C040 R D Table create dialog open → close. `Create table` trigger and dialog button; input `#table-create-name`.
- [ ] C041 R D Store create dialog open → close. `Create store` trigger and dialog button; input `#store-create-name`.
- [ ] C042 R D Table/store create empty submit → inline name error → type name clears error; reverse by clearing and submitting again.
- [ ] C043 R D Table/store create Advanced settings expand → collapse; scroll near footer before collapse and inspect focus/scroll.
- [ ] C044 R D Folder picker popover open → close; choose nested folder → reopen → No folder; label changes while dialog stays open.
- [ ] C045 R D Visibility select open → close; Organization ↔ Private ↔ Specific people ↔ Specific teams; conditional grant picker insertion/removal.
- [ ] C046 R D People grant picker open → close; search matches → no matches → clear; select → deselect people; long combined name label.
- [ ] C047 R D Teams grant picker open → close; search matches → no matches → clear; select → deselect teams.
- [ ] C048 R D Visibility help tooltip show → hide; audience count tooltip show → hide and owner/selection changes update sentence.
- [ ] C049 R D Post-creation Visibility dialog open → close for table/store/file/folder/job. Draft visibility/grants alter audience line; Cancel discards.
- [ ] C050 M D Post-creation Visibility Save → close and badge/audience update; reopen then restore original mode and grants.
- [ ] C051 M D Create table/store with long name → pending state → list row and toast; reset page after item. L required to prolong actual network pending/error branch.
- [ ] C052 R D Move to folder dialog open → close for table/store/file/job/folder; select target → previous/current target; long title and hierarchy scroll.
- [ ] C053 M D Move material/job/folder to another folder → row path and selected dock update; move back. Demo has same logical conflict decisions but no network wait.
- [ ] C054 R L Move prompt asynchronous visibility consequences → confirmation → cancel; `src/console/folders/move/{prompt,confirm}.tsx`.
- [ ] C055 M D File/job deletion confirmation → confirm → rows/route/count update; reset between items. Table/store archive confirmation → confirm → demo removes row.
- [ ] C056 M L Table/store archive → archived menu → Restore pending → restored row; archived permanent delete → pending → removed.
- [ ] C057 R L Create/edit/visibility/move/delete pending spinner inserted beside label → success/error/rest; failure toast appears → dismisses.
- [ ] C058 R D Share dialog open → close from material header; link create controls and expiry selection → reset. Shared share flow is inventoried by routes/chat slice if assigned there.

## Table grid

Evidence: `src/shared/console/tables/grid/{index,row,cell,scroll}.tsx`, `tables/{sheet,add,columns}.tsx`; demo binding in `src/landing/demo/pages/materials/rows.tsx`. Customer renewals has required Customer column, so New row opens Add row. The grid fixes row geometry at 36px and columns at 224px, uses transformed virtual rows, and renders an initial 240×960 assumed viewport before measurement.

- [ ] C059 R D Table grid initial assumed virtual viewport → measured viewport and visible row mount; cell/footer geometry stable after first frame.
- [ ] C060 R D Grid horizontal/vertical user scroll → settle; hover gutter number → checkbox → number; selection → clear.
- [ ] C061 R D Text cell button → inline input → Escape returns button; `Edit Customer` then `Customer value`.
- [ ] C062 M D Text/integer/float/date-like cell edit → Enter/blur saves → button; Tab advances → Shift+Tab returns; no unscheduled scroll.
- [ ] C063 R D Integer/float cell invalid text → error toast → correction or Escape; failed commit keeps editor.
- [ ] C064 M D Boolean cell false → true → false and pending disabled state; Customer renewals Paid/Reminded.
- [ ] C065 R D Grid row context menu open → Escape close; Edit cell selection closes menu then asynchronously focuses editor; Escape cancels editor.
- [ ] C066 R D Grid row Copy cell → success toast → dismiss; clipboard-denied error path can be forced at browser permission boundary.
- [ ] C067 M D Grid row Paste valid → saved; invalid → toast and unchanged value.
- [ ] C068 R D New row → Add row dialog open → close; fill required and optional field → invalid JSON/number error when applicable → correction.
- [ ] C069 M D Add row submit → spinner → dialog close → new row count and fresh editor focus; repeat optional-only table path where New row inserts directly.
- [ ] C070 M D Context Insert row above/below → dialog if required → saved insertion → fresh focused cell; Duplicate row → count and neighbors update.
- [ ] C071 R D Row Delete confirmation open → Cancel close; selection bulk Delete confirmation open → Cancel close.
- [ ] C072 M D Row Delete confirm → row and count update; selected rows bulk delete → dock clears. Reset page between items.
- [ ] C073 R D New column sheet open → close; type Select open → close and each type choice; optional/required checkbox enabled on empty table only.
- [ ] C074 R D Existing column details sheet open → close; Required toggle → untoggle; Delete column nested confirmation open → Cancel close.
- [ ] C075 R D Column name blank/duplicate validation after submit → correction clears error, both directions.
- [ ] C076 M D Add column → spinner → new header/cells; rename column → save → grid label; remove column confirmation → grid columns contract.
- [ ] C077 R L Grid initial load → rows; load-more band → new virtual rows → New row affordance; deleting inspected column concurrently closes sheet.
- [ ] C078 R L Cell/row/column write failure and version conflict → error feedback → recovery without losing viewport or focus.

## Store value and schema

Evidence: `src/shared/console/stores/value/{section,editor,fields,inputs,rows,arrays}.tsx`, `stores/schema/{dialog,editor,fields}.tsx`, `stores/menu.tsx`; demo binding `src/landing/demo/pages/materials/store.tsx`. Release state has scalar, checkbox, and optional array. Renewals watch state has optional scalar. Use breadcrumb `Release state` menu for Form/Code/Schema.

- [ ] C079 R D Store Form → Code lazy import/textarea fallback → CodeMirror; Code → Form; repeat warm.
- [ ] C080 M D Scalar edit → debounce saving glyph → saved glyph → idle; restore original value. Boolean false → true → false.
- [ ] C081 R D Numeric invalid/empty required value → field error row → correction clears error; malformed Code JSON → error → valid JSON.
- [ ] C082 M D Optional value Add → editor rows → Unset → Add. Optional nested group adds/removes its descendant rows.
- [ ] C083 M D Array Add item → empty row → fill → save; Remove item → renumber and save; append object-array item with nested fields where schema supports it.
- [ ] C084 R D Enum dropdown open → close; select → unset or previous choice where enum schema exists. Fixture needs schema addition first.
- [ ] C085 R D Schema dialog open → close via Escape/close button; capture close frames since `store={isSchemaOpen ? store : undefined}` removes form contents immediately.
- [ ] C086 R D Schema Add field → row insertion → Remove draft field → prior form; clear all fields → No fields yet → Add field.
- [ ] C087 R D Schema Field type select open → close; scalar → Object → nested fields → Array of objects → scalar; Required on → off.
- [ ] C088 R D Schema field name blank/duplicate → Save schema validation → inline error → type clears; incompatible schema submit → error under editor → correction.
- [ ] C089 M D Save schema → spinner → close → value form matches schema; Remove schema → spinner → read-only JSON view; restore schema.
- [ ] C090 R D Schemaless unwritten store No schema yet → Add schema dialog → Cancel. Create isolated store before driving.
- [ ] C091 R L Unsupported schema → read-only JSON schema with explanation; archived store → read-only value; write conflict → upstream reseed → toast; subscription refetch while editing.
- [ ] C092 R D Copy value → toast feedback → dismissal; Download export → transient browser download with stable page.

## Files

Evidence: `src/shared/console/files/{body,dock,edit,header}.tsx`, `files/editor/section.tsx`, `files/viewer/{frame,section,image,html}.tsx`, `src/console/files/upload/{index,list,dropzone}.tsx`. Demo has markdown, PDF, XLSX fallback, and PNG. Audio/video and HTML require local test file fixtures through live upload or an isolated test host.

- [ ] C093 R D Markdown file lazy body/fetch → editor; PDF loading → iframe; PNG loading → ready; XLSX → No inline view.
- [ ] C094 R D Previous file → next file via dock buttons; ArrowLeft/ArrowRight equivalents; first/last boundary; title and sibling position update.
- [ ] C095 R D File navigation dock hover/focus → tools unfold; unhover/blur → fold; mobile stacked tools remain visible. Existing intentional 200ms grid-template-columns transition.
- [ ] C096 R D PNG zoom in → zoom out → Fit to view; double click in → out; wheel zoom and arrow pan after zoom. User transform motion expected.
- [ ] C097 R D Navigation/zoom tooltip open → close; title menu Copy text → toast → clear; Edit file dialog open → close.
- [ ] C098 M D Markdown text edit → debounce saving/saved glyph → idle; long text/code lines → horizontal/vertical scroll and stable anchor.
- [ ] C099 R L File fetch error → download fallback; oversized text fallback; media error notice; dynamic signed URL refresh must retain cached displayed URL.
- [ ] C100 R L HTML Preview ↔ Code and toolbar/dock changes; lazy CodeMirror mount; reload preview after save.
- [ ] C101 R L Audio/video metadata loading → player, playback controls show/hide, keyboard Space play/pause; media geometry.
- [ ] C102 R D Upload file action → demo explanatory toast → dismissal. This does not cover upload UI.
- [ ] C103 M L File upload dialog open → drag/drop active → file queue → uploading → done/error; retry/remove queue entries → close; full/small/many-file lists.

## Jobs and scheduling

Evidence: `src/shared/console/jobs/list/{actions,filters,tools,trigger}.tsx`, `jobs/editor/{dialog,fields/*,schedule/*}.tsx`, `jobs/editor/instructions/{field,suggestion/suggestions,access/*}.tsx`, `jobs/detail/{index,header}.tsx`. Bindings in `src/landing/demo/dialogs/editor.tsx` and `pages/jobs`. Demo permissions and skill labels are realistic, but event connection options and tool-reference schema host are absent.

- [ ] C104 R D Jobs Filters button → desktop aside/mobile sheet open → Close filters; active filter count/control appears → clear/reset → disappears; preserve list scroll.
- [ ] C105 R D Job Status filter each status → All; Visibility filter each audience → All; match/no-match list and footer states.
- [ ] C106 R D New job dialog lazy mount → open → close; Edit job open → close through row menu and detail title menu.
- [ ] C107 R D Job empty Create job → name/instructions validation → type clears; existing long instructions scroll → validation below → correction.
- [ ] C108 R D Job Advanced settings expand → collapse; Folder popover and Visibility modes/grants/help as C044–C048.
- [ ] C109 R D Recurring → One-time → Event → Recurring tabs; lazy One-time h-16 fallback → real two-field picker; Event demo placeholder is separate from live event controls.
- [ ] C110 R D Recurring Daily → Weekly → Monthly → Custom → Daily; day select open → choose → close; date/time labels and next-run preview change.
- [ ] C111 R D Custom cron valid → invalid → empty → valid; error/next-run sentence removed/replaced. Expression help tooltip open → close.
- [ ] C112 R D One-time Date popover open → close; month forward → back; choose date → unselect date; Time edit updates date label.
- [ ] C113 R D Job instructions typing slash → skill/tool suggestion list → no matches → Escape; select mention → remove mention. Explicit typed growth is expected; delayed reflow is not.
- [ ] C114 R D Job Let Jori search the web checkbox off → on → off; existing additional access Configure tools dialog open → close; group Select all → Clear and individual tools select → deselect updates counts.
- [ ] C115 R L Tool schema warm fetch → pending icon → schema dialog; Request → Response → Request; close, including nested dialogs and focus return. Demo lacks ToolReferenceContext host.
- [ ] C116 R D Job detail instructions markdown/code/tool chips arrive → stable final layout; tools tooltip/dialog open → close; detail runs tab/pagination as run slice.
- [ ] C117 M D Create/edit job → success → dialog closes and list/detail update; Pause → Resume → Pause via row/title menu changes status/trigger. L for sustained Pausing/Resuming/Saving.
- [ ] C118 R D Delete job dialog open → Cancel close; Move job dialog open → close; bulk uses C028.
- [ ] C119 R L Event integration select → connected trigger choices → resource/parameter options loading → results/error → query clear; trigger scope switches and matching fields add/remove.
- [ ] C120 R L Job permissions and skills async resolution update instruction pills, tool counts, scope issues and editor controls; pending submission failure → error → correction.

## Folders and usage

Evidence: `src/shared/console/folders/{section,row,create,menu,picker}.tsx`, `folders/dialogs/{name,move,delete}.tsx`, `folders/list/*`, `folders/usage/*`. Demo binds these in `src/landing/demo/dialogs/folders.tsx` and `pages/folders.tsx`.

- [ ] C121 R D Sidebar folder branch expand → collapse; root group expand → collapse; pointer and keyboard. List nested subfolder expand → collapse.
- [ ] C122 R D Folder New menu open → close; New submenu open → close; choose Table/Store/Job/Folder → dialog → close; File produces demo toast.
- [ ] C123 R D New folder/rename folder dialog open → close; empty submit → inline Name is required → type clears.
- [ ] C124 M D Create nested folder → pending spinner → tree/list insertion; rename long folder → breadcrumb/list wrap → restore name.
- [ ] C125 R D Folder title/row/tree menu open → close; Usage/Visibility/Move/Delete entry transitions and return.
- [ ] C126 R D Delete folder confirmation open → close; Also permanently delete contents checkbox on → off changes description/action label; required name invalid → matching name enables button.
- [ ] C127 M D Delete empty/populated folder keeping contents → route parent and surviving contents move; deleting subtree and contents is isolated fixture only.
- [ ] C128 R L Delete impact loading sentence → counts/name-confirmation fields; concurrent deleted folder → already gone state.
- [ ] C129 M D Drag resource/folder → drag ghost → invalid target → cancel; valid drop → reparent → reset. Direct drag motion intentional, later neighbors/scroll settling still measured.
- [ ] C130 R D Usage hint hover/focus → arrow/padding expansion → leave/blur; usage link → Usage page → folder breadcrumb return.
- [ ] C131 R D Usage Window select open → close; 7/30/90-day option transitions and reverse; charts/stats/counts update.
- [ ] C132 R D Usage chart/legend/stats/source tooltips open → close; chart legend focus/hover → unhover; drill into subfolder → back.
- [ ] C133 R L Usage loading skeleton stats/spinner → chart/data or empty; window refetch → replacement; usage hint undefined → amount arrival.

## Account and organization settings

Evidence: `src/console/shell/settings/{index,shell,nav}.tsx` lazy settings and h-56 skeleton, nullable header action; `src/console/organization/{create,timezone}.tsx`; `src/components/auth/settings/{account,security}`; `src/components/auth/organization`; `src/console/teams`.

- [ ] C134 R L Account settings dialog open → close; Account → Security → Account navigation and lazy skeleton replacement; mobile tab layout and scroll return.
- [ ] C135 R L Organization settings dialog open → close; General → People → Teams → Billing and each reverse navigation; lazy Invite member/Create team header button appearance.
- [ ] C136 R L Account session pending → profile/avatar form; avatar fallback → image; Change/remove avatar chooser open → cancel.
- [ ] C137 M L Account name edit → pending → saved; avatar upload/remove → pending → image/fallback; email invalid → error → corrected submit → pending/success toast.
- [ ] C138 R L Security linked-accounts pending → set-password or change-password form; password reveal on → off; invalid/valid password and confirmation errors appear/clear.
- [ ] C139 M L Change password/request reset → pending → success/error; active sessions loading skeletons → devices; revoke other session → spinner → row removal.
- [ ] C140 R L Organization General permissions/session pending → profile/logo/danger zone; organization slug/name edit and validation; timezone combobox open → search → choose → close/reopen.
- [ ] C141 M L Save organization profile/timezone/logo → pending → success/error → resolved label; name/slug long value and restore.
- [ ] C142 R L Create organization dialog open → close; empty name validation → clear; timezone select open → close. Create commit reloads the app and is mutating.
- [ ] C143 R L Leave/Delete organization alert open → cancel; required name/password validation and pending control sizes. Destructive confirmation requires isolated disposable organization.
- [ ] C144 R L People members/invitations data/permissions loading skeleton rows → table; People tab members ↔ invitations; search/role/status header filters → reset and sort direction cycles.
- [ ] C145 R L Invite member dialog open → close; invalid email → error → correction; role select open → close; pending spinner. Sending invites needs authorization for communication and was not driven.
- [ ] C146 R L Member row menu open → close; role menu open → close; Remove member alert open → Cancel; own Leave alert open → Cancel.
- [ ] C147 M L Change role → spinner → label; Remove member → pending → row removal; invitation cancel → pending → row removal. Isolated local account/workspace needed.
- [ ] C148 R L User invitations loading rows → invitations/empty; Accept/Reject pending label and avatar/organization logo arrival. Accept/Reject are mutations.
- [ ] C149 R L Teams list loading spinner → table/empty; Create team dialog open → close, empty name disabled → enabled, role/roster popover open → search → no match → clear → close.
- [ ] C150 M L Create/rename/delete team → pending → table row/count; Add/remove member in roster popover → count/avatar list updates; reverse where supported.

## Billing and integrations

Evidence: `src/console/billing/{index,plan,topup,autotopup,activity,summary,empty}.tsx`, `src/console/integrations/{index,providers,card,disconnect,offers,options}`, `src/console/permissions/{section,row}.tsx`. These are absent from the demo and require the authenticated dev console. Plan purchases/topups and external OAuth connections must not be committed by a layout measurement.

- [ ] C151 R L Billing overview query loading → no-wallet/empty or plan/wallet/activity; delayed Stripe checkout return status banner → dismiss/refetch.
- [ ] C152 R L Choose plan dialog open → close; Monthly → Annual → Monthly tabs change price/copy/cards; pending choose control measured without completing purchase.
- [ ] C153 R L Top up wallet dialog open → close; invalid/empty/below-minimum amount → inline issue → valid amount clears; checkout pending spinner. Do not complete payment.
- [ ] C154 R L Auto top-up switch off → on reveals amount/threshold fields → off hides; amount/threshold invalid → corrected; pending save/rejection. Real configuration commit is M and was not driven.
- [ ] C155 R L Billing activity filter dropdown open → close; Everything → each category → Everything; loading/empty/results and next/previous pagination → return.
- [ ] C156 R L Integrations page tab Personal ↔ Workspace ↔ Built-in where configured; query loading → provider cards and logos; missing/unavailable status/error branches.
- [ ] C157 R L Provider Connect/Reconnect pending button text/icon → error/status; do not complete external OAuth; disconnect confirmation open → Cancel close.
- [ ] C158 M L Provider disconnect/reconnect callback status → card controls/counts/tool section update; isolated dev provider only.
- [ ] C159 R L Permission section Show → Hide collapsible; loading → unavailable/empty/read-write groups; summary counts appear and wrap.
- [ ] C160 R L Tool permission select open → close; Allowed → Ask first → Blocked and reverse; pending disabled select retains geometry. Committing mode changes is M.
- [ ] C161 R L Integration option picker dialog/popover open → close; search → loading → options/no matches/error → query clear; selected option/chip then removal.
- [ ] C162 R L Integration offer claiming → accepted/expired/error outcome; success/error toast appears → dismiss; callback loader → outcome route.

## Context organization and workstreams

These were found in the supplied organization scope. Parent may assign them to route discovery. Evidence: `src/console/context/index.tsx`, `organization/profile`, `organization/discovery`, `organization/onboarding`, `places`, `workstreams`.

- [ ] C163 R L Context tabs Organization ↔ Workstreams ↔ Places; loading spinner → populated/empty/unavailable states.
- [ ] C164 R L Organization onboarding welcome → website form → discovery progress → ready/error/retry; dialogs close only at allowed stages; validation issue appears/clears.
- [ ] C165 R L Organization website Edit dialog open → close; url invalid → error → correction; discovery pending progress rows/times → ready summary/proposal.
- [ ] C166 R L Profile facts/sources/domain list loading → content; Add domain field show → hide; invalid domain → error → correction; source tooltips open → close.
- [ ] C167 M L Add/remove domain and timezone change → pending spinner → profile row/label; errors toast and recover.
- [ ] C168 R L Review proposed update dialog open → close; proposal sections expand → collapse; added/removed/changed field groups; Approve/Discard pending label changes are M.
- [ ] C169 R L Places list → place sheet → close; provider details and tooltip open → close; sheet content populated after query.
- [ ] C170 R L Workstreams filters/search/paging → results/empty → reset; status and timeline-lane tooltips open → close.
- [ ] C171 R L Workstream card → detail → back; decision/activity timeline rows expand → collapse; receipts query loading → cards/empty; preserve vertical anchor.
- [ ] C172 M L Workstream confirm/reject/archive/reopen/restore → pending → status/action/card changes. Isolated dev workspace needed.

## Motion that needs review before any fix

These are code observations, not measured defects. The user explicitly wants existing motion intent retained.

- List header buttons intentionally grow padding on hover/focus/open. This changes layout dimensions rather than transform/opacity, but code comments declare it deliberate. Measure and report; do not silently redesign.
- Desktop Filters aside deliberately animates width for 200ms, allowing content to reflow. Mobile uses Sheet. Treat as a proposed exception until screenshots confirm its scope.
- File dock tools deliberately unfold with grid-template-columns and opacity for 200ms. It may be allowlisted with its exact affected nodes after measuring.
- Usage hint intentionally expands arrow width and button padding on hover/focus. The code claims nothing beside it shifts; verify that claim in the shell.
- Table virtual rows use fixed geometry and transform positioning. User insertion/deletion changes requested rows, but late focus scroll or post-action canvas resize is still a candidate.
- Store SchemaDialog passes undefined immediately when closed, unlike retained material dialogs. Measure for closing content collapse before considering a retention fix.
- `FieldError` calls and `AdvancedSettings` have no local reserved space/height animation. They are candidates, not findings until browser evidence exists.

## Static search coverage

The scan included Dialog, AlertDialog, Sheet, Popover, DropdownMenu, ContextMenu, Tooltip, Command, Select, Tabs, ToggleGroup, Accordion, Collapsible, Suspense/lazy/ClientOnly, image/avatar, query hooks, pending labels and form errors. No Accordion is used in this slice. ContextMenu is used by table grid rows. Full route/layout/error/redirect coverage belongs to the lead inventory and should not be inferred from this control list.
