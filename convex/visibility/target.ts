import { type Infer, v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { type Gate } from "./sight"

// What a console visibility surface points at. Materials and folders read
// through the same resolver, so a folder answers as its own gate: its
// creator is the owner, and its parent is the chain above it.

export const targetValidator = v.union(
  v.object({ kind: v.literal("table"), id: v.id("collections") }),
  v.object({ kind: v.literal("store"), id: v.id("collections") }),
  v.object({ kind: v.literal("file"), id: v.id("files") }),
  v.object({ kind: v.literal("folder"), id: v.id("folders") })
)

export type VisibilityTarget = Infer<typeof targetValidator>

/** A folder as a gate of its own: its creator owns it, and its parent is
 *  the chain above it. What holds for the folder holds for everything filed
 *  inside it, since that chain cascades. */
export function folderGate(folder: Doc<"folders">): Gate {
  return {
    organizationId: folder.organizationId,
    visibility: folder.visibility,
    ownerId: folder.createdBy,
    folderId: folder.parentId,
  }
}

type LoadedTarget = {
  id: Id<"collections"> | Id<"files"> | Id<"folders">
  gate: Gate
  /** The person whose consent a change needs; folders answer with their
   *  creator, ownerless materials with nothing. */
  owner: Id<"persons"> | undefined
}

/** Load one target of this organization, or throw the same "Not found."
 *  every miss throws, so nobody can probe what exists. */
export async function loadTarget(
  ctx: QueryLikeCtx,
  organizationId: string,
  target: VisibilityTarget
): Promise<LoadedTarget> {
  if (target.kind === "folder") {
    const folder = await ctx.db.get(target.id)

    if (folder === null || folder.organizationId !== organizationId) {
      throw new Error("Not found.")
    }

    return {
      id: folder._id,
      gate: folderGate(folder),
      owner: folder.createdBy,
    }
  }

  return await loadMaterialTarget(ctx, organizationId, target)
}

async function loadMaterialTarget(
  ctx: QueryLikeCtx,
  organizationId: string,
  target: Exclude<VisibilityTarget, { kind: "folder" }>
): Promise<LoadedTarget> {
  const material = await ctx.db.get(target.id)

  // Files carry no kind; every collection carries the kind its target names.
  const isTargetKind =
    material !== null &&
    (target.kind === "file"
      ? !("kind" in material)
      : "kind" in material && material.kind === target.kind)

  if (
    material === null ||
    material.organizationId !== organizationId ||
    !isTargetKind
  ) {
    throw new Error("Not found.")
  }

  return { id: material._id, gate: material, owner: material.ownerId }
}
