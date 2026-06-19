import { internal } from "../../../_generated/api"
import { type ActionCtx } from "../../../_generated/server"

export type SlackActorProfile = {
  email?: string
  name?: string
}

export async function getSlackActorProfile(
  ctx: ActionCtx,
  args: {
    accountId: string
    actorId: string | undefined
  }
): Promise<SlackActorProfile | undefined> {
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

  const profile = readSlackProfile(body.user)

  return profile.email === undefined && profile.name === undefined
    ? undefined
    : profile
}

type SlackUserInfo =
  | {
      ok: true
      user?: {
        name?: string
        real_name?: string
        profile?: {
          display_name?: string
          display_name_normalized?: string
          email?: string
          real_name?: string
          real_name_normalized?: string
        }
      }
    }
  | {
      ok: false
      error?: string
    }

function readSlackProfile(
  user: Extract<SlackUserInfo, { ok: true }>["user"]
): SlackActorProfile {
  return {
    email: normalizeSlackProfileString(user?.profile?.email),
    name:
      normalizeSlackProfileString(user?.profile?.display_name_normalized) ??
      normalizeSlackProfileString(user?.profile?.display_name) ??
      normalizeSlackProfileString(user?.profile?.real_name_normalized) ??
      normalizeSlackProfileString(user?.profile?.real_name) ??
      normalizeSlackProfileString(user?.real_name) ??
      normalizeSlackProfileString(user?.name),
  }
}

function normalizeSlackProfileString(value: string | undefined) {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? undefined : trimmed
}
