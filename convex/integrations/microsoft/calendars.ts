import { microsoftGraphJsonObject } from "./graph"

export async function listMicrosoftCalendars(token: string, top: number) {
  return await microsoftGraphJsonObject(token, "/me/calendars", { $top: top })
}
