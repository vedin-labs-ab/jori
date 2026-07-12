import { type ConvexHttpClient } from "convex/browser"
import { api } from "../../convex/_generated/api"
import { type ConvexId } from "../types"

export async function upsertSandbox(
  client: ConvexHttpClient,
  secret: string,
  args: { externalId: string; runId: ConvexId<"runs"> }
) {
  await client.mutation(api.runtime.sandboxes.upsert, { ...args, secret })
}

export async function releaseSandbox(
  client: ConvexHttpClient,
  secret: string,
  args: { externalId: string; runId: ConvexId<"runs"> }
) {
  return (await client.mutation(api.runtime.sandboxes.release, {
    ...args,
    secret,
  })) as { expiresAt: number } | null
}

export async function reserveExpiredSandboxCleanup(
  client: ConvexHttpClient,
  secret: string,
  args: {
    expiresAt: number
    externalId: string
    runId: ConvexId<"runs">
  }
) {
  return (await client.mutation(api.runtime.sandboxes.reserveExpiredCleanup, {
    ...args,
    secret,
  })) as boolean
}

export async function markSandboxCleaned(
  client: ConvexHttpClient,
  secret: string,
  args: { error?: string; externalId: string }
) {
  await client.mutation(api.runtime.sandboxes.markCleaned, {
    ...args,
    secret,
  })
}
