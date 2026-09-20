import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { editedFacts, factsEqual } from "./facts"
import { approvedFacts, derivedFacts } from "./profile"

function buildProfile(
  overrides: Partial<Doc<"organizationProfile">> = {}
): Doc<"organizationProfile"> {
  return {
    _id: "profile" as Doc<"organizationProfile">["_id"],
    _creationTime: 0,
    organizationId: "organization",
    name: "Acme",
    aliases: ["Acme Inc"],
    domains: ["acme.com"],
    summary: "Acme builds anvils.",
    updatedAt: 0,
    ...overrides,
  }
}

describe("approvedFacts", () => {
  test("unions declared domains into the approved facts and dedupes", () => {
    const profile = buildProfile({
      declared: { domains: ["contractors.example", "acme.com"] },
    })

    expect(approvedFacts(profile).domains).toEqual([
      "acme.com",
      "contractors.example",
    ])
  })

  test("declared domains survive an approval replacing the derived domains", () => {
    const profile = buildProfile({
      declared: { domains: ["contractors.example"] },
    })
    const approved = buildProfile({
      ...derivedFacts({ ...profile, domains: ["acme.io"] }),
      declared: profile.declared,
    })

    expect(approvedFacts(approved).domains).toEqual([
      "acme.io",
      "contractors.example",
    ])
  })

  test("the watcher comparison stays blind to declared domains", () => {
    const profile = buildProfile()
    const withDeclared = buildProfile({
      declared: { domains: ["contractors.example"] },
    })

    expect(factsEqual(derivedFacts(profile), derivedFacts(withDeclared))).toBe(
      true
    )
    expect(derivedFacts(withDeclared).domains).toEqual(["acme.com"])
  })
})

describe("editedFacts", () => {
  test("a reviewer's text replaces the draft's, trimmed, and blank clears it", () => {
    expect(editedFacts({ name: "  Copperline  ", summary: " " })).toEqual({
      name: "Copperline",
      summary: undefined,
    })
  })

  test("a field the reviewer left alone keeps the draft's", () => {
    expect(editedFacts({ summary: "Roofing, done right." })).toEqual({
      summary: "Roofing, done right.",
    })
    expect(editedFacts(undefined)).toEqual({})
  })
})
