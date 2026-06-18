import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { type FileContext } from "../../../files/attachments"
import { setSlackThreadStatus } from "./status"

export type SlackMessageRoute = {
  channelId: string
  recordFinal: boolean
  source: boolean
  threadTs?: string
}

export async function prepareSlackMessageRoute(
  context: FileContext | undefined,
  args: {
    channel: string
    threadTs: string | undefined
  }
): Promise<SlackMessageRoute> {
  if (context === undefined) {
    return {
      channelId: args.channel,
      recordFinal: false,
      source: false,
      ...(args.threadTs === undefined ? {} : { threadTs: args.threadTs }),
    }
  }

  return (await context.ctx.runMutation(
    internal.runtime.slack.source.prepareSlackToolMessage,
    {
      channelId: args.channel,
      runId: context.execution.runId,
      threadTs: args.threadTs,
      now: Date.now(),
    }
  )) as SlackMessageRoute
}

export async function clearSourceSlackStatus(
  context: FileContext | undefined,
  integration: Doc<"integrations">,
  route: SlackMessageRoute
) {
  if (context === undefined || route.threadTs === undefined) {
    return false
  }

  try {
    await setSlackThreadStatus(integration, {
      channelId: route.channelId,
      status: "",
      threadTs: route.threadTs,
    })

    return true
  } catch (error) {
    await recordSlackFailure(context, error)

    return false
  }
}

export async function recordSourceSlackReply(
  context: FileContext | undefined,
  response: unknown,
  route: SlackMessageRoute,
  options: {
    hasAttachments: boolean
    statusCleared: boolean
  }
) {
  if (!shouldRecordSourceReply(context, route)) {
    return
  }

  if (options.hasAttachments) {
    await releaseSourceSlackReply(context)

    return
  }

  const messageTs = readSlackResponseString(response, "ts")

  if (messageTs === undefined) {
    await releaseSourceSlackReply(
      context,
      "Slack source reply response is missing ts"
    )

    return
  }

  await context.ctx.runMutation(
    internal.runtime.slack.source.recordSlackFinal,
    {
      messageTs,
      runId: context.execution.runId,
      statusCleared: options.statusCleared,
      now: Date.now(),
    }
  )
}

export async function recordSourceSlackReplyFailure(
  context: FileContext | undefined,
  route: SlackMessageRoute,
  error: unknown
) {
  if (!shouldRecordSourceReply(context, route)) {
    return
  }

  await releaseSourceSlackReply(
    context,
    error instanceof Error ? error.message : "Slack source reply failed"
  )
}

async function recordSlackFailure(context: FileContext, error: unknown) {
  await context.ctx.runMutation(internal.runtime.slack.status.recordFailure, {
    error: error instanceof Error ? error.message : "Slack status clear failed",
    runId: context.execution.runId,
    now: Date.now(),
  })
}

function shouldRecordSourceReply(
  context: FileContext | undefined,
  route: SlackMessageRoute
): context is FileContext {
  return context !== undefined && route.source && route.recordFinal
}

async function releaseSourceSlackReply(context: FileContext, error?: string) {
  await context.ctx.runMutation(
    internal.runtime.slack.source.releaseSlackFinalClaim,
    {
      ...(error === undefined ? {} : { error }),
      runId: context.execution.runId,
      now: Date.now(),
    }
  )
}

function readSlackResponseString(response: unknown, key: string) {
  if (typeof response !== "object" || response === null) {
    return undefined
  }

  const value = (response as Record<string, unknown>)[key]

  return typeof value === "string" && value !== "" ? value : undefined
}
