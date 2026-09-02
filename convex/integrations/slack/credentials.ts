import { type Doc } from "../../_generated/dataModel"

/** Slack is the only provider whose bot and user tokens rotate on separate
 *  clocks, each carrying its own single-use refresh token, so it stores two
 *  pairs rather than the single `tokens` object the others keep. */
export const slackTokenKinds = ["bot", "user"] as const

type SlackTokenKind = (typeof slackTokenKinds)[number]

export type SlackTokenPair = {
  access: string
  refresh: string
  expiresAt: number
}

type SlackCredentials = Record<SlackTokenKind, SlackTokenPair>

export function requireSlackCredentials(
  integration: Doc<"integrations">
): SlackCredentials {
  const credentials = integration.credentials

  if (typeof credentials !== "object" || credentials === null) {
    throw new Error("Missing Slack integration credentials")
  }

  const record = credentials as Record<string, unknown>
  const bot = readSlackTokenPair(record.bot)
  const user = readSlackTokenPair(record.user)

  if (bot === undefined || user === undefined) {
    throw new Error("Missing Slack integration credentials")
  }

  return { bot, user }
}

export function readSlackTokenPair(value: unknown): SlackTokenPair | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined
  }

  const pair = value as Record<string, unknown>

  return typeof pair.access === "string" &&
    typeof pair.refresh === "string" &&
    typeof pair.expiresAt === "number"
    ? { access: pair.access, refresh: pair.refresh, expiresAt: pair.expiresAt }
    : undefined
}
