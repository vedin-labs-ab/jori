# Lists, tables and resource navigation findings

Phase 3 is running on frozen measurement commit `9eddd142` with one browser per slice. The reviewed transitions below use the final baseline. This file is a working review, not a completion claim. The slice contains 234 inventory transitions, each scheduled in cold and warm Chromium at 1440×900 and 375×812. The generated review package is `dist/layout-hunt`. Final baseline evidence goes in `before/lists`; contact sheets go in `contacts/before-lists`. Prior evidence is archived in `preflight-concurrent/lists`. No UI changes have been made.

## Reviewed boundaries

C001-forward and C001-return replace table-list content with table-detail content and back. All four profiles were visually reviewed, including all 24 frames per direction. The main region and 48px app header remain reserved. On desktop the transparent actions wrapper changes from `(945.72,9.5,470.28,30)` to `(1176,9.5,240,30)`, or the reverse, because the entire action set changes. The LayoutShift entry is `0.001739844`, with recent input, but no prior action control remains to move. Every post-action rect/scroll diff is empty. The narrow profiles have zero LayoutShift entries. This is requested content occupying a reserved header and main region. It is not evidence of the shell remounting or overlapping action sets.

Evidence: [list before navigation](dist/layout-hunt/before/lists/C001-forward/cold-1440/before.png), [detail after navigation](dist/layout-hunt/before/lists/C001-forward/cold-1440/0.png), [stable detail](dist/layout-hunt/before/lists/C001-forward/cold-1440/settled.png). Reverse: [detail before](dist/layout-hunt/before/lists/C001-return/cold-375/before.png), [list after](dist/layout-hunt/before/lists/C001-return/cold-375/0.png), [stable list](dist/layout-hunt/before/lists/C001-return/cold-375/settled.png). Every profile retains the complete source paths, timings and geometry in its record.

## Motion questions

### LF-01: Table header buttons animate their padding

Hovering and leaving Name moves the text/icon within the header while the button width changes by up to 16px. The shared list header deliberately declares a padding transition and documents the intent to align text at rest. It is an existing animation of a layout property. The brief asks that possible intended motion remain untouched pending review, so this is a motion question rather than an authorized design change.

In C006-tables-hover cold-375, Name changes `(40,54,52.95,28)` to `(40,54,68.95,28)` and its icon moves from x77.95 to x85.95. The first sample is 27ms with PNG at 74ms; the next is 275ms with PNG at 276ms. The browser reports a LayoutShift value of `0.000005998` at 153ms, without recent input. The reverse profile reports the icon moving back and all four profiles show geometry changes. Neighboring table cells and rows remain fixed.

Source: `src/shared/console/list/head.tsx`, the Button classes `px-0 hover:px-2 focus-visible:px-2 aria-expanded:px-2` and declared padding transition. Evidence: [resting header](dist/layout-hunt/before/lists/C006-tables-hover/cold-375/before.png), [early hover](dist/layout-hunt/before/lists/C006-tables-hover/cold-375/0.png), [hover complete](dist/layout-hunt/before/lists/C006-tables-hover/cold-375/250.png). All occurrences, including the reverse direction and other shared list variants, will be added after the full slice runs.

Sorting in C007-asc and C007-desc updates the requested order inside the existing list region. Header, list viewport and bottom pagination remain in place, and the rows have the same slots and dimensions. The browser reports row movement from the explicit ordering action. All later geometry is stable apart from LF-01 header padding during activation. This reserved-region result replacement is an intentional exception, limited to the requested row order. It does not permit delayed row, viewport or scroll movement.

## Review ledger

- C001-forward: four profiles, all 24 PNGs inspected, every post-action rect/scroll comparison empty. Reserved-region content replacement as described above.
- C001-return: four profiles, all 24 PNGs inspected, every post-action rect/scroll comparison empty. Reserved-region content replacement.
- C006-tables-hover: four profiles, all 24 PNGs inspected. Only the declared header-padding motion is present.

The completed coverage matrix will retain an explicit result for every case and profile. A selector error will be corrected and rerun, never counted as a passed measurement or an inaccessible product state.

- C006-tables-blur: four profiles, all 24 PNGs inspected. LF-01 reverses; neighboring rows and pagination remain fixed.
- C007-asc: four profiles, all 24 PNGs inspected. Requested row sorting plus LF-01.
- C007-desc: four profiles, all 24 PNGs inspected. Requested row sorting, no later rect or scroll delta.

Machine-readable review accounting is in `dist/layout-hunt/LISTS_REVIEW.json`, currently 936 profiles and 5048 frames.

