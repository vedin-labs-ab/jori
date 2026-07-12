import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryLikeCtx } from "../../shared/context"
import { preferredPersonName } from "../names"

export type RequesterContext = {
  name?: string
  emails: string[]
  timezone?: string
  accounts: Array<{
    integration: Doc<"integrations">["integration"]
    name?: string
    email?: string
  }>
}

export async function readRequesterContext(
  ctx: QueryLikeCtx,
  args: {
    personId: Id<"persons"> | undefined
    integrations: Doc<"integrations">[]
  }
): Promise<RequesterContext | null> {
  if (args.personId === undefined) {
    return null
  }

  const personId = args.personId

  const [person, identities] = await Promise.all([
    ctx.db.get(personId),
    ctx.db
      .query("identities")
      .withIndex("by_person", (query) => query.eq("personId", personId))
      .take(100),
  ])

  if (person === null) {
    return null
  }

  const accounts = args.integrations.map((integration) => ({
    integration: integration.integration,
    ...(integration.name === undefined ? {} : { name: integration.name }),
    ...(integration.email === undefined ? {} : { email: integration.email }),
  }))
  const emails = uniqueEmails([
    ...identities.map((identity) => identity.email),
    ...accounts.map((account) => account.email),
  ])
  const name = preferredPersonName(identities)

  return {
    emails,
    accounts,
    ...(name === undefined ? {} : { name }),
    ...(person.timezone === undefined ? {} : { timezone: person.timezone }),
  }
}

function uniqueEmails(values: Array<string | undefined>) {
  const emails = new Map<string, string>()

  for (const value of values) {
    const email = value?.trim()

    if (email !== undefined && email !== "") {
      emails.set(email.toLowerCase(), email)
    }
  }

  return [...emails.values()]
}
