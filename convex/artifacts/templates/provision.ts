"use node"

import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { publishArtifact } from "../publish"
import {
  type ArtifactTemplate,
  readArtifactTemplate,
  templatePartition,
} from "./catalog"

type ProvisionArgs = {
  key: string
  tenantId: string
  personId: Id<"persons">
}

type FoundTemplate = {
  artifact: Doc<"artifacts">
  headTemplate: { key: string; version: number } | null
}

/**
 * Find or create the canonical artifact a playbook works against. Stock
 * artifacts fast-forward to the current template version; a customized
 * artifact — one whose head version the user published — is never touched.
 */
export async function provisionTemplateArtifact(
  ctx: ActionCtx,
  args: ProvisionArgs
): Promise<Id<"artifacts"> | undefined> {
  const template = readArtifactTemplate(args.key)

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

    return published.artifactId
  } catch (error) {
    const raced = await findProvisioned(ctx, args, partition)

    if (raced !== null) {
      return raced.artifact._id
    }

    throw error
  }
}

/**
 * Publish a user-owned copy of a template as an ordinary artifact — the
 * public counterpart of provisioning, reachable through #create_artifact.
 * The version records template provenance; no canonical slot is claimed.
 */
export async function instantiateArtifactTemplate(
  ctx: ActionCtx,
  args: {
    tenantId: string
    personId: Id<"persons">
    key: string
    title?: string
    access?: Doc<"artifacts">["access"]
    message?: string
  }
) {
  const template = readArtifactTemplate(args.key)

  if (template === undefined) {
    throw new Error(`Unknown artifact template: ${args.key}`)
  }

  return await publishArtifact(ctx, {
    mode: "create",
    tenantId: args.tenantId,
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
  template: ArtifactTemplate,
  existing: FoundTemplate
) {
  if (existing.artifact.archivedAt !== undefined) {
    await ctx.runMutation(internal.artifacts.records.restore, {
      artifactId: existing.artifact._id,
      tenantId: args.tenantId,
    })
  }

  // A customized head (no template stamp) belongs to the user; only stock
  // heads fast-forward to the current template version.
  if (
    existing.headTemplate !== null &&
    existing.headTemplate.version !== template.version
  ) {
    await publishTemplate(ctx, args, template, existing.artifact._id)
  }

  return existing.artifact._id
}

async function publishTemplate(
  ctx: ActionCtx,
  args: ProvisionArgs,
  template: ArtifactTemplate,
  artifactId?: Id<"artifacts">
) {
  const common = {
    tenantId: args.tenantId,
    personId: args.personId,
    capabilities: [],
    title: template.title,
    contract: template.contract,
    source: template.source,
    build: template.build,
  }

  return artifactId === undefined
    ? await publishArtifact(ctx, {
        ...common,
        mode: "create",
        access: template.access,
        template: {
          key: template.key,
          version: template.version,
          canonical: true,
        },
      })
    : await publishArtifact(ctx, {
        ...common,
        mode: "update",
        access: template.access,
        artifactId,
        template: { key: template.key, version: template.version },
      })
}

async function findProvisioned(
  ctx: ActionCtx,
  args: ProvisionArgs,
  partition: string
): Promise<FoundTemplate | null> {
  return await ctx.runQuery(internal.artifacts.queries.findTemplate, {
    tenantId: args.tenantId,
    template: args.key,
    partition,
  })
}