## Confirmed cause classes

### LF-02: Filtering recalculates table columns and moves the open menu

The table uses automatic column sizing. Removing its last data row removes the intrinsic widths contributed by its cells, so the existing header controls move even though the table viewport width is unchanged. Restoring the rows reverses this. Radix follows the moved Owner trigger after a layout measurement, which produces a second visible horizontal jump in the open popup. This is not an entrance animation.

C012-clear and C012-all reproduce at both desktop profiles. Narrow profiles explicitly omit the Owner column. The Name header cell changes width 249.78→132.59px while the table stays 1184px wide. In warm C012-clear, the already-open popup remains at x1040 in the first geometry sample 19ms after the action completed, then moves to x1023 by 270ms. PNG times 25ms and 274ms closely match. Restoring All reverses the popup position x1023→1040 between 32ms and 279ms, with PNGs 57ms and 290ms. Browser LayoutShift is zero throughout these popup moves; the geometry and images expose them.

Source: `src/shared/console/list/frame.tsx` uses the default automatic Table layout; `src/shared/console/materials/list.tsx` removes filtered rows. The changed table anchor explains the Radix repositioning, so they are one cause rather than two findings.

Evidence: [before Clear](dist/layout-hunt/before/lists/C012-clear/warm-1440/before.png), [columns changed, old popup position](dist/layout-hunt/before/lists/C012-clear/warm-1440/0.png), [popup follows](dist/layout-hunt/before/lists/C012-clear/warm-1440/250.png). Reverse: [first All frame](dist/layout-hunt/before/lists/C012-all/warm-1440/0.png), [popup follows restored columns](dist/layout-hunt/before/lists/C012-all/warm-1440/250.png).

### LF-03: Conditional facet footer changes the open popover height

Clear selection removes its own footer when the selection becomes empty. The open Owner popover shrinks from 224×207.5px to 224×174.5px. Restoring All mounts the footer and grows it 33px. The search row and options stay in the same vertical positions; the popup's existing lower edge changes without a reserved slot or declared layout transition. This is separate from LF-02's horizontal movement.

Source: `ClearFooter` in `src/shared/console/list/head.tsx` returns null when there is no selection. C012-clear and C012-all reproduce in both cold and warm 1440 profiles. Browser LayoutShift is zero, but the before/action rects and PNGs show the resize. Evidence: [full-height picker](dist/layout-hunt/before/lists/C012-clear/cold-1440/before.png), [footer removed](dist/layout-hunt/before/lists/C012-clear/cold-1440/0.png), [footer restored](dist/layout-hunt/before/lists/C012-all/cold-1440/0.png).

The no-match query C012-empty is a separate direct-typing interaction, with no delayed geometry or scroll movement after its first frame. C012-owner-open/close show the default opacity/transform entrance and exit, plus LF-01's declared trigger padding. They do not show LF-02 or LF-03 until the filter selection changes.

C020-one, C020-all and C020-clear were reviewed in all four profiles, 72 PNGs. Selecting rows mounts the fixed selection toolbar with its declared 8px translation and opacity entrance. The table, selected row slots, header and scroll positions stay fixed. Clearing selection removes the toolbar with no later rect or scroll changes. This exception is limited to the existing overlay animation.


### LF-04: Rename draft clears before the dialog exits

Closing Edit table clears the Name value while the dialog is still visible. The blank field flashes during the stock exit. This is not a dimension change, so all CLS entries remain zero and the geometry differences consist only of the declared transform/opacity exit.

`useMaterialEdit` in `src/shared/console/materials/dialogs/edit.tsx` resets name to `material?.name ?? ""` in its effect when the parent clears material to close. The text is visible before Escape, then empty in the first post-action screenshot. Warm desktop samples at 71ms with PNG86ms. Cold narrow samples at68ms with PNG74ms; warm narrow19ms with PNG35ms. Cold desktop's PNG137ms captures a nearly transparent card, so it is weaker evidence than the other three profiles. All24 source PNGs were inspected.

Evidence: [value before close](dist/layout-hunt/before/lists/C035-edit-close/warm-375/before.png), [empty value during exit](dist/layout-hunt/before/lists/C035-edit-close/warm-375/0.png), [desktop flash crop](dist/layout-hunt/contacts/warm-1440-0-rename.png). The mechanism shares the dialog lifetime problem seen in schema close, but clearing a field and unmounting a whole body are separate source sites.

### LF-05: Lazy material navigation clears the header until the chunk arrives

