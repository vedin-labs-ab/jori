import { type Visibility } from "@contracts/visibility"
import { expect, test } from "vitest"
import { type VisibilityDirectory } from "./directory"
import { visibilitySummary } from "./summary"

const directory: VisibilityDirectory = {
  viewerId: "maya",
  people: [{ id: "priya", name: "Priya" }],
  teams: [{ id: "finance", name: "Finance" }],
  folders: [
    {
      folderId: "root",
      name: "Finance",
      visibility: { mode: "teams", teamIds: ["finance"] },
    },
    {
      folderId: "child",
      parentId: "root",
      name: "Renewals",
      visibility: { mode: "organization" },
    },
    { folderId: "open", name: "Design", visibility: { mode: "organization" } },
  ],
}

test("organization grants remain marked when a parent limits access", () => {
  const summary = visibilitySummary(
    { visibility: { mode: "organization" }, folderId: "child" },
    directory
  )
  expect(summary.label).toBe("Via folder")
  expect(summary.configuredLabel).toBe("Organization")
  expect(summary.icon).toBe("folder")
  expect(summary.marked).toBe(true)
  expect(summary.description).toContain('"Finance"')
  expect(summary.description).not.toContain(
    "Everyone in your organization can see"
  )
  expect(
    visibilitySummary(
      { visibility: { mode: "organization" }, folderId: "open" },
      directory
    ).marked
  ).toBe(false)
})

test("unknown folders and cycles never imply organization-wide access", () => {
  for (const folders of [
    undefined,
    [
      {
        folderId: "loop",
        parentId: "loop",
        name: "Loop",
        visibility: { mode: "organization" as const },
      },
    ],
  ]) {
    const summary = visibilitySummary(
      { visibility: { mode: "organization" }, folderId: "loop" },
      { folders }
    )
    expect(summary.marked).toBe(true)
    expect(summary.label).toBe("Via folder")
    expect(summary.description).toContain("check who can see")
  }
})

test("private wording distinguishes the viewer from another owner", () => {
  for (const ownerId of [undefined, "maya", "priya"]) {
    const summary = visibilitySummary(
      { visibility: { mode: "private" }, ownerId },
      directory
    )
    expect(summary).toMatchObject(
      ownerId === "priya"
        ? {
            label: "Owner only",
            description: "Only the owner can see this item.",
          }
        : { label: "Only me", description: "Only you can see this item." }
    )
  }
  expect(
    visibilitySummary({ visibility: { mode: "private" }, ownerId: "maya" }, {})
  ).toMatchObject({
    label: "Owner only",
    description: "Only the owner can see this item.",
  })
})

test("selected grants name known recipients without claiming a reader count", () => {
  const summary = visibilitySummary(
    {
      visibility: { mode: "teams", teamIds: ["finance", "finance"] },
      folderId: "child",
    },
    directory
  )
  expect(summary.label).toBe("Finance")
  expect(summary.description).toContain("You keep access")
  expect(summary.description).toContain(
    'Restrictions from the "Finance" folder also apply.'
  )
  expect(
    visibilitySummary(
      { visibility: { mode: "people", personIds: ["priya"] } },
      directory
    ).label
  ).toBe("Priya")
  expect(
    visibilitySummary(
      { visibility: { mode: "people", personIds: ["priya", "missing"] } },
      directory
    ).label
  ).toBe("2 selected people")
  expect(
    visibilitySummary(
      { visibility: { mode: "teams", teamIds: ["unknown"] } },
      directory
    ).label
  ).toBe("1 team")
  expect(
    visibilitySummary(
      { visibility: { mode: "people", personIds: ["maya"] }, ownerId: "priya" },
      directory
    ).description
  ).toContain("The owner keeps access.")
})

test("empty grants do not promise access to a team or person", () => {
  expect(
    visibilitySummary(
      { visibility: { mode: "people", personIds: [] } },
      directory
    )
  ).toMatchObject({
    label: "Only me",
    description: "Only you can see this item.",
    marked: true,
  })
  expect(
    visibilitySummary(
      { visibility: { mode: "teams", teamIds: [] }, ownerId: "priya" },
      directory
    )
  ).toMatchObject({
    label: "Owner only",
    description: "Only the owner can see this item.",
  })
})

test("explanations identify team members and join people's names naturally", () => {
  const namedDirectory = {
    teams: [
      { id: "billing", name: "Billing" },
      { id: "finance", name: "Finance" },
    ],
    people: [
      { id: "maya", name: "Maya" },
      { id: "priya", name: "Priya" },
      { id: "alex", name: "Alex" },
    ],
  }
  for (const [visibility, recipients] of [
    [
      { mode: "teams", teamIds: ["billing", "billing"] },
      "members of the Billing team",
    ],
    [
      { mode: "teams", teamIds: ["billing", "finance"] },
      "members of the Billing team and the Finance team",
    ],
    [{ mode: "teams", teamIds: ["unknown"] }, "members of 1 selected team"],
    [
      { mode: "teams", teamIds: ["billing", "unknown"] },
      "members of 2 selected teams",
    ],
    [{ mode: "people", personIds: ["maya"] }, "Maya"],
    [{ mode: "people", personIds: ["maya", "priya"] }, "Maya and Priya"],
    [
      { mode: "people", personIds: ["maya", "priya", "alex"] },
      "Maya, Priya, and Alex",
    ],
    [{ mode: "people", personIds: ["unknown"] }, "1 selected person"],
    [{ mode: "people", personIds: ["maya", "unknown"] }, "2 selected people"],
  ] satisfies [Visibility, string][]) {
    expect(visibilitySummary({ visibility }, namedDirectory).description).toBe(
      `Shared with ${recipients}. You keep access.`
    )
  }
})
