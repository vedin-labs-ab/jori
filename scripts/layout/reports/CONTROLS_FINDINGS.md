# Controls layout hunt - phase 3 in progress

V3 review progress: 16 profile series and 96 frames examined, including the before frame where present.

Final-run review progress: 552 profile series and 3276 frames examined, including the before frame where present.

The final run uses frozen lead commit `9eddd142` and one Chromium browser. Earlier concurrent runs remain supplemental evidence and do not establish final coverage. Preliminary measurements from `2aa45283` are archived under `preflight-partial/controls`; preliminary observations below require remeasurement before a final pass/fail claim. Current raw evidence is written to `dist/layout-hunt/before/controls`. This slice uses `scripts/layout/scenarios/shards/controls.json`: 196 original cases from C081 onward plus the supplemental cases listed in the coverage table, each scheduled for cold and warm runs at 1440×900 and 375×812. Explicitly unavailable states and intentional breakpoint restrictions remain coverage records. Fixture writes occur only in each scenario's in-memory DemoConsole context; live app recipes are read-only.

Raw evidence is under `dist/layout-hunt/before/controls/<scenario>/<condition>-<width>/`. Each completed execution records before/action geometry, 0/250/1000/3000 ms and settled frames, all LayoutShift entries including recent input, rect replacements/resizes and scroll deltas. The actual image capture times in `record.json` govern frame timing. `screenshotElapsed` is relative to sampling start after the action returns; `msAfterAction` is relative to the browser action marker before the click. They are reported separately and are not interchangeable. A contact sheet is a review aid; it does not replace the raw images.

This file is preliminary. No UI fix has been made and this report does not establish the phase 3 completion gate.

Occurrence index: `dist/layout-hunt/CONTROLS_OCCURRENCES.json` groups every reviewed finding occurrence by cause, exact inventory ID/profile, source paths, status, recorded native/rect values and explicit PNG pairs. The coverage CSV uses the same cause IDs.

## Confirmed root causes

### CF-01 - validation errors appear without reserved space

Clearing required `rolloutPercent` on `/stores/collections_release` inserts the inline "is required" message after the 1200 ms autosave debounce. The row grows from 37 px to 64.5 px. The following `frozen`, `blockers`, array-item and Add item rows move down 27.5 px. Correcting the value removes the error and moves them back. This is an unanimated document-flow reflow, with no intended motion declared at this boundary.

Source: `src/shared/console/stores/value/autosave.ts:13` schedules validation after 1200 ms; `fields.tsx:173` mounts `FieldError` below the scalar control; `src/components/ui/field.tsx` returns null when there is no error. Related error placements also exist at `rows.tsx:197` and `fields.tsx:253`, but only the measured scalar case is claimed here.

Reproduction: C081-empty clears `[id="value.rolloutPercent"]`. C081-clear starts from that settled error and fills a valid value. All eight profiles reproduce. At mobile width, the `frozen` row changes `(x=0,y=159,w=375,h=37)` → `(0,186.5,375,37)`; desktop is `(256,159,1184,37)` → `(256,186.5,1184,37)`. Correction reverses the y delta. No scroll delta is recorded.

Evidence pair: [1000 ms before error](dist/layout-hunt/before/controls/C081-empty/cold-375/1000.png) → [3000 ms error visible](dist/layout-hunt/before/controls/C081-empty/cold-375/3000.png). Reverse pair: [error before correction](dist/layout-hunt/before/controls/C081-clear/cold-375/before.png) → [immediate corrected field](dist/layout-hunt/before/controls/C081-clear/cold-375/0.png). Exact geometry and event attribution are in each `record.json`.

| Case | Profile | Event after action | LayoutShift value | Recent input |
| --- | --- | ---: | ---: | --- |
| C081-clear | cold 1440 | 12 ms | 0.003070645 | False |
| C081-clear | cold 375 | 12 ms | 0.007340629 | False |
| C081-clear | warm 1440 | 13 ms | 0.003070645 | False |
| C081-clear | warm 375 | 11 ms | 0.007340629 | False |
| C081-empty | cold 1440 | 1254 ms | 0.003070645 | False |
| C081-empty | cold 375 | 1245 ms | 0.007340629 | False |
| C081-empty | warm 1440 | 1221 ms | 0.003070645 | False |
| C081-empty | warm 375 | 1222 ms | 0.007340629 | False |

Confirmed under final frozen digest `44d5b4a789…` (`9eddd142`), eight of eight profiles, one browser. All 48 frames reviewed.

Schema-name validation reproduces the same missing reservation in `src/shared/console/stores/schema/fields.tsx:121`. C088-error submits a new field with no name and inserts "Give the field a name."; C088-clear types a name and removes it. The error adds 27.5 px. Desktop dialog `(432,262.25,576,375.5)` becomes `(432,248.5,576,403)`; mobile `(0,344,375,468)` becomes `(0,316.5,375,495.5)`. Correction reverses both. Error events occur 26–52 ms after action with recent input, while correction events occur 19–31 ms without recent input in the browser record. Mobile shift value is 0.020645520; desktop error 0.000511971 and correction 0.000400983. Raw occurrences: `before/controls/C088-{error,clear}/{cold,warm}-{1440,375}/record.json`. Field-error frames: `C088-error/cold-375/before.png` → `0.png`.

| Schema validation case | Profile | Event after action | LayoutShift value | Recent input |
| --- | --- | ---: | ---: | --- |
| C088-clear | cold 1440 | 31 ms | 0.000400983 | False |
| C088-clear | cold 375 | 24 ms | 0.020645520 | False |
| C088-clear | warm 1440 | 19 ms | 0.000400983 | False |
| C088-clear | warm 375 | 27 ms | 0.020645520 | False |
| C088-error | cold 1440 | 52 ms | 0.000511971 | True |
| C088-error | cold 375 | 35 ms | 0.020645520 | True |
| C088-error | warm 1440 | 34 ms | 0.000511971 | True |
| C088-error | warm 375 | 26 ms | 0.020645520 | True |

All eight schema-validation profiles and 48 frames reviewed.

Job-name validation is another CF-01 occurrence. `src/shared/console/jobs/editor/fields/name.tsx:25` mounts `FieldError` without a slot. C107-error inserts "Name is required." and adds 27.5 px, desktop dialog `(432,146.25,576,607.5)` → `(432,132.5,576,635)`, mobile `(0,131.5,375,680.5)` → `(0,104,375,708)`. Events: cold desktop 214 ms, warm desktop 80 ms, cold mobile 226 ms, warm mobile 55 ms. Recorded values are 0.000464935 desktop and 0.030066248 mobile, with recent input. No scroll delta. Evidence: `before/controls/C107-error/{cold,warm}-{1440,375}/{before.png,250.png,record.json}`. All four profiles/24 frames reviewed.

Folder-name validation is another CF-01 occurrence. `src/shared/console/folders/dialogs/name.tsx:84` mounts the same `FieldError` without reserving space. C123-error inserts "Name is required." and changes desktop modal `(528,370,384,160)` → `(528,356.25,384,187.5)` and mobile `(0,615,375,197)` → `(0,587.5,375,224.5)`. C123-clear reverses these changes while typing. Error events occur at 43/35 ms cold/warm desktop and 76/25 ms mobile, all with recent input. Clearing occurs at 84/17 ms desktop and 21/6 ms mobile, without recent input in the observer. Desktop values are 0.000300840 for error and 0.000228224 for clear; mobile both 0.009342619. No scroll changes. Evidence: `before/controls/C123-{error,clear}/{cold,warm}-{1440,375}/{before.png,0.png,record.json}`. All eight profiles/48 frames reviewed.

Create-organization name validation adds another CF-01 occurrence. `src/console/organization/create.tsx:111` renders `FieldError` without reserved space. C142-empty changes the desktop dialog from x496/y314.25, 448×271.5 to x496/y300.5, 448×299. The timezone field moves down 13.75 px as the name field moves up 13.75 px. Both desktop profiles show one recent-input entry, value 0.000355538, at 432 ms cold and 46 ms warm. No scroll changes. Evidence is `before/controls/C142-empty/{cold,warm}-1440/{before.png,0.png,record.json}`. Both series and all 12 frames were reviewed. Error clearing and mobile validation are queued separately.

### CF-02 - schema content disappears before the dialog exit finishes

Closing Schema removes the body immediately while the dialog/drawer exit transition is still running. All four final profiles visibly reproduce: the desktop dialog becomes a thin empty bar and the mobile drawer becomes an empty handle strip. Browser LayoutShift is zero throughout. Geometry and pixels expose the collapse.

