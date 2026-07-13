import {
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
      options: Awaited<ReturnType<typeof loadIntegrationOptions>>
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
      options: await loadIntegrationOptions(args),
    }
  } catch (error) {
    return {
      status: "unavailable",
      message:
        error instanceof OptionUnavailable
          ? error.message
          : optionUnavailableMessage(args.source),
    }
  }
}

async function loadIntegrationOptions(args: {
  integration: Doc<"integrations">
  source: IntegrationOptionSource
  query: string
  match: IntegrationOptionMatch | undefined
}) {
  const loaderArgs = {
    integration: args.integration,
    query: args.query,
    match: args.match,
  }

  if (args.source === "slack.channels") {
    return await searchSlackChannels(loaderArgs)
  }
  if (args.source === "slack.users") {
    return await searchSlackUsers(loaderArgs)
  }
  if (args.source === "github.repositories") {
    return await searchGitHubRepositories(loaderArgs)
  }
  if (args.source === "github.issues") {
    return await searchGitHubIssues(loaderArgs)
  }
  if (args.source === "github.pullRequests") {
    return await searchGitHubPullRequests(loaderArgs)
  }
  if (args.source === "linear.teams") {
    return await searchLinearTeams(loaderArgs)
  }
  if (args.source === "linear.projects") {
    return await searchLinearProjects(loaderArgs)
  }
  if (args.source === "linear.issues") {
    return await searchLinearIssues(loaderArgs)
  }
  if (args.source === "gmail.labels") {
    return await searchGmailLabels(loaderArgs)
  }
  if (args.source === "microsoftEmail.folders") {
    return await searchMicrosoftMailFolders(loaderArgs)
  }
  if (args.source === "googleCalendar.calendars") {
    return await searchGoogleCalendars(loaderArgs)
  }
  if (args.source === "microsoftCalendar.calendars") {
    return await searchMicrosoftCalendars(loaderArgs)
  }
  if (args.source === "notion.pages") {
    return await searchNotionObjects(loaderArgs)
  }

  return []
}

function optionUnavailableMessage(source: IntegrationOptionSource) {
  const messages: Record<IntegrationOptionSource, string> = {
    "slack.channels":
      "Could not load Slack channels. Check the Slack connection and try again.",
    "slack.users":
      "Could not load Slack people. Check the Slack connection and try again.",
    "github.repositories":
      "Could not load GitHub repositories. Check the GitHub connection and try again.",
    "github.issues":
      "Could not load GitHub issues. Check the GitHub connection and try again.",
    "github.pullRequests":
      "Could not load GitHub pull requests. Check the GitHub connection and try again.",
    "linear.teams":
      "Could not load Linear teams. Check the Linear connection and try again.",
    "linear.projects":
      "Could not load Linear projects. Check the Linear connection and try again.",
    "linear.issues":
      "Could not load Linear issues. Check the Linear connection and try again.",
    "gmail.labels":
      "Could not load Gmail labels. Check the Gmail connection and try again.",
    "microsoftEmail.folders":
      "Could not load Outlook folders. Check the Outlook connection and try again.",
    "googleCalendar.calendars":
      "Could not load Google calendars. Check the Google Calendar connection and try again.",
    "microsoftCalendar.calendars":
      "Could not load Microsoft calendars. Check the Microsoft Calendar connection and try again.",
    "notion.pages":
      "Could not load Notion pages. Check the Notion connection and try again.",
  }

  return messages[source]
}
