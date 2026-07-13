"use node"

import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { publishArtifact } from "../../artifacts/publish"
import {
  isCurrentPlaybookBlueprint,
  type PlaybookBlueprint,
  readPlaybookBlueprint,
} from "./catalog"

export async function provisionPlaybookArtifact(
  ctx: ActionCtx,
  args: {
    key: string
    tenantId: string
    personId: Id<"persons">
  }
) {
  const blueprint = readPlaybookBlueprint(args.key)

  if (blueprint === undefined) {
    return undefined
  }

  const partition = `person:${args.personId}`
  const existing = await findBlueprint(ctx, args, partition)

  if (existing !== null) {
    if (existing.artifact.archivedAt !== undefined) {
      await ctx.runMutation(internal.artifacts.records.restore, {
        artifactId: existing.artifact._id,
        tenantId: args.tenantId,
      })
    }

    if (!isCurrentPlaybookBlueprint(existing, blueprint)) {
      await publishBlueprint(ctx, args, blueprint, existing.artifact._id)
    }

    return existing.artifact._id
  }

  try {
    const published = await publishBlueprint(ctx, args, blueprint)

    return published.artifactId
  } catch (error) {
    const raced = await findBlueprint(ctx, args, partition)

    if (raced !== null) {
      return raced.artifact._id
    }

    throw error
  }
}

async function publishBlueprint(
  ctx: ActionCtx,
  args: { key: string; tenantId: string; personId: Id<"persons"> },
  blueprint: PlaybookBlueprint,
  artifactId?: Id<"artifacts">
) {
  const common = {
    tenantId: args.tenantId,
    personId: args.personId,
    capabilities: [],
    access: blueprint.access,
    title: blueprint.title,
    contract: blueprint.contract,
    source: blueprint.source.map((file) => ({ ...file })),
    build: {
      sourceHash: blueprint.build.sourceHash,
      assets: blueprint.build.assets.map((asset) => ({ ...asset })),
    },
  }

  return artifactId === undefined
    ? await publishArtifact(ctx, {
        ...common,
        mode: "create",
        blueprint: args.key,
      })
    : await publishArtifact(ctx, {
        ...common,
        mode: "update",
        artifactId,
      })
}

async function findBlueprint(
  ctx: ActionCtx,
  args: { key: string; tenantId: string },
  partition: string
) {
  return await ctx.runQuery(internal.artifacts.queries.findBlueprint, {
    tenantId: args.tenantId,
    blueprint: args.key,
    partition,
  })
}
