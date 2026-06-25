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

  test("keeps user-facing description and agent-facing usage distinct", () => {
    for (const permission of toolPermissions) {
      expect(permission.description.trim().length).toBeGreaterThan(0)
      expect(permission.usage.trim().length).toBeGreaterThan(0)
      expect(permission.description).not.toBe(permission.usage)
    }
  })
})