C002-forward navigates from the stores list to Release state. In all four profiles the first post-action frame has only the sidebar toggle in the header and a centered content spinner. The store breadcrumb and actions appear later. The existing header dimensions and main viewport stay fixed, and every scroll delta is zero. This is a visual header flash without CLS, pending review against the reserved-content exception.

The demo `DemoPage` wraps the entire lazy material page in Suspense with ConsoleListLoading. Its detail header is mounted only inside the loaded page, so both breadcrumb and action portal are absent during the fallback. Cold desktop PNG42ms shows the blank header, with the final header by PNG325ms. Warm desktop PNG76ms and PNG281ms still show it blank, then PNG1077ms has the header and content. Narrow profiles show the same sequence. Evidence: [blank header and loading region](dist/layout-hunt/before/lists/C002-forward/warm-1440/0.png), [still loading](dist/layout-hunt/before/lists/C002-forward/warm-1440/250.png), [resolved header](dist/layout-hunt/before/lists/C002-forward/warm-1440/1000.png).

C035-menu-open/close, C035-edit-open, C049-tables-open/close and C052-tables-open/close were reviewed in all four profiles,168 PNGs. Their geometry candidates are confined to the declared popup/modal scale, fade and mobile drawer slide. The background list, header, pagination and scroll positions remain fixed. Visibility and Move preserve their body content through closing; Rename has LF-04.


C013-owner-open adds an important LF-01 occurrence. In the stores list the Owner header's animated padding exceeds its previous intrinsic column width, so the automatic table redistributes neighboring columns too. Warm desktop Owner header cell moves x1099.02→1081.14 and grows112.8→134.48px; Name shrinks252.5→246.88px. Existing data cells move horizontally. The declared intent covers the header padding, while the wider table reflow is a consequence of automatic sizing. This remains a motion question until the merged review decides the scope.

C013-clear and C013-all extend LF-02 and LF-03. The stores Name column changes246.88↔128.17px; Owner's popup changes x1089↔1036 and height144.5↔111.5px. Warm Clear shows its old x1089 at21ms geometry/41ms PNG, then x1036 at270ms/274ms. Warm All reverses x1036→1089 between122ms/128ms and280ms/289ms. Cold captures the same changes before the first post-action frame. CLS is zero. Evidence: [Clear before](dist/layout-hunt/before/lists/C013-clear/warm-1440/before.png), [new height and old position](dist/layout-hunt/before/lists/C013-clear/warm-1440/0.png), [popup follows](dist/layout-hunt/before/lists/C013-clear/warm-1440/250.png). Reverse: [All first frame](dist/layout-hunt/before/lists/C013-all/warm-1440/0.png), [All settled position](dist/layout-hunt/before/lists/C013-all/warm-1440/250.png).

C036-edit-close extends LF-04 to stores in all four profiles. Release state is blank in the first exit PNG. Cold narrow geometry25ms/PNG42ms and warm narrow12ms/19ms show the value disappearing before the drawer slides away. Desktop captures are late in the fade but show the same cleared value. Evidence: [store before close](dist/layout-hunt/before/lists/C036-edit-close/warm-375/before.png), [cleared field during exit](dist/layout-hunt/before/lists/C036-edit-close/warm-375/0.png). C049-stores-close and C052-stores-open/close retain content and only show their stock transform/opacity motion.


### LF-06 candidate: CodeMirror corrects its estimated gutter spacing after mounting

C003-forward shows native LayoutShift entries in all four profiles as line-number gutters change from the library's initial 14px estimate to the actual 19.5px line height. Line4 moves y90→110.5, line5 y104→130, and line8 y146→188.5. Desktop x268 and narrow x4 remain fixed. Cold desktop/narrow entries occur1347/1327ms after the action marker and have values0.001061664/0.008013298; warm674/653ms have the same values. All entries lack recent input.

`src/shared/console/mirror/view.tsx` creates EditorView in a passive effect and sets the scroller line height1.625 over the12px host text. CodeMirror6.43.9 initializes HeightOracle.lineHeight to14 and schedules its first measurement. This explains the recorded positions, but the standard PNG times do not capture the intermediate incorrect gutters. A focused visibility follow-up is queued before classifying this as a confirmed visible defect. The existing screenshots show loading followed by the correctly spaced editor. C003 also extends LF-05's reserved-header loading question.

C003-return replaces the detail action set in the reserved header and list content in the reserved main region. All later rect and scroll deltas are zero. C006-files-hover extends LF-01 only; neighboring rows stay fixed.


