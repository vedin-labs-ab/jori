# Branch previews

[Docs index](index.md) · [Sandboxes](sandboxes.md)

Use an expiring Convex preview for live worktree tests. Shared development and
production remain separate. Create one preview per region when testing residency.

From the task worktree, with account-level CLI authentication:

```sh
pnpm exec convex deployment create preview/TASK-eu --type preview --region eu --expiration 'in 4 days'
pnpm exec convex deployment token create TASK-eu --deployment preview/TASK-eu --save-env .env.local
pnpm exec convex deploy --env-file .env.local --yes
pnpm exec convex run --env-file .env.local skills/catalog:syncGlobalSkills
```

The token command's positional argument names the key. `--deployment` selects
its target. Protect the ignored env file and use the preview-scoped key for later
commands. For US, use `--region us`, a different reference and `.env.us.local`.

Configure each preview's runtime secrets explicitly. Use regional sandbox
credentials, a fresh auth secret and synthetic test data. Do not copy production
secrets or databases. Missing unrelated integrations can stay unconfigured.

Point `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` at the preview's exact URLs.
Set `JORI_REGION` in Convex and `VITE_JORI_REGION` in the frontend to match.
For a standalone local preview, enable only that region with
`VITE_JORI_ENABLED_REGIONS`. Match its frontend origin, `JORI_APP_URL` and
`JORI_PUBLIC_ORIGIN`; register its callback on the development OAuth client.

Run only Vite from the worktree, using its preview env file. `pnpm dev` also
starts a Convex watcher, so do not use it with the shared development environment.
For simultaneous EU/US browsers, use distinct hostnames such as `localhost`
and `127.0.0.1`. Different ports alone still share sign-in cookies.

Before handing off, record preview URLs, expiry, credential expiry and test
results outside this guide. Delete test sandboxes after verification. Remove
temporary OAuth callbacks and revoke preview keys when retiring the previews.
