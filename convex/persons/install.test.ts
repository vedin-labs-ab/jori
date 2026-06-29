import { beforeEach, expect, test, vi } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { linkSetupIdentity } from "./install"
import { linkIdentityToPerson } from "./links"

vi.mock("./links", () => ({
  linkIdentityToPerson: vi.fn(async () => "linked_person"),
}))

const ctx = {} as MutationCtx
const personId = "person_1" as Id<"persons">

beforeEach(() => {
  vi.mocked(linkIdentityToPerson).mockClear()
})

test("links setup identities as OAuth provider identities", async () => {
  const result = await linkSetupIdentity(ctx, {
    tenantId: "tenant_1",
    personId,
    provider: "slack",
    identity: {
      externalId: "U123",
      email: "albin@example.com",
      name: "Albin",
    },
  })

  expect(result).toBe("linked_person")
  expect(linkIdentityToPerson).toHaveBeenCalledWith(ctx, {
    tenantId: "tenant_1",
    personId,
    provider: "slack",
    externalId: "U123",
    method: "oauth",
    email: "albin@example.com",
    name: "Albin",
  })
})

test("skips setup identity linking when providers lack a human handle", async () => {
  const result = await linkSetupIdentity(ctx, {
    tenantId: "tenant_1",
    personId,
    provider: "linear",
    identity: undefined,
  })

  expect(result).toBeUndefined()
  expect(linkIdentityToPerson).not.toHaveBeenCalled()
})
