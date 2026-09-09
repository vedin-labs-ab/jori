import { type Infer, v } from "convex/values"
import { type Doc } from "../../_generated/dataModel"

export const credentialSnapshotValidator = v.object({
  connectionGeneration: v.number(),
  credentialVersion: v.number(),
})
export type CredentialSnapshot = Infer<typeof credentialSnapshotValidator>

export function credentialSnapshot(
  integration: Doc<"integrations">
): CredentialSnapshot {
  return {
    connectionGeneration: integration.connectionGeneration ?? 0,
    credentialVersion: integration.credentialVersion ?? 0,
  }
}

export function matchesCredentialSnapshot(
  integration: Doc<"integrations">,
  expected: CredentialSnapshot
) {
  return (
    integration.status === "active" &&
    (integration.connectionGeneration ?? 0) === expected.connectionGeneration &&
    (integration.credentialVersion ?? 0) === expected.credentialVersion
  )
}
