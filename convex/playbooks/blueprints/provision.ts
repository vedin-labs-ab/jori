"use node"

import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { publishArtifact } from "../../artifacts/publish"
import { playbookBlueprints } from "./generated"

export async function provisionPlaybookArtifact(
  ctx: ActionCtx,
  args: {
    key: string
    tenantId: string
    personId: Id<"persons">
  }
) {
  const blueprint = readBlueprint(args.key)

  if (blueprint === undefined) {
    return undefined
  }

  const partition = `person:${args.personId}`
  const existing = await findBlueprint(ctx, args, partition)

  if (existing !== null) {
    if (existing.archivedAt !== undefined) {
      await ctx.runMutation(internal.artifacts.records.restore, {
        artifactId: existing._id,
        tenantId: args.tenantId,
      })
    }

    return existing._id
  }

  try {
    const published = await publishArtifact(ctx, {
      mode: "create",
      tenantId: args.tenantId,
      personId: args.personId,
      blueprint: args.key,
      capabilities: [],
      access: blueprint.access,
      title: blueprint.title,
      contract: blueprint.contract,
      source: blueprint.source.map((file) => ({ ...file })),
      build: {
        sourceHash: blueprint.build.sourceHash,
        assets: blueprint.build.assets.map((asset) => ({ ...asset })),
      },
    })

    return published.artifactId
  } catch (error) {
    const raced = await findBlueprint(ctx, args, partition)

    if (raced !== null) {
      return raced._id
    }

    throw error
  }
}

function readBlueprint(key: string) {
  return key in playbookBlueprints
    ? playbookBlueprints[key as keyof typeof playbookBlueprints]
    : undefined
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
