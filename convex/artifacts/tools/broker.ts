import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { callMiloTool } from "../../broker/milo"
import { callProviderTool } from "../../broker/tools"
import { prepareIntegrationForRuntime } from "../../integrations/runtime"
import {
  type ArtifactToolCacheOptions,
  canStoreArtifactToolCacheValue,
  createArtifactToolCacheKey,
  normalizeArtifactToolCacheOptions,
} from "./cache"
import {
  type ArtifactPlatformContext,
  callArtifactPlatformTool,
  createArtifactPlatformToolCacheArgs,
  isArtifactPlatformTool,
} from "./platform"

export type ArtifactToolRequest = {
  tool: string
  args?: unknown
  integrationId?: Id<"integrations">
  cacheTtlMs?: unknown
  forceRefresh?: unknown
}

type AuthorizedExternalTool = {
  integration: Doc<"integrations">
  permission: {
    access: "read" | "write"
    surface: string
  }
}

export async function callArtifactTool(
  ctx: ActionCtx,
  context: ArtifactPlatformContext,
  request: ArtifactToolRequest
) {
  const args = normalizeToolArgs(request.args)
  const cache = normalizeArtifactToolCacheOptions({
    ttlMs: request.cacheTtlMs,
    forceRefresh: request.forceRefresh,
  })

  if (isArtifactPlatformTool(request.tool)) {
    return await callPlatformTool(ctx, context, request.tool, args, cache)
  }

  const authorization = await authorizeArtifactTool(ctx, context, request)

  if (authorization.permission.surface === "milo") {
    return await callAuthorizedMiloTool(ctx, context, request.tool, args)
  }

  if (authorization.integration === null) {
    throw new Error(
      `No active ${authorization.permission.surface} integration is available`
    )
  }

  return await callAuthorizedExternalTool(
    ctx,
    context,
    {
      integration: authorization.integration,
      permission: authorization.permission,
    },
    {
      args,
      cache,
      tool: request.tool,
    }
  )
}

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args as Record<string, unknown>
}

async function callPlatformTool(
  ctx: ActionCtx,
  context: ArtifactPlatformContext,
  tool: string,
  args: Record<string, unknown>,
  cache: ArtifactToolCacheOptions
) {
  if (tool !== "promptModel") {
    return await callArtifactPlatformTool(ctx, context, { tool, args })
  }

  return await callCachedArtifactTool(ctx, context, {
    args: createArtifactPlatformToolCacheArgs(tool, args),
    cache,
    surface: "model",
    tool,
    run: () => callArtifactPlatformTool(ctx, context, { tool, args }),
  })
}

async function authorizeArtifactTool(
  ctx: ActionCtx,
  context: ArtifactPlatformContext,
  request: ArtifactToolRequest
) {
  return await ctx.runQuery(internal.artifacts.runtime.authorizeTool, {
    ...context,
    tool: request.tool,
    integrationId: request.integrationId,
  })
}

async function callAuthorizedMiloTool(
  ctx: ActionCtx,
  context: ArtifactPlatformContext,
  tool: string,
  args: Record<string, unknown>
) {
  return await callMiloTool(
    ctx,
    {
      tenantId: context.tenantId,
      createdBy: context.personId,
    },
    { tool, args }
  )
}

async function callAuthorizedExternalTool(
  ctx: ActionCtx,
  context: ArtifactPlatformContext,
  authorization: AuthorizedExternalTool,
  request: {
    args: Record<string, unknown>
    cache: ArtifactToolCacheOptions
    tool: string
  }
) {
  const callProvider = async () =>
    await callProviderTool({
      ctx,
      integration: await prepareIntegrationForRuntime(ctx, {
        integration: authorization.integration,
      }),
      tool: request.tool,
      toolArgs: request.args,
    })

  if (authorization.permission.access === "read") {
    return await callCachedArtifactTool(ctx, context, {
      args: request.args,
      cache: request.cache,
      integrationId: authorization.integration._id,
      surface: authorization.permission.surface,
      tool: request.tool,
      run: callProvider,
    })
  }

  const result = await callProvider()

  await ctx.runMutation(internal.artifacts.tools.cache.invalidate, {
    tenantId: context.tenantId,
    artifactId: context.artifactId,
    personId: context.personId,
    surface: authorization.permission.surface,
    integrationId: authorization.integration._id,
  })

  return result
}

async function callCachedArtifactTool(
  ctx: ActionCtx,
  context: ArtifactPlatformContext,
  input: {
    args: Record<string, unknown>
    cache: ArtifactToolCacheOptions
    surface: string
    tool: string
    integrationId?: Id<"integrations">
    run: () => Promise<unknown>
  }
) {
  const now = Date.now()
  const cacheKey = await createArtifactToolCacheKey({
    tenantId: context.tenantId,
    artifactId: context.artifactId,
    versionId: context.versionId,
    personId: context.personId,
    surface: input.surface,
    tool: input.tool,
    integrationId: input.integrationId,
    args: input.args,
  })

  if (!input.cache.forceRefresh) {
    const cached = await ctx.runMutation(internal.artifacts.tools.cache.read, {
      tenantId: context.tenantId,
      artifactId: context.artifactId,
      versionId: context.versionId,
      personId: context.personId,
      surface: input.surface,
      tool: input.tool,
      integrationId: input.integrationId,
      cacheKey,
      now,
    })

    if (cached !== null) {
      return cached.value as unknown
    }
  }

  const value = await input.run()

  if (canStoreArtifactToolCacheValue(value)) {
    await ctx.runMutation(internal.artifacts.tools.cache.write, {
      tenantId: context.tenantId,
      artifactId: context.artifactId,
      versionId: context.versionId,
      personId: context.personId,
      surface: input.surface,
      tool: input.tool,
      integrationId: input.integrationId,
      cacheKey,
      value,
      ttlMs: input.cache.ttlMs,
      now,
    })
  }

  return value
}
