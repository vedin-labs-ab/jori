import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { callJoriTool } from "../../broker/jori"
import { callProviderTool } from "../../broker/tools"
import { prepareIntegrationForRuntime } from "../../integrations/runtime"
import { readRecord } from "../../shared/input"
import {
  type AppToolCacheOptions,
  canStoreAppToolCacheValue,
  createAppToolCacheKey,
  normalizeAppToolCacheOptions,
} from "./cache"
import {
  type AppPlatformContext,
  callAppPlatformTool,
  createAppPlatformToolCacheArgs,
  isAppPlatformTool,
  isShareGrantTool,
} from "./platform"

export type AppToolRequest = {
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

export async function callAppTool(
  ctx: ActionCtx,
  context: AppPlatformContext,
  request: AppToolRequest
) {
  if (context.grant === "share" && !isShareGrantTool(request.tool)) {
    throw new Error("Share links are view-only: this tool is not available.")
  }

  const args = readRecord(request.args)
  const cache = normalizeAppToolCacheOptions({
    ttlMs: request.cacheTtlMs,
    forceRefresh: request.forceRefresh,
  })

  if (isAppPlatformTool(request.tool)) {
    return await callPlatformTool(ctx, context, request.tool, args, cache)
  }

  const authorization = await authorizeAppTool(ctx, context, request)

  if (authorization.permission.surface === "jori") {
    return await callAuthorizedJoriTool(ctx, context, request.tool, args)
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

async function callPlatformTool(
  ctx: ActionCtx,
  context: AppPlatformContext,
  tool: string,
  args: Record<string, unknown>,
  cache: AppToolCacheOptions
) {
  if (tool !== "promptModel") {
    return await callAppPlatformTool(ctx, context, { tool, args })
  }

  return await callCachedAppTool(ctx, context, {
    args: createAppPlatformToolCacheArgs(tool, args),
    cache,
    surface: "model",
    tool,
    run: () => callAppPlatformTool(ctx, context, { tool, args }),
  })
}

async function authorizeAppTool(
  ctx: ActionCtx,
  context: AppPlatformContext,
  request: AppToolRequest
) {
  return await ctx.runQuery(internal.apps.runtime.authorizeTool, {
    ...context,
    tool: request.tool,
    integrationId: request.integrationId,
  })
}

async function callAuthorizedJoriTool(
  ctx: ActionCtx,
  context: AppPlatformContext,
  tool: string,
  args: Record<string, unknown>
) {
  return await callJoriTool(
    ctx,
    {
      organizationId: context.organizationId,
      principal: { kind: "person", personId: context.personId },
    },
    { tool, args }
  )
}

async function callAuthorizedExternalTool(
  ctx: ActionCtx,
  context: AppPlatformContext,
  authorization: AuthorizedExternalTool,
  request: {
    args: Record<string, unknown>
    cache: AppToolCacheOptions
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
    return await callCachedAppTool(ctx, context, {
      args: request.args,
      cache: request.cache,
      integrationId: authorization.integration._id,
      surface: authorization.permission.surface,
      tool: request.tool,
      run: callProvider,
    })
  }

  const result = await callProvider()

  await ctx.runMutation(internal.apps.tools.cache.invalidate, {
    organizationId: context.organizationId,
    appId: context.appId,
    personId: context.personId,
    surface: authorization.permission.surface,
    integrationId: authorization.integration._id,
  })

  return result
}

async function callCachedAppTool(
  ctx: ActionCtx,
  context: AppPlatformContext,
  input: {
    args: Record<string, unknown>
    cache: AppToolCacheOptions
    surface: string
    tool: string
    integrationId?: Id<"integrations">
    run: () => Promise<unknown>
  }
) {
  const now = Date.now()
  const cacheKey = await createAppToolCacheKey({
    organizationId: context.organizationId,
    appId: context.appId,
    versionId: context.versionId,
    personId: context.personId,
    surface: input.surface,
    tool: input.tool,
    integrationId: input.integrationId,
    args: input.args,
  })

  if (!input.cache.forceRefresh) {
    const cached = await ctx.runMutation(internal.apps.tools.cache.read, {
      organizationId: context.organizationId,
      appId: context.appId,
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

  if (canStoreAppToolCacheValue(value)) {
    await ctx.runMutation(internal.apps.tools.cache.write, {
      organizationId: context.organizationId,
      appId: context.appId,
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
