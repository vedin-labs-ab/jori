import { describe, expect, test } from "vitest"
import { linearOAuthScopes } from "./config"

describe("Linear OAuth scopes", () => {
  test("requests write access for mutations beyond comment creation", () => {
    expect(linearOAuthScopes).toEqual(
      expect.arrayContaining(["read", "write", "comments:create"])
    )
  })
})
