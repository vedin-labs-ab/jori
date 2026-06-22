import { type Integration, integrationLabel } from "../../shared/integrations"

const setupLinkActionId = "milo_setup_link_open"

export function createSlackSetupLinkMessage(args: {
  integration: Integration
  url: string
}) {
  const label = integrationLabel(args.integration)
  const text = `Set up ${label}: ${args.url}`

  return {
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Connect *${label}* to Milo.`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            action_id: setupLinkActionId,
            text: {
              type: "plain_text",
              text: `Connect ${label}`,
              emoji: true,
            },
            url: args.url,
          },
        ],
      },
    ],
  }
}

export function isSlackSetupLinkInteraction(payload: unknown) {
  return readActionIds(payload).includes(setupLinkActionId)
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