C014-clear/all extend LF-02 and LF-03 to Files at both desktop profiles. Name column239.09↔139.78px, Owner popup x1038↔1002, height239↔206px. Warm Clear retains x1038 in geometry26ms/PNG42ms then follows to x1002 at267ms/273ms. Cold Clear and both All profiles complete the same relocation before the first post-action sample. Every CLS value is zero. Evidence: [before Clear](dist/layout-hunt/before/lists/C014-clear/warm-1440/before.png), [resized, old anchor](dist/layout-hunt/before/lists/C014-clear/warm-1440/0.png), [popup follows](dist/layout-hunt/before/lists/C014-clear/warm-1440/250.png). The no-match search is direct typing, with no delayed geometry or scroll changes.


C037-edit-close extends LF-04 to Files. Both narrow profiles show the now-empty Name during the visible drawer exit: cold geometry85ms/PNG92ms and warm15ms/33ms. Desktop screenshots arrive late (cold141ms, warm398ms) and cannot establish the input flash independently. Their source binding is shared, but only narrow captures are positive visual evidence. Evidence: [file value before](dist/layout-hunt/before/lists/C037-edit-close/warm-375/before.png), [blank file name during exit](dist/layout-hunt/before/lists/C037-edit-close/warm-375/0.png). C049-files-open only shows the existing dialog/drawer entrance, retaining the surrounding list and scroll positions.


C004-forward extends LF-05 to Jobs. Blank header plus centered spinner persists through PNG1054ms cold desktop and1305ms cold narrow, then the complete job detail appears by3212/3261ms. Warm desktop firstPNG514ms remains loading, the592ms frame has detail; warm narrow71ms loading→301ms detail. No existing rects move and no scroll deltas occur. The main and header stay reserved. C004-return only replaces the header action set in its reserved region (native0.001692294 desktop/0.000436798 narrow, recent input), with every later geometry/scroll comparison empty. C006-jobs-hover extends LF-01's16px button padding motion without neighboring cell changes.


C015-clear/all extend LF-02 and LF-03 to Jobs at both desktop profiles. Name253.69↔153.11px; Owner popup x1007↔841 (166px) and height365↔332px. Warm Clear retains the old x1007 at geometry22ms/PNG39ms, then moves to x841 by269ms/290ms. Warm All reverses from x841 at48ms/73ms to x1007 at295ms/296ms. Both cold profiles have the same changes by the first post-action sample. CLS remains zero. Evidence: [Jobs before Clear](dist/layout-hunt/before/lists/C015-clear/warm-1440/before.png), [new columns, old popup anchor](dist/layout-hunt/before/lists/C015-clear/warm-1440/0.png), [popup follows166px](dist/layout-hunt/before/lists/C015-clear/warm-1440/250.png). Reverse: [All first frame](dist/layout-hunt/before/lists/C015-all/warm-1440/0.png), [All final anchor](dist/layout-hunt/before/lists/C015-all/warm-1440/250.png).


### LF-07 motion question: Advanced settings grows the existing job editor

C049-jobs-open/close toggles Advanced settings inside Edit job. These are disclosure transitions, not modal entrance and exit. All eight profiles and48 PNGs were reviewed. Opening adds a64px Visibility section to the existing form. Desktop dialog643→707px recenters from y128.5→96.5; closing reverses it. On narrow screens the form grows683.5→747.5 and pushes Save changes below the viewport. Warm narrow opening appears at geometry46ms/PNG68ms, and closing at41ms/45ms. Native narrow LayoutShift is0.002539251 in both directions; desktop closing0.000559671.

`AdvancedSettings` in `src/shared/console/materials/form.tsx` conditionally mounts normal-flow CollapsibleContent. Only the chevron declares a transform animation. This shares controls CF-07 and remains a motion question. Proposed review decision: retain the disclosure behavior but animate its expansion, or reserve its maximum content footprint. No motion or design change is made during the hunt. Evidence: [closed advanced section](dist/layout-hunt/before/lists/C049-jobs-open/warm-375/before.png), [section pushes footer out](dist/layout-hunt/before/lists/C049-jobs-open/warm-375/0.png), [desktop before collapse](dist/layout-hunt/before/lists/C049-jobs-close/warm-1440/before.png), [desktop recenters after collapse](dist/layout-hunt/before/lists/C049-jobs-close/warm-1440/0.png).


### LF-08: Material-name validation has no reserved error slot

C042-table-error adds27.5px under Name after submitting an empty Create table form. The desktop dialog grows215.5→243px and recenters y342.25→328.5. The narrow drawer grows252.5→280px and its top moves559.5→532. Cold/warm narrow native entries occur67/39ms after the action marker, value0.011890606, both with recent input. Warm narrow PNG52ms shows the new error and moved fields. This is the shared FieldError cause also recorded as controls CF-01. `CreateMaterialDialog` passes conditional nameError into MaterialNameField, with no reserved error footprint.

