import { type SlackBlock } from "../../broker/tools/slack"

export function createApprovalCard(args: {
  icon: string
  title: string
  subtitle?: string
  body: string
  subtext?: string
  actions?: Record<string, unknown>[]
}): SlackBlock {
  return {
    type: "card",
    slack_icon: {
      type: "icon",
      name: args.icon,
    },
    title: markdownText(args.title),
    ...(args.subtitle === undefined
      ? {}
      : { subtitle: markdownText(args.subtitle) }),
    body: markdownText(args.body),
    ...(args.subtext === undefined
      ? {}
      : { subtext: markdownText(args.subtext) }),
    ...(args.actions === undefined ? {} : { actions: args.actions }),
  }
}

export function formatSlackTime(timestamp: number) {
  const fallback = new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  return `<!date^${timestamp}^{time}|${fallback}>`
}

export function toSlackTimestamp(timestampMs: number) {
  return Math.floor(timestampMs / 1000)
}

export function truncateSlackText(value: string, maximumLength: number) {
  return value.length <= maximumLength
    ? value
    : `${value.slice(0, maximumLength - 3)}...`
}

function markdownText(text: string) {
  return {
    type: "mrkdwn",
    text,
    verbatim: false,
  }
}
