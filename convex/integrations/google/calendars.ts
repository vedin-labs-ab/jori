import { googleJson } from "./api"

export async function listGoogleCalendars(
  token: string,
  args: {
    maxResults: number
    minAccessRole?: "freeBusyReader" | "reader" | "writer" | "owner"
    pageToken?: string
    showHidden?: boolean
  }
) {
  const url = new URL(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList"
  )
  url.searchParams.set("maxResults", String(args.maxResults))

  if (args.minAccessRole !== undefined) {
    url.searchParams.set("minAccessRole", args.minAccessRole)
  }
  if (args.pageToken !== undefined) {
    url.searchParams.set("pageToken", args.pageToken)
  }
  if (args.showHidden !== undefined) {
    url.searchParams.set("showHidden", String(args.showHidden))
  }

  return await googleJson(token, url.toString())
}
