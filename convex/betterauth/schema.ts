import { defineSchema } from "convex/server"
import { tables } from "./generated"

/**
 * Better Auth's tables, plus the indexes its adapter actually asks for.
 *
 * `generated.ts` is the CLI's output and is overwritten whole on every
 * regeneration, so nothing may be added there. This file is the seam the
 * library documents for exactly that: import the generated tables, extend
 * them here, and the customisation survives the next `auth generate`.
 *
 * The organization plugin looks a membership up by organization and user
 * together, and a team membership up by team and user together. Better Auth
 * resolves an index by its fields joined with an underscore, the way
 * `accountId_providerId` already reads in the generated file, so the name is
 * the contract rather than a label. Without it the adapter scans the table
 * in full and Convex warns on every call, which on tables that grow with
 * organizations times people is the document read limit waiting to happen.
 */
const schema = defineSchema({
  ...tables,
  session: tables.session.index("activeOrganizationId", [
    "activeOrganizationId",
  ]),
  member: tables.member.index("organizationId_userId", [
    "organizationId",
    "userId",
  ]),
  teamMember: tables.teamMember.index("teamId_userId", ["teamId", "userId"]),
})

export default schema
