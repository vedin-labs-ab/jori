import { type SlackBlock } from "../../broker/tools/slack"
import { createSlackCard } from "../../providers/slack/card"

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
  return createSlackCard({
    icon: {
      type: "icon",
      name: args.icon,
    },
    title: args.title,
    subtitle: args.subtitle,
    body: args.body,
    subtext: args.subtext,
    actions: args.actions,
  })
}
