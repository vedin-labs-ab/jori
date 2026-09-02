type SlackCardIcon =
  | {
      name: string
      type: "icon"
    }
  | {
      alt_text: string
      image_url: string
      type: "image"
    }

type SlackCardText = {
  text: string
  type: "mrkdwn"
  verbatim: false
}

/** How much of a card body Slack shows before it needs truncating. */
export const slackCardBodyLimit = 200

export function createSlackCard(args: {
  actions?: Record<string, unknown>[]
  body: string
  icon?: SlackCardIcon
  subtext?: string
  subtitle?: string
  title: string
}) {
  return {
    type: "card",
    ...cardIcon(args.icon),
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

function markdownText(text: string): SlackCardText {
  return {
    type: "mrkdwn",
    text,
    verbatim: false,
  }
}

function cardIcon(icon: SlackCardIcon | undefined) {
  if (icon === undefined) {
    return {}
  }

  if (icon.type === "icon") {
    return { slack_icon: icon }
  }

  return { icon }
}
