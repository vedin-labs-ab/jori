import { type Infer } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import {
  getToolPermissionsByProvider,
  isUnattendedToolMode,
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
  type ToolAccess,
} from "../permissions/catalog"
import { listPermissionOverrides } from "../permissions/read"
import {
  type IntegrationProvider,
  isUserScopedProvider,
} from "../providers/catalog"
import { type access, type accessInput } from "./schema"

export type AutomationAccess = Infer<typeof access>
export type AutomationAccessInput = Infer<typeof accessInput>
export type AccessLevel = "none" | "read" | "write" | "both"
type QueryLikeCtx = MutationCtx | QueryCtx

export const providerLabels = {
  github: "GitHub",
  gmail: "Gmail",
  googleCalendar: "Google Calendar",
  googleDrive: "Google Drive",
  linear: "Linear",
  microsoftCalendar: "Microsoft Calendar",
  microsoftEmail: "Outlook Mail",
  notion: "Notion",
  slack: "Slack",
} satisfies Record<IntegrationProvider, string>

export async function resolveAccessInput(
  ctx: QueryLikeCtx,
  args: {
    access: AutomationAccessInput
    createdBy: string | undefined
    tenantId: string
  }
): Promise<AutomationAccess> {
  const writeProviders = uniqueProviders(args.access.write)

  if (writeProviders.length === 0) {
    throw new Error("Give at least one integration write access.")
  }

  await requireAutomationAccessPolicy(ctx, {
    readProviders:
      args.access.read === "all" ? [] : uniqueProviders(args.access.read),
    tenantId: args.tenantId,
    writeProviders,
  })

  const read =
    args.access.read === "all"
      ? "all"
      : await resolveProviders(ctx, {
          providers: uniqueProviders(args.access.read),
          createdBy: args.createdBy,
          tenantId: args.tenantId,
        })

  return {
    read,
    write: await resolveProviders(ctx, {
      providers: writeProviders,
      createdBy: args.createdBy,
      tenantId: args.tenantId,
    }),
    web: args.access.web,
  }
}

export async function requireAutomationAccessPolicy(
  ctx: QueryLikeCtx,
  args: {
    readProviders: IntegrationProvider[]
    tenantId: string
    writeProviders: IntegrationProvider[]
  }
) {
  const toolModes = resolveToolModes(
    await listPermissionOverrides(ctx, args.tenantId)
  )

  for (const provider of args.readProviders) {
    requireAutomationProviderAccess(toolModes, provider, "read")
  }

  for (const provider of args.writeProviders) {
    requireAutomationProviderAccess(toolModes, provider, "write")
  }
}

function requireAutomationProviderAccess(
  toolModes: ReadonlyMap<string, PermissionMode>,
  provider: IntegrationProvider,
  access: ToolAccess
) {
  if (canUseAutomationProviderAccess(toolModes, provider, access)) {
    return
  }

  throw new Error(
    `${providerLabels[provider]} ${access} access is not available for automations. Check integration permissions.`
  )
}

export function canUseAutomationProviderAccess(
  toolModes: ReadonlyMap<string, PermissionMode>,
  provider: IntegrationProvider,
  access: ToolAccess
) {
  return getToolPermissionsByProvider(provider).some(
    (permission) =>
      permission.access === access &&
      isUnattendedToolMode(resolveToolMode(toolModes, permission.tool))
  )
}

export async function resolveEventIntegration(
  ctx: QueryLikeCtx,
  args: {
    provider: IntegrationProvider
    createdBy: string | undefined
    tenantId: string
  }
) {
  return await resolveProvider(ctx, args)
}

export function getIntegrationAccess(
  access: AutomationAccess,
  integrationId: Id<"integrations">
): AccessLevel {
  const canRead = access.read === "all" || access.read.includes(integrationId)
  const canWrite = access.write.includes(integrationId)

  if (canRead && canWrite) {
    return "both"
  }

  if (canRead) {
    return "read"
  }

  return canWrite ? "write" : "none"
}

export function canUseRead(access: AccessLevel) {
  return access === "read" || access === "both"
}

export function canUseWrite(access: AccessLevel) {
  return access === "write" || access === "both"
}

export function accessLabel(access: AccessLevel) {
  if (access === "both") {
    return "Read/write"
  }

  if (access === "read") {
    return "Read"
  }

  return access === "write" ? "Write" : "None"
}

export async function projectAccessForConsole(
  ctx: QueryLikeCtx,
  access: AutomationAccess
) {
  const ids = new Set<Id<"integrations">>([
    ...(access.read === "all" ? [] : access.read),
    ...access.write,
  ])
  const surfaces: Array<{
    provider: IntegrationProvider
    access: Exclude<AccessLevel, "none">
  }> = []

  for (const integrationId of ids) {
    const integration = await ctx.db.get(integrationId)

    if (integration === null) {
      continue
    }

    const level = getIntegrationAccess(access, integration._id)

    if (level !== "none") {
      surfaces.push({ provider: integration.provider, access: level })
    }
  }

  return {
    readScope:
      access.read === "all" ? ("allConnected" as const) : ("selected" as const),
    webSearch: access.web,
    surfaces: sortSurfaces(surfaces),
  }
}

async function resolveProviders(
  ctx: QueryLikeCtx,
  args: {
    providers: IntegrationProvider[]
    createdBy: string | undefined
    tenantId: string
  }
) {
  const integrationIds: Id<"integrations">[] = []

  for (const provider of args.providers) {
    integrationIds.push((await resolveProvider(ctx, { ...args, provider }))._id)
  }

  return integrationIds
}

async function resolveProvider(
  ctx: QueryLikeCtx,
  args: {
    provider: IntegrationProvider
    createdBy: string | undefined
    tenantId: string
  }
): Promise<Doc<"integrations">> {
  const integration =
    isUserScopedProvider(args.provider) && args.createdBy !== undefined
      ? await ctx.db
          .query("integrations")
          .withIndex("by_tenant_and_provider_and_owner", (query) =>
            query
              .eq("tenantId", args.tenantId)
              .eq("provider", args.provider)
              .eq("ownerId", args.createdBy)
          )
          .first()
      : await ctx.db
          .query("integrations")
          .withIndex("by_tenant_and_provider", (query) =>
            query.eq("tenantId", args.tenantId).eq("provider", args.provider)
          )
          .first()

  if (integration === null || integration.status !== "active") {
    throw new Error(`${providerLabels[args.provider]} is not connected.`)
  }

  return integration
}

function uniqueProviders(providers: IntegrationProvider[]) {
  return [...new Set(providers)]
}

function sortSurfaces<
  Surface extends {
    provider: IntegrationProvider
  },
>(surfaces: Surface[]) {
  return [...surfaces].sort((left, right) =>
    providerLabels[left.provider].localeCompare(providerLabels[right.provider])
  )
}