Source: `src/shared/console/stores/schema/dialog.tsx:39-44` uses `store !== undefined` for open state and removes `SchemaDialogForm` as soon as `store` becomes undefined. The exit primitive is still mounted, so it takes its collapsed content height. No fix has been made.

Desktop before rect is `(432,280.25,576,339.5)`, then warm first sample is empty `(432,434,576,32)`. The cold frame also applies the exit scale, producing `(435.18,434.18,569.64,31.65)`. Mobile before rect is `(0,380,375,432)`, then empty `(0,743,375,69)`, then `(0,808.88,375,69)` before leaving the viewport.

| Profile | First geometry | First PNG completed | Next geometry/PNG | Visible result |
| --- | ---: | ---: | --- | --- |
| Cold 1440 | 60 ms | 111 ms | 299 / 301 ms | Empty desktop bar, then absent |
| Warm 1440 | 17 ms | 73 ms | 266 / 277 ms | Empty desktop bar, then absent |
| Cold 375 | 19 ms | 43 ms | 268 / 292 ms | Empty handle strip, then strip near bottom |
| Warm 375 | 8 ms | 22 ms | 257 / 272 ms | Empty handle strip, then strip near bottom |

Evidence: [desktop before](dist/layout-hunt/before/controls/C085-schema-close/warm-1440/before.png) → [desktop empty bar](dist/layout-hunt/before/controls/C085-schema-close/warm-1440/0.png); [mobile before](dist/layout-hunt/before/controls/C085-schema-close/cold-375/before.png) → [mobile empty strip](dist/layout-hunt/before/controls/C085-schema-close/cold-375/0.png) → [strip exiting](dist/layout-hunt/before/controls/C085-schema-close/cold-375/250.png). Occurrence: 4/4 final profiles, all 24 frames reviewed under final digest `44d5b4a789…`.

C089-remove (Remove schema commit) exercises the same premature close cleanup and visibly reproduces the empty desktop bar/mobile strip in all four profiles. Its underlying value switches to read-only JSON within the existing content region; the separate defect claimed here is the closing modal collapse. Evidence: `before/controls/C089-remove/{cold,warm}-{1440,375}/{before.png,0.png,record.json}`. All 24 frames reviewed. CF-02 now has eight final profile occurrences across C085-schema-close and C089-remove.

### CF-06: One-time scheduling fallback has different geometry from the loaded controls

`src/shared/console/jobs/editor/fields/timing.tsx:48` lazy-loads `JobDateTimePicker`. Its `TimingFallback` at line 66 reserves one 64 px block. The loaded date/time controls are 48 px tall on desktop and 108 px on mobile. After selecting One-time, the dialog first takes the fallback height and then changes again when the import resolves. This second movement is an async placeholder mismatch, separate from the requested tab change.

All four profiles reproduce. Desktop modal `(432,170.25,576,559.5)` becomes `(432,178.25,576,543.5)`, a 16 px shrink and 8 px recenter. Mobile `(0,215.5,375,596.5)` becomes `(0,171.5,375,640.5)`, a 44 px growth moving the heading upward. No scroll change occurs. The second event is at 443 ms cold desktop, 352 ms warm desktop, 366 ms cold mobile, and 353 ms warm mobile. Values are 0.000354459 on desktop and 0.042709120 on mobile, all with recent input. Mobile also records the separate immediate tab-size change, 0.086631562 at 44–60 ms.

Evidence pair for each profile: `before/controls/C109-one-time/{condition}-{width}/0.png` → `1000.png`. Actual PNG times relative to the sampling start: cold desktop 143 → 1143 ms, warm desktop 79 → 1071 ms, cold mobile 75 → 1051 ms, warm mobile 41 → 1032 ms. Each first image shows the blank fallback, each later image shows the loaded date/time controls. All 24 frames reviewed. PNG times and `msAfterAction` have different origins, because sampling begins after the Playwright action returns. The intermediate cold-mobile 250.png has already loaded the controls; it is not claimed as a pre-load frame.

### CF-09: Paused status changes every desktop table column's width

`src/shared/console/jobs/list/cells.tsx:32` conditionally adds a 16 px Paused `RowMark` in the name cell. The shared material table lets content set its column widths. Pausing Weekly release summary expands Name from 253.69 to 261.55 px, making Trigger start x549.69→557.55. Tools, Folder, Owner, Last run and Next run all move on every existing row. Their y positions and row heights remain fixed. This is a status-icon geometry change affecting unrelated cells, with no reserved mark slot or declared motion.

C117-pause reproduces in both desktop profiles. The one recorded shift is 0.000855184597 at 82 ms cold/46 ms warm, with recent input. Example Trigger cell `(549.69,292.5,180.05,41)` → `(557.55,292.5,178.36,41)`. Mobile's single name column retains geometry and only shows the new mark. All four profiles/24 frames reviewed; no scroll delta. Evidence: `before/controls/C117-pause/{cold,warm}-1440/{before.png,0.png,record.json}`. The menu's exit is a separate normal portal animation. C117-resume's original fast Pause→reopen setup timed out before the Resume action; its corrected recipe starts from the already paused Design review digest and remains queued for all four profiles.

C124-create adds a long folder name and reproduces CF-09 automatic table sizing in all four profiles. Desktop Owner cells move x714.58→898.30 and shrink 292.95→212.56 px. Mobile Updated cells move x197.39→304 and shrink 129.61→71 px. Existing row y positions stay fixed. One recent-input shift occurs at 83/34 ms cold/warm desktop, value 0.016263957, and 80/37 ms mobile, value 0.012540682. The new row appears within the existing result section; the defect claimed is the movement of unrelated columns. Evidence: `before/controls/C124-create/{cold,warm}-{1440,375}/{before.png,0.png,record.json}`. All24 frames reviewed. This root merges with lead LF-02.

### CF-11: Folder name resets while its dialog is exiting

`src/shared/console/folders/dialogs/name.tsx:50` calls `setName(initialName)` after successful submit and before closing the dialog. C124-create submits a long name, then the visible input becomes empty during the exit fade/slide. The form retains its geometry; this is a screenshot-only content flash, separate from the simultaneous table-column shift.

Evidence: `before/controls/C124-create/warm-1440/before.png` → `0.png`, first PNG71 ms after sampling starts; `warm-375/before.png` → `0.png`, PNG31 ms. Cold mobile PNG65 ms shows the partly exiting form with an empty input; the cold desktop PNG105 ms has nearly faded out, so it is not used as the decisive text evidence. All four series/24 frames were inspected. Visible occurrences are warm desktop and both mobile profiles. This shares the reset-before-exit family with lead LF-04, which covers material rename.

### CF-13: Changing the deletion label moves the neighboring Cancel button

`src/shared/console/folders/dialogs/delete.tsx:119` switches the action label between "Delete folder" and "Delete folder and contents". On desktop, C126-contents/contents-back changes its width 91.27↔167.61 px and positionx 804.73↔728.39. Cancel moves 76.34 px, x739.67↔663.33, while retaining 57.06 px width. The full dialog keeps 231 px height. This is an unreserved state-label width change moving an existing control, with no declared layout animation.

Four desktop occurrences: checkbox-on event 28/35 ms cold/warm, value 0.000159704; checkbox-off 34/33 ms, value 0.000276128. All have recent input. Evidence: `before/controls/C126-contents{,-back}/{cold,warm}-1440/{before.png,0.png,record.json}`. All four desktop series/24 frames reviewed. Mobile buttons reserve full width and stay fixed. Mobile's0.000296081 entries come from replacing the explanation text inside the same `(24,578,327,35.5)` bounds; no surrounding rect/scroll changes occur, so those entries are treated as requested text replacement in reserved space. All four mobile series/24 frames also reviewed.

## Reviewed intentional motion

- C106 job row menu open/close: initial reviewed desktop and mobile profiles show the dropdown appearing/disappearing with its default fade/transform. Main list rows, header and pagination remain fixed. LayoutShift entries are empty. Geometry differences belong to mounted/removed menu nodes. Raw example: `preflight-partial/controls/C106-menu-open/cold-375/record.json`, paired `before.png` and `250.png`; closing example `C106-menu-close/cold-375/before.png` and `0.png`.

Job menus and full job create/edit dialogs preserve their content while closing. C106-menu-open/close, C106-edit-open/close, C106-new-open/close were reviewed in all four profiles. Their fixed portals animate opacity/transform without changing page flow. C087-type-open/close's 2 px trigger movement is the Select's explicit tactile transform; C087-required changes the switch thumb inside its fixed slot. These scoped motions have no LayoutShift or scroll delta. C092-copy removes its menu without page reflow.

