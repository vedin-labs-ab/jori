import { type WithoutSystemFields } from "convex/server"
import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import {
  type ActionCtx,
  type MutationCtx,
  mutation,
} from "../../_generated/server"
import { ensureCurrentPerson } from "../../persons/account"
import {
  type Integration,
  integrationValidator,
} from "../../shared/integrations"
import { requireReturnUrl } from "../../shared/origin"
import { createSignedGitHubState } from "../github/signing"
import { googleIntegrationConfigs } from "../google/config"
import { createSignedGoogleState } from "../google/signing"
import { createSignedLinearState } from "../linear/signing"
import { microsoftIntegrationConfigs } from "../microsoft/config"
import { createSignedMicrosoftState } from "../microsoft/signing"
import { createSignedNotionState } from "../notion/signing"
import { createSignedSlackState } from "../slack/signing"
import { redirectWithStatus } from "./http"
import { type ProviderInstallState } from "./signing"

/**
 * Starts any provider's install: mints the signed state the provider's
 * callback reads back. Every provider signs the same state, so the integration
 * is an argument rather than eight near-identical endpoints.
 */
export const createInstallState = mutation({
  args: {
    organizationId: v.string(),
    integration: integrationValidator,
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createSignedInstallState(ctx, args.integration, args)
  },
})

export async function buildInstallState(
  ctx: MutationCtx,
  args: {
    organizationId: string
    returnUrl: string
    integrationOfferId?: Id<"integrationOffers">
  }
): Promise<ProviderInstallState> {
  return {
    organizationId: args.organizationId,
    createdBy: await ensureCurrentPerson(ctx, args.organizationId),
    returnUrl: requireReturnUrl(args.returnUrl),
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
    organizationId: string
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
      return googleIntegrationConfigs[integration].installPath
    case "microsoftEmail":
    case "microsoftCalendar":
      return microsoftIntegrationConfigs[integration].installPath
  }
}

type IntegrationValues = Omit<
  WithoutSystemFields<Doc<"integrations">>,
  "createdAt"
>

export async function findUserIntegrationForInstall(
  ctx: MutationCtx,
  args: {
    organizationId: string
    integration: Integration
    createdBy: Id<"persons">
  }
) {
  return await ctx.db
    .query("integrations")
    .withIndex("by_organization_and_integration_and_owner", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("integration", args.integration)
        .eq("ownerId", args.createdBy)
    )
    .first()
}

// Every provider install lands through here: a reinstall revives the
// matching row — reset to active with fresh credentials and ownership,
// whatever state it was in — instead of stacking a new one.
export async function upsertIntegration(
  ctx: MutationCtx,
  existing: Doc<"integrations"> | null,
  values: IntegrationValues
): Promise<Id<"integrations">> {
  if (existing !== null) {
    await ctx.db.patch(existing._id, values)

    return existing._id
  }

  return await ctx.db.insert("integrations", {
    ...values,
    createdAt: values.updatedAt,
  })
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

export async function failOfferAndRedirect(
  ctx: ActionCtx,
  args: {
    callbackParam: string
    error: string
    integrationOfferId?: Id<"integrationOffers">
    returnUrl: string
  }
) {
  await failIntegrationOffer(ctx, {
    integrationOfferId: args.integrationOfferId,
    error: args.error,
  })

  return redirectWithStatus(args.returnUrl, args.callbackParam, "error")
}
