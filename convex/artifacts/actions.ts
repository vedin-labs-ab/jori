"use node"

import { randomBytes } from "node:crypto"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { action, internalAction } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"
import {
  type PublishArtifactArgs,
  type PublishResult,
  publishArtifact,
  readArtifactSource,
  type SourceReadResult,
} from "./publish"
import { artifactAccess } from "./schema"
import { createSessionTokenPayload } from "./serve/session"

const artifactSourceFileValidator = v.object({
  path: v.string(),
  content: v.string(),
  executable: v.optional(v.boolean()),
})
const artifactBuildAssetValidator = v.object({
  path: v.string(),
  mimeType: v.string(),
  contentBase64: v.string(),
})
const artifactBuildValidator = v.object({
  sourceHash: v.string(),
  assets: v.array(artifactBuildAssetValidator),
})
const capabilityInputValidator = v.object({
  tool: v.string(),
  integrationId: v.optional(v.id("integrations")),
  versionPinned: v.optional(v.boolean()),
})
const publishArgs = {
  tenantId: v.string(),
  title: v.string(),
  access: artifactAccess,
  contract: v.optional(v.any()),
  source: v.array(artifactSourceFileValidator),
  build: artifactBuildValidator,
  message: v.optional(v.string()),
  capabilities: v.optional(v.array(capabilityInputValidator)),
}

type SessionResult = {
  sessionId: Id<"artifactSessions">
  tenantId: string
  userId: string
  artifactId: Id<"artifacts">
  versionId: Id<"artifactVersions">
  secret: string
  expiresAt: number
  token: string
}

export const create = action({
  args: publishArgs,
  handler: async (ctx, args): Promise<PublishResult> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)

    return await publishArtifact(ctx, {
      ...args,
      mode: "create",
      userId: requireClerkUserId(identity),
    } satisfies PublishArtifactArgs)
  },
})

export const update = action({
  args: {
    ...publishArgs,
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args): Promise<PublishResult> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)

    return await publishArtifact(ctx, {
      ...args,
      mode: "update",
      userId: requireClerkUserId(identity),
    } satisfies PublishArtifactArgs)
  },
})

export const read = action({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    versionId: v.optional(v.id("artifactVersions")),
  },
  handler: async (ctx, args): Promise<SourceReadResult> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const artifact = await ctx.runQuery(
      internal.artifacts.queries.readForAgent,
      {
        tenantId: args.tenantId,
        userId: requireClerkUserId(identity),
        artifactId: args.artifactId,
      }
    )

    return artifact === null ? null : await readArtifactSource(ctx, args)
  },
})

export const createSession = action({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args): Promise<SessionResult> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const now = Date.now()
    const expiresAt = now + 60 * 60 * 1000
    const record: Omit<SessionResult, "token"> = await ctx.runMutation(
      internal.artifacts.serve.sessions.createSessionRecord,
      {
        tenantId: args.tenantId,
        artifactId: args.artifactId,
        userId: requireClerkUserId(identity),
        secret: randomTokenSecret(),
        now,
        expiresAt,
        tokenExpiresAt: expiresAt,
      }
    )

    return {
      ...record,
      token: createSessionTokenPayload({
        sessionId: record.sessionId,
        tenantId: record.tenantId,
        userId: record.userId,
        artifactId: record.artifactId,
        versionId: record.versionId,
        secret: record.secret,
        expiresAt: record.expiresAt,
      }),
    }
  },
})

export const createFromAgent = internalAction({
  args: {
    ...publishArgs,
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<PublishResult> => {
    return await publishArtifact(ctx, {
      ...args,
      mode: "create",
      userId: args.userId,
    } satisfies PublishArtifactArgs)
  },
})

export const updateFromAgent = internalAction({
  args: {
    ...publishArgs,
    artifactId: v.id("artifacts"),
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<PublishResult> => {
    return await publishArtifact(ctx, {
      ...args,
      mode: "update",
      userId: args.userId,
    } satisfies PublishArtifactArgs)
  },
})

export const readForAgent = internalAction({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    versionId: v.optional(v.id("artifactVersions")),
  },
  handler: async (ctx, args): Promise<SourceReadResult> => {
    return await readArtifactSource(ctx, args)
  },
})

function randomTokenSecret() {
  return randomBytes(32).toString("base64url")
}
