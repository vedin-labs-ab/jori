import { isRecord } from "../../../../contracts/json"
import { internal } from "../../../_generated/api"
import { type ActionCtx } from "../../../_generated/server"

/**
 * A sandbox command that outlived its grace window posts here when it
 * finishes. The token is generated per command and only names that command's
 * waiter, so it carries its own authority and needs no other credential.
 */
export async function handleCommandCallback(ctx: ActionCtx, request: Request) {
  const payload: unknown = await request.json().catch(() => undefined)

  if (!isRecord(payload) || typeof payload.token !== "string") {
    return new Response(null, { status: 400 })
  }

  await ctx.runMutation(internal.runs.execution.waiters.records.wakeCommand, {
    token: payload.token,
  })

  return new Response(null, { status: 204 })
}
