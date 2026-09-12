import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"
import { type IntegrationCardConfig } from "./card"

export type ProviderStatus = FunctionReturnType<
  typeof api.integrations.status.get
>

export type ProviderDefinition = {
  config: IntegrationCardConfig
  emptyHeadline?: string
  type: "account" | "workspace"
  useUrlHeadline?: boolean
}

export const organizationProviders = [
  {
    config: {
      action: "Connect Slack",
      connectedDetail:
        "Jori responds to mentions, searches conversation context, and replies in threads.",
      connectError: "Couldn't start the Slack integration.",
      emptyDetail:
        "Install the Slack app so Jori can respond to mentions where your team talks.",
      installPath: "/slack/install",
      integration: "slack",
      label: "Slack",
      loading: "Connecting Slack",
    },
    emptyHeadline: "No workspace connected",
    type: "workspace",
  },
  {
    config: {
      action: "Connect Linear",
      connectedDetail:
        "Jori responds to mentions, reads issue context, and comments on issues.",
      connectError: "Couldn't start the Linear integration.",
      emptyDetail:
        "Connect Linear so Jori can respond to mentions and comment on issues.",
      installPath: "/linear/install",
      integration: "linear",
      label: "Linear",
      loading: "Connecting Linear",
    },
    emptyHeadline: "No workspace connected",
    type: "workspace",
    useUrlHeadline: true,
  },
  {
    config: {
      action: "Connect GitHub",
      connectedDetail:
        "Jori responds to mentions, reads the connected repositories, and replies in issue and pull request threads.",
      connectError: "Couldn't start the GitHub integration.",
      emptyDetail:
        "Install the GitHub App so Jori can respond to mentions in issues and pull requests.",
      installPath: "/github/install",
      integration: "github",
      label: "GitHub",
      loading: "Connecting GitHub",
    },
    emptyHeadline: "No installation connected",
    type: "workspace",
  },
  {
    config: {
      action: "Connect Notion",
      connectedDetail:
        "Jori can search shared content, read and update pages, and add comments.",
      connectError: "Couldn't start the Notion integration.",
      emptyDetail:
        "Connect Notion so Jori can work with the pages and databases you share.",
      installPath: "/notion/install",
      integration: "notion",
      label: "Notion",
      loading: "Connecting Notion",
    },
    emptyHeadline: "No workspace connected",
    type: "workspace",
  },
] satisfies ProviderDefinition[]

export const personalProviders = [
  {
    config: {
      action: "Connect Gmail",
      connectedDetail:
        "Connected for you only. Jori can read and reply to your email when you ask.",
      connectError: "Couldn't start the Gmail integration.",
      emptyDetail:
        "Connect your Gmail account. This connects only you, not the whole organization.",
      installPath: "/gmail/install",
      integration: "gmail",
      label: "Gmail",
      loading: "Connecting Gmail",
    },
    type: "account",
  },
  {
    config: {
      action: "Connect Calendar",
      connectedDetail:
        "Connected for you only. Jori can read, create, and update your events when you ask.",
      connectError: "Couldn't start the Google Calendar integration.",
      emptyDetail:
        "Connect your Google Calendar. This connects only you, not the whole organization.",
      installPath: "/google-calendar/install",
      integration: "googleCalendar",
      label: "Google Calendar",
      loading: "Connecting Calendar",
    },
    type: "account",
  },
  {
    config: {
      action: "Connect Outlook",
      connectedDetail:
        "Connected for you only. Jori can read, draft, and send your mail when you ask.",
      connectError: "Couldn't start the Outlook integration.",
      emptyDetail:
        "Connect your Outlook account. This connects only you, not the whole organization.",
      installPath: "/microsoft-email/install",
      integration: "microsoftEmail",
      label: "Outlook Mail",
      loading: "Connecting Outlook",
    },
    type: "account",
  },
  {
    config: {
      action: "Connect Calendar",
      connectedDetail:
        "Connected for you only. Jori can read, create, and update your events when you ask.",
      connectError: "Couldn't start the Microsoft Calendar integration.",
      emptyDetail:
        "Connect your Microsoft Calendar. This connects only you, not the whole organization.",
      installPath: "/microsoft-calendar/install",
      integration: "microsoftCalendar",
      label: "Microsoft Calendar",
      loading: "Connecting Calendar",
    },
    type: "account",
  },
] satisfies ProviderDefinition[]