All four profiles and24 PNGs were inspected. C042-table-clear removes the same27.5px as typing clears the validation. That immediate direct-typing occurrence is allowed by the brief but records the inverse dimensions for regression review. No post-action geometry or scroll changes remain in either direction. Evidence: [name field before invalid submit](dist/layout-hunt/before/lists/C042-table-error/warm-375/before.png), [error pushes fields](dist/layout-hunt/before/lists/C042-table-error/warm-375/0.png).

C043-table-open/close extend LF-07 to the Create table Advanced settings disclosure. Folder and Visibility add128px. The narrow drawer jumps252.5↔380.5px; its top559.5↔431.5. Desktop dialog215.5↔343.5px, y342.25↔278.25. All eight profiles and48 PNGs show the unanimated resizing, native narrow0.073770. Warm narrow close PNG36ms and303ms bracket the same final closed geometry. The two remaining rect candidates are the declared chevron rotation. Source and motion question are shared AdvancedSettings. Evidence: [before expansion](dist/layout-hunt/before/lists/C043-table-open/cold-375/before.png), [expanded drawer](dist/layout-hunt/before/lists/C043-table-open/cold-375/0.png), [collapsed drawer](dist/layout-hunt/before/lists/C043-table-close/warm-375/0.png).


### LF-09: Successful creation clears the draft during the dialog exit

C051-table confirms the create path has its own draft lifetime problem. `useCreateMaterial` in `src/shared/console/materials/dialogs/create.tsx` calls setNameState("") before onCreated closes the dialog. Warm narrow PNG38ms clearly shows the previously filled Name becoming empty while the drawer is still visible. Cold narrow PNG56ms shows the same empty field near the bottom edge; desktop exit is already faint at PNG116/155ms. All24 PNGs were inspected. This shares LF-04's symptom but has a distinct source reset on successful creation. Evidence: [filled draft before creating](dist/layout-hunt/before/lists/C051-table/warm-375/before.png), [empty draft while closing](dist/layout-hunt/before/lists/C051-table/warm-375/0.png).

The inserted long-named table also extends LF-02 automatic column sizing. Desktop Name grows249.78→347.63px and Columns moves x545.78→643.63. Narrow Name grows179.33→272px and Last Updated moves x211.33→304, partly outside the viewport. Cold/warm desktop native value0.007200185; narrow0.010045881 at84/36ms after the action marker. All later scroll differences are zero. The existing row/header geometry changes with new intrinsic content. The fixed success toast only uses its declared entrance and does not push the page.


C042-store-error extends LF-08 with the identical27.5px error insertion, desktop215.5→243 and narrow252.5→280. Cold/warm narrow PNG34/23ms show the moved fields; native55/26ms, value0.011890606. All4profiles and24PNGs reviewed. C042-store-clear is the immediate typing-driven inverse with no later deltas. C043-store-open/close extend LF-07 with the same128px disclosure growth as tables, narrow252.5↔380.5 and desktop215.5↔343.5. All8profiles and48PNGs reviewed. Evidence: [store error before](dist/layout-hunt/before/lists/C042-store-error/warm-375/before.png), [store error after](dist/layout-hunt/before/lists/C042-store-error/warm-375/0.png), [store advanced before](dist/layout-hunt/before/lists/C043-store-open/warm-375/before.png), [store advanced after](dist/layout-hunt/before/lists/C043-store-open/warm-375/0.png).


C051-store extends LF-09 and LF-02. Warm narrow PNG43ms and warm desktop80ms show the Name value clearing while the dialog remains visible. Cold narrow68ms captures only the top of the exiting drawer, so it does not independently show the field; cold desktop211ms is after the fade. Stores Name grows252.5→349.28px desktop and175.41→272px narrow after the long row appears. Native desktop0.003545804 at176/24ms cold/warm, narrow0.005343921 at131/39ms. All4profiles and24PNGs reviewed. Evidence: [store draft](dist/layout-hunt/before/lists/C051-store/warm-375/before.png), [blank draft during exit](dist/layout-hunt/before/lists/C051-store/warm-375/0.png), [new columns](dist/layout-hunt/before/lists/C051-store/warm-375/250.png). C044-folder-open keeps the existing dialog fields and background fixed while the Folder picker uses its stock scale/opacity entrance.


### LF-10 motion question: Visibility mode inserts an unreserved grantee picker

