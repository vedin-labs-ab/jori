import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"

export async function getSlackActorEmail(
  ctx: ActionCtx,
  args: {
    accountId: string
    actorId: string | undefined
  }
) {
  if (args.actorId === undefined) {
    return undefined
  }

  const userToken = await ctx.runQuery(
    internal.providers.slack.install.getUserToken,
    {
      accountId: args.accountId,
    }
  )

  if (userToken === null) {
    return undefined
  }

  const slackUrl = new URL("https://slack.com/api/users.info")
  slackUrl.searchParams.set("user", args.actorId)

  const response = await fetch(slackUrl, {
    headers: { authorization: `Bearer ${userToken}` },
  })
  const body = (await response.json().catch(() => null)) as SlackUserInfo | null

  if (!response.ok || body?.ok !== true) {
    return undefined
  }

  const email = body.user?.profile?.email?.trim()

  return email === "" ? undefined : email
}

type SlackUserInfo =
  | {
      ok: true
      user?: {
        profile?: {
          email?: string
        }
      }
    }
  | {
      ok: false
      error?: string
    }
