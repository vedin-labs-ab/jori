import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { type ActionCtx } from "../../../_generated/server"
import { type SlackApiResult } from "../api"
import { requireSlackCredentials } from "../credentials"

export type SlackActorProfile = {
  email?: string
  name?: string
}

export type SlackDirectoryUser = {
  id: string
  name?: string
  real_name?: string
  deleted?: boolean
  is_bot?: boolean
  is_app_user?: boolean
  profile?: {
    display_name?: string
    display_name_normalized?: string
    email?: string
    real_name?: string
    real_name_normalized?: string
  }
}

export function readSlackDirectoryUsers(result: SlackApiResult) {
  const members = result?.members

  return Array.isArray(members) ? members.filter(isSlackDirectoryUser) : []
}

export function slackDirectoryUserProfile(user: SlackDirectoryUser) {
  return readSlackProfile(user)
}

function isSlackDirectoryUser(value: unknown): value is SlackDirectoryUser {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === "string"
  )
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

  const target = await ctx.runQuery(
    internal.providers.slack.install.getProfileLookupTarget,
    {
      accountId: args.accountId,
    }
  )

  if (target === null) {
    return undefined
  }

  return await resolveSlackUserProfile(ctx, {
    tenantId: target.tenantId,
    token: async () =>
      (await ctx.runQuery(internal.providers.slack.install.getUserToken, {
        accountId: args.accountId,
      })) ?? undefined,
    userId: args.actorId,
  })
}

export async function resolveSlackUserNames(
  ctx: ActionCtx,
  args: {
    integration: Doc<"integrations">
    userIds: string[]
  }
): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  const userIds = [...new Set(args.userIds)]

  if (userIds.length === 0) {
    return names
  }

  const token = slackUserToken(args.integration)

  await Promise.all(
    userIds.map(async (userId) => {
      const profile = await resolveSlackUserProfile(ctx, {
        tenantId: args.integration.tenantId,
        token: async () => token,
        userId,
      })

      if (profile?.name !== undefined) {
        names.set(userId, profile.name)
      }
    })
  )

  return names
}

async function resolveSlackUserProfile(
  ctx: ActionCtx,
  args: {
    tenantId: string
    token: () => Promise<string | undefined>
    userId: string
  }
): Promise<SlackActorProfile | undefined> {
  const cached = await ctx.runQuery(
    internal.identity.identities.resolveProviderActorProfileRecord,
    {
      tenantId: args.tenantId,
      provider: "slack",
      externalId: args.userId,
    }
  )

  if (cached !== null && cached.name !== undefined) {
    return cached
  }

  const token = await args.token()

  if (token === undefined) {
    return cached ?? undefined
  }

  const profile = await fetchSlackUserProfile(token, args.userId)

  if (profile === undefined) {
    return cached ?? undefined
  }

  try {
    await cacheSlackActorProfile(ctx, {
      actorId: args.userId,
      profile,
      tenantId: args.tenantId,
    })
  } catch {
    // Profile caching must not make the calling interaction fail.
  }

  return profile
}

function slackUserToken(integration: Doc<"integrations">) {
  try {
    return requireSlackCredentials(integration).user
  } catch {
    return undefined
  }
}

async function fetchSlackUserProfile(
  token: string,
  userId: string
): Promise<SlackActorProfile | undefined> {
  const slackUrl = new URL("https://slack.com/api/users.info")
  slackUrl.searchParams.set("user", userId)

  const response = await fetch(slackUrl, {
    headers: { authorization: `Bearer ${token}` },
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
      user?: SlackDirectoryUser
    }
  | {
      ok: false
      error?: string
    }

function readSlackProfile(
  user: SlackDirectoryUser | undefined
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

async function cacheSlackActorProfile(
  ctx: ActionCtx,
  args: {
    actorId: string
    profile: SlackActorProfile
    tenantId: string
  }
) {
  await ctx.runMutation(internal.persons.resolve.resolveActorRecord, {
    tenantId: args.tenantId,
    provider: "slack",
    actor: {
      kind: "person",
      externalId: args.actorId,
      email: args.profile.email,
      name: args.profile.name,
    },
  })
}
