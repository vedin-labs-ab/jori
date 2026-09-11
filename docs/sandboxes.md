# Sandboxes

[Docs index](index.md) · [Residency](residency.md)

Blaxel runs Jori's sandbox workloads. Development and each production region
use separate workspaces and service-account credentials.

## Regional setup

| Jori deployment | Blaxel sandbox region | Blaxel workspace |
| --- | --- | --- |
| EU production | Frankfurt (`eu-fra-1`) | `jori-eu` |
| US production | North Virginia (`us-was-1`) | `jori-us` |
| Development | Selected by `JORI_REGION` | `jori-development` |

Use separate workspaces and service accounts. Set `BL_WORKSPACE`, `BL_API_KEY`,
`JORI_BLAXEL_IMAGE` and `DO_NOT_TRACK=1` on each Convex deployment. `JORI_REGION`
selects the sandbox region; there is no automatic region or cross-region fallback.

Creation and reconnect validate the workspace, resource name, region and regional
endpoint before sending customer content. Commands and files use that endpoint.
Missing sandboxes fail rather than silently starting with an empty filesystem.

Build with `pnpm sandbox <target>` after setting the target's Blaxel credentials.
The build uploads only a generated Dockerfile and configuration, with no customer
files or secrets. Set `JORI_BLAXEL_IMAGE` to the resulting immutable image version.
Build in each workspace; do not bake credentials into an image.

## Execution and cleanup

The image provides Node, Python, Git, Bash, curl and GNU coreutils. Workloads run
as an unprivileged user in `/home/user/workspace`.

Commands have deadlines and stay awake while running. Long commands return a
process handle and post a secret callback token to the same Convex deployment.
Jori's waiter handles completion or cancellation and collects the saved output.

The filesystem survives standby and reconnect. Successful runs retain it for
Jori's existing five-minute session reuse window; failures and expired leases
trigger deletion. Blaxel's one-hour idle expiry is a backup for orphaned resources.
Terminated resource records have five-minute retention. No shared volumes,
public previews or customer-content snapshots are created by Jori.

File imports read this deployment's Convex storage and upload bytes directly.
Exports reject outside paths, symlinks and oversized files before storing bytes
in the same regional Convex deployment.

## Verification and limits

Run the focused sandbox tests before changing this adapter. The opt-in
`blaxel/live.test.ts` uses `JORI_SANDBOX_LIVE=1` and the deployment's credentials;
run it separately for EU and US. It creates and deletes synthetic sandboxes.
Also verify a full Jori run, file import/export, callback completion and cleanup
on matching regional Convex previews.

Blaxel's written response states that customer data remains in the resource's
region after creation. Runtime tests verify our configuration and behavior;
they cannot inspect Blaxel's backups, support access or internal telemetry.
Workspace/control-plane metadata is distinct from the sandbox's selected region.
Keep the [residency claim](residency.md) scoped to evidence and the applicable DPA.

Separate workspaces require sufficient account quota. Blaxel currently ties tier
eligibility to recent credit top-ups; monitor quota and credential expiry before
extending previews or changing account billing.
