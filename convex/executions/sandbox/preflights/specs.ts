import { notionApiVersion } from "../../../providers/notion/config"
import { type ToolPreflight } from "../../tools/types"
import { type TokenPreflightSpec } from "./script"

export type TokenPreflightType = Exclude<ToolPreflight["type"], "slack">

export const tokenPreflightSpecs: Record<
  TokenPreflightType,
  TokenPreflightSpec
> = {
  github: {
    tokenEnv: "MILO_GITHUB_TOKEN",
    missingTokenError: "Missing GitHub token",
    url: "https://api.github.com/installation/repositories?per_page=1",
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
    failureLabel: "GitHub token",
    successMessage: "GitHub token preflight passed",
  },
  linear: {
    tokenEnv: "MILO_LINEAR_ACCESS_TOKEN",
    missingTokenError: "Missing Linear access token",
    url: "https://api.linear.app/graphql",
    headers: { "content-type": "application/json" },
    body: { query: "query MiloLinearPreflight { viewer { id } }" },
    failureCondition: "body.errors",
    failureLabel: "Linear token",
    successMessage: "Linear token preflight passed",
  },
  notion: {
    tokenEnv: "MILO_NOTION_ACCESS_TOKEN",
    missingTokenError: "Missing Notion access token",
    url: "https://api.notion.com/v1/users/me",
    headers: { "notion-version": notionApiVersion },
    failureLabel: "Notion token",
    successMessage: "Notion token preflight passed",
  },
  gmail: {
    tokenEnv: "MILO_GOOGLE_ACCESS_TOKEN",
    missingTokenError: "Missing Google Workspace access token",
    url: "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    failureLabel: "Gmail profile",
    successMessage: "Gmail token preflight passed",
  },
  googleCalendar: {
    tokenEnv: "MILO_GOOGLE_ACCESS_TOKEN",
    missingTokenError: "Missing Google Calendar access token",
    url: googleCalendarEventsUrl,
    failureLabel: "Google Calendar events",
    successMessage: "Google Calendar token preflight passed",
  },
  googleDrive: {
    tokenEnv: "MILO_GOOGLE_ACCESS_TOKEN",
    missingTokenError: "Missing Google Drive access token",
    url: googleDriveFilesUrl(),
    failureLabel: "Google Drive files",
    successMessage: "Google Drive token preflight passed",
  },
  microsoftEmail: {
    tokenEnv: "MILO_MICROSOFT_ACCESS_TOKEN",
    missingTokenError: "Missing Microsoft access token",
    url: "https://graph.microsoft.com/v1.0/me/messages?$top=1",
    failureLabel: "Microsoft Email messages",
    successMessage: "Microsoft Email token preflight passed",
  },
  microsoftCalendar: {
    tokenEnv: "MILO_MICROSOFT_ACCESS_TOKEN",
    missingTokenError: "Missing Microsoft access token",
    url: "https://graph.microsoft.com/v1.0/me/events?$top=1",
    failureLabel: "Microsoft Calendar events",
    successMessage: "Microsoft Calendar token preflight passed",
  },
}

function googleCalendarEventsUrl() {
  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  )
  url.searchParams.set("maxResults", "1")
  url.searchParams.set("timeMin", new Date().toISOString())
  return url.toString()
}

function googleDriveFilesUrl() {
  const url = new URL("https://www.googleapis.com/drive/v3/files")
  url.searchParams.set("pageSize", "1")
  url.searchParams.set("fields", "files(id)")
  return url.toString()
}
