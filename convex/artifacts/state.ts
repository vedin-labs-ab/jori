import { type Infer, v } from "convex/values"
import {
  type ArtifactContractStateEntry,
  assertContractStateValue,
  resolveArtifactStateContract,
} from "../../contracts/artifacts/contract"
import { mergePatch, pathPatch, readPath } from "../../contracts/json"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"
import { getAccessibleArtifact } from "./access"
import { type ArtifactSessionGrant, artifactSessionGrant } from "./schema"

const stateWrite = v.union(
  v.object({
    type: v.literal("replace"),
    value: v.any(),
  }),
  v.object({
    type: v.literal("merge"),
    patch: v.any(),
  }),
  v.object({
    type: v.literal("claim"),
    path: v.array(v.string()),
    value: v.any(),
  })
)

export type ArtifactStateWrite = Infer<typeof stateWrite>

/** Resolve a write against the current document. A claim is an atomic
 *  insert-if-absent: it sets its path only when nothing is stored there yet. */
export function resolveStateWrite(
  current: unknown,
  write: ArtifactStateWrite
): { kind: "write"; value: unknown } | { kind: "held"; existing: unknown } {
  if (write.type === "replace") {
    return { kind: "write", value: write.value }
  }

  if (write.type === "merge") {
    return { kind: "write", value: mergePatch(current ?? {}, write.patch) }
  }

  if (write.path.length === 0 || write.value == null) {
    throw new Error("A claim requires a non-empty path and a non-null value.")
  }

  const existing = readPath(current, write.path)

  return existing !== undefined
    ? { kind: "held", existing }
    : {
        kind: "write",
        value: mergePatch(current ?? {}, pathPatch(write.path, write.value)),
      }
}

export const read = internalQuery({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
    personId: v.id("persons"),
    grant: v.optional(artifactSessionGrant),
    contractName: v.string(),
  },
  handler: async (ctx, args) => {
    const artifact = await getAccessibleArtifact(ctx, args)
    const entry = resolveArtifactStateContract(
      artifact.contract,
      args.contractName
    )

    if (!isStateEntryVisible(entry, args.grant)) {
      return null
    }

    const document = await findStateDocument(ctx, { ...args, entry })

    return document === null ? null : summarizeStateDocument(document, entry)
  },
})

export const list = internalQuery({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
    personId: v.id("persons"),
    grant: v.optional(artifactSessionGrant),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const artifact = await getAccessibleArtifact(ctx, args)
    const documents = []

    for (const entry of (artifact.contract?.state ?? []).slice(
      0,
      normalizeListLimit(args.limit)
    )) {
      if (!isStateEntryVisible(entry, args.grant)) {
        continue
      }

      const document = await findStateDocument(ctx, { ...args, entry })

      if (document !== null) {
        documents.push(summarizeStateDocument(document, entry))
      }
    }

    return documents
  },
})

/** Share-link viewers see shared-scope state only; personal state stays
 *  with the members it belongs to. */
export function isStateEntryVisible(
  entry: Pick<ArtifactContractStateEntry, "scope">,
  grant: ArtifactSessionGrant | undefined
) {
  return grant !== "share" || entry.scope === "shared"
}

export const update = internalMutation({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
    personId: v.id("persons"),
    contractName: v.string(),
    expectedVersion: v.optional(v.number()),
    write: stateWrite,
  },
  handler: async (ctx, args) => {
    const artifact = await getAccessibleArtifact(ctx, args)

    // Archiving pauses the automations bound to an artifact; this guard
    // covers every other writer, so an archived artifact stops changing.
    if (artifact.archivedAt !== undefined) {
      throw new Error("Artifact is archived. Restore it to write state.")
    }

    const entry = resolveArtifactStateContract(
      artifact.contract,
      args.contractName
    )
    const existing = await findStateDocument(ctx, { ...args, entry })
    const currentVersion = existing?.version ?? 0

    if (
      args.expectedVersion !== undefined &&
      args.expectedVersion !== currentVersion
    ) {
      throw new Error("Artifact state version conflict.")
    }

    const resolved = resolveStateWrite(existing?.value, args.write)

    if (resolved.kind === "held") {
      return {
        claimed: false,
        existing: resolved.existing,
        version: currentVersion,
      }
    }

    assertContractStateValue({ entry, value: resolved.value })

    const summary =
      existing === null
        ? await insertStateDocument(ctx, args, entry, resolved.value)
        : await updateStateDocument(ctx, existing, entry, resolved.value)

    return args.write.type === "claim" ? { ...summary, claimed: true } : summary
  },
})

async function insertStateDocument(
  ctx: MutationCtx,
  args: {
    organizationId: string
    artifactId: Doc<"artifacts">["_id"]
    personId: Id<"persons">
  },
  entry: ArtifactContractStateEntry,
  value: unknown
) {
  const now = Date.now()
  const documentId = await ctx.db.insert("artifactState", {
    organizationId: args.organizationId,
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
