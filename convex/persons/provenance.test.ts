import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "../_generated/api"
import schema from "../schema"

vi.mock("../auth", () => ({
  authComponent: {
    getAnyUserById: async (_ctx: unknown, userId: string) => ({
      image: `https://example.com/${userId}.png`,
    }),
  },
}))

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const organizationId = "provenance"

test("folder detail resolves its creator's display instead of the viewer's", async () => {
  const { t, creator, folderId } = await fixture()
  const result = await t.query(api.folders.console.get, {
    organizationId,
    folderId,
  })

  expect(result).toMatchObject({
    status: "ready",
    folder: {
      createdBy: creator,
      ownerId: creator,
      ownerName: "Hanna Ek",
      ownerImage: "https://example.com/creator.png",
      updatedAt: 2_000,
    },
  })
})

test("live chat resolves its creator separately from the signed-in viewer", async () => {
  const { t, creator, viewer, conversationId } = await fixture()
  const result = await t.query(api.conversations.console.live, {
    organizationId,
    conversationId,
  })

  expect(result).toMatchObject({
    status: "ready",
    createdBy: creator,
    ownerId: creator,
    ownerName: "Hanna Ek",
    ownerImage: "https://example.com/creator.png",
    updatedAt: 3_000,
    viewer: {
      id: viewer,
      name: "Maya Lund",
      image: "https://example.com/viewer.png",
    },
  })
})

test("live chat falls back to its creation time when no update is recorded", async () => {
  const { t, conversationId } = await fixture()
  const createdAt = await t.run(async (ctx) => {
    await ctx.db.patch(conversationId, { updatedAt: undefined })
    return (await ctx.db.get(conversationId))?._creationTime
  })
  expect(createdAt).toEqual(expect.any(Number))
  expect(
    await t.query(api.conversations.console.live, {
      organizationId,
      conversationId,
    })
  ).toMatchObject({ status: "ready", updatedAt: createdAt })
})

async function fixture() {
  const t = convexTest(schema, modules)
  const records = await t.run(async (ctx) => {
    const people = []
    for (const [externalId, name] of [
      ["creator", "Hanna Ek"],
      ["viewer", "Maya Lund"],
    ]) {
      const personId = await ctx.db.insert("persons", {
        organizationId,
        createdAt: 1,
        updatedAt: 1,
      })
      await ctx.db.insert("identities", {
        organizationId,
        personId,
        provider: "auth",
        externalId,
        name,
        link: { method: "oauth", at: 1 },
        createdAt: 1,
        updatedAt: 1,
      })
      people.push(personId)
    }
    const [creator, viewer] = people
    const folderId = await ctx.db.insert("folders", {
      organizationId,
      name: "Design",
      visibility: { mode: "organization" },
      createdBy: creator,
      createdAt: 1,
      updatedAt: 2_000,
    })
    const conversationId = await ctx.db.insert("conversations", {
      organizationId,
      title: "Design review",
      surface: "console",
      scope: "conversation",
      externalId: "design-review",
      folderId,
      visibility: { mode: "organization" },
      createdBy: creator,
      updatedAt: 3_000,
    })
    return { creator, viewer, folderId, conversationId }
  })
  return {
    t: t.withIdentity({ subject: "viewer", org: organizationId }),
    ...records,
  }
}
