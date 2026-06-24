import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"

export const setupLinkOpenActionId = "milo_setup_link_open"
export const setupLinkCancelActionId = "milo_setup_link_cancel"

export type SlackSetupLinkCancelInteraction = {
  accountId: string
  channelId: string
  messageTs: string
  setupLinkId: Id<"setupLinks">
}

export async function handleSlackSetupLinkInteraction(
  ctx: ActionCtx,
  payload: unknown
) {
  const cancel = parseSlackSetupLinkCancelInteraction(payload)

  if (cancel !== null) {
    await ctx.runMutation(internal.integrations.setup.lifecycle.cancel, cancel)
    return true
  }

  return isSlackSetupLinkInteraction(payload)
}

export function isSlackSetupLinkInteraction(payload: unknown) {
  return readActionIds(payload).includes(setupLinkOpenActionId)
}

export function parseSlackSetupLinkCancelInteraction(payload: unknown) {
  if (!isObject(payload) || payload.type !== "block_actions") {
    return null
  }

  const action = readFirstAction(payload.actions)

  if (action?.action_id !== setupLinkCancelActionId) {
    return null
  }

  const accountId = readNestedString(payload.team, "id")
  const channelId = readNestedString(payload.channel, "id")
  const messageTs = readNestedString(payload.message, "ts")
  const setupLinkId = readSetupLinkId(action.value)

  if (
    accountId === null ||
    channelId === null ||
    messageTs === null ||
    setupLinkId === null
  ) {
    return null
  }

  return {
    accountId,
    channelId,
    messageTs,
    setupLinkId,
  } satisfies SlackSetupLinkCancelInteraction
}

function readActionIds(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return []
  }

  const actions = (payload as { actions?: unknown }).actions

  if (!Array.isArray(actions)) {
    return []
  }

  return actions.flatMap((action) => {
    if (typeof action !== "object" || action === null) {
      return []
    }

    const actionId = (action as { action_id?: unknown }).action_id

    return typeof actionId === "string" ? [actionId] : []
  })
}

function readFirstAction(actions: unknown) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return null
  }

  return isObject(actions[0]) ? actions[0] : null
}

function readNestedString(value: unknown, key: string) {
  if (!isObject(value)) {
    return null
  }

  const child = value[key]

  return typeof child === "string" && child !== "" ? child : null
}

function readSetupLinkId(value: unknown) {
  if (typeof value !== "string" || value === "") {
    return null
  }

  try {
    const parsed = JSON.parse(value) as unknown

    return isObject(parsed) && typeof parsed.setupLinkId === "string"
      ? (parsed.setupLinkId as Id<"setupLinks">)
      : null
  } catch {
    return null
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
