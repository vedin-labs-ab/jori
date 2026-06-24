import { type SlackBlock } from "../../broker/tools/slack"

export {
  formatSlackTime,
  toSlackTimestamp,
  truncateSlackText,
} from "../../providers/slack/format"

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

function markdownText(text: string) {
  return {
    type: "mrkdwn",
    text,
    verbatim: false,
  }
}
