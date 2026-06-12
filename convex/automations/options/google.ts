import { driveFilesUrl } from "../../broker/providers/google/drive/format"
import { googleJson } from "../../broker/providers/google/request"
import { requireGoogleCredentials } from "../../providers/google/credentials"
import {
  compactDescription,
  maxOptions,
  normalizeQuery,
  type OptionLoaderArgs,
  optionalOptionString,
  optionMatches,
  readArray,
  readRecord,
  requiredOptionString,
} from "./common"

const driveFolderMimeType = "application/vnd.google-apps.folder"

export async function searchGmailLabels(args: OptionLoaderArgs) {
  const result = await googleJson(
    googleAccessToken(args),
    "https://gmail.googleapis.com/gmail/v1/users/me/labels"
  )
  const normalizedQuery = normalizeQuery(args.query)

  return readArray(result.labels)
    .map(readRecord)
    .map((label) => ({
      value: requiredOptionString(label.id),
      label: requiredOptionString(label.name),
      description: optionalOptionString(label.type),
    }))
    .filter((option) => optionMatches(option, normalizedQuery))
    .slice(0, maxOptions)
}

export async function searchGoogleCalendars(args: OptionLoaderArgs) {
  const result = await googleJson(
    googleAccessToken(args),
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50"
  )
  const normalizedQuery = normalizeQuery(args.query)

  return readArray(result.items)
    .map(readRecord)
    .map((calendar) => ({
      value: requiredOptionString(calendar.id),
      label: requiredOptionString(calendar.summary),
      description: googleCalendarDescription(calendar),
    }))
    .filter((option) => optionMatches(option, normalizedQuery))
}

export async function searchGoogleDriveFiles(
  args: OptionLoaderArgs,
  kind: "file" | "folder"
) {
  const url = new URL(driveFilesUrl)
  url.searchParams.set("pageSize", String(maxOptions))
  url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,parents)")
  url.searchParams.set("q", driveSearchQuery(args.query, kind))
  const result = await googleJson(googleAccessToken(args), url.toString())

  return readArray(result.files).map((file) => {
    const record = readRecord(file)

    return {
      value: requiredOptionString(record.id),
      label: requiredOptionString(record.name),
      description: compactDescription([
        optionalOptionString(record.mimeType),
        optionalOptionString(record.modifiedTime),
      ]),
    }
  })
}

function googleAccessToken(args: OptionLoaderArgs) {
  return requireGoogleCredentials(args.integration).tokens.access
}

function googleCalendarDescription(calendar: Record<string, unknown>) {
  return compactDescription([
    calendar.primary === true ? "Primary" : undefined,
    optionalOptionString(calendar.accessRole),
  ])
}

function driveSearchQuery(query: string, kind: "file" | "folder") {
  const clauses = [
    "trashed=false",
    kind === "folder"
      ? `mimeType='${driveFolderMimeType}'`
      : `mimeType!='${driveFolderMimeType}'`,
  ]
  const normalized = query.trim()

  if (normalized !== "") {
    clauses.push(`name contains '${escapeDriveQuery(normalized)}'`)
  }

  return clauses.join(" and ")
}

function escapeDriveQuery(value: string) {
  return value.replace(/['\\]/g, "\\$&")
}