C045-people/people-return and C045-teams/teams-return all4profiles and96PNGs show the open Create table dialog growing/shrinking36px. `VisibilityField` in `src/shared/console/visibility/field.tsx` adds GrantPicker for people/teams and returns null for other modes. No slot or layout animation covers this additional field. Desktop343.5↔379.5px recenters y278.25↔260.25. Narrow380.5↔416.5px changes its top431.5↔395.5. The native narrow value is0.022713485 in each direction. Warm people PNG35ms and reverse36ms show the jump; teams35/20ms. All later geometry outside the closing Select menu is stable, and scroll is unchanged.

This is a requested form-structure change with unanimated movement, left for motion review. A reserved grantee row would keep the editor footprint steady; animating the reveal is a design decision to review, not something added silently. Evidence: [before people mode](dist/layout-hunt/before/lists/C045-people/warm-375/before.png), [picker added](dist/layout-hunt/before/lists/C045-people/warm-375/0.png), [picker removed](dist/layout-hunt/before/lists/C045-people-return/warm-375/0.png), [teams picker added](dist/layout-hunt/before/lists/C045-teams/warm-375/0.png). C045-mode-open/close only show stock Select menu motion and keep the editor fixed.


### LF-11 motion question: Grid keyboard navigation scrolls focused cells into view

C062-tab and C062-shifttab have zero native LayoutShift entries, but both
narrow profiles scroll the grid horizontally. Tab moves scrollLeft 0 to 120;
Shift+Tab returns 120 to 48. The header and other page regions stay fixed.
Warm Tab still has scrollLeft 0 in the first 12 ms snapshot and 15 ms PNG,
then 120 at the 258 ms snapshot and 262 ms PNG. Warm reverse has 120 in the
12 ms snapshot and 29 ms PNG, then 48 by 258 ms and 261 ms. Cold profiles
complete their scroll before the first PNG, at 70 ms and 46 ms respectively.
All eight profiles and 48 PNGs were inspected.

`TextCell` in `src/shared/console/tables/grid/cell.tsx` mounts an autoFocus
input. Its Tab handler commits, then calls onAdvance; the neighboring editor
mounts through a spotlight effect. The browser scrolls that new focus into
view. This is intentional keyboard navigation with an unanimated scroll, so
it remains a motion question under the brief's focus-scroll rule. Preventing
scroll alone would leave keyboard focus offscreen. Review whether the current
accessible focus reveal should be allowed or get explicit scroll animation.
No animation has been added.

Evidence: [Tab before focus scroll](dist/layout-hunt/before/lists/C062-tab/warm-375/0.png),
[Tab after focus scroll](dist/layout-hunt/before/lists/C062-tab/warm-375/250.png),
[reverse before focus scroll](dist/layout-hunt/before/lists/C062-shifttab/warm-375/0.png),
[reverse after focus scroll](dist/layout-hunt/before/lists/C062-shifttab/warm-375/250.png).
The desktop profiles keep scroll fixed and replace the editor inside the
same cell slot.


### LF-12: Successful row creation clears fields during the exit

C069-add uses AddRowDialog's real submit path. It calls setDraft({}) before
onOpenChange(false), so the filled Customer value disappears while the closing
card remains visible. Narrow cold PNG55ms and warm31ms clearly show the empty
input; desktop132/112ms captures a fainter empty form. All four profiles and
24 PNGs were inspected. This is the dialog draft-lifetime family, with its own
source in `src/shared/console/tables/add.tsx`.

Evidence: [row draft before save](dist/layout-hunt/before/lists/C069-add/warm-375/before.png),
[blank field while closing](dist/layout-hunt/before/lists/C069-add/warm-375/0.png).
The requested fifth row also pushes the existing New row control down36px.
Native values are0.000130556 desktop and0.000985416 narrow, all recent input.
Existing data rows and columns stay fixed. The footer movement belongs to the
open question about unanimated requested row insertion, separate from the
unintended field flash. Scroll positions remain fixed.

### LF-13: New-column sheet switches to edit mode while closing

C073-new-close clears ColumnSheetState. ColumnSheet derives isCreating from
state?.mode, so its closing render switches the title to Column details,
replaces the Type picker with a badge, removes the required-field hint, adds
Delete and changes Add column to Save. The Type badge is8px taller than the
picker, moving Required down8px. The footer button set changes while the
sheet is still visible. This is unrelated to the stock horizontal exit slide.

