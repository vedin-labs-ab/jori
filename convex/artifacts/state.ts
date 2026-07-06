import { v } from "convex/values"
import { isRecord } from "../../contracts/json"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"
import { canAccessArtifact } from "./access"
import {
  type ArtifactContractStateEntry,
  assertContractStateValue,
  resolveStateContract,
} from "./contract"

const stateWrite = v.union(
  v.object({
    type: v.literal("replace"),
    value: v.any(),
  }),
  v.object({
    type: v.literal("merge"),
    patch: v.any(),
  })
)

export const read = internalQuery({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    personId: v.id("persons"),
    contractName: v.string(),
  },
  handler: async (ctx, args) => {
    const artifact = await requireStateArtifact(ctx, args)
    const entry = resolveStateContract(artifact, args.contractName)
    const document = await findStateDocument(ctx, { ...args, entry })

    return document === null ? null : summarizeStateDocument(document, entry)
  },
})

export const list = internalQuery({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    personId: v.id("persons"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const artifact = await requireStateArtifact(ctx, args)
    const documents = []

    for (const entry of (artifact.contract?.state ?? []).slice(
      0,
      normalizeListLimit(args.limit)
    )) {
      const document = await findStateDocument(ctx, { ...args, entry })

      if (document !== null) {
        documents.push(summarizeStateDocument(document, entry))
      }
    }

    return documents
  },
})

export const update = internalMutation({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    personId: v.id("persons"),
    contractName: v.string(),
    expectedVersion: v.optional(v.number()),
    write: stateWrite,
  },
  handler: async (ctx, args) => {
    const artifact = await requireStateArtifact(ctx, args)
    const entry = resolveStateContract(artifact, args.contractName)
    const existing = await findStateDocument(ctx, { ...args, entry })
    const currentVersion = existing?.version ?? 0

    if (
      args.expectedVersion !== undefined &&
      args.expectedVersion !== currentVersion
    ) {
      throw new Error("Artifact state version conflict.")
    }

    const value =
      args.write.type === "replace"
        ? args.write.value
        : mergePatch(existing?.value ?? {}, args.write.patch)

    assertContractStateValue({ entry, value })

    return existing === null
      ? await insertStateDocument(ctx, args, entry, value)
      : await updateStateDocument(ctx, existing, entry, value)
  },
})

function mergePatch(target: unknown, patch: unknown): unknown {
  if (!isRecord(patch)) {
    return patch
  }

  const result = isRecord(target) ? { ...target } : {}

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key]
    } else {
      result[key] = mergePatch(result[key], value)
    }
  }

  return result
}

async function insertStateDocument(
  ctx: MutationCtx,
  args: {
    tenantId: string
    artifactId: Doc<"artifacts">["_id"]
    personId: Id<"persons">
  },
  entry: ArtifactContractStateEntry,
  value: unknown
) {
  const now = Date.now()
  const documentId = await ctx.db.insert("artifactState", {
    tenantId: args.tenantId,
    artifactId: args.artifactId,
    personId: statePersonId(entry.scope, args.personId),
    scope: entry.scope,
    contractName: entry.name,
    schemaHash: entry.schemaHash,
    schemaName: entry.schemaName,
    schemaVersion: entry.schemaVersion,
    key: entry.key,
    value,
    version: 1,
    createdAt: now,
    updatedAt: now,
  })

  return summarizeStateDocument(await ctx.db.get(documentId), entry)
}

async function updateStateDocument(
  ctx: MutationCtx,
  existing: Doc<"artifactState">,
  entry: ArtifactContractStateEntry,
  value: unknown
) {
  const version = existing.version + 1
  const updatedAt = Date.now()

  await ctx.db.patch(existing._id, {
    contractName: entry.name,
    schemaHash: entry.schemaHash,
    schemaName: entry.schemaName,
    schemaVersion: entry.schemaVersion,
    value,
    version,
    updatedAt,
  })

  return summarizeStateDocument(
    { ...existing, value, version, updatedAt },
    entry
  )
}

async function requireStateArtifact(
  ctx: QueryLikeCtx,
  args: {
    tenantId: string
    artifactId: Doc<"artifacts">["_id"]
    personId: Id<"persons">
  }
) {
  const artifact = await ctx.db.get(args.artifactId)

  if (
    artifact === null ||
    artifact.tenantId !== args.tenantId ||
    !canAccessArtifact(artifact, args.personId)
  ) {
    throw new Error("Artifact not found.")
  }

  return artifact
}

async function findStateDocument(
  ctx: QueryLikeCtx,
  args: {
    artifactId: Doc<"artifacts">["_id"]
    entry: ArtifactContractStateEntry
    personId: Id<"persons">
  }
) {
  return await ctx.db
    .query("artifactState")
    .withIndex("by_artifact_and_scope_and_person_and_key", (index) =>
      index
        .eq("artifactId", args.artifactId)
        .eq("scope", args.entry.scope)
        .eq("personId", statePersonId(args.entry.scope, args.personId))
        .eq("key", args.entry.key)
    )
    .first()
}

function summarizeStateDocument(
  document: Doc<"artifactState"> | null,
  entry: ArtifactContractStateEntry
) {
  if (document === null) {
    throw new Error("Artifact state document is missing.")
  }

  assertContractStateValue({ entry, value: document.value })

  return {
    contractName: entry.name,
    key: entry.key,
    scope: entry.scope,
    schemaHash: entry.schemaHash,
    schemaName: entry.schemaName,
    schemaVersion: entry.schemaVersion,
    value: document.value as unknown,
    version: document.version,
    updatedAt: document.updatedAt,
  }
}

function statePersonId(
  scope: Doc<"artifactState">["scope"],
  personId: Id<"persons">
) {
  return scope === "personal" ? personId : undefined
}

function normalizeListLimit(limit: number | undefined) {
  if (limit === undefined || !Number.isFinite(limit)) {
    return 50
  }

  return Math.max(1, Math.min(100, Math.trunc(limit)))
}
