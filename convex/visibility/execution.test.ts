import { beforeEach, expect, test, vi } from "vitest"
import { databaseContext, id } from "../../test/convex/database"
import { folderDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import { listOrganizationViewerIds } from "./audience"
import { createAudienceSight } from "./execution"
import { type Gate } from "./sight"

vi.mock("./audience", () => ({ listOrganizationViewerIds: vi.fn() }))
vi.mock("./viewer", () => ({
  loadPersonTeamIds: async (_ctx: unknown, args: { personId: Id<"persons"> }) =>
    new Set(args.personId === member ? ["engineering"] : []),
}))
const owner = id<"persons">("owner")
const member = id<"persons">("member")
const outsider = id<"persons">("outsider")
const organizationId = "organization"
const gate: Gate = {
  organizationId,
  ownerId: owner,
  visibility: { mode: "people", personIds: [member] },
}

beforeEach(() => {
  vi.mocked(listOrganizationViewerIds)
    .mockReset()
    .mockResolvedValue([owner, member, outsider])
})

test("shared execution sees the audience's common resources and caches its audience", async () => {
  const { ctx } = databaseContext()
  const sight = createAudienceSight(ctx, gate)
  expect(await sight.canSee(gate)).toBe(true)
  expect(await sight.canSee({ ...gate, visibility: { mode: "private" } })).toBe(
    false
  )
  expect(
    await sight.canSee({ ...gate, visibility: { mode: "organization" } })
  ).toBe(true)
  expect(await sight.canSee({ ...gate, organizationId: "foreign" })).toBe(false)
  expect(listOrganizationViewerIds).toHaveBeenCalledTimes(1)
})

test("a team folder narrows the shared audience without denying its common resources", async () => {
  const { ctx, database } = databaseContext()
  const folder = folderDoc({
    organizationId,
    createdBy: owner,
    visibility: { mode: "teams", teamIds: ["engineering"] },
  })
  const folderId = await database.insert("folders", folder)
  const sight = createAudienceSight(ctx, {
    organizationId,
    ownerId: owner,
    folderId,
    visibility: { mode: "organization" },
  })
  expect(
    await sight.canSee({
      organizationId,
      folderId,
      visibility: { mode: "organization" },
    })
  ).toBe(true)
  expect(await sight.canSeeFolder({ ...folder, _id: folderId })).toBe(true)
  expect(
    await sight.canSee({
      organizationId,
      ownerId: owner,
      visibility: { mode: "private" },
    })
  ).toBe(false)
})

test("members without console identities and empty audiences cannot widen access", async () => {
  const { ctx } = databaseContext()
  vi.mocked(listOrganizationViewerIds).mockResolvedValue([owner, undefined])
  const organization = {
    ...gate,
    visibility: { mode: "organization" as const },
  }
  expect(
    await createAudienceSight(ctx, organization).canSee({
      ...gate,
      visibility: { mode: "private" },
    })
  ).toBe(false)
  vi.mocked(listOrganizationViewerIds).mockResolvedValue([])
  expect(
    await createAudienceSight(ctx, organization).canSee(organization)
  ).toBe(false)
})
