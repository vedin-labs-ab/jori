import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { action, internalQuery } from "../_generated/server"
import { slackQueryApi } from "../broker/providers/slack/client"
import { requireClerkUserId } from "../identity/users"
import { integrationProviderValidator } from "../providers/catalog"
import { requireSlackCredentials } from "../providers/slack/credentials"
import { requireTenantAccess } from "../skills/access"
import { resolveEventIntegration } from "./access"
import {
  isAutomationEventOptionSource,
  providerUsesAutomationEventOptionSource,
} from "./events"

const maxOptions = 50
const maxSlackPages = 5
const slackChannelTypes = "public_channel,private_channel"

export type AutomationEventOption = {
  value: string
  label: string
  description?: string
}

export type AutomationEventOptionSearchResult =
  | {
      status: "ready"
      options: AutomationEventOption[]
    }
  | {
      status: "unavailable"
      message: string
    }

export const search = action({
  args: {
    tenantId: v.string(),
    provider: integrationProviderValidator,
    source: v.string(),
    query: v.string(),
  },
  handler: async (ctx, args): Promise<AutomationEventOptionSearchResult> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)

    if (
      !isAutomationEventOptionSource(args.source) ||
      !providerUsesAutomationEventOptionSource(args.provider, args.source)
    ) {
      throw new Error("Choose a supported event resource.")
    }

    const lookup: IntegrationLookup = await ctx.runQuery(
      internal.automations.options.integration,
      {
        tenantId: args.tenantId,
        provider: args.provider,
        createdBy: requireClerkUserId(identity),
      }
    )

    if (lookup.status === "unavailable") {
      return lookup
    }

    if (args.source === "slack.channels") {
      return await searchSlackChannelOptions(lookup.integration, args.query)
    }

    return { status: "ready", options: [] }
  },
})

type IntegrationLookup =
  | {
      status: "ready"
      integration: Doc<"integrations">
    }
  | {
      status: "unavailable"
      message: string
    }

export const integration = internalQuery({
  args: {
    tenantId: v.string(),
    provider: integrationProviderValidator,
    createdBy: v.string(),
  },
  handler: async (ctx, args): Promise<IntegrationLookup> => {
    try {
      return {
        status: "ready",
        integration: await resolveEventIntegration(ctx, {
          tenantId: args.tenantId,
          provider: args.provider,
          createdBy: args.createdBy,
        }),
      }
    } catch {
      return {
        status: "unavailable",
        message: "Connect Slack before choosing a channel.",
      }
    }
  },
})

async function searchSlackChannelOptions(
  integration: Doc<"integrations">,
  query: string
): Promise<AutomationEventOptionSearchResult> {
  try {
    return {
      status: "ready",
      options: await searchSlackChannels(integration, query),
    }
  } catch {
    return {
      status: "unavailable",
      message:
        "Could not load Slack channels. Check the Slack connection and try again.",
    }
  }
}

async function searchSlackChannels(
  integration: Doc<"integrations">,
  query: string
) {
  const credentials = requireSlackCredentials(integration)
  const normalizedQuery = normalizeQuery(query)
  const options: AutomationEventOption[] = []
  let cursor: string | undefined

  for (let page = 0; page < maxSlackPages; page += 1) {
    const result = await slackQueryApi(credentials.user, "conversations.list", {
      cursor,
      exclude_archived: true,
      limit: 200,
      types: slackChannelTypes,
    })

    for (const channel of readSlackChannels(result)) {
      if (options.length >= maxOptions) {
        return options
      }

      if (!matchesSlackChannel(channel, normalizedQuery)) {
        continue
      }

      options.push(toSlackChannelOption(channel))
    }

    cursor = readSlackCursor(result)

    if (cursor === undefined) {
      return options
    }
  }

  return options
}

type SlackChannel = {
  id: string
  name: string
  is_private?: boolean
  num_members?: number
}

function readSlackChannels(result: Record<string, unknown> | null) {
  const channels = result?.channels

  if (!Array.isArray(channels)) {
    return []
  }

  return channels.filter(isSlackChannel)
}

function isSlackChannel(value: unknown): value is SlackChannel {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const channel = value as Record<string, unknown>

  return typeof channel.id === "string" && typeof channel.name === "string"
}

function readSlackCursor(result: Record<string, unknown> | null) {
  const metadata = result?.response_metadata

  if (typeof metadata !== "object" || metadata === null) {
    return undefined
  }

  const cursor = (metadata as Record<string, unknown>).next_cursor

  return typeof cursor === "string" && cursor !== "" ? cursor : undefined
}

function matchesSlackChannel(channel: SlackChannel, normalizedQuery: string) {
  if (normalizedQuery === "") {
    return true
  }

  return normalizeQuery(channel.name).includes(normalizedQuery)
}

function toSlackChannelOption(channel: SlackChannel): AutomationEventOption {
  return {
    value: channel.id,
    label: `#${channel.name}`,
    description: slackChannelDescription(channel),
  }
}

function slackChannelDescription(channel: SlackChannel) {
  const visibility = channel.is_private === true ? "Private" : "Public"

  if (typeof channel.num_members !== "number") {
    return visibility
  }

  return `${visibility} - ${channel.num_members} members`
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase()
}
