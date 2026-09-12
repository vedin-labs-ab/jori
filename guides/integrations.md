# Integration decisions

[AGENTS.md](../AGENTS.md)

## Choose the registration

1. One registration, when it serves every regional flow. An integration
   without webhooks may need only regional OAuth callbacks.
2. Separate EU and US registrations, when the provider delivers app-wide and
   cannot route by region. Same implementation, regional configuration.
3. Neither fits: compare what the provider supports, such as polling. Shared
   ingress needs a concrete reason and a maintainer review of data,
   credentials, processing locations, retention, and failure handling.
4. Nothing fits: state the limitation.

Check current provider documentation before deciding. OAuth callbacks do not
route later webhooks. Several subscriptions do not prove selective delivery.
Separate registrations do not need separate developer accounts. Keep
development apps and data apart from production.

## Current choices

All four providers use separate registrations named "Jori", or "Jori EU" and
"Jori US" where names must be unique. If those are taken, ask Albin rather
than inventing one. These are decisions, not a record of provider settings;
check the provider before assuming they are applied. Jori's console selects
the regional app at connection time.

| Provider | Guidance |
| --- | --- |
| GitHub | Regional app keys. Names are unique and each app has one webhook. [Registration](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app). |
| Slack | Events and interactions have app-wide destinations. Keep app and bot branding aligned. [Request URLs](https://docs.slack.dev/apis/events-api/using-http-request-urls/), [manifest](https://docs.slack.dev/reference/app-manifest/). |
| Linear | Keep app notifications; do not add admin scope only to route by region. [Webhooks](https://linear.app/developers/webhooks), [app notifications](https://linear.app/developers/agent-best-practices). |
| Notion | The documented subscription controls do not give selective delivery per regional installation. [Webhooks](https://developers.notion.com/reference/webhooks). |

Branding is shared: the avatar at `public/brand/avatar/avatar-light-512.png`,
and this description wherever a provider shows one:

> Jori helps your team find information and get work done across your connected tools.

For Slack, set Default username to `jori-eu` or `jori-us` in App Home before
the first installation; manifests have no field for it. After installing or
changing configuration, check installation screens, app profiles, bot
identities, and the connection UI. Keep permissions and event subscriptions
aligned through shared configuration where the provider supports it. A
marketplace listing is separate from branding; leave it unpublished unless
asked. Infrastructure names such as `jori-production-eu` are separate from
the display name.

Renaming keeps registration IDs, grants, and connection ownership. Refresh
stored provider identities and any configured app slug, then verify mentions
and replies on existing connections. Replacing a registration, only when
explicitly authorized, creates new provider IDs and grants: preserve Jori
organization and connection IDs, audit destinations, jobs, and cards,
complete a new OAuth installation, and verify it before retiring the old one.

## Delivery and credentials

- Verify the provider's signature before trusting any routing identifier.
  Resolve the active local connection and enforce its tenant permissions.
- Accept and deduplicate events durably in the region before acknowledging,
  then process asynchronously. Answer synchronous interactions within their
  deadlines.
- Define retry and recovery per provider; GitHub needs explicit recovery of
  failed deliveries. Handle revocation and reconnection.
- Tokens and payloads stay regional, queues and scheduled arguments included,
  and out of logs. One app's key reaches every installation, so separate
  keys on one app are not isolation; separate registrations are.
- Check grant semantics before changing connection ownership or revocation,
  so disconnecting one connection never invalidates another by surprise.

## Verify the change

Record the chosen design and the provider evidence in the task. Test the
failures that matter: tenant or region mix-ups, forged or duplicate events,
revocation, outages. Reuse existing tests. Report what was tested and what
remains; a successful OAuth redirect is not end-to-end proof.