C105-paused/reset changes rows within the fixed-height result section, with pagination staying at y870. That requested result replacement is contained. The separate 29 px header movement caused by the count control is recorded below.

## Unresolved motion decisions

### CF-03 - store row insertion/removal has unreserved, unanimated growth

C083-add and C083-remove move the Add item affordance by one 37 px row. No reserved slot or existing layout animation explains this motion. User initiation does not establish an exception to the brief. This remains an unresolved expansion/contraction finding for motion review, including whether the existing instant row growth is intended and acceptable or needs stabilization.

All four profiles reproduce both directions. On mobile, Add item goes `(0,270,375,37)` → `(0,307,375,37)` for insertion and `(0,270,375,37)` → `(0,233,375,37)` for removal. LayoutShift value is 0.004152612 (mobile) and 0.001737071 (desktop), with `hadRecentInput=true`. No later row/scroll movement was observed after the direct change. C082 optional array unset/add removes/inserts whole child groups and needs the same motion review even where CLS is zero.

Evidence: `before/controls/C083-add/cold-375/{before.png,0.png,record.json}` and `before/controls/C083-remove/cold-375/{before.png,0.png,record.json}`. Source boundary: `src/shared/console/stores/value/arrays.tsx` and `fields.tsx` map the current array into flow rows without a reserved slot or transition.

Final one-browser run reproduces C082/C083 in all 16 profiles; all 96 frames reviewed. The Add item movement is immediate (recent-input) with no delayed following-row movement.

### CF-04 - schema builder field changes resize and recenter its modal

C086-add and C086-remove insert/remove an unreserved 36 px schema field row. The desktop dialog grows 339.5 → 375.5 px and recenters y=280.25 → 262.25; removal reverses it. The mobile drawer grows 432 → 468 px and moves y=380 → 344, taking its heading and existing fields with it. No declared layout animation or reserved slot explains the motion, so this is unresolved under the brief rather than an automatic user-action exception.

Source: `src/shared/console/stores/schema/fields.tsx:55` maps fields directly into normal flow; `fields.tsx:101` adds a field and `fields.tsx:172` removes it. The auto-sized `DialogContent` in `schema/dialog.tsx` centers the resulting height on desktop and uses the drawer on mobile.

Observed in all eight profiles. Mobile LayoutShift value is 0.025552671 in both directions, `hadRecentInput=true`; desktop removal records 0.000447377 and desktop addition records zero despite the visible modal resizing. Example desktop rects: `(432,280.25,576,339.5)` → `(432,262.25,576,375.5)`; mobile `(0,380,375,432)` → `(0,344,375,468)`.

Evidence pairs: `before/controls/C086-add/cold-375/{before.png,0.png,record.json}` and `before/controls/C086-remove/cold-1440/{before.png,0.png,record.json}`. All four profiles in each direction were reviewed in the six-frame series. Confirmed under the final one-browser run in all eight profiles, all 48 frames reviewed. First PNGs completed 36–126 ms after sampling began. Mobile addition events occur 42–54 ms after action; mobile removal 35–74 ms. Desktop removal events occur 33–51 ms.

C087-object adds an empty nested object field group using the same flow field list. Desktop height increases 339.5 → 371.5 px and recenters y=280.25 → 264.25. Mobile height increases 432 → 464 px and y=380 → 348. Both mobile profiles report 0.022616419 with recent input at 45–58 ms; desktop reports zero while the geometry still changes. All four profiles and 24 frames were reviewed. Evidence: `before/controls/C087-object/cold-375/{before.png,0.png,record.json}`.

### CF-05 - desktop Filters width animation reflows the existing list

`src/shared/console/filters/layout.tsx:97` declares a 200 ms width transition. Opening reserves the 288 px panel by shrinking the already visible list region from `(256,48,1184,852)` to `(256,48,896,852)`; closing reverses it. Table columns, header controls and row content reflow during that width animation. The rail moves x=1432 ↔ 1144. This existing layout-motion intent is explicit, but it does not meet the brief's transform/opacity exception. Leave it untouched pending motion review rather than silently redesigning it or calling it zero movement.

| Transition | Profile | Shift entries | Sum of recorded values | Event times after action |
| --- | --- | ---: | ---: | --- |
| C104-filter-open | Cold 1440 | 7 | 0.042048781 | 205–297 ms |
| C104-filter-open | Warm 1440 | 11 | 0.054434323 | 108–274 ms |
| C104-filter-close | Cold 1440 | 10 | 0.060497075 | 150–377 ms |
| C104-filter-close | Warm 1440 | 11 | 0.059872945 | 61–229 ms |

Every entry has recent input. Evidence: `before/controls/C104-filter-{open,close}/{cold,warm}-1440/{before.png,0.png,250.png,record.json}`. Mobile fixture controls are unavailable by deliberate DemoConsole CSS; separate live mobile sheet cases cover that entrance.

### CF-07: Advanced settings and schedule tabs change the job modal's size immediately

`src/shared/console/materials/form.tsx:47` places Advanced settings in an unanimated `CollapsibleContent` with normal-flow grid children. Only its chevron has a declared transform transition. C108-advanced-open/close inserts/removes Folder and Visibility, changing the desktop dialog `(432,146.25,576,607.5)` ↔ `(432,82.25,576,735.5)`. Mobile `(0,131.5,375,680.5)` ↔ `(0,8,375,804)` moves the heading 123.5 px. This is an unresolved expansion/contraction decision under the brief.

All eight profiles reproduce. Mobile LayoutShift 0.156082409, with recent input, occurs at 72/30 ms open cold/warm and 52/24 ms close. Desktop open has zero browser LayoutShift despite its rect change; close records 0.001119342 at 35/37 ms. No scroll change. Evidence: `before/controls/C108-advanced-{open,close}/{cold,warm}-{1440,375}/{before.png,0.png,record.json}`. All 48 frames reviewed.

C109-one-time, C109-one-time-back and C109-event have the same immediate auto-height tab behavior in `jobs/editor/fields/timing.tsx:26-60`. Recurring→One-time initially shrinks desktop 607.5→559.5 and mobile 680.5→596.5 before CF-06's later loading correction. Returning to Recurring grows desktop 543.5→607.5 and mobile 640.5→680.5. Event changes desktop 607.5→668.5 and mobile 680.5→705.5. Each moves existing heading/fields, with no reserved maximum tab region or layout animation. All 12 profiles/72 frames reviewed. C109-event-back reverses that change in all four profiles, desktop shift 0.001066872 at 31–37 ms and mobile 0.026731115 at 28–32 ms, all with recent input and no scroll. All four reverse profiles/24 frames reviewed.

C110-weekly/monthly insert the day selector in `jobs/editor/schedule/recurring.tsx:99-117`. On mobile this adds 56 px: dialog `(0,131.5,375,680.5)` → `(0,75.5,375,736.5)`, moving existing content upward. Mobile shift 0.062510617 at 58/28 ms for Weekly and 94/32 ms for Monthly, cold/warm, all recent input. Desktop modal height stays fixed but the existing time input jumps x448→852.56, 404.56 px, while the new day field occupies its old position. Both forms need the same motion decision as CF-07. All eight profiles/48 frames reviewed. Evidence: `before/controls/C110-{weekly,monthly}/{cold,warm}-{1440,375}/{before.png,0.png,record.json}`. The later 2 px radio-button differences are the ToggleGroup's explicit selected-state transform, confined to the controls.

C110-custom replaces Time with Expression inside the same 48 px details region in all four profiles, with no surrounding movement or scroll. Its only later rect changes are the explicit 2 px ToggleGroup transforms. C110-daily's initial recipe was a no-op because Daily was already selected. That result is excluded from completed transition coverage; a corrected Weekly→Daily recipe is queued for all four profiles.

### CF-08: Active filter count grows the header action group

`src/shared/console/filters/button.tsx:46-65` conditionally inserts the count/clear button and separator. C105-paused/reset changes the desktop header action group `(959.28,9.5,456.72,28)` ↔ `(930.28,9.5,485.72,28)`, moving the Filters control left/right 29 px. The filter panel also inserts/removes Reset, growing its controls `(1404,59.5,24,24)` ↔ `(1349.41,59.5,78.59,24)`. Those state controls have no reserved width. This remains a motion/stabilization decision rather than being hidden behind the requested row replacement.

