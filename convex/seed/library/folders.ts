import { type Id } from "../../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../../_generated/server"
import { type StoredVisibility } from "../../visibility/schema"
import { clearOrganization, daysAgo, type SeedContext } from "../context"
import { resolveOwner, resolveOwners, resolvePeople } from "../people"

// The filing Vedin Labs works out of. A folder's visibility cascades over
// everything inside it, so the tree is also the access model: #founders-grade
// material sits under a folder only the founders can see, and everything else
// is organization-wide.

type SeedFolder = {
  name: string
  parent?: string
  /** Days before the seed instant the folder was made. */
  created: number
  /** Absent means organization-wide. */
  visibility?: "founders"
  /** Who made it, by the local part of their address. */
  owner?: string
}

const tree: SeedFolder[] = [
  { name: "Engineering", created: 118, owner: "oskar" },
  { name: "Incidents", parent: "Engineering", created: 96, owner: "oskar" },
  { name: "Releases", parent: "Engineering", created: 96, owner: "nadia" },
  { name: "Product", created: 118, owner: "mia" },
  { name: "Go to market", created: 112, owner: "tobias" },
  { name: "Pipeline", parent: "Go to market", created: 84, owner: "tobias" },
  { name: "Customers", parent: "Go to market", created: 84, owner: "tobias" },
  { name: "Support", created: 104, owner: "priya" },
  { name: "Operations", created: 91, owner: "johan" },
  { name: "Vendors", parent: "Operations", created: 62, owner: "johan" },
  { name: "Board and runway", created: 77, visibility: "founders" },
]

export async function seedFolders(ctx: MutationCtx, seed: SeedContext) {
  const ownerId = await resolveOwner(ctx, seed)
  const owners = await resolveOwners(ctx, seed)
  const people = await resolvePeople(ctx, seed)
  const founders = [ownerId, people.get("mia@vedinlabs.example")].filter(
    (personId) => personId !== undefined
  )
  const written = new Map<string, Id<"folders">>()

  await clearOrganization(ctx, ["folders"], seed.organizationId)

  for (const folder of tree) {
    const createdAt = daysAgo(seed, folder.created, 11)

    written.set(
      folder.name,
      await ctx.db.insert("folders", {
        organizationId: seed.organizationId,
        name: folder.name,
        visibility: folderVisibility(folder, founders),
        parentId:
          folder.parent === undefined ? undefined : written.get(folder.parent),
        createdBy: owners(folder.owner),
        createdAt,
        updatedAt: createdAt,
      })
    )
  }

  return written.size
}

function folderVisibility(
  folder: SeedFolder,
  founders: Id<"persons">[]
): StoredVisibility {
  return folder.visibility === "founders"
    ? { mode: "people", personIds: founders }
    : { mode: "organization" }
}

/** Folders by name, so the stages that file material into them can read the
 *  fixture the way it is written. */
export async function resolveFolders(ctx: QueryCtx, seed: SeedContext) {
  const rows = await ctx.db
    .query("folders")
    .withIndex("by_organization_and_parent", (index) =>
      index.eq("organizationId", seed.organizationId)
    )
    .collect()

  return new Map(rows.map((row) => [row.name, row._id]))
}
