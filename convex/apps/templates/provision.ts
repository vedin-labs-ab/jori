"use node"

import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { publishApp } from "../publish"
import { type AppTemplate, readAppTemplate, templatePartition } from "./catalog"

type ProvisionArgs = {
  key: string
  organizationId: string
  personId: Id<"persons">
}

type FoundTemplate = {
  app: Doc<"apps">
  headTemplate: { key: string; version: number } | null
}

/**
 * Find or create the canonical app a playbook works against. Stock
 * apps fast-forward to the current template version; a customized
 * app — one whose head version the user published — is never touched.
 */
export async function provisionTemplateApp(
  ctx: ActionCtx,
  args: ProvisionArgs
): Promise<Id<"apps"> | undefined> {
  const template = readAppTemplate(args.key)

  if (template === undefined) {
    return undefined
  }

  const partition = templatePartition(template, args.personId)
  const existing = await findProvisioned(ctx, args, partition)

  if (existing !== null) {
    return await refreshProvisioned(ctx, args, template, existing)
  }

  try {
    const published = await publishTemplate(ctx, args, template)

    return published.appId
  } catch (error) {
    const raced = await findProvisioned(ctx, args, partition)

    if (raced !== null) {
      return raced.app._id
    }

    throw error
  }
}

/**
 * Publish a user-owned copy of a template as an ordinary app — the
 * public counterpart of provisioning, reachable through #create_app.
 * The version records template provenance; no canonical slot is claimed.
 */
export async function instantiateAppTemplate(
  ctx: ActionCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    key: string
    title?: string
    access?: Doc<"apps">["access"]
    message?: string
  }
) {
  const template = readAppTemplate(args.key)

  if (template === undefined) {
    throw new Error(`Unknown app template: ${args.key}`)
  }

  return await publishApp(ctx, {
    mode: "create",
    organizationId: args.organizationId,
    personId: args.personId,
    title: args.title ?? template.title,
    access: args.access ?? template.access,
    contract: template.contract,
    source: template.source,
    build: template.build,
    message: args.message,
    capabilities: [],
    template: { key: template.key, version: template.version },
  })
}

async function refreshProvisioned(
  ctx: ActionCtx,
  args: ProvisionArgs,
  template: AppTemplate,
  existing: FoundTemplate
) {
  if (existing.app.archivedAt !== undefined) {
    await ctx.runMutation(internal.apps.records.restore, {
      appId: existing.app._id,
      organizationId: args.organizationId,
    })
  }

  // A customized head (no template stamp) belongs to the user; only stock
  // heads fast-forward to the current template version.
  if (
    existing.headTemplate !== null &&
    existing.headTemplate.version !== template.version
  ) {
    await publishTemplate(ctx, args, template, existing.app._id)
  }

  return existing.app._id
}

async function publishTemplate(
  ctx: ActionCtx,
  args: ProvisionArgs,
  template: AppTemplate,
  appId?: Id<"apps">
) {
  const common = {
    organizationId: args.organizationId,
    personId: args.personId,
    capabilities: [],
    title: template.title,
    contract: template.contract,
    source: template.source,
    build: template.build,
  }

  return appId === undefined
    ? await publishApp(ctx, {
        ...common,
        mode: "create",
        access: template.access,
        template: {
          key: template.key,
          version: template.version,
          canonical: true,
        },
      })
    : await publishApp(ctx, {
        ...common,
        mode: "update",
        access: template.access,
        appId,
        template: { key: template.key, version: template.version },
      })
}

async function findProvisioned(
  ctx: ActionCtx,
  args: ProvisionArgs,
  partition: string
): Promise<FoundTemplate | null> {
  return await ctx.runQuery(internal.apps.queries.findTemplate, {
    organizationId: args.organizationId,
    template: args.key,
    partition,
  })
}