All four desktop profiles reproduce, with one recent-input LayoutShift entry per case that also includes the row replacement. Combined value 0.013581382; events 41/34 ms for paused cold/warm and 80/41 ms for reset cold/warm. Evidence: `before/controls/C105-{paused,reset}/{cold,warm}-1440/{before.png,0.png,record.json}`. All 24 frames reviewed. Mobile fixture controls are explicitly unavailable at this breakpoint.

C112-date-open/close were reviewed in all eight profiles/48 frames. Calendar content stays in its 192×241.05 px portal, using the popover's default fade/scale; the job form and page stay fixed with zero LayoutShift and scroll changes. C114-web-enable/disable were reviewed in all eight profiles/48 frames. Checkbox indicator changes and the editor's empty paragraph remain inside existing slots, with no rect or scroll movement of surrounding content.

### CF-10: Folder branch expansion moves its following sibling immediately

`src/shared/console/folders/row.tsx:85` mounts/removes `SidebarMenuSub` conditionally. Expanding Finance inserts one 36 px child block and moves Marketing `(8,499,239,32)` → `(8,535,239,32)`; closing reverses it. The folder list grows `(8,400,239,131)` → `(8,400,239,167)`. The child block has no layout animation or reserved space. Only the chevron declares a transform. This remains an unresolved expansion/contraction decision under the brief.

C121-finance-open/close reproduce in all four available desktop profiles. Recorded shift 0.000295061728 has recent input. Open events are 102 ms cold/24 ms warm; close 28 ms cold/38 ms warm. No scroll change and main page content stays fixed. Evidence: `before/controls/C121-finance-{open,close}/{cold,warm}-1440/{before.png,0.png,record.json}`. All24 frames reviewed. Fixture sidebar is deliberately hidden at mobile width, recorded as unavailable, not a pass.

C118-delete-open/close preserve full confirmation content through the default dialog/drawer entrance and exit. All eight profiles/48 frames were reviewed, with zero LayoutShift and scroll changes. The mobile dialog retains 208 px height while its transform moves it out of view; the desktop retains 135 px height until removed.

### CF-12: Breadcrumb hover/open padding changes the following header positions

`src/shared/console/shell/frame.tsx:266` changes breadcrumb padding from 0 to 6 px on each side for hover, focus-visible and aria-expanded. C125-menu-open changes Finance from 61.25 to 73.25 px wide in all four profiles. Desktop usage hint and separator move 12 px to the right. Existing `Button` styling transitions all properties, so this is declared padding/width motion, outside the brief's transform/opacity exception. It remains an unresolved motion decision.

Desktop native entries capture parts of the animation,0.000020919 at 310 ms cold and 0.000006228 at 161 ms warm, with recent input. Mobile records zero LayoutShift but its Finance button still grows 12 px. Both profiles retain the rest of the page geometry and have no scroll change. Evidence: `before/controls/C125-menu-open/{cold,warm}-{1440,375}/{before.png,250.png,record.json}`. All24 frames reviewed. C126-delete-open also catches the reverse breadcrumb contraction under the opening confirmation, cold desktop 0.000006286 at 185 ms and warm desktop 0.000006286/0.000008435 at 108/156 ms. The modal itself retains full form geometry. C125-menu-close keeps focus on the trigger, so its focus-visible padding remains 73.25 px; all four close series show only the normal menu exit and no page shift.

C122-new-open/close and C123-new-open/close were reviewed in all 16 profiles/96 frames. Their menus/forms retain full geometry through default portal transforms and fades, with no LayoutShift or page scroll. C123 validation and C124 successful save are recorded separately above.

C126-delete-open/close were reviewed in all eight profiles/48 frames. The confirmation retains its 231 px desktop/304 px mobile height throughout entrance/exit. Main content and scroll remain fixed; the separate desktop breadcrumb padding entries on open belong to CF-12 above. Contents selection belongs to CF-13, with mobile text replacement staying inside the reserved description slot.

C130-hover/leave adds four desktop occurrences to CF-12. `folders/usage/hint.tsx:39,47` explicitly animates arrow width/opacity and changes horizontal padding. The hint expands 110.31→122.31 px on hover; moving to Finance contracts it while Finance expands 12 px, shifting hint x481.86→493.86 and its separator x468.86→480.86. Hover entries are 0.000003350 at 574 ms cold and 0.000003764 at 134 ms warm. Leave entries are 0.000010795 at 111 ms cold and 0.000006554 at 85 ms warm. All lack recent input, because pointer hover is not that browser flag. No page/scroll movement occurs. Evidence: `before/controls/C130-{hover,leave}/{cold,warm}-1440/{before.png,250.png,record.json}`. All24 frames reviewed. Mobile hides this hint at the fixture breakpoint and is recorded unavailable.

C131-window-open/close retain the 128×84 option menu and surrounding usage layout across all eight profiles, 48 frames. The trigger has the existing 2 px pressed transform; there are no native shifts or scroll changes. Window-value changes are separate follow-up cases.

Desktop C134 Account open/close, Security/return, C135 Organization open/close, People/return, Teams/return, Billing/return, and C136 avatar loading were inspected in all 26 available profiles, 156 frames. The 1024×704 settings dialog stays at x208/y98 while panel loaders resolve and tabs change. Main-page geometry and scroll remain fixed. Header text and selected-nav text change within fixed header/nav slots. The Security list grows inside the reserved, scrollable panel; its outer bounds stay fixed. Account and Organization retain content through their normal exit transforms. C135 People resolves the outer headers and Invite control, but member/invitation rows remain skeletons through the final frame, so these captures do not establish row-action availability. Mobile equivalents have separate scenario IDs queued later in the shard.

## Coverage

The live per-profile [coverage table](dist/layout-hunt/CONTROLS_COVERAGE.md) and [CSV](dist/layout-hunt/CONTROLS_COVERAGE.csv) distinguish pending, reviewed, unavailable and retry-required records. Current recipe corrections are documented in `controls-review-final/recipe-failures.json`; they do not alter the frozen measurement code. An unavailable record is not a zero-shift measurement; a selector failure is not an unavailable product state.

## Environment and capture limitations discovered during live settings

C145-invite-open cold desktop has a late native table-sizing entry at 5240 ms after the action. Invitations header columns change after its pending state fails. Invited at moves x727.75→759.94 and width 212.41→156.53; Role x940.16→916.47; Status x1046.36→1028.09. The foreground invitation form remains 384×283. The final PNG shows stacked "Invalid origin" toasts. This is consistent with the automatic table-sizing root CF-09, but the permission request failure is an environment limitation on localhost:5178. Membership/invitation controls that remain pending are not passed as complete. The event value is 0.000330457 and lacks recent input. Evidence is `before/controls/C145-invite-open/cold-1440/{3000.png,settled.png,record.json}`. The settings behind the nested modal are blurred, so an unobscured retry is needed before claiming a decisive visual pair.

This profile also has delayed PNG captures at 760/1956/2460/4067/5298 ms after sampling starts. Preserve it as supplemental evidence and repeat its short entrance after the main run. No extra controls browser was running during this capture. C145-invite-close and warm entrance keep full dialog content through their standard transforms, with no native shift or scroll change.

## Further reviewed states

C149 Teams and C151 Billing maintain the desktop settings panel while data resolves. C152 plan open/close, Annual and Monthly retain the 448×358 nested dialog. Plan price paragraphs occupy the same 291.42×40 region in both intervals, and card/buttons do not move. Monthly has one recent-input entry with no attributed element, value 0.000032628 at 48 ms cold and 113 ms warm; screenshots and all sampled element rectangles show only the requested price text replacement inside those reserved paragraphs. All 12 desktop series and 72 frames were inspected. The delayed cold plan-close capture is queued for a short-exit repeat.

C134 mobile Account/Security and C135 mobile General/People/Teams/Billing retain the drawer bounds and scroll positions as content resolves. All 12 mobile series and 72 frames were inspected. Permission-dependent row and Danger zone content is still limited by the known local origin failure; the real read-only permission correction will be applied only in a separately logged supplemental run. C104 live mobile Filters uses the existing 288×812 sheet transform at x87 and leaves the underlying jobs list fixed. All four sheet series and 24 frames were reviewed, with no native shift or scroll change.

C093-notes was inspected in all four profiles and 20 frames. Its code editor arrives inside the reserved main content region with no measured native shift, existing-node resize or scroll change. Cold initial-route captures stay blank through early samples and then mount the page, so they establish the resolved geometry but cannot establish intermediate lazy-boundary appearance; the warm captures show the centered spinner replaced inside the same content region.

C093-forecast and C093-onboarding reach their intended download fallback and image, respectively, with no native shift, existing-element resize or scroll change. All eight profiles and 40 frames were reviewed. C094-next replaces the notes editor with the spreadsheet fallback inside the same main region. The floating dock retains its dimensions; its short existing entrance transform accounts for the sampled y movement in one profile. All four series and 24 frames were reviewed.

