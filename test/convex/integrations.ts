import { id } from "./database"

type DataModel = import("../../convex/_generated/dataModel").DataModel
type Doc<TableName extends keyof DataModel> =
  import("../../convex/_generated/dataModel").Doc<TableName>

/** An active integration row with the organization, ownership, and timestamp
 *  fields every projection reads. Tests name the provider and override only
 *  the identifiers and credentials their assertions depend on. */
export function integrationDoc(
  overrides: Partial<Doc<"integrations">> &
    Pick<Doc<"integrations">, "integration">
): Doc<"integrations"> {
  return {
    _creationTime: 0,
    _id: id<"integrations">("integration"),
    createdAt: 0,
    createdBy: id<"persons">("person"),
    credentials: {},
    externalId: "external",
    organizationId: "organization",
    scope: "organization",
    status: "active",
    updatedAt: 0,
    ...overrides,
  } as Doc<"integrations">
}
