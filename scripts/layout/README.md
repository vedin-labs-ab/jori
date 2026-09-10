# Layout recorder

Run commands from the task worktree. The app host loads development config and
refuses a production Convex deployment. Shared-component fixtures use local
data and do not establish backend timing or permission coverage.

```sh
pnpm layout:app --build
pnpm layout:fixture
pnpm layout:states
node --experimental-strip-types scripts/layout/chatstate/server.ts
```

These commands stay running on ports 5178, 5180, 5192 and 5193 respectively.
Use only the hosts required by the selected manifest. Rebuild a host after
changing product source. The application on port 8050 is independent.
The permission transport maps only the preview has-permission POST Origin to
http://localhost:8050, which must match the development JORI_APP_URL.

```sh
LAYOUT_STORAGE=scripts/layout/reports/session.local pnpm layout scripts/layout/scenarios/shards/lists.json dist/layout-hunt/after/lists
```

`LAYOUT_APP` and `LAYOUT_FIXTURE` override the first two host URLs.
`LAYOUT_CONCURRENCY` defaults to one, capped at four. Each recipe runs cold and
warm at 1440×900 and 375×812. Cold runs throttle CPU and network. Warm runs
prime the cache and navigate through a blank document before measurement.
Use a small selected manifest for a focused regression, not an entire area.

For signed-in measurements, sign in through the browser to the local dev app.
The non-build app host exposes `/__layout/session` to save the authorized
localhost auth cookies as `scripts/layout/reports/session.local`. This file is
ignored and written with mode 0600. Never commit it or print its contents.
Keep raw screenshots and records in ignored `dist/layout-hunt`, since they
can contain development account data.

Transport fault recipes require their wrapper:

```sh
LAYOUT_STORAGE=scripts/layout/reports/session.local node --experimental-strip-types scripts/layout/transport/index.mjs scripts/layout/transport/specs.mjs dist/layout-hunt/after/transport case-id warm-375
```

The wrapper records its own digest and verifies the recorder digest. It changes
the selected response or socket at the data boundary and preserves cache
behavior. Read its scenario before running any live action. Fixture mutations
are local; app mutations may affect the signed-in development account.

The frozen V3 recorder digest is
`7bd0f4b7935def55b1b1686eb0ab475f9ae4ccc8f473d2069a9df9e40f7f6b21`.
It covers `probe.js`, `drive.ts`, `capture.ts`, `actions.ts`, `diff.ts`,
`types.ts`, `measurement/network.ts` and `measurement/transport.ts` in that
order. Keep these files identical between a before and after comparison.

Review every captured frame in a selected series, plus native shift entries,
element rectangles and scroll positions. Include `hadRecentInput` entries.
Separate intended motion and direct interaction from neighboring movement.
A failed recipe, interrupted capture, unreviewed frame or older warm fragment
capture is a coverage gap, never a pass. PNG and geometry timestamps differ.
Keep their actual times when citing evidence pairs.