C093-brief and C094-previous remain on the PDF spinner in their standard captures. The asset responds 200 with application/pdf and no page errors occur. `viewer/status.ts` intentionally reveals media after 4000 ms if its load event never fires; the capture window may finish earlier. C093-brief-complete and C094-previous-complete are therefore required continuation cases before PDF completion can be claimed. Their original eight series and 44 frames have been inspected, and no other geometry or scroll change appears.

### CF-14: File dock expands its layout width on hover

`src/shared/console/files/dock.tsx:112` animates `grid-template-columns` and opacity as its tool group unfolds. The centered dock expands from x789.16/y846,117.67×38 to x738.66/y846,218.67×38. The navigation group moves 50.5 px left; leaving reverses it. This is deliberate existing layout animation, outside the brief's explicit transform/opacity exception. Leave it unchanged until the motion question is resolved.

C095-unfold and C095-fold reproduce in all four available desktop profiles,24 frames. Native entries lack recent input because hover is not that browser flag. Unfold sums are 0.000244433 cold over 94–158 ms and 0.000242073 warm over 65–149 ms. Fold sums are 0.000261151 cold over 84–179 ms and 0.000254456 warm over 63–179 ms. No page geometry or scroll moves. Evidence is `before/controls/C095-{unfold,fold}/{cold,warm}-1440/{before.png,250.png,record.json}`. Mobile permanently displays the tools as a second row, so this hover fold is unavailable there by design.

C096-zoom/fit use the image's existing translate/scale transform without reflowing its allocated 1136×804 desktop or 343×732 mobile box. The toolbar stays fixed while the image scales 1↔1.5. All eight profiles and 48 frames were reviewed, with no native shift or scroll change. This is direct manipulation of the image content in its reserved viewport. C094-keyboard has the same pending PDF destination as C094-previous and needs the PDF continuation evidence before its completed viewer state is claimed; all four original series and 24 frames were reviewed.

C096-double was reviewed in all four profiles and 24 frames. The image scales 1 to 2.5 using its existing transform. Desktop visible image bounds change from 280,72,1136×804 to −572,−531,2840×2010; mobile from 16,64,343×732 to −240.5,−485,857.5×1830. Toolbar and page allocation stay fixed, with no native shift or scroll change. This is direct image manipulation.

C097-tooltip adds the expected 69.95×28 portal above Next file, with no surrounding movement. All four profiles and 24 frames were reviewed. Original C097-tooltip-close retains the tooltip through its final PNG at 3139/3177 ms desktop and 3067/3055 ms mobile. Radix creates its pointer grace polygon on pointerleave and installs a subsequent pointermove listener. A single synthetic hop to header supplies no later pointermove. The corrected recipe adds a second real hover to the Files breadcrumb; the originals remain evidence until all profiles are repeated. Its mobile header hop also adds a CF-12 occurrence: Release notes 2.14.md grows 139.17 to 151.17 px between first and second samples, while its breadcrumb grows 190.81 to 202.81 px. Native shift and scroll remain zero. Evidence is before/controls/C097-tooltip-close/{cold,warm}-375/{0.png,250.png,record.json}.

C098-edit was reviewed in all four profiles and 24 frames. Typing replaces the document directly. CodeMirror's line-number gutter narrows 23.45 to 21 px when the document changes from 30 lines to three. On mobile its editor scrollLeft changes 0 to 70 to keep the newly typed caret visible; surrounding page and toolbar remain fixed. These changes occur with the typing action. The later Saved icon replaces the existing breadcrumb icon inside the same slot. No native entry or later scroll jump appears.

C102-upload was reviewed in all four profiles and 24 frames. The toast enters through its existing transform in an overlay, with a fixed 356×53.5 desktop or 343×53.5 mobile box. It does not move the list or page scroll. The feedback remains visible at the end, and C102-upload-complete is still required to inspect its timer dismissal.

C113-suggest was reviewed in all four profiles and 24 frames. The 288×104.5 suggestions overlay appears over the existing job instructions without changing dialog or surrounding field bounds. C113-dismiss also has four reviewed series and 24 frames, but Escape closes the whole job dialog while the suggestions remain visible during exit. The shared suggestion key handler prevents default and clears its state, while the modal also handles Escape. This adjacent functional outcome needs confirmation after the main run; it does not establish an isolated suggestions dismissal. No native shift or page scroll change occurs.

C116-detail was reviewed in all four profiles and 20 frames. Warm captures replace the centered loader with the job detail inside the reserved main region; cold captures remain blank until the final page. No existing-element resize, native shift or scroll change appears.

C127-delete adds two desktop occurrences to CF-03, the requested row insertion/removal motion question. Removing the open Finance folder also removes its sidebar row, moving Marketing from 8,499,239×32 to 8,466,239×32 without animation or a reserved slot. The sidebar list contracts 131 to 98 px. Native values are 0.000572875 at 144 ms cold and 60 ms warm, with recent input; these values also include the header action group's changing bounds. The action navigates to the root list inside the reserved main region. Mobile has no sidebar; its 0.000279551 entry at 104/50 ms only reflects the header action group shrinking as a control disappears. The remaining New folder child stays fixed, so mobile does not add a confirmed movement occurrence. All four series and 24 frames were reviewed. Evidence is before/controls/C127-delete/{cold,warm}-1440/{before.png,0.png,record.json}; source paths are landing/demo/dialogs/folders.tsx:124 and shared/console/folders/row.tsx.

C129-drag was reviewed in all four profiles and 24 frames. The explicit drag nests Finance in the adjacent folder. Removing it from the current sibling list moves Marketing y210.5 to 169.5, and on desktop moves the sidebar Marketing y499 to 466. Native values are 0.002416975 desktop and 0.004974641 mobile, all with recent input. The table bounds contract by 41 px, but the surrounding page and scroll stay fixed. These changes are the immediate result of the user's direct drag, which the brief allows; no further delayed resize appears.

### CF-15: Integration status and action labels resize cards after queries resolve

This shares root SF11 with the shell report. `src/console/integrations/card/headline.ts` returns Checking labels while status is undefined. `card/index.tsx` replaces them with Not connected or Access expired and replaces Connect Slack with Reconnect. The card's description has less width while that action label is longer. These asynchronous text changes alter card height and move following cards.

C156-personal reproduces the pending-to-disconnected height change in both mobile profiles. Google Calendar's Checking status wraps into two lines; Not connected uses one. Its description moves y424 to 408, and Outlook moves y575 to 559. Native value 0.013240473 occurs 787 ms after action cold without recent input and 316 ms warm with recent input. Actual PNG pairs are 0.png to 250.png at 97 to 364 ms cold and 132 to 402 ms warm. Desktop changes stay inside the existing card dimensions. All four profiles and 24 frames were reviewed, with no scroll movement.

C156-return reproduces the Slack action-label change in all four profiles. Connect Slack is 118.13 px wide; Reconnect is 96.31 px. The button moves x701.88 to 723.69 on desktop and 224.88 to 246.69 on mobile. At mobile width the wider description loses one line, shrinking the Slack card 188 to 168 px and moving every following card 20 px upward. Cold events occur at 656 ms desktop and 664 ms mobile without recent input; warm at 226/230 ms with recent input. Native values are 0.000041375 desktop and 0.016290961 mobile. Evidence pairs are cold 250.png to 1000.png at 377 to 1110 ms desktop and 316 to 1048 ms mobile, and warm 0.png to 1000.png at 148 to 1051 ms desktop and 100 to 1028 ms mobile. All24 frames reviewed, no scroll change.

C156-load records the same label movement on initial entry in all four profiles. Desktop native values 0.009108676 combine this with the shell's async sidebar groups, which move Resources and Folders down 105 px. Mobile values 0.016290961 show the Slack width/card-height mechanism above. Events occur at 13008 ms cold desktop,12870 ms cold mobile,1606 ms warm desktop and 1487 ms warm mobile, all without recent input. Initial screenshots show the full-page loader then resolved cards, so these 20 frames establish initial and final states but the tab-transition pairs above provide the decisive pending-to-resolved images.

