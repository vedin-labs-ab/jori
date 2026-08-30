import { type ListFacet } from "../list/controls"

// Materials (tables, stores) archive before they delete, so their list
// pages share one status facet: active rows by default, with archived
// reachable from the Name header's filter menu.

export const statusFacet: ListFacet<{ archivedAt?: number }> = {
  defaults: ["active"],
  label: "Status",
  options: [
    { label: "Active", value: "active" },
    { label: "Archived", value: "archived" },
  ],
  resolve: (material) =>
    material.archivedAt === undefined ? "active" : "archived",
}

/** The list queries omit archived materials unless asked; any status
 *  selection that can surface archived rows must ask for them. */
export function shouldIncludeArchived(
  selection: readonly string[] | undefined
) {
  return selection === undefined || selection.includes("archived")
}
