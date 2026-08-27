import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import {
  accessibleMaterial,
  canAccessMaterial,
  filterMaterialSearch,
  type MaterialDoc,
} from "./access"

const owner = "owner" as Id<"persons">
const other = "other" as Id<"persons">

function material(overrides: Partial<MaterialDoc> = {}): MaterialDoc {
  return {
    organizationId: "organization",
    scope: "organization" as const,
    ownerId: owner,
    name: "Launch tracker",
    ...overrides,
  }
}

describe("canAccessMaterial", () => {
  test("organization materials are visible to every member", () => {
    expect(canAccessMaterial(material(), other)).toBe(true)
  })

  test("personal materials are visible only to their owner", () => {
    const personal = material({ scope: "personal" })

    expect(canAccessMaterial(personal, owner)).toBe(true)
    expect(canAccessMaterial(personal, other)).toBe(false)
  })
})

describe("accessibleMaterial", () => {
  const args = { organizationId: "organization", personId: other }

  test("returns null for missing, foreign, and invisible materials alike", () => {
    expect(accessibleMaterial(null, args)).toBeNull()
    expect(
      accessibleMaterial(material({ organizationId: "elsewhere" }), args)
    ).toBeNull()
    expect(accessibleMaterial(material({ scope: "personal" }), args)).toBeNull()
  })

  test("returns visible materials unchanged", () => {
    const visible = material()

    expect(accessibleMaterial(visible, args)).toBe(visible)
  })
})

describe("filterMaterialSearch", () => {
  const materials = [
    material({ name: "Launch tracker" }),
    material({ name: "Owner notes", scope: "personal" }),
    material({ name: "Old launch", archivedAt: 5 }),
  ]

  test("hides other people's personal materials and archived ones", () => {
    expect(
      filterMaterialSearch(materials, { personId: other, limit: 10 }).map(
        (entry) => entry.name
      )
    ).toEqual(["Launch tracker"])
  })

  test("owners see their personal materials", () => {
    expect(
      filterMaterialSearch(materials, { personId: owner, limit: 10 }).map(
        (entry) => entry.name
      )
    ).toEqual(["Launch tracker", "Owner notes"])
  })

  test("matches name substrings case-insensitively and honors limits", () => {
    expect(
      filterMaterialSearch(materials, {
        personId: owner,
        query: "LAUNCH",
        includeArchived: true,
        limit: 1,
      }).map((entry) => entry.name)
    ).toEqual(["Launch tracker"])
  })
})
