import { optionalString } from "../../shared/input"
import {
  compactDescription,
  maxOptions,
  normalizeQuery,
  type OptionLoaderArgs,
  optionMatches,
  readArray,
  readRecord,
  requiredOptionString,
} from "../options/common"
import { googleJson } from "./api"
import { listGoogleCalendars } from "./calendars"
import { requireGoogleCredentials } from "./credentials"

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
      description: optionalString(label.type),
    }))
    .filter((option) => optionMatches(option, normalizedQuery))
    .slice(0, maxOptions)
}

export async function searchGoogleCalendars(args: OptionLoaderArgs) {
  const result = await listGoogleCalendars(googleAccessToken(args), {
    maxResults: 50,
  })
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

function googleAccessToken(args: OptionLoaderArgs) {
  return requireGoogleCredentials(args.integration).tokens.access
}

function googleCalendarDescription(calendar: Record<string, unknown>) {
  return compactDescription([
    calendar.primary === true ? "Primary" : undefined,
    optionalString(calendar.accessRole),
  ])
}
