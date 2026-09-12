# Integration decisions

[Docs index](index.md)

## Choose the registration

1. Use one registration when it supports all required regional flows. An
   integration without webhooks may need only regional OAuth callbacks.
2. Use separate EU/US registrations when app-wide delivery prevents direct
   regional routing. Keep the same implementation with regional configuration.
3. If neither meets the feature's needs, compare provider-supported alternatives
   such as polling. Shared ingress requires a concrete reason and a maintainer
   review of data, credentials, processing locations, retention and failure handling.
4. If no option meets the requirements, state the limitation. Do not silently
   broaden geography or permissions.

Verify provider capabilities against current official documentation. OAuth
callbacks do not route later webhooks; multiple subscriptions do not prove
selective delivery. Separate registrations do not inherently require separate
developer accounts. Keep development apps and data separate from production.

## Current choices

Keep separate registrations for all four. Use the display name "Jori". Where a
provider requires globally unique names, use "Jori EU" and "Jori US". Ask Albin
if those names are unavailable; do not invent alternatives. This guidance does
not mean provider settings have already been updated.

| Provider | Guidance |
| --- | --- |
| GitHub | Use "Jori EU" and "Jori US", subject to availability. Keep app keys regional. Names are unique and each app has one webhook. [Registration](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app). |
| Slack | Events and interactions use app-wide destinations. Keep app and bot branding aligned. [Request URLs](https://docs.slack.dev/apis/events-api/using-http-request-urls/), [manifest](https://docs.slack.dev/reference/app-manifest/). |
| Linear | Keep app notifications without adding admin scope solely for regional routing. [Webhooks](https://linear.app/developers/webhooks), [app notifications](https://linear.app/developers/agent-best-practices). |
| Notion | Selective delivery per regional installation is not established by the documented subscription controls. [Webhooks](https://developers.notion.com/reference/webhooks). |

For Slack, set Default username to `jori-eu` or `jori-us` in App Home before
first installation. App manifests have no separate Default username field.
Verify the installed username and visible identity after installation or
configuration changes.

Jori's console selects the regional app. All four provider registrations use
`public/brand/avatar/avatar-light-512.png` for Jori's avatar. Use this description
wherever the provider exposes an app description field:

> Jori helps your team find information and get work done across your connected tools.

Check installation screens, app profiles, bot identities and the connection UI.
Keep permissions and event subscriptions aligned through shared configuration
where supported. A marketplace listing is separate from app branding; leave it
unpublished unless publication is requested.

Renaming must preserve registration IDs, grants and existing connection
ownership. Refresh stored provider identities and any configured app slug after
renaming, then verify mentions and replies on existing connections. Infrastructure
names such as `jori-production-eu` are separate from the provider display name.

An explicitly authorized registration replacement creates new provider IDs and
grants. Preserve Jori organization and connection IDs, audit destinations, jobs
and cards, and complete a new OAuth installation. Verify the replacement before
retiring the old installation.

## Delivery and credentials

- Verify provider signatures before trusting routing identifiers. Resolve the
  active local connection and enforce its tenant permissions.
- Durably accept and deduplicate events in the region before acknowledging;
  process asynchronously. Handle synchronous interactions within their deadlines.
- Define retry and recovery behavior per provider. GitHub needs explicit failed
  delivery recovery. Handle provider revocation and reconnection.
- Keep tokens and payloads regional, including queues and scheduled arguments.
  Keep credentials and payloads out of logs. A shared app key can grant access
  across installations; separate keys for one app do not create regional isolation.
- Check grant semantics before changing connection ownership or revocation.
  Do not make one connection's disconnect invalidate another unexpectedly.

## Verify the change

Record the chosen design and provider evidence in the task. Test relevant
failures: tenant/region mixups, forged or duplicate events, revocation and outages.
Reuse existing tests and follow `AGENTS.md` for checks. Report tested workflows
and remaining gaps; a successful OAuth redirect alone is not end-to-end proof.
