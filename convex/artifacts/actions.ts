"use node"

import { randomBytes } from "node:crypto"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { action, internalAction } from "../_generated/server"
import { ensureCurrentPersonFromAction } from "../persons/account"
import {
  type PublishArtifactArgs,
  type PublishResult,
  publishArtifact,
  readArtifactSource,
  type SourceReadResult,
} from "./publish"
import { artifactAccess } from "./schema"
import { artifactSessionDurationMs, createSessionToken } from "./serve/session"
import { capabilityInputValidator } from "./storage/validators"
import { instantiateArtifactTemplate } from "./templates/provision"

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
const publishArgs = {
  organizationId: v.string(),
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
  organizationId: string
  personId: Id<"persons">
  artifactId: Id<"artifacts">
  versionId: Id<"artifactVersions">
  secret: string
  expiresAt: number
  token: string
}

export const createSession = action({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args): Promise<SessionResult> => {
    const personId = await ensureCurrentPersonFromAction(
      ctx,
      args.organizationId
    )
    const now = Date.now()
    const expiresAt = now + artifactSessionDurationMs
    const record: Omit<SessionResult, "token"> = await ctx.runMutation(
      internal.artifacts.serve.sessions.createSessionRecord,
      {
        organizationId: args.organizationId,
        artifactId: args.artifactId,
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
    return await publishArtifact(ctx, {
      ...args,
      mode: "create",
      personId: args.personId,
    } satisfies PublishArtifactArgs)
  },
})

/** Publish a user-owned copy of an artifact template — the public
 *  counterpart of playbook provisioning, reachable via #create_artifact. */
export const instantiateFromAgent = internalAction({
  args: {
    organizationId: v.string(),
    personId: v.id("persons"),
    template: v.string(),
    title: v.optional(v.string()),
    access: v.optional(artifactAccess),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PublishResult> => {
    return await instantiateArtifactTemplate(ctx, {
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
    artifactId: v.id("artifacts"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args): Promise<PublishResult> => {
    return await publishArtifact(ctx, {
      ...args,
      mode: "update",
      personId: args.personId,
    } satisfies PublishArtifactArgs)
  },
})

export const readForAgent = internalAction({
  args: {
    organizationId: v.string(),
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