C132-drill was reviewed in all four profiles and 24 frames. Its mobile click automatically scrolls the below-fold link into view before navigation; the recorded scrollTop0 to 304 is that automation scroll, not a spontaneous application scroll. It stays 304 after navigation, and the fixed totals band stays in place while charts below it are cropped. The requested Finance data replaces the organization data inside the existing content region. The legend goes from two rows to one on mobile, moving Spend by source upward 28 px; this is part of that route-content replacement. Desktop adds two CF-09 automatic table-width occurrences: existing Runs through Share headers move 7.20 px left when the new values determine intrinsic column widths. Native0.000054036 occurs at 237 ms cold and 98 ms warm, with recent input. Evidence is before/controls/C132-drill/{cold,warm}-1440/{before.png,0.png,record.json}. There is no later scroll delta. The mobile native 0.076675386 captures the legend/table region change at 588/182 ms; a repeat with explicit setup scrolling will isolate navigation from driver scrolling.

### CF-16: Permissions content expands the card without a layout transition

`src/console/permissions/section.tsx:61` mounts CollapsibleContent with padding but no expansion animation. C159-permissions-open grows the Jori card from 280,408,560×171 to 280,408,560×2939 on desktop. Its 2768 px content is inserted immediately. At mobile width the inserted block is 311×4480, and the card grid's total height changes 1007 to 5487 px. Close reverses those changes. The last card has no following neighbor, but the existing card still resizes without a reserved slot or animated expansion. This remains an explicit motion question. All eight profiles and 48 frames were reviewed. Evidence is before/controls/C159-permissions-{open,close}/{cold,warm}-{1440,375}/{before.png,0.png,record.json}. First actual PNGs are 157/70 ms desktop open,49/54 ms mobile open,92/56 ms desktop close and 49/37 ms mobile close. Mobile open scrolls the initially below-fold trigger into view as part of locator.click, scrollTop0 to 323; there is no subsequent scroll jump.

### CF-17: Flush row hover padding moves its label

`src/shared/console/flush.ts:11` declares px-0 and hover:px-2, relying on the Button transition-all. C159-permissions-open cold desktop captures the Permissions label group x301 to 307.69 during that 8 px inward motion, value 0.000032419 at 572 ms after action with recent input. The existing chevron also rotates, which is a permitted transform. The label padding is a separate declared layout animation, grouped with the header/breadcrumb padding motion question in the merged report. Evidence is before/controls/C159-permissions-open/cold-1440/{before.png,0.png,250.png,record.json}; all other C159 profiles have no native entry for this motion. No product change is made.

C160-permission-open/close were reviewed in all eight profiles and 48 frames. The select content retains its 128×84 option viewport through default portal opening/closing, and the trigger uses its existing 2 px pressed transform. The surrounding permission rows do not resize and native shifts remain zero. Opening the first editable tool scrolls it into view because several preceding Required controls are disabled: desktop scrollTop0 to 600, mobile 323 to 1522. These are locator click scrolls before the menu opens, with no subsequent scroll movement.

### Shared shell findings observed in Context

C163-load records shell SF7 on desktop as the recent-chat group arrives. Resources moves y121 to 259 and Folders y292 to 430, both 138 px, after the source account has gained another conversation. Native0.011709635 occurs 12672 ms cold/2142 ms warm, without recent input. On mobile, independent organization sources match SF8: the final separator moves y612.25 to 788.75, pushing Timezone outside the viewport. Native0.013712882 occurs 11961 ms cold/1470 ms warm, without recent input. WebsitesSection appears only when the independent sources query supplies a primary website, and SourcesSection replaces its 112 px skeleton with a131.5 px result. Together with website/gap geometry this adds 176.5 px. All four entry profiles and 20 frames were inspected. Initial pictures are loader-to-final, so these entries retain the shell report's visibility limitation.

C163-workstreams confirms SF9 with visible existing cards below an unresolved Activity skeleton. The shared skeleton uses three 28 px lanes; the result has four, so the list moves y373.38 to 401.38 on desktop. Mobile also gains a19.5 px description line, moving the list to 420.88. Native values are 0.008997917 desktop and 0.029096041 mobile. Cold events occur 1339 ms desktop/1772 ms mobile without recent input; warm 541/566 ms with recent input. Decisive screenshot pairs are warm 1440 250.png to 1000.png at 323 to 1141 ms after sampling starts, warm 375 250.png to 1000.png at 453 to 1157 ms, and cold 3751000.png to 3000.png at 1222 to 3188 ms. Cold1440 screenshots skip from the prior Organization view to already-resolved Activity; its native movement lacks a bracketing pending-list PNG. All four profiles and 24 frames were inspected. No recorded scroll change occurs. Source is console/context/workstreams/activity/lane.tsx:203 and the independent pulse query in activity/pulse.tsx.

C163-workstreams-return, C163-places and C163-places-return were reviewed in all 12 profiles and 72 frames. Routes replace their body inside the existing main scroll region while the shell and tab bar remain fixed. The Organization container has a148 px centered-loader state before its 640 px desktop/779.75 px mobile card arrives, but it occupies the already reserved main area and has no following content to displace. No native shift or scroll change appears in these route captures.

### CF-18: Website editor unmounts before its default exit motion

`src/console/context/organization/profile/index.tsx:111` conditionally mounts OrganizationEditDialog only while editorOpen. The child at discovery/edit.tsx:87 passes a permanently true open prop to Dialog. When Escape calls onOpenChange(false), the parent removes the component immediately; the dialog never gets its closed state. C165-edit-close loses the 448×211 desktop dialog and 375×284 mobile drawer and overlay before the first capture. Actual first PNGs are 163 ms cold/130 ms warm desktop and 46/29 ms mobile. This is an abrupt disappearance, while the same view uses the stock entrance on open. Preserve the existing motion intent; restoring the missing exit or accepting abrupt close remains a review decision. All four close profiles and 24 frames were reviewed, with no native shift or background scroll movement. Evidence is before/controls/C165-edit-close/{cold,warm}-{1440,375}/{before.png,0.png,record.json}.

C165-edit-open retains the complete 211 px desktop/284 px mobile form through the stock modal entrance. All four profiles and 24 frames were reviewed. There is no intrinsic resize, native shift or scroll change. Local validation/error dismissal is covered in the queued C165 followups without starting extraction.

C166-source/source-return add eight occurrences to the CF-03 requested collection expansion/removal question. `src/console/context/paging.tsx` replaces its capped slice immediately, and profile/sources.tsx renders one more 28.5 px source row without reservation or expansion motion. Timezone moves y670 to 698.5 on desktop; the disclosure moves y601 to 629.5. On mobile the disclosure moves y744.75 to 773.25 and the following separator leaves the viewport. Close reverses those positions. The label also changes Show 1 more 90.86 px to Show less 77.38 px. Native expand values are 0.001194736 desktop and 0.000425332 mobile, at 79/50 ms desktop and 91/47 ms mobile cold/warm. Collapse values are 0.001054852 desktop and 0.000454840 mobile, at 45/34 ms desktop and 33/26 ms mobile. All have recent input. All48 frames were reviewed, with no scroll delta. Evidence is before/controls/C166-source{,-return}/{cold,warm}-{1440,375}/{before.png,0.png,record.json}.

### CF-19: Inline domain form increases the profile grid's minimum width

C166-domain-open/close changes existing content widths in both mobile conditions, despite zero native LayoutShift entries. The form's w-44 InputGroup plus Add button and Websites label exceed the available 311 px content width. The CardContent grid consequently makes its entire track 317.28 px wide. Summary, aliases, Websites, Sources and separators all gain 6.28 px; closing reverses it. The outer card remains 343 px wide and no text wraps differently for this account. The separator's extended right edge is visible in before.png to 0.png. Source is console/context/organization/profile/domains/add.tsx:ButtonGroup and InputGroup, inside profile/index.tsx's CardContent grid.

The four mobile occurrences have first actual PNGs at 60/53 ms open and 44/30 ms close, cold/warm respectively. No scroll delta occurs. Evidence is before/controls/C166-domain-{open,close}/{cold,warm}-375/{before.png,0.png,record.json}. All eight available profiles and 48 frames were reviewed. Desktop has enough room and retains all surrounding geometry; both widths keep the inline row height stable.

C166-timezone-open/close were reviewed in all eight profiles and 48 frames. The 254×252 option viewport uses the existing Base UI scale/fade on entrance and exit; all visible option rows stay allocated through close. Native shifts remain zero and no following profile content resizes. Mobile open scrolls the below-fold field into view, scrollTop 0 to 96, before the click. No later scroll delta appears.

C166-timezone-empty was reviewed in all four profiles and 24 frames. Filling the initially closed field opens a 254×35.5 No timezone found portal with its stock transform; the field and surrounding card retain their sizes. Mobile fill scrolls the field into view, scrollTop 0 to 51, with no later scroll movement. Native shifts remain zero. Separate open-list filtering and restoration captures are queued to inspect the change in menu height.