All four profiles and24 PNGs were reviewed. Narrow cold first PNG58ms and
warm21ms clearly show the wrong edit-mode form. Desktop119/110ms also retain
the title and controls. Native entries occur at34/9ms cold/warm desktop,
value0.000087269; narrow43/18ms, value0.000483292, all recent input.
Source is `src/shared/console/tables/sheet.tsx`, with the draft reset in
`src/shared/console/tables/column.ts` part of the same closing-state lifetime.

Evidence: [new-column form before close](dist/layout-hunt/before/lists/C073-new-close/warm-375/before.png),
[edit-mode form during exit](dist/layout-hunt/before/lists/C073-new-close/warm-375/0.png),
[sheet gone](dist/layout-hunt/before/lists/C073-new-close/warm-375/250.png).


C074-details-close extends LF-13 to the existing-column path. Closing Customer
resets its Name to the Column name placeholder and clears Required while the
sheet remains visible. All four profiles and24 PNGs show the closing state;
narrow PNG22ms warm and57ms cold are decisive. Native shifts are zero because
this path keeps the same geometry. The reset comes from useColumnSheetForm's
effect, which calls draftFor(undefined, table) when the parent clears state.
Evidence: [Customer details](dist/layout-hunt/before/lists/C074-details-close/warm-375/before.png),
[blank name and cleared Required during exit](dist/layout-hunt/before/lists/C074-details-close/warm-375/0.png).
C074-details-open only shows the existing Sheet entrance and keeps its values.

C076-create and C076-rename confirm LF-13 on successful saves. The create path
changes to Column details, replaces the type selector with its taller badge and
clears the name before the sheet exits. All four profiles record the eight-pixel
Required movement at 19-133 ms. The rename path clears the entered name and
Required without changing the sheet's geometry. Narrow screenshots at 40 ms
cold and 46 ms warm show the blank fields.
Evidence: [saved create form before exit](dist/layout-hunt/before/lists/C076-create/warm-375/0.png),
[completed create](dist/layout-hunt/before/lists/C076-create/warm-375/250.png),
[rename draft](dist/layout-hunt/before/lists/C076-rename/warm-375/before.png),
[blank rename during exit](dist/layout-hunt/before/lists/C076-rename/warm-375/0.png).

C075-duplicate is a useful stable validation case. Its error appears inside the
existing flex-grow sheet body, and no existing element moves or resizes. All
four profiles have zero native shifts, rect changes and scroll changes. This
should stay stable when changing the shared error component.

C074-delete-close needs a corrected recipe. The original Cancel selector
matches both the underlying sheet and the confirmation dialog. All four
attempts are retained as errors; the retry targets only the alertdialog.

### LF-14 motion question: Requested collection edits move trailing controls

C069-add inserts one 36px row before New row. C072-delete removes four rows,
moving the existing New row button from y232 to y88. All four deletion profiles
record the 144px jump at48-141ms, with native values0.000522222 desktop and
0.003941663 narrow. No scroll change follows. C076-create inserts a224px column
before the existing New column control. The viewport and earlier rows/columns
remain fixed, but these trailing controls have no reserved position or authored
transition. Source is the row and column mapping in
`src/shared/console/tables/grid/index.tsx`. Keep this requested collection
behavior unchanged pending a motion decision. It is separate from the draft
reset on row creation in LF-12.

Evidence: [before deleting four rows](dist/layout-hunt/before/lists/C072-delete/warm-375/before.png),
[New row144px higher](dist/layout-hunt/before/lists/C072-delete/warm-375/0.png).

C079-code extends LF-06 to Store Code view. All four profiles record initial
CodeMirror gutter correction365-1659ms after the action. In warm375 the sixth
line moves y118 to149.5; line7 moves132 to169; line8 moves146 to188.5. First
painted editor screenshots already show correct spacing, so visible proof still
needs the passive observer follow-up. Cold desktop's first PNG1865ms also
requires an early-frame repeat. C079-form's warm desktop attempt failed to find
Form after its lazy setup. The other three profiles reach the actual form; all
four will be repeated with explicit setup completion.


### LF-15: Empty lists remove the pagination label and shrink the narrow footer

Bulk archiving all tables or stores removes the conditional count label from the pager. At375px, the existing footer changes from `(0,740,375,72)` to `(0,768,375,44)` and its inner pager from `(16,748,343,56)` to `(16,776,343,28)`. Removing the16px label and12px gap releases28px into the main region. Pagination buttons remain against the bottom edge. Desktop keeps its44px footer and has no native shift.

