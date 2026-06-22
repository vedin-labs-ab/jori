import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx, type MutationCtx } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"
import { type Integration } from "../shared/integrations"
import { createSignedGitHubState } from "./github/signing"
import { googleIntegrationConfigs } from "./google/config"
import { createSignedGoogleState } from "./google/signing"
import { createSignedLinearState } from "./linear/signing"
import { microsoftIntegrationConfigs } from "./microsoft/config"
import { createSignedMicrosoftState } from "./microsoft/signing"
import { createSignedNotionState } from "./notion/signing"
import { createSignedSlackState } from "./slack/signing"

export type ProviderInstallState = {
  tenantId: string
  createdBy: string
  returnUrl: string
  createdAt: number
  setupLinkId?: Id<"setupLinks">
}

export async function buildInstallState(
  ctx: MutationCtx,
  args: {
    tenantId: string
    returnUrl: string
    setupLinkId?: Id<"setupLinks">
  }
): Promise<ProviderInstallState> {
  const identity = await requireTenantAccess(ctx, args.tenantId)

  return {
    tenantId: args.tenantId,
    createdBy: requireClerkUserId(identity),
    returnUrl: args.returnUrl,
    createdAt: Date.now(),
    ...(args.setupLinkId === undefined
      ? {}
      : { setupLinkId: args.setupLinkId }),
  }
}

export async function createSignedInstallState(
  ctx: MutationCtx,
  integration: Integration,
  args: {
    tenantId: string
    returnUrl: string
    setupLinkId?: Id<"setupLinks">
  }
) {
  const state = await buildInstallState(ctx, args)

  switch (integration) {
    case "github":
      return await createSignedGitHubState(state)
    case "slack":
      return await createSignedSlackState(state)
    case "linear":
      return await createSignedLinearState(state)
    case "notion":
      return await createSignedNotionState(state)
    case "gmail":
    case "googleCalendar":
    case "googleDrive":
      return await createSignedGoogleState({ integration, ...state })
    case "microsoftEmail":
    case "microsoftCalendar":
      return await createSignedMicrosoftState({ integration, ...state })
  }
}

export function installPathForIntegration(integration: Integration) {
  switch (integration) {
    case "github":
      return "/github/install"
    case "slack":
      return "/slack/install"
    case "linear":
      return "/linear/install"
    case "notion":
      return "/notion/install"
    case "gmail":
    case "googleCalendar":
    case "googleDrive":
      return googleIntegrationConfigs[integration].installPath
    case "microsoftEmail":
    case "microsoftCalendar":
      return microsoftIntegrationConfigs[integration].installPath
  }
}

export async function completeSetupLink(
  ctx: ActionCtx,
  args: {
    setupLinkId?: Id<"setupLinks">
    integrationId: Id<"integrations">
  }
) {
  if (args.setupLinkId === undefined) {
    return
  }

  await ctx.runMutation(internal.integrations.setup.links.complete, args)
}

export async function failSetupLink(
  ctx: ActionCtx,
  args: {
    setupLinkId?: Id<"setupLinks">
    error?: string
  }
) {
  if (args.setupLinkId === undefined) {
    return
  }

  await ctx.runMutation(internal.integrations.setup.links.complete, args)
}
