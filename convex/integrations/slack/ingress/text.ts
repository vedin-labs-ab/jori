import { withUnicodeEmoji } from "../../../../contracts/emoji/convert"

// Renders raw Slack mrkdwn as the human-readable text stored on messages:
// mention/link/special tokens become labels, entities unescape, and known
// emoji shortcodes become unicode.
type SlackTextEntities = {
  channels: ReadonlyMap<string, string>
  users: ReadonlyMap<string, string>
}

export function humanizeSlackText(text: string, entities: SlackTextEntities) {
  const rendered = text.replace(/<([^<>]*)>/g, (token, body: string) =>
    renderSlackToken(token, body, entities)
  )

  return withUnicodeEmoji(unescapeSlackEntities(rendered))
}

export function unlabeledSlackUserIds(text: string) {
  return matchedIds(text, /<@([UW][A-Z0-9]+)>/g)
}

export function unlabeledSlackChannelIds(text: string) {
  return matchedIds(text, /<#([CGD][A-Z0-9]+)>/g)
}

export function slackTextMentionsUser(text: string, userId: string) {
  return new RegExp(`<@${escapeRegExp(userId)}(?:\\|[^>]*)?>`).test(text)
}

function matchedIds(text: string, pattern: RegExp) {
  return [...new Set([...text.matchAll(pattern)].map((match) => match[1]))]
}

function renderSlackToken(
  token: string,
  body: string,
  entities: SlackTextEntities
) {
  const separatorIndex = body.indexOf("|")
  const target = separatorIndex === -1 ? body : body.slice(0, separatorIndex)
  const label =
    separatorIndex === -1
      ? undefined
      : emptyToUndefined(body.slice(separatorIndex + 1))

  if (target.startsWith("@")) {
    const id = target.slice(1)

    return `@${entities.users.get(id) ?? label ?? id}`
  }

  if (target.startsWith("#")) {
    const id = target.slice(1)

    return `#${entities.channels.get(id) ?? label ?? id}`
  }

  if (target.startsWith("!")) {
    return specialTokenLabel(target.slice(1), label, token)
  }

  return isLinkTarget(target) ? linkLabel(target, label) : token
}

function specialTokenLabel(
  name: string,
  label: string | undefined,
  token: string
) {
  if (name === "here" || name === "channel" || name === "everyone") {
    return `@${name}`
  }

  if (name.startsWith("subteam^")) {
    const handle = label ?? name.slice("subteam^".length)

    return handle.startsWith("@") ? handle : `@${handle}`
  }

  if (name.startsWith("date^")) {
    return label ?? dateTokenLabel(name)
  }

  return label ?? token
}

function dateTokenLabel(name: string) {
  const timestamp = Number(name.split("^")[1])

  return Number.isFinite(timestamp)
    ? new Date(timestamp * 1000).toISOString()
    : name
}

function isLinkTarget(target: string) {
  return /^(?:https?:\/\/|mailto:|tel:)/i.test(target)
}

function linkLabel(target: string, label: string | undefined) {
  const address = target.replace(/^(?:mailto:|tel:)/i, "")

  if (label === undefined || label === address || label === target) {
    return address
  }

  return `${label} (${address})`
}

function unescapeSlackEntities(text: string) {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
}

function emptyToUndefined(value: string) {
  return value === "" ? undefined : value
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
