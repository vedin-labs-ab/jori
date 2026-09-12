import { type MutationCtx } from "../../_generated/server"
import { authComponent, createAdapterOptions } from "../../auth"

/** Remove organization membership only; people may belong to other workspaces. */
export async function eraseAuth(ctx: MutationCtx, organizationId: string) {
  const adapter = authComponent.adapter(ctx)(createAdapterOptions())
  const team = await adapter.findOne<{ id: string }>({
    model: "team",
    where: [{ field: "organizationId", value: organizationId }],
  })
  if (team) {
    const members = await adapter.findMany<{ id: string }>({
      model: "teamMember",
      where: [{ field: "teamId", value: team.id }],
      limit: 25,
    })
    for (const member of members) {
      await adapter.delete({
        model: "teamMember",
        where: [{ field: "id", value: member.id }],
      })
    }
    if (members.length === 0) {
      await adapter.delete({
        model: "team",
        where: [{ field: "id", value: team.id }],
      })
    }
    return false
  }
  for (const model of ["invitation", "member", "session"] as const) {
    const rows = await adapter.findMany<{ id: string }>({
      model,
      where: [
        {
          field:
            model === "session" ? "activeOrganizationId" : "organizationId",
          value: organizationId,
        },
      ],
      limit: 25,
    })
    for (const row of rows) {
      if (model === "session") {
        await adapter.update({
          model,
          where: [{ field: "id", value: row.id }],
          update: { activeOrganizationId: null, activeTeamId: null },
        })
      } else {
        await adapter.delete({ model, where: [{ field: "id", value: row.id }] })
      }
    }
    if (rows.length) {
      return false
    }
  }
  await adapter.delete({
    model: "organization",
    where: [{ field: "id", value: organizationId }],
  })
  return true
}
