import { requireMicrosoftCredentials } from "../../providers/microsoft/credentials"
import { fetchJsonObject } from "../../shared/http"
import {
  maxOptions,
  normalizeQuery,
  type OptionLoaderArgs,
  optionalOptionNumber,
  optionMatches,
  readArray,
  readNestedString,
  readRecord,
  requiredOptionString,
} from "./common"

export async function searchMicrosoftMailFolders(args: OptionLoaderArgs) {
  const result = await microsoftGraph(args, "/me/mailFolders", {
    $top: maxOptions,
  })
  const normalizedQuery = normalizeQuery(args.query)

  return readArray(result.value)
    .map(readRecord)
    .map((folder) => ({
      value: requiredOptionString(folder.id),
      label: requiredOptionString(folder.displayName),
      description: microsoftFolderDescription(folder),
    }))
    .filter((option) => optionMatches(option, normalizedQuery))
}

export async function searchMicrosoftCalendars(args: OptionLoaderArgs) {
  const result = await microsoftGraph(args, "/me/calendars", {
    $top: maxOptions,
  })
  const normalizedQuery = normalizeQuery(args.query)

  return readArray(result.value)
    .map(readRecord)
    .map((calendar) => ({
      value: requiredOptionString(calendar.id),
      label: requiredOptionString(calendar.name),
      description: readNestedString(calendar, "owner", "name"),
    }))
    .filter((option) => optionMatches(option, normalizedQuery))
}

async function microsoftGraph(
  args: OptionLoaderArgs,
  path: string,
  query: Record<string, unknown> = {}
) {
  const credentials = requireMicrosoftCredentials(args.integration)
  const url = new URL(`https://graph.microsoft.com/v1.0${path}`)

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return await fetchJsonObject(url.toString(), {
    method: "GET",
    headers: {
      authorization: `Bearer ${credentials.tokens.access}`,
      "content-type": "application/json",
    },
  })
}

function microsoftFolderDescription(folder: Record<string, unknown>) {
  const total = optionalOptionNumber(folder.totalItemCount)
  const unread = optionalOptionNumber(folder.unreadItemCount)

  if (total === undefined && unread === undefined) {
    return undefined
  }

  return `${unread ?? 0} unread - ${total ?? 0} total`
}