Source: `src/shared/console/list/pager.tsx`, the conditional `pagination.footerLabel` paragraph within the column layout. C030-tables cold/warm375 reports the change at70/31ms; C030-stores at69/41ms. Each native value is0.0030575845082384916 with recent input. All four profiles of each transition were visually reviewed. The first narrow PNGs,19/38ms for tables and19/25ms for stores, already show the missing label and shorter footer. The empty body is requested content in its reserved main region; the existing footer resize is the defect.

Evidence: [tables before](dist/layout-hunt/before/lists-tail-chat/C030-tables/warm-375/before.png), [tables after](dist/layout-hunt/before/lists-tail-chat/C030-tables/warm-375/0.png); [stores before](dist/layout-hunt/before/lists-tail-root/C030-stores/warm-375/before.png), [stores after](dist/layout-hunt/before/lists-tail-root/C030-stores/warm-375/0.png).

### LF-16 motion question: Successful bulk removal unmounts the confirmation before its exit

The same C030-tables and C030-stores transitions remove the confirmation outright once the selected count becomes zero. `SelectionActionsBar` in `src/shared/console/list/bar.tsx` returns null for count0; it owns the removal button and its AlertDialog. The first post-action PNGs19–56ms already have no dialog, instead of retaining the content for its stock exit. This differs from the draft-clearing defects: the entire modal owner disappears. Leave the motion unchanged pending review.

The before/after pairs for LF-15 also capture this disappearance at both widths. Clearing a selection toolbar alone has no authored exit and no movement of surviving content, so C024-clear is an allowed overlay removal; this question concerns the confirmation’s lost default exit.


C030-jobs extends LF-02, LF-15 and LF-16. Unlike the material-list empty state, Jobs retains its table headers: Name width253.69→158.2px on desktop,295→303px narrow, while adjacent columns redistribute. The narrow footer shrinks72→44px; native entries84/41ms have value0.0030575845082384916. The confirmation has disappeared by PNG26/17ms narrow and57/50ms desktop, before the toast’s stock entrance. Scroll positions stay fixed. Evidence: [Jobs before](dist/layout-hunt/before/lists-tail-root/C030-jobs/warm-375/before.png), [empty Jobs/footer](dist/layout-hunt/before/lists-tail-root/C030-jobs/warm-375/0.png).

C039-stores extends LF-02 to rename: Name width252.5→364.2px desktop and175.41→272px narrow moves unchanged neighboring data. Native values0.004048268636067709 desktop and0.005316183964667912 narrow occur30–127ms. It also extends LF-04: saving clears the Name field while the closing modal is visible, best shown in warm narrow PNG34ms; cold narrow PNG69ms has already slid the field below the viewport. Evidence: [rename before save](dist/layout-hunt/before/lists-tail-root/C039-stores/warm-375/before.png), [blank field and widened background name column](dist/layout-hunt/before/lists-tail-root/C039-stores/warm-375/0.png).

C027-move-close, C028-move-open, C028-delete-open, C038-store-open/close and C050-save preserve surrounding content and scroll positions. Their candidate geometry is stock popup/dialog/drawer motion. Visibility save retains its selections through exit. C038-store-open additionally records the already-authored breadcrumb padding movement (CF-12),4.18px for label/icon in cold desktop at336ms. All24PNGs per transition were reviewed.


Delegated tail review extends LF-02 and LF-04 to C039-files/tables. Files Type moves x622.64→718.59px desktop and Last Updated207.77→304px narrow. Tables Columns moves545.78→643.53px desktop and Last Updated211.33→304px narrow. All four profiles retain recent-input native entries. Warm desktop and narrow first PNGs also show blank Name during the successful-save exit. Full per-profile coordinates, timings and screenshot pairs are retained in `LISTS_TAIL_SHELL_REVIEW.json`.

C072-row extends LF-14: deleting one row moves New row y232→196px. Native values0.0001305556 desktop and0.0009854158 narrow occur37–80ms, all with recent input. It extends LF-16 at a second source site: `RowContextMenu` in `src/shared/console/tables/grid/row.tsx` owns the confirmation inside the deleted keyed row, so the modal disappears by PNG26–66ms. Keyed surviving rows move into preceding positions; positional selector replacements do not establish a remount.

C063-invalid and C067-paste show their requested fixed-position validation/clipboard-refusal toasts with stock transform/opacity motion, stable grid and no scroll changes. C066-copy was denied write permission; its stable menu exit does not establish copy success. A private per-document clipboard response is queued for successful Copy/Paste and toast expiry measurements. C038-table-close cold desktop (geometry242ms/PNG491ms) and C029-Delete-open cold desktop (341/446ms) are queued for early-frame repeats.
