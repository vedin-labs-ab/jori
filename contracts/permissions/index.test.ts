import { describe, expect, test } from "vitest"
import { toolSurfaces } from "../integrations"
import { toolPermissions } from "."

describe("permission catalog", () => {
  test("attaches permissions to tool surfaces, not broad providers", () => {
    const knownSurfaces = new Set<string>(toolSurfaces)
    const permissionSurfaces = new Set<string>(
      toolPermissions.map((permission) => permission.surface)
    )

    expect(permissionSurfaces.has("google")).toBe(false)
    expect(permissionSurfaces.has("microsoft")).toBe(false)

    for (const surface of permissionSurfaces) {
      expect(knownSurfaces.has(surface)).toBe(true)
    }
  })
})
