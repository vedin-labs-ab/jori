# Additional data states

`pnpm layout:states` builds a separate local fixture at port 5192. It does not
replace the main fixture server or change the production application. Run
`pnpm layout scripts/layout/scenarios/states.json <output>` with the same frozen
probe, conditions and viewports as the main inventory. Its absolute localhost
URLs require no saved account state.

This fixture uses the actual ConsoleFrame, TableList, ConsoleListBody,
pagination and selection hooks. It expands the existing table summaries to 29
local records with long names. Initial result states and the 1100 ms page-fetch
delay are simulated at the data boundary. F8 schedules an independent row
removal, so the driver can mark the data update without adding a test control to
the visible layout.

The save cases use the actual useMaterialUpdate hook and EditMaterialDialog.
Only the service promise is replaced with a delayed local success or rejection.
These cases measure those shared components and states. They do not establish
the timing or authorization behavior of the Convex service.

Keep this host separate while a baseline capture is running. Build both hosts
again for verification after product fixes are integrated. The normal fixture
remains on port 5180 and the authenticated development build on port 5178.

The grid variants use RowGrid, useRowWrites and useColumnSheetForm directly.
They contain 150 or 300 rows derived from the normal renewals fixture. A local
ConvexReactClient has only its mutation method replaced with a delayed outcome;
it connects to no backend. The first cell save rejects or reports a version
conflict, and retry succeeds. This exercises the actual pending state, conflict
message and draft handling. Column saves use the normal form hook with a
rejected first service promise. F8 can also remove the inspected column from
the supplied table data. Service timing and authorization remain outside these
isolated cases; the authenticated app pass covers normal integration behavior.

Lifecycle variants call useMaterialRemoval and the existing row menu and
confirmation. Initial archived rows are supplied explicitly to exercise the
shared Restore and permanent Delete controls; the live default list excludes
archived items. The local service delays archive, restore or delete by 1100 ms,
then resolves or rejects. This covers their visual states without claiming a
live archived-list navigation path.


Creation variants use CreateMaterialDialog and its actual creation hook. The
local create service resolves or rejects after 1100 ms. Retry uses the same
hook. These cases cover the form and its pending state; the main C051 cases
separately cover inserting the created material into the list.

Job variants use JobEditorDialog, the existing demo job and folder data, and
its real save callback. They delay tool schemas and permission data as well as
save outcomes. F8 reloads permissions, F9 returns an unavailable result, and
F10 restores them. The controls shard owns the 17 cases in
`scenarios/jobs.json`.

Access and move variants use OrganizationVisibilityDialog, MoveDialog and
useMoveConfirmation. Their local Convex query adapter publishes audience,
grantee, team and folder results to the real query hooks. No network request
is sent. One argument set per query name is supported in each isolated case.
Visibility saves delay success or failure, including retry. Move cases cover
folder loading, audience comparison, confirmation, cancellation and the
unchanged-audience path. These local values measure visual behavior without
claiming to test backend permissions.
