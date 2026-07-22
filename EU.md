# EU data residency

This document is the launch gate for Milo's EU data region. EU must remain
disabled until every blocking item is resolved and the enablement checklist is
complete.

## Product contract

- A Milo account, session, organization, invitation, and all core product data
  belong to one regional deployment.
- US and EU deployments do not share authentication or application databases.
- An email address may independently create an account in each region. Those
  accounts are separate identities with separate organization memberships.
- Organizations and memberships never cross regional deployments.
- Self-service data transfer between regions is not supported.
- Direct regional links, including invitations, always take precedence over a
  saved preference or geographic estimate.
- Region is encoded by the deployment and application hostname. It is not
  stored redundantly on every product record.

## Frontend topology

Two frontend deployments serve three hostnames:

| Deployment | Hostnames | Backend |
| --- | --- | --- |
| US | Public apex and US regional hostname | US Convex deployment |
| EU | EU regional hostname | EU Convex deployment |

The apex is a routing edge. It does not serve authentication, inspect regional
sessions, or access product data. It stores only a non-sensitive, host-only
region preference and redirects visitors to regional marketing pages. A
regional marketing page can then display authenticated state using its own
same-origin session.

The apex currently shares the US frontend deployment. Anonymous request data
and hosting logs for the public website may therefore be processed in the US.
If Milo's final residency promise covers anonymous marketing traffic, the apex
must move to a suitable independent deployment before EU launch.

## Configuration

Each frontend build receives:

| Variable | Purpose |
| --- | --- |
| `VITE_MILO_REGION` | Current deployment identity: `us` or `eu` |
| `VITE_MILO_ENABLED_REGIONS` | Comma-separated regions exposed to users |
| `VITE_MILO_PUBLIC_ORIGIN` | Neutral public origin |
| `VITE_MILO_US_ORIGIN` | US application origin |
| `VITE_MILO_EU_ORIGIN` | EU application origin |
| `VITE_CONVEX_URL` | Convex client URL for the current region |
| `VITE_CONVEX_SITE_URL` | Convex HTTP URL for the current region |

Each Convex deployment receives its exact regional `MILO_APP_URL`, plus
`MILO_REGION=us` or `MILO_REGION=eu`. Secrets and provider credentials are
deployment-local. In production, `MILO_REGION` must match the physical region
shown in the Convex deployment settings.

The existing personal development deployment is hosted in Convex EU West even
though normal frontend development simulates the US product region. It is test
infrastructure, not either production target. Do not derive production
residency readiness from the development environment.

EU is currently held off with:

```text
VITE_MILO_ENABLED_REGIONS=us
```

## Provider readiness

`Unverified` is blocking. Evidence must cover stored data, transient
processing, logs, backups, support access, subprocessors, and control-plane
metadata, not only compute location.

| System | Current state | EU launch requirement |
| --- | --- | --- |
| Frontend hosting | Host not selected | Pin EU execution and verify logs, analytics, previews, and support access |
| Convex and Better Auth | Regional code plumbing implemented; production targets not provisioned | Provision named US and EU deployments, secrets, backups, and recovery procedures |
| Trigger.dev | US-centric, blocking | Replace with a verified EU-resident setup or self-host without losing required wait/checkpoint behavior |
| Stripe | US-centric aspects expected | Define an acceptable billing boundary or replace it for a strict 100% EU promise |
| Resend | Unverified | Verify email content, event data, logs, and retention |
| Model providers | Unverified | Verify OpenRouter, OpenAI, and every routed model provider |
| E2B | Unverified | Verify sandbox execution, files, snapshots, logs, and control plane |
| Exa | Unverified | Verify query and result processing, logs, and retention |
| Google and Microsoft auth | Unverified | Verify identity and OAuth metadata handling |
| Slack, GitHub, Linear, and Notion | Unverified | Verify OAuth, webhook, cached provider data, logs, and regional app configuration |
| Observability and support | Not selected | Select EU-compatible logging, error reporting, analytics, and support tooling |

Trigger.dev can run task compute in an EU region, but its managed execution
region does not by itself relocate all payloads, outputs, tags, logs, or
control-plane data. Treat Trigger as US-only until a fresh review of the
[run region documentation](https://trigger.dev/docs/triggering)
and [data processing addendum](https://trigger.dev/legal/dpa) proves that the
complete Milo workflow satisfies the final residency promise.

## Enablement checklist

- [ ] Approve a precise, customer-facing definition of EU data residency.
- [ ] Select and review the production frontend host.
- [ ] Verify the host's trusted country header or add an equivalent geographic
      adapter. Missing geographic evidence deliberately falls back to US.
- [ ] Provision the EU frontend and EU Convex deployment.
- [ ] Provision and verify the US production deployment independently of the
      existing personal development deployment.
- [ ] Add `deploy:us` and `deploy:eu` targets plus one serialized production
      parent command after both named deployment targets exist.
- [ ] Configure deployment-local auth, integration, billing, and email secrets.
- [ ] Register EU-specific OAuth callbacks and webhook endpoints where needed.
- [ ] Resolve every `Unverified` or `blocking` provider row above.
- [ ] Verify backup, restore, deletion, incident response, and support access.
- [ ] Confirm invitation, artifact, integration, checkout, and email links use
      the EU hostname.
- [ ] Confirm each `MILO_REGION` value matches the physical Convex region. See
      [Convex regions](https://docs.convex.dev/production/regions).
- [ ] Confirm the apex cannot serve `/api/auth` or authenticated product data.
- [ ] Run host-routing, sign-in, organization, invitation, and integration
      smoke tests against both production deployments.
- [ ] Review privacy, trust, subprocessors, and customer-facing copy.
- [ ] Set `VITE_MILO_ENABLED_REGIONS=us,eu` only after the preceding checks pass.

## Decisions

### 2026-07-22: Region-local identities

Milo uses independent accounts in each region. A person may intentionally have
both a US account and an EU account. No global identity directory is introduced.

### 2026-07-22: Two frontend deployments

The public apex and US hostname share the US frontend deployment. The EU
hostname uses the EU frontend deployment. A third public frontend is not needed
unless the final residency promise includes anonymous public-site processing.

### 2026-07-22: Trigger remains US-only

Milo keeps the current managed Trigger.dev workflow while EU is disabled. EU
support cannot launch until Trigger's data boundary is resolved.
