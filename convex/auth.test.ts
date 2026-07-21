import { expect, test } from "vitest"
import { createAdapterOptions } from "./auth"

test("authentication identities cannot be linked", () => {
  expect(createAdapterOptions().account.accountLinking).toEqual({
    enabled: false,
  })
})
