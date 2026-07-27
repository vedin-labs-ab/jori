# EU data residency

This document is the launch gate for Jori's EU data region. EU must remain
disabled until every blocking item is resolved and the enablement checklist is
complete.

## Product contract

- A Jori account, session, organization, invitation, and all core product data
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
If Jori's final residency promise covers anonymous marketing traffic, the apex
must move to a suitable independent deployment before EU launch.

## Configuration

Each frontend build receives:

| Variable | Purpose |
| --- | --- |
| `VITE_JORI_REGION` | Current deployment identity: `us` or `eu` |
| `VITE_JORI_ENABLED_REGIONS` | Comma-separated regions exposed to users |
| `VITE_JORI_PUBLIC_ORIGIN` | Neutral public origin |
| `VITE_JORI_US_ORIGIN` | US application origin |
| `VITE_JORI_EU_ORIGIN` | EU application origin |
| `VITE_CONVEX_URL` | Convex client URL for the current region |
| `VITE_CONVEX_SITE_URL` | Convex HTTP URL for the current region |

Each Convex deployment receives its exact regional `JORI_APP_URL`, plus
`JORI_REGION=us` or `JORI_REGION=eu`. Secrets and provider credentials are
deployment-local. In production, `JORI_REGION` must match the physical region
shown in the Convex deployment settings.

The existing personal development deployment is hosted in Convex EU West even
though normal frontend development simulates the US product region. It is test
infrastructure, not either production target. Do not derive production
residency readiness from the development environment.

EU is currently held off with:

```text
VITE_JORI_ENABLED_REGIONS=us
```

## Provider readiness

`Unverified` is blocking. Evidence must cover stored data, transient
processing, logs, backups, support access, subprocessors, and control-plane
metadata, not only compute location.

| System | Current state | EU launch requirement |
| --- | --- | --- |
| Frontend hosting | Vercel hosts US, blocking for EU | Select an EU-resident host and deploy the EU frontend there. Vercel cannot carry the promise; see the 2026-07-27 decision |
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
complete Jori workflow satisfies the final residency promise.

## Enablement checklist

- [ ] Approve a precise, customer-facing definition of EU data residency.
- [ ] Select an EU frontend host that satisfies that definition, and verify it
      against the definition before the first EU deployment. The US frontend
      host does not carry over.
- [ ] Verify the host's trusted country header or add an equivalent geographic
      adapter. Missing geographic evidence deliberately falls back to US.
- [ ] Provision the EU frontend and EU Convex deployment.
- [ ] Split `deploy:prod` into `deploy:prod:us` and `deploy:prod:eu` with the
      existing command as the serialized parent, once the EU target exists.
- [ ] Configure deployment-local auth, integration, billing, and email secrets.
- [ ] Register EU-specific OAuth callbacks and webhook endpoints where needed.
- [ ] Resolve every `Unverified` or `blocking` provider row above.
- [ ] Verify backup, restore, deletion, incident response, and support access.
- [ ] Confirm invitation, app, integration, checkout, and email links use
      the EU hostname.
- [ ] Confirm each `JORI_REGION` value matches the physical Convex region. See
      [Convex regions](https://docs.convex.dev/production/regions).
- [ ] Confirm the apex cannot serve `/api/auth` or authenticated product data.
- [ ] Run host-routing, sign-in, organization, invitation, and integration
      smoke tests against both production deployments.
- [ ] Review privacy, trust, subprocessors, and customer-facing copy.
- [ ] Set `VITE_JORI_ENABLED_REGIONS=us,eu` only after the preceding checks pass.

## Decisions

### 2026-07-22: Region-local identities

Jori uses independent accounts in each region. A person may intentionally have
both a US account and an EU account. No global identity directory is introduced.

### 2026-07-22: Two frontend deployments

The public apex and US hostname share the US frontend deployment. The EU
hostname uses the EU frontend deployment. A third public frontend is not needed
unless the final residency promise includes anonymous public-site processing.

### 2026-07-22: Trigger remains US-only

Jori keeps the current managed Trigger.dev workflow while EU is disabled. EU
support cannot launch until Trigger's data boundary is resolved.

### 2026-07-24: Railway hosts the frontend

Railway is the frontend host, chosen over Vercel for the residency story rather
than for developer experience.

Railway offers an EU West region in Amsterdam, and a service deployed there
keeps its data on European infrastructure. Vercel can pin function execution to
Frankfurt, but its edge network terminates every request, including session
cookies and form submissions, in US-owned infrastructure before any regional
function runs, and its caching, logging, and analytics are not region-selected.
Vercel is also not listed under the EU-US Data Privacy Framework as of early
2026. That combination caps how strong an EU claim Jori could make, and the
frontend is the application host, not a disposable marketing site.

Neither provider delivers sovereignty. Both are US-incorporated and therefore
in scope for the CLOUD Act, which the EU Cloud Sovereignty Framework names
explicitly as a limiting factor. Railway improves residency, not sovereignty.
If the final promise is written at the sovereignty level rather than the
residency level, the frontend host must be revisited alongside every other
US-owned provider in the table above.

Reversed on 2026-07-27.

### 2026-07-27: Vercel hosts the US frontend

Vercel replaces Railway as the frontend host, chosen for developer experience.

This reverses the 2026-07-24 decision on its own terms. That decision picked
Railway for the residency story, and the residency story does not survive
either choice: Railway improves residency without delivering sovereignty, and
the EU promise Jori intends to make is not one a US-incorporated host can
carry. Paying a developer experience cost for a partial improvement that still
needs replacing is the wrong trade, so the US frontend optimises for the thing
it can actually have.

The objections to Vercel recorded on 2026-07-24 stand and are not answered
here. Its edge terminates every request, including session cookies and form
submissions, in US-owned infrastructure before any regional function runs; its
caching, logging, and analytics are not region-selected; and it is not listed
under the EU-US Data Privacy Framework. None of that constrains the US
deployment, which makes no residency promise. All of it disqualifies Vercel
from serving the EU region.

The EU frontend is therefore an open provider selection rather than a
configuration of the existing one. Scaleway is the current candidate, chosen
against a residency definition that does not yet exist; the enablement
checklist keeps that ordering. Nothing about the EU host is decided here.
