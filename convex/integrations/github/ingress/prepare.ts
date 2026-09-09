import { getGitHubMessage } from "./events"
import { getGitHubLifecycleEvent } from "./lifecycle"

type Webhook = Parameters<typeof getGitHubMessage>[0]

// Persist only the fields consumed by Jori. Large push payloads otherwise
// exceed a Convex document even though their normalized event is small.
export function prepareGitHubEvent(webhook: Webhook) {
  const installationId = webhook.payload.installation?.id
  if (installationId === undefined) {
    return null
  }
  const accountId = String(installationId)
  if (
    webhook.event === "installation" &&
    (webhook.payload.action === "deleted" ||
      webhook.payload.action === "suspend")
  ) {
    const timestamp = Date.parse(
      webhook.payload.installation?.suspended_at ?? ""
    )
    return {
      kind: "revocation" as const,
      accountId,
      suspendedAt: Number.isFinite(timestamp) ? timestamp : undefined,
    }
  }
  const message = getGitHubMessage(webhook)
  if (message !== null) {
    return { kind: "message" as const, accountId, message }
  }
  const lifecycle = getGitHubLifecycleEvent(webhook)
  return lifecycle === null
    ? null
    : { kind: "lifecycle" as const, accountId, lifecycle }
}

export type PreparedGitHubEvent = NonNullable<
  ReturnType<typeof prepareGitHubEvent>
>
