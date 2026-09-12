import { expect, test, vi } from "vitest"
import { type QueryCtx } from "../_generated/server"
import { page, team } from "./organization"

const auth = vi.hoisted(() => ({ findOne: vi.fn() }))
vi.mock("../auth", () => ({
  authComponent: {
    adapter: () => () => ({ findOne: auth.findOne }),
    getAnyUserById: async () => ({
      name: "Member",
      email: "member@example.com",
      accessToken: "secret",
    }),
  },
  createAdapterOptions: () => ({}),
}))

test("auth metadata export enforces workspace scope and returns only approved fields", async () => {
  const runQuery = vi.fn(async () => ({
    page: [
      {
        _id: "member",
        organizationId: "org",
        userId: "user",
        role: "owner",
        token: "secret",
      },
      { _id: "foreign", organizationId: "other", userId: "foreign" },
    ],
    isDone: false,
    continueCursor: "next",
  }))
  const handler = (
    page as unknown as {
      _handler: (
        ctx: QueryCtx,
        args: { organizationId: string; model: "member"; cursor: string | null }
      ) => Promise<{ page: unknown[]; continueCursor: string }>
    }
  )._handler
  const result = await handler({ runQuery } as unknown as QueryCtx, {
    organizationId: "org",
    model: "member",
    cursor: null,
  })
  expect(result.page).toEqual([
    {
      _id: "member",
      organizationId: "org",
      userId: "user",
      role: "owner",
      name: "Member",
      email: "member@example.com",
    },
  ])
  expect(result.continueCursor).toBe("next")
  expect(runQuery).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      where: [{ field: "organizationId", value: "org" }],
      paginationOpts: { cursor: null, numItems: 20 },
    })
  )
})

test("team metadata export refuses a team belonging to another workspace", async () => {
  auth.findOne.mockResolvedValue({ organizationId: "other" })
  const runQuery = vi.fn()
  const handler = (
    team as unknown as {
      _handler: (
        ctx: QueryCtx,
        args: { organizationId: string; teamId: string; cursor: string | null }
      ) => Promise<unknown>
    }
  )._handler
  await expect(
    handler({ runQuery } as unknown as QueryCtx, {
      organizationId: "org",
      teamId: "foreign",
      cursor: null,
    })
  ).rejects.toThrow("does not belong")
  expect(runQuery).not.toHaveBeenCalled()
})