C170-load adds four initial-entry occurrences of SF9. The three-lane Activity skeleton resolves to four lanes and moves the existing list by 28 px on desktop and 47.5 px on mobile. Native values are 0.008997917 desktop at 12470/2203 ms cold/warm and 0.029096041 mobile at 12290/1635 ms, all without recent input. C169-load and C170-load also each add two desktop SF7 sidebar occurrences: Resources y121 to 259 and Folders y292 to 430. Their sidebar native value is 0.011709635, at 15653/1553 ms for Places and 12157/2056 ms for Workstreams. Mobile Places remains stable. All eight entry series and 40 frames were reviewed; loader-to-final images do not directly bracket these shifts. The C163-workstreams tab captures provide the clear SF9 pair. No scroll delta appears.

C090-close adds the new, unwritten store variant to CF-02 in all four profiles. Clearing the selected store unmounts the schema form before exit: desktop dialog 576×329 becomes 576×32; mobile drawer 375×405 becomes 375×69. The blank surface is visible in warm desktop 0.png at 149 ms and mobile 0.png at 41 ms cold/19 ms warm. Cold desktop geometry at 54 ms catches the collapse, but its PNG at 196 ms has already lost the fading surface. All four series and 24 frames were examined; native shifts and background scroll remain zero. Evidence is before/controls/C090-close/{cold,warm}-{1440,375}/{before.png,0.png,record.json}.

C090-load and C090-open were reviewed in all eight profiles and 48 frames. New-store content moves from the centered loader to its no-schema state inside the reserved main region. The Add schema form retains its 576×329 desktop/375×405 mobile size through the stock modal entrance. A creation toast overlays the page and does not move content; mobile still shows it at the final load frame, so a separate timer-completion capture is queued. No native shift or scroll delta appears.

### Billing activity filter occurrences

C155-Runs, C155-Allowances and C155-Top-ups, plus each return to Everything, add twelve desktop occurrences to the CF-03 unreserved collection-size question. The bordered table frame starts at 768×174.5. Runs leaves three rows and contracts it to 140.5 px; Allowances leaves one row and contracts it to 75.5 px; Top-ups replaces the rows with a 64 px no-matches cell and contracts it to 106 px. The enclosing Activity section changes by the same 34, 99 and 68.5 px. Return reverses those changes. The outer Settings dialog remains fixed and no later scroll delta appears, but the existing border resizes without reservation or an expansion transition. Source is console/billing/activity.tsx:92, mapping the filtered row model directly. All twelve desktop series and 72 frames were reviewed. Mobile counterparts are queued.

The eight Allowances/Top-ups desktop profiles also add CF-09 intrinsic table-column occurrences. Allowances changes When width 232.05→264.66, What width 281.39→202.42 and Amount x954.44→908.08. Top-ups changes When width 232.05→190.11, What width 281.39→203.05 and Amount x954.44→834.16. The Amount button moves 21.61 px left for Allowances and 56.08 px left for Top-ups; each return reverses it. The closing radio menu also follows its moved trigger, x673→706 for Allowances and x673→631 for Top-ups. These horizontal shifts are separate from the requested row filtering.

| Case | Cold native ms / value | Warm native ms / value | First PNG cold / warm |
| --- | --- | --- | --- |
| C155-Allowances | 147 / 0.002514680 | 51 / 0.002514680 | 160 / 119 ms |
| C155-Allowances-return | 373 / 0.003896258 | 254 / 0.003896258 | 235 / 186 ms |
| C155-Top-ups | 107 / 0.001484954 | 55 / 0.001484954 | 233 / 156 ms |
| C155-Top-ups-return | 346 / 0.001484954 | 187 / 0.001484954 | 168 / 86 ms |

All native entries above have recent input. Source is console/billing/activity.tsx:95, the automatic table layout. Each evidence pair is before/controls/{case}/{cold,warm}-1440/before.png to 0.png, with exact rects in record.json. C155-Runs/return has no native entry and retains the table column widths.

### CF-20: Billing filter label changes its button width

KindHeader in console/billing/activity.tsx:191 replaces What with the active kind inside an intrinsically sized Button. Its widths are What 63.42 px, Runs 62.47 px, Allowances 98.53 px and Top-ups 79.77 px. All six filter/return cases above reproduce in both desktop conditions, twelve occurrences. Runs changes only the button width within its header cell; longer labels also participate in the CF-09 table effect. No slot reserves the widest label. The before/0.png pairs and actionDelta retain the measurements even where the small Runs change has no LayoutShift entry.

C155-open/close were reviewed in both desktop conditions, four series and 24 frames. The menu keeps its 128×120 allocation through the stock portal scale/fade, and the table and dialog stay fixed.

### CF-21: Workstream detail clears its content during sheet exit

WorkstreamDetail sets open from its nullable workstream prop and conditionally mounts DetailBody from the same value. Closing clears that value immediately, leaving only the Sheet close button during exit. The desktop sheet remains 512×900 and mobile 281.25×812; its geometry is stable while its title, brief, timeline and footer disappear. This is a content flash from premature cleanup. C171-close has zero native shifts and scroll changes in all four profiles. Warm desktop 0.png at 156 ms and warm mobile 0.png at 52 ms show the empty sheet. Cold mobile 0.png at 97 ms retains a narrow empty strip; cold desktop geometry at 464 ms captures empty content but PNG637 ms misses the sheet. Source is src/console/context/workstreams/detail/index.tsx:40-51. All four series and 24 frames were reviewed. Evidence is before/controls/C171-close/{cold,warm}-{1440,375}/{before.png,0.png,record.json}. Places has the same nullable-body pattern at places/detail.tsx:34-43, but its original close recipe only dismissed an autofocus tooltip and must be repeated before claiming its sheet occurrence.

### CF-22: Timeline expansion inserts content without a layout transition

C171-timeline-open mounts CollapsibleContent with padding and a border, without a height transition or reserved slot. The Timeline section grows 223→362 px on desktop and 277→476 px on mobile before receipts resolve. Later dated entries move down 139/199 px. Closing the fully loaded entry reverses 163 px desktop and 241 px mobile. The surrounding sheet stays fixed. This is a requested expansion that needs motion review. Source is src/console/context/workstreams/detail/timeline.tsx:142.

Open native events are 0.007900679 at 74/30 ms cold/warm desktop and 0.051773771 at 50/25 ms mobile. Close values are 0.007226277 at 39/22 ms desktop and 0.050688620 at 47/23 ms mobile. All have recent input, and no scroll delta appears. All eight series and 48 frames were examined. Evidence is before/controls/C171-timeline-{open,close}/{cold,warm}-{1440,375}/{before.png,0.png,record.json}. The loading-to-receipt movement is separate below.

### CF-23: Receipt placeholder is smaller than the loaded receipt

EntryReceipts at src/console/context/workstreams/detail/timeline.tsx:207 reserves a 48 px skeleton. The loaded Receipt in receipt.tsx uses 72 px on desktop and 90 px on mobile. The 24/42 px difference pushes later timeline entries. Timeline height changes 362→386 px desktop and 476→518 px mobile. The later dated section moves y481.5→505.5 desktop and y617.5→659.5 mobile.

All four C171-timeline-open profiles reproduce, separate from immediate expansion CF-22. Native events are 0.000914956 at 267 ms cold/181 ms warm desktop and 0.007689146 at 200/154 ms mobile, all with recent input. Clear skeleton-to-receipt pairs are warm desktop 0.png→250.png at 167→363 ms, cold mobile 90→340 ms and warm mobile 42→277 ms. Cold desktop's first PNG at 414 ms already contains the receipt; its geometry and native entries establish the delta but its image pair does not show the skeleton. No scroll jump appears. All 24 frames were reviewed.

C171-open retains its 512×900 desktop/281.25×812 mobile sheet allocation through the stock horizontal entrance. Brief and Timeline arrive in its already reserved scroll body. All four series and 24 frames were reviewed; native shifts and scroll deltas are zero.

Original C155-sort-When/Amount series were examined in both desktop conditions, four series and 24 frames. Each recipe clicks twice before sampling, so the intermediate sort direction is not visually covered. Native row-reorder entries are retained, but the recipes are marked retry required; forward and reverse are now separate. Original C169-close likewise remains retry required because Escape closes Copy Purpose while leaving the Place sheet open. Its four series and 24 frames document the tooltip exit only.

### CF-24: Autofocused copy tooltip tracks the opening Place sheet

