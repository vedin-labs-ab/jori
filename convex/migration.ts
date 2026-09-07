import { v } from "convex/values"
import { type Doc, type Id } from "./_generated/dataModel"
import { internalMutation, type MutationCtx } from "./_generated/server"
import { requireEnvironmentVariable } from "./shared/environment"

const identityIds = [
  "mx7367n28hheqg2s0sek67epdx8c16g3",
  "mx7a9qkc3vdy3jb6dgag99srh98c1th7",
] as Id<"identities">[]
const skillIds = [
  "q17cbjmx571sk05mrgcr1nqfkn8bbbyz",
  "q177ztgv2e5yghrxk0c489783x8bb642",
  "q178zs7x02h8k1f3zb0v5n657s8bamkj",
  "q170t1wn6y7jqrqqjzwbbqshz58bbjvn",
] as Id<"skills">[]

/** Single-use bridge, removed after verified preservation and strict deploy.
 * No arbitrary IDs, values or region are accepted from the caller. */
export const preserve = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  returns: v.object({
    dryRun: v.boolean(),
    identities: v.number(),
    skills: v.number(),
    alreadyApplied: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (
      requireEnvironmentVariable("JORI_REGION") !== "us" ||
      requireEnvironmentVariable("CONVEX_CLOUD_URL") !==
        "https://insightful-goat-7.convex.cloud" ||
      requireEnvironmentVariable("JORI_APP_URL") !== "https://us.usejori.com"
    ) {
      throw new Error("Preservation is restricted to the audited US deployment")
    }
    return await preserveRows(
      ctx,
      { identityIds, skillIds },
      args.dryRun ?? true
    )
  },
})

/** Transactional implementation, independently exercised with fixture IDs. */
export async function preserveRows(
  ctx: MutationCtx,
  targets: { identityIds: Id<"identities">[]; skillIds: Id<"skills">[] },
  dryRun: boolean
) {
  const identities = await ctx.db.query("identities").take(3)
  const skills = await ctx.db.query("skills").take(5)
  requireExactRows(identities, targets.identityIds, 2)
  requireExactRows(skills, targets.skillIds, 4)
  const identityPatches = identities.map(identityPatch)
  const skillPatches = skills.map(skillPatch)
  const patches = [...identityPatches, ...skillPatches]
  const pending = patches.filter((patch) => patch !== null).length
  if (pending !== 0 && pending !== 6) {
    throw new Error("Unexpected partially migrated state; no records changed")
  }
  if (!dryRun && pending === 6) {
    for (const patch of identityPatches) {
      if (patch !== null) {
        await ctx.db.patch(patch.id, { link: patch.link })
      }
    }
    for (const patch of skillPatches) {
      if (patch !== null) {
        await ctx.db.replace(patch.id, patch.value)
      }
    }
  }
  return { dryRun, identities: 2, skills: 4, alreadyApplied: pending === 0 }
}

function requireExactRows(
  rows: { _id: string }[],
  expected: string[],
  count: number
) {
  if (
    expected.length !== count ||
    new Set(expected).size !== count ||
    rows.length !== count ||
    rows.some((row) => !expected.includes(row._id))
  ) {
    throw new Error("Records differ from the audited six targets")
  }
}

function identityPatch(row: Doc<"identities">) {
  if ("at" in row.link && "linkedAt" in row.link) {
    throw new Error("Ambiguous identity link shape")
  }
  if ("at" in row.link && !("linkedAt" in row.link)) {
    return null
  }
  if (
    !("linkedAt" in row.link) ||
    typeof row.link.linkedAt !== "number" ||
    !Number.isFinite(row.link.linkedAt)
  ) {
    throw new Error("Unexpected identity link shape")
  }
  const { linkedAt, ...link } = row.link
  return { id: row._id, link: { ...link, at: linkedAt } }
}

function skillPatch(row: Doc<"skills">) {
  if ("surfaces" in row && "associatedIntegrations" in row) {
    throw new Error("Ambiguous skill surface shape")
  }
  if (row.organizationId !== null) {
    throw new Error("Preservation only targets the audited global skills")
  }
  if ("surfaces" in row && !("associatedIntegrations" in row)) {
    return null
  }
  if (
    !("associatedIntegrations" in row) ||
    !Array.isArray(row.associatedIntegrations)
  ) {
    throw new Error("Unexpected skill surface shape")
  }
  const { _id, _creationTime, associatedIntegrations, ...fields } = row
  return { id: _id, value: { ...fields, surfaces: associatedIntegrations } }
}
