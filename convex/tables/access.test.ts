import { describe, expect, test, vi } from "vitest"
import { databaseContext, id } from "../../test/convex/database"
import {
  type TableOverrides,
  tableDoc,
  testOwner,
} from "../../test/convex/materials/collections"
import { type CollectionDoc } from "../collections/spec"
import { withOwnerDisplay, withOwnerDisplays } from "../persons/names"
import { summarizeTable } from "./access"

function table(overrides: TableOverrides = {}): CollectionDoc<"table"> {
  return {
    ...tableDoc(overrides),
    _id: id<"collections">("table"),
    _creationTime: 1,
  } as CollectionDoc<"table">
}

describe("resolving the owner name", () => {
  test("enriches table rows in order with one lookup per owner", async () => {
    const { database, ctx } = databaseContext()

    await database.insert("identities", {
      organizationId: "org",
      personId: testOwner,
      provider: "slack",
      externalId: "U1",
      name: "Ada Lovelace",
    })

    const query = vi.spyOn(database, "query")
    const summaries = await withOwnerDisplays(ctx, [
      summarizeTable(table({ documentCount: 42 })),
      summarizeTable(table({ documentCount: 1, ownerId: undefined })),
      summarizeTable(table({ documentCount: 7 })),
    ])

    expect(summaries).toMatchObject([
      { rowCount: 42, ownerName: "Ada Lovelace" },
      { rowCount: 1, ownerName: undefined, ownerImage: undefined },
      { rowCount: 7, ownerName: "Ada Lovelace" },
    ])
    expect(query).toHaveBeenCalledExactlyOnceWith("identities")
  })

  test("carries the sign-in avatar from the linked auth account", async () => {
    // The auth component resolves users through ctx.runQuery; the stub is
    // that component answering with the account's provider image.
    const { database, ctx } = databaseContext({
      runQuery: async () => ({ image: "https://lh3.example/avatar.png" }),
    })

    await database.insert("identities", {
      organizationId: "org",
      personId: testOwner,
      provider: "auth",
      externalId: "user_1",
      name: "Ada Lovelace",
    })

    const document = table()
    const summary = await withOwnerDisplay(ctx, summarizeTable(document))

    expect(summary.ownerName).toBe("Ada Lovelace")
    expect(summary.ownerImage).toBe("https://lh3.example/avatar.png")
  })

  test.each([undefined, testOwner])(
    "leaves the name unset for an owner without an identity: %s",
    async (ownerId) => {
      const { ctx } = databaseContext()
      const summary = await withOwnerDisplay(
        ctx,
        summarizeTable(table({ ownerId }))
      )
      expect(summary.ownerName).toBeUndefined()
    }
  )
})
