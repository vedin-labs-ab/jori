import { type Id } from "../_generated/dataModel"

// Materials — tables, stores, and files to come — share one visibility
// model: organization-scoped materials are visible to every member,
// personal ones only to their owner.

export type MaterialDoc = {
  organizationId: string
  scope: "organization" | "personal"
  ownerId: Id<"persons">
  name: string
  archivedAt?: number
}

export function canAccessMaterial(
  material: Pick<MaterialDoc, "scope" | "ownerId">,
  personId: Id<"persons">
) {
  return material.scope === "organization" || material.ownerId === personId
}

/** Null for missing, foreign, and invisible materials alike, so callers
 *  cannot tell missing from inaccessible. */
export function accessibleMaterial<Material extends MaterialDoc>(
  material: Material | null,
  args: { organizationId: string; personId: Id<"persons"> }
) {
  if (
    material === null ||
    material.organizationId !== args.organizationId ||
    !canAccessMaterial(material, args.personId)
  ) {
    return null
  }

  return material
}

/** Narrow a recency-ordered candidate list to what the person may see and
 *  asked for: visible, active unless archived ones were requested, and
 *  matching the name query. */
export function filterMaterialSearch<Material extends MaterialDoc>(
  materials: Material[],
  args: {
    personId: Id<"persons">
    query?: string
    includeArchived?: boolean
    limit: number
  }
) {
  const query = args.query?.trim().toLowerCase()

  return materials
    .filter(
      (material) =>
        canAccessMaterial(material, args.personId) &&
        (args.includeArchived === true || material.archivedAt === undefined) &&
        (query === undefined ||
          query === "" ||
          material.name.toLowerCase().includes(query))
    )
    .slice(0, args.limit)
}