C169-open automatically focuses the first Copy button, displaying Copy Purpose before the Place sheet finishes sliding in. Floating placement keeps the tooltip at the viewport edge while its arrow follows the moving trigger. Desktop tooltip x1348→1340, with arrow movement up to 17.27 px; mobile arrow x363.94→344.52. This remains a motion question about the existing automatic tooltip and its placement during sheet entrance. The sheet itself stays 512×900 desktop/281.25×812 mobile, and no page scroll moves. Source is src/shared/console/copy/index.tsx's TooltipTrigger, the default Sheet autofocus, and src/components/ui/tooltip.tsx.

All four profiles and 24 frames were examined. Arrow-native events are cold desktop 420 ms, value 0.000000399; warm desktop 265/271 ms, values 0.000001507/0.000000223. Mobile cold events occur 316/337/350 ms, values 0.000004276/0.000003223/0.000001906; warm 159/176/193/209 ms, values 0.000002415/0.000004265/0.000003223/0.000001914. All have recent input. Evidence is before/controls/C169-open/{cold,warm}-{1440,375}/{0.png,250.png,record.json}; actual PNG pairs are 124→353 ms cold desktop, 150→328 ms warm desktop, 109→300 ms cold mobile and 47→276 ms warm mobile.

The original main sweep is complete: 784 profile records across 196 items, consisting of 552 captured series, 226 explicit unavailable or breakpoint exclusions, and 6 action errors. Every captured series and all 3,276 original PNGs were examined. Pixel comparisons also cover all 552 series. Late differences map to documented placeholders, errors, toast exits and chat placeholder typing; the latter is the authored ChatHome animation in a fixed input slot, shared with the chat allowlist. Recipe retries and permission-dependent completion checks remain open and do not count as completed intended transitions. The occurrence index currently lists 27 source-cause groups and 256 profile occurrences; all source and explicit evidence paths exist.

### Supplemental readiness checks

The exact CDP permission-Origin correction has now passed a real read-only check. The four permission requests return HTTP 200 with `success: true`; the browser remains on localhost:5178. A separate static-resource proof records real memory-cache hits on the warm visit with the combined permission/fault dispatcher. See `controls-review-final/cache-preflight.json` and `cache-static-preflight.json` under the evidence root. These checks establish transport readiness; they do not replace the permission-limited main measurements above.

General, People and Teams were inspected at both widths with that correction. General now exposes Leave/Delete, and People resolves the actual Owner row, role/actions menus, member/email search, role/status filters and invitation sorting. There is no second member, no invitation and no team. The read-only transitions have a separate 102-case manifest, with desktop/mobile setup variants. The C143 and C146 unavailable reasons now refer only to destructive submission and the absent second-member Remove dialog. Neither Leave nor Delete asks for a name or password in the current source.

## Reduced-scope closeout

The user stopped the broad verification loop and requested best-effort fixes. The original controls slice remains fully reviewed: 552 completed series and 3276 frames. The V3 supplement stopped with 16 completed series and 96 frames, all reviewed, plus 18 breakpoint exclusions and one interrupted record. No remaining supplemental or retry case is claimed as measured. People and job selector preflights establish reachability, not layout verification.

### CF-25: Settings resets the active panel before its exit finishes

`src/console/shell/settings/shell.tsx:40` calls `setView(initialView)` on close before the dialog exits. Billing, People and Teams visibly turn into General; Security turns into Account. The modal keeps its outer dimensions while its content and title flash. All 14 completed non-default-panel exit records contain the reset in DOM/action geometry. Eight provide visible PNG evidence; six have a capture/fade visibility limitation recorded in the occurrence index. Native LayoutShift and scroll entries are zero.

Strong pairs: `before-v3/controls/C134-mobile-billing-exit/warm-375/{before.png,0.png}` with first geometry85ms/PNG92ms; `C134-mobile-security-exit/warm-375/{before.png,0.png}` geometry40ms/PNG52ms; `C134-desktop-billing-exit/warm-1440/{before.png,0.png}` geometry36ms/PNG116ms. Settings remains 375×780 on mobile and1024×704 on desktop before its normal exit transform. Closing Account itself preserves its content and is allowed exit motion.

The V3 series' remaining candidates are portal exit transforms/removal and the existing ChatHome placeholder typing inside its reserved input slot. No additional page-flow or late scroll change was found. C134-mobile-teams-exit/cold-375 has an interrupted browser-close error and no complete measured series; it is retained without a pass claim.

Coverage links are in `dist/layout-hunt/CONTROLS_COVERAGE_LINKS.json`. They distinguish preflight reachability, actual recorded profiles, and cases skipped after the user's scope change. C143/C146 no longer claim General or People is unavailable. Destructive organization/membership actions remain unexercised.

## Best-effort implementation

These changes are implemented and pass focused checks. They are not yet described as fixed at zero; independent targeted browser evidence determines that status. The user explicitly waived the exhaustive fix/verification loop.

| Cause | Commit | Change |
| --- | --- | --- |
| CF-25 | `486287b4` | Retain active Settings panel while closing; reset at next open. |
| CF-02 | `e7e6d29b` | Use existing retained-value hook for the schema form. |
| CF-21 | `bb60db14` | Retain Place and Workstream detail props through sheet exit. |
| CF-11 | `88e51e0c` | Reset folder draft and validation on next open, after the exit. |
| CF-06 | `74e82c7f` | Match one-time fallback to48px desktop and108px mobile using the editor container breakpoint. |
| CF-20 | `dae38290` | Reserve all possible billing kind labels using accessible shared StableLabel. |
| CF-01 | `308d4d80` | Opt-in FieldError reserve keeps one message line without an empty accessible alert; applied to measured name/schema/store fields. |
| CF-13 | `64330006` | Reserve the longest delete-folder action label. |
| CF-19 | `b435d342` | Allow the inline domain input to shrink within available header width. |
| CF-23 | `640e2586` | Reserve known initial receipt count, responsive headers, two description lines, and a paging control slot. |

All52 distinct focused tests pass. Typecheck, changed-source Biome, structure and dependency checks pass. Suggested independent representative cases: C081-empty, C085-schema-close, C109-one-time, C124-create, C134-mobile-billing-exit, C171-timeline-open.

- No complete after-inventory rerun was performed, per user scope reduction. Changes remain implemented pending independent targeted measurement.
- FieldError reserves one line and expands naturally for longer or multiple messages. It does not claim to eliminate all long-message growth.
- Receipt placeholders match the measured normal header, two-line description and initial two-row paging geometry. Unusually wrapped provider names or concurrent receipt count changes remain unverified.
- Requested expansions, collapses, width animations and hover padding questions remain unchanged.
- CF09 automatic column widths are owned by lead; the billing button-label fix does not independently stabilize billing table column distribution.

## Independent targeted after review

The lead reviewed every frame from six representative profiles on the integrated build. These checks verify the named cause in that profile; they do not supersede the unmeasured inventory cells or the remaining motion questions.

| Cause | Inventory/profile | Result |
| --- | --- | --- |
| CF-01 | [C081-empty/warm-375](dist/layout-hunt/after/chat-controls-by-root/C081-empty/warm-375/record.json) | Required-error line remains reserved. Native0. |
| CF-02 | [C085-schema-close/warm-375](dist/layout-hunt/after/chat-controls-by-root/C085-schema-close/warm-375/record.json) | Schema fields remain visible through exit at PNG70ms. Native0. |
| CF-06 | [C109-one-time/cold-375](dist/layout-hunt/after/chat-controls-by-root/C109-one-time/cold-375/record.json) | Fallback and loaded controls share bounds. Native0.042952 belongs to requested tab replacement. |
| CF-11 | [C124-create/warm-375](dist/layout-hunt/after/chat-controls-by-root/C124-create/warm-375/record.json) | Draft remains visible during exit at PNG32ms. Native0.012541 remains from insertion/table sizing. |
| CF-25 | [C134-mobile-billing-exit/warm-375](dist/layout-hunt/after/chat-controls-by-root/C134-mobile-billing-exit/warm-375/record.json) | Billing remains visible through exit at PNG75ms. Native0. |
| CF-23 | [C171-timeline-open/warm-375](dist/layout-hunt/after/chat-controls-by-root/C171-timeline-open/warm-375/record.json) | Skeleton and loaded receipt keep later Kessler row fixed. Native0.062701 belongs to requested initial expansion. |

CF13, CF19, CF20 and CF21 have implementation and focused/static checks but were outside the six-profile after pass. The controls agent independently reviewed12 shell after profiles/70PNGs in `SHELL_INDEPENDENT_CONTROLS.json`; that pass confirms the personal-integration headline remains a partial fix.
