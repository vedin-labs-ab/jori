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
  integrationOfferId?: Id<"integrationOffers">
}

export async function buildInstallState(
  ctx: MutationCtx,
  args: {
    tenantId: string
    returnUrl: string
    integrationOfferId?: Id<"integrationOffers">
  }
): Promise<ProviderInstallState> {
  const identity = await requireTenantAccess(ctx, args.tenantId)

  return {
    tenantId: args.tenantId,
    createdBy: requireClerkUserId(identity),
    returnUrl: args.returnUrl,
    createdAt: Date.now(),
    ...(args.integrationOfferId === undefined
      ? {}
      : { integrationOfferId: args.integrationOfferId }),
  }
}

export async function createSignedInstallState(
  ctx: MutationCtx,
  integration: Integration,
  args: {
    tenantId: string
    returnUrl: string
    integrationOfferId?: Id<"integrationOffers">
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

export async function completeIntegrationOffer(
  ctx: ActionCtx,
  args: {
    integrationOfferId?: Id<"integrationOffers">
    integrationId: Id<"integrations">
  }
) {
  if (args.integrationOfferId === undefined) {
    return
  }

  await ctx.runMutation(internal.integrations.offers.updates.complete, args)
}

export async function failIntegrationOffer(
  ctx: ActionCtx,
  args: {
    integrationOfferId?: Id<"integrationOffers">
    error?: string
  }
) {
  if (args.integrationOfferId === undefined) {
    return
  }

  await ctx.runMutation(internal.integrations.offers.updates.complete, args)
}
