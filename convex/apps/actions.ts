"use node"

import { randomBytes } from "node:crypto"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { action, internalAction } from "../_generated/server"
import { ensureCurrentPersonFromAction } from "../persons/account"
import {
  type PublishAppArgs,
  type PublishResult,
  publishApp,
  readAppSource,
  type SourceReadResult,
} from "./publish"
import { appAccess } from "./schema"
import { appSessionDurationMs, createSessionToken } from "./serve/session"
import { capabilityInputValidator } from "./storage/validators"
import { instantiateAppTemplate } from "./templates/provision"

const appSourceFileValidator = v.object({
  path: v.string(),
  content: v.string(),
  executable: v.optional(v.boolean()),
})
const appBuildAssetValidator = v.object({
  path: v.string(),
  mimeType: v.string(),
  contentBase64: v.string(),
})
const appBuildValidator = v.object({
  sourceHash: v.string(),
  assets: v.array(appBuildAssetValidator),
})
const publishArgs = {
  organizationId: v.string(),
  title: v.string(),
  access: appAccess,
  contract: v.optional(v.any()),
  source: v.array(appSourceFileValidator),
  build: appBuildValidator,
  message: v.optional(v.string()),
  capabilities: v.optional(v.array(capabilityInputValidator)),
}

type SessionResult = {
  sessionId: Id<"appSessions">
  organizationId: string
  personId: Id<"persons">
  appId: Id<"apps">
  versionId: Id<"appVersions">
  secret: string
  expiresAt: number
  token: string
}

export const createSession = action({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
  },
  handler: async (ctx, args): Promise<SessionResult> => {
    const personId = await ensureCurrentPersonFromAction(
      ctx,
      args.organizationId
    )
    const now = Date.now()
    const expiresAt = now + appSessionDurationMs
    const record: Omit<SessionResult, "token"> = await ctx.runMutation(
      internal.apps.serve.sessions.createSessionRecord,
      {
        organizationId: args.organizationId,
        appId: args.appId,
        personId,
        secret: randomTokenSecret(),
        now,
        expiresAt,
        tokenExpiresAt: expiresAt,
      }
    )

    return { ...record, token: createSessionToken(record) }
  },
})

export const createFromAgent = internalAction({
  args: {
    ...publishArgs,
    personId: v.id("persons"),
  },
  handler: async (ctx, args): Promise<PublishResult> => {
    return await publishApp(ctx, {
      ...args,
      mode: "create",
      personId: args.personId,
    } satisfies PublishAppArgs)
  },
})

/** Publish a user-owned copy of an app template — the public
 *  counterpart of playbook provisioning, reachable via #create_app. */
export const instantiateFromAgent = internalAction({
  args: {
    organizationId: v.string(),
    personId: v.id("persons"),
    template: v.string(),
    title: v.optional(v.string()),
    access: v.optional(appAccess),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PublishResult> => {
    return await instantiateAppTemplate(ctx, {
      organizationId: args.organizationId,
      personId: args.personId,
      key: args.template,
      title: args.title,
      access: args.access,
      message: args.message,
    })
  },
})

export const updateFromAgent = internalAction({
  args: {
    ...publishArgs,
    appId: v.id("apps"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args): Promise<PublishResult> => {
    return await publishApp(ctx, {
      ...args,
      mode: "update",
      personId: args.personId,
    } satisfies PublishAppArgs)
  },
})

export const readForAgent = internalAction({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
    versionId: v.optional(v.id("appVersions")),
  },
  handler: async (ctx, args): Promise<SourceReadResult> => {
    return await readAppSource(ctx, args)
  },
})

function randomTokenSecret() {
  return randomBytes(32).toString("base64url")
}
