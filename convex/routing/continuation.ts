import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { continueTerminalWatchSession } from "../watches/continuation"
import { findWatch } from "../watches/data"

export async function continueTerminalSession(
  ctx: MutationCtx,
  input: {
    integration: Doc<"integrations">
    message: Doc<"messages">
    now: number
    route: "agent" | "ignore" | "respond"
  }
) {
  if (input.route === "agent" || input.message.conversationId === undefined) {
    return
  }

  const watch = await findWatch(ctx, {
    tenantId: input.integration.tenantId,
    integrationId: input.integration._id,
    externalId: input.message.conversationId,
  })

  if (watch === null) {
    return
  }

  await continueTerminalWatchSession(ctx, {
    now: input.now,
    watchId: watch._id,
  })
}
