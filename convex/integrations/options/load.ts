import {
  type IntegrationOption,
  type IntegrationOptionMatch,
  type IntegrationOptionSource,
} from "../../../contracts/integrations/options"
import { type Doc } from "../../_generated/dataModel"
import {
  searchGitHubIssues,
  searchGitHubPullRequests,
  searchGitHubRepositories,
} from "../github/options"
import { searchGmailLabels, searchGoogleCalendars } from "../google/options"
import {
  searchLinearIssues,
  searchLinearProjects,
  searchLinearTeams,
} from "../linear/options"
import {
  searchMicrosoftCalendars,
  searchMicrosoftMailFolders,
} from "../microsoft/options"
import { searchNotionObjects } from "../notion/options"
import { searchSlackChannels, searchSlackUsers } from "../slack/options"
import { OptionUnavailable } from "./common"

export type IntegrationOptionSearchResult =
  | {
      status: "ready"
      options: IntegrationOption[]
    }
  | {
      status: "unavailable"
      message: string
    }

export async function searchIntegrationOptions(args: {
  integration: Doc<"integrations">
  source: IntegrationOptionSource
  query: string
  match: IntegrationOptionMatch | undefined
}): Promise<IntegrationOptionSearchResult> {
  try {
    return {
      status: "ready",
      options: await optionSources[args.source].load(args),
    }
  } catch (error) {
    return {
      status: "unavailable",
      message:
        error instanceof OptionUnavailable
          ? error.message
          : optionSources[args.source].unavailable,
    }
  }
}

type OptionLoader = (args: {
  integration: Doc<"integrations">
  query: string
  match: IntegrationOptionMatch | undefined
}) => Promise<IntegrationOption[]>

/** Each source's loader, and what to say when it cannot answer. */
const optionSources: Record<
  IntegrationOptionSource,
  { load: OptionLoader; unavailable: string }
> = {
  "slack.channels": {
    load: searchSlackChannels,
    unavailable:
      "Could not load Slack channels. Check the Slack connection and try again.",
  },
  "slack.users": {
    load: searchSlackUsers,
    unavailable:
      "Could not load Slack people. Check the Slack connection and try again.",
  },
  "github.repositories": {
    load: searchGitHubRepositories,
    unavailable:
      "Could not load GitHub repositories. Check the GitHub connection and try again.",
  },
  "github.issues": {
    load: searchGitHubIssues,
    unavailable:
      "Could not load GitHub issues. Check the GitHub connection and try again.",
  },
  "github.pullRequests": {
    load: searchGitHubPullRequests,
    unavailable:
      "Could not load GitHub pull requests. Check the GitHub connection and try again.",
  },
  "linear.teams": {
    load: searchLinearTeams,
    unavailable:
      "Could not load Linear teams. Check the Linear connection and try again.",
  },
  "linear.projects": {
    load: searchLinearProjects,
    unavailable:
      "Could not load Linear projects. Check the Linear connection and try again.",
  },
  "linear.issues": {
    load: searchLinearIssues,
    unavailable:
      "Could not load Linear issues. Check the Linear connection and try again.",
  },
  "gmail.labels": {
    load: searchGmailLabels,
    unavailable:
      "Could not load Gmail labels. Check the Gmail connection and try again.",
  },
  "microsoftEmail.folders": {
    load: searchMicrosoftMailFolders,
    unavailable:
      "Could not load Outlook folders. Check the Outlook connection and try again.",
  },
  "googleCalendar.calendars": {
    load: searchGoogleCalendars,
    unavailable:
      "Could not load Google calendars. Check the Google Calendar connection and try again.",
  },
  "microsoftCalendar.calendars": {
    load: searchMicrosoftCalendars,
    unavailable:
      "Could not load Microsoft calendars. Check the Microsoft Calendar connection and try again.",
  },
  "notion.pages": {
    load: searchNotionObjects,
    unavailable:
      "Could not load Notion pages. Check the Notion connection and try again.",
  },
}
