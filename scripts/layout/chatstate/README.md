# Additional chat measurement data

This separate host fills states absent from the frozen landing demo. It imports
actual shared views and the console's `ChatProgress`, `RunApprovals` and
`useSendMessage` hooks. It changes no product source and never connects to a
backend. The frozen layout probe remains unchanged.

The local Convex method boundary supplies query values and 1100 ms promise
responses. F8 schedules the next data arrival; F9 does nothing and marks a
measurement window. Query phase 1 supplies activity, phase 2 adds a pending
approval, and phase 3 adds a connection offer. Expiry uses a current anchor.
The `current-clock` case mounts the original DemoConsole with a current anchor;
all other original demo data and callbacks remain unchanged.

The send response uses the real hook's pending/error handling and composer
promise contract. It does not implement Convex's optimistic-update engine and
cannot establish live end-to-end send coverage. Separate signed-in isolated
conversations are queued to cover that boundary. The local service can reject
the first send and resolve the second. The actual Sonner toaster handles error feedback and auto-dismiss.

Pagination prepends 24 older turns through ChatThread's normal load callback.
Reference names, condensed context, failed run, activity and approval arrival
are state changes passed to the actual views. Synthetic HTML, two-second playback
completion clips, eight-second pause fixtures of silent audio/video, oversized
text metadata and a missing URL exercise the shared file viewer. The media
assets are local fixture data.

Run `node --experimental-strip-types scripts/layout/chatstate/server.ts` to build
and serve on port 5193. The separate scenario manifest is
`scripts/layout/scenarios/chatstate.json`. Selectors remain subject to browser
preflight after the concurrent main sweeps finish. Do not describe an unverified
or failed drive as completed coverage.

The pane-file and pane-store cases supply bindings missing from DemoPaneBody.
They use actual ChatPane, its tab hook, and ChatPaneBody over the same fixture
material data. F7 schedules opening the selected resource. Writes use delayed
demo workspace actions; these cases are isolated UI/service coverage.

The copy-resolve and copy-reject cases replace only the local browser clipboard
response, leaving CopyButton and its 1200 ms reset timer intact. They never write
the system clipboard. This is platform-boundary UI coverage; a permission-enabled
browser repeat separately covers the real clipboard call.
