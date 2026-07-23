import { type FunctionReference } from "convex/server"
import { api } from "../../../convex/_generated/api"
import { type IntegrationCardConfig } from "./card"
import { type IntegrationCardStatus } from "./card/headline"

export type ProviderStatus = {
  email?: string
  externalId: string
  name?: string
  status: Exclude<IntegrationCardStatus, undefined>
  url?: string
} | null

export type ProviderDefinition = {
  config: IntegrationCardConfig
  emptyHeadline?: string
  install: FunctionReference<
    "mutation",
    "public",
    {
      organizationId: string
      returnUrl: string
    },
    string
  >
  status: FunctionReference<
    "query",
    "public",
    { organizationId: string },
    ProviderStatus
  >
  type: "account" | "workspace"
  useUrlHeadline?: boolean
}

export const organizationProviders = [
  {
    config: {
      action: "Connect Slack",
      connectedDetail:
        "Milo responds to mentions, searches conversation context, and replies in threads.",
      connectError: "Couldn't start the Slack integration.",
      emptyDetail:
        "Install the Slack app so Milo can respond to mentions where your team talks.",
      installPath: "/slack/install",
      integration: "slack",
      label: "Slack",
      loading: "Connecting Slack",
      logo: {
        alt: "Slack logo",
        src: "https://svgl.app/library/slack.svg",
      },
    },
    emptyHeadline: "No workspace connected",
    install: api.integrations.slack.install.createInstallState,
    status: api.integrations.status.getSlackStatus,
    type: "workspace",
  },
  {
    config: {
      action: "Connect Linear",
      connectedDetail:
        "Milo responds to mentions, reads issue context, and comments on issues.",
      connectError: "Couldn't start the Linear integration.",
      emptyDetail:
        "Connect Linear so Milo can respond to mentions and comment on issues.",
      installPath: "/linear/install",
      integration: "linear",
      label: "Linear",
      loading: "Connecting Linear",
      logo: {
        alt: "Linear logo",
        src: "https://svgl.app/library/linear.svg",
      },
    },
    emptyHeadline: "No workspace connected",
    install: api.integrations.linear.install.createInstallState,
    status: api.integrations.status.getLinearStatus,
    type: "workspace",
    useUrlHeadline: true,
  },
  {
    config: {
      action: "Connect GitHub",
      connectedDetail:
        "Milo responds to mentions, reads the connected repositories, and replies in issue and pull request threads.",
      connectError: "Couldn't start the GitHub integration.",
      emptyDetail:
        "Install the GitHub App so Milo can respond to mentions in issues and pull requests.",
      installPath: "/github/install",
      integration: "github",
      label: "GitHub",
      loading: "Connecting GitHub",
      logo: {
        alt: "GitHub logo",
        src: "https://svgl.app/library/github_light.svg",
      },
    },
    emptyHeadline: "No installation connected",
    install: api.integrations.github.install.createInstallState,
    status: api.integrations.status.getGitHubStatus,
    type: "workspace",
  },
  {
    config: {
      action: "Connect Notion",
      connectedDetail:
        "Milo can search shared content, read and update pages, and add comments.",
      connectError: "Couldn't start the Notion integration.",
      emptyDetail:
        "Connect Notion so Milo can work with the pages and databases you share.",
      installPath: "/notion/install",
      integration: "notion",
      label: "Notion",
      loading: "Connecting Notion",
      logo: {
        alt: "Notion logo",
        src: "https://svgl.app/library/notion.svg",
      },
    },
    emptyHeadline: "No workspace connected",
    install: api.integrations.notion.install.createInstallState,
    status: api.integrations.status.getNotionStatus,
    type: "workspace",
  },
] satisfies ProviderDefinition[]

export const personalProviders = [
  {
    config: {
      action: "Connect Gmail",
      connectedDetail:
        "Connected for you only. Milo can read and reply to your email when you ask.",
      connectError: "Couldn't start the Gmail integration.",
      emptyDetail:
        "Connect your Gmail account. This connects only you, not the whole organization.",
      installPath: "/gmail/install",
      integration: "gmail",
      label: "Gmail",
      loading: "Connecting Gmail",
      logo: {
        alt: "Gmail logo",
        src: "https://svgl.app/library/gmail.svg",
      },
    },
    install: api.integrations.google.install.createGmailInstallState,
    status: api.integrations.status.getGmailStatus,
    type: "account",
  },
  {
    config: {
      action: "Connect Calendar",
      connectedDetail:
        "Connected for you only. Milo can read, create, and update your events when you ask.",
      connectError: "Couldn't start the Google Calendar integration.",
      emptyDetail:
        "Connect your Google Calendar. This connects only you, not the whole organization.",
      installPath: "/google-calendar/install",
      integration: "googleCalendar",
      label: "Google Calendar",
      loading: "Connecting Calendar",
      logo: {
        alt: "Google Calendar logo",
        src: "https://svgl.app/library/google-calendar.svg",
      },
    },
    install: api.integrations.google.install.createGoogleCalendarInstallState,
    status: api.integrations.status.getGoogleCalendarStatus,
    type: "account",
  },
  {
    config: {
      action: "Connect Outlook",
      connectedDetail:
        "Connected for you only. Milo can read, draft, and send your mail when you ask.",
      connectError: "Couldn't start the Outlook integration.",
      emptyDetail:
        "Connect your Outlook account. This connects only you, not the whole organization.",
      installPath: "/microsoft-email/install",
      integration: "microsoftEmail",
      label: "Outlook Mail",
      loading: "Connecting Outlook",
      logo: {
        alt: "Microsoft Outlook logo",
        src: "https://svgl.app/library/microsoft-outlook.svg",
      },
    },
    install:
      api.integrations.microsoft.install.createMicrosoftEmailInstallState,
    status: api.integrations.status.getMicrosoftEmailStatus,
    type: "account",
  },
  {
    config: {
      action: "Connect Calendar",
      connectedDetail:
        "Connected for you only. Milo can read, create, and update your events when you ask.",
      connectError: "Couldn't start the Microsoft Calendar integration.",
      emptyDetail:
        "Connect your Microsoft Calendar. This connects only you, not the whole organization.",
      installPath: "/microsoft-calendar/install",
      integration: "microsoftCalendar",
      label: "Microsoft Calendar",
      loading: "Connecting Calendar",
      logo: {
        alt: "Microsoft logo",
        src: "https://svgl.app/library/microsoft.svg",
      },
    },
    install:
      api.integrations.microsoft.install.createMicrosoftCalendarInstallState,
    status: api.integrations.status.getMicrosoftCalendarStatus,
    type: "account",
  },
] satisfies ProviderDefinition[]
