import { v } from "convex/values"
import {
  type MessageContext,
  readMessageContext,
  readMessageReferences,
} from "../../contracts/replies/answers"
import { type ReferenceTarget } from "../../contracts/replies/parts"
import { referenceKinds } from "../../contracts/replies/references"
import { type Id } from "../_generated/dataModel"
import { query } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { ancestorPath } from "../folders/tree"
import { resolveConsolePerson } from "../persons/account"
import { loadReference } from "../references/lookup"
import { type QueryLikeCtx } from "../shared/context"
import { createSight, type Sight } from "../visibility/sight"

// Every reference reads through its resource's visibility predicate. Missing,
// foreign and invisible targets all resolve as unavailable. A console message
// records its folder when sent; inline resources resolve independently.

export const referenceTargetValidator = v.object({
  kind: v.union(...referenceKinds.map((kind) => v.literal(kind))),
  id: v.string(),
})

export type { ReferenceTarget }

/** A context as the run reads it: the target, its name, and the folder
 *  the run it starts is filed under — the folder itself, or the one a
 *  filed resource is in. */
export type ResolvedContext = MessageContext & {
  name: string
  folderId?: Id<"folders">
}

export type ResolvedReference = ReferenceTarget & {
  name: string
  /** Where it is filed, root folder first; a run says how it stands. */
  detail?: string
  folderId?: Id<"folders">
  unavailable: boolean
}

export const resolve = query({
  args: {
    organizationId: v.string(),
    targets: v.array(referenceTargetValidator),
  },
  handler: async (ctx, args): Promise<ResolvedReference[]> => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return args.targets.map(unavailable)
    }

    const sight = createSight(ctx, {
      organizationId: args.organizationId,
      personId: await resolveConsolePerson(
        ctx,
        args.organizationId,
        access.identity
      ),
    })

    return await Promise.all(
      args.targets.map((target) => resolveReferenceTarget(ctx, sight, target))
    )
  },
})

export async function resolveReferenceTarget(
  ctx: QueryLikeCtx,
  sight: Sight,
  target: ReferenceTarget
): Promise<ResolvedReference> {
  const found = await loadReference(ctx, sight, target)

  if (found === null) {
    return unavailable(target)
  }

  const detail = found.status ?? (await filedUnder(ctx, found.folderId))

  return {
    ...target,
    name: found.name,
    ...(found.folderId === undefined ? {} : { folderId: found.folderId }),
    ...(detail === undefined ? {} : { detail }),
    unavailable: false,
  }
}

function unavailable(target: ReferenceTarget): ResolvedReference {
  return { ...target, name: "", unavailable: true }
}

/** The folders something is filed under, root first, as one line. */
async function filedUnder(
  ctx: QueryLikeCtx,
  folderId: Id<"folders"> | undefined
) {
  const folder = folderId === undefined ? null : await ctx.db.get(folderId)

  return folder === null
    ? undefined
    : (await ancestorPath(ctx, folder))
        .map((segment) => segment.name)
        .join(" › ")
}

/** The resources a message's data says its text mentions, each with its
 *  name for the viewer, or without one when the viewer may not see it or
 *  it is gone. */
export async function resolveConsoleReferences(
  ctx: QueryLikeCtx,
  sight: Sight,
  data: unknown
): Promise<Array<MessageContext & { name: string | null }>> {
  return await Promise.all(
    readMessageReferences(data).map(async (reference) => ({
      ...reference,
      name: (await loadReference(ctx, sight, reference))?.name ?? null,
    }))
  )
}

/** The context a message's data carries, resolved for the viewer: the
 *  target's name, and its folder when it has one. A target the viewer may
 *  not see, or that is gone, resolves to nothing. */
export async function resolveConsoleContext(
  ctx: QueryLikeCtx,
  sight: Sight,
  data: unknown
): Promise<ResolvedContext | undefined> {
  const context = readMessageContext(data)

  if (context === undefined) {
    return undefined
  }

  const reference = await loadReference(ctx, sight, context)

  if (reference === null) {
    return undefined
  }

  const folderId =
    context.kind === "folder"
      ? (context.id as Id<"folders">)
      : reference.folderId

  return {
    ...context,
    name: reference.name,
    ...(folderId === undefined ? {} : { folderId }),
  }
}
