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
    "Everyone in the organization can see"
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
  expect(
    visibilitySummary(
      { visibility: { mode: "private" }, ownerId: "maya" },
      directory
    ).label
  ).toBe("Only me")
  expect(
    visibilitySummary(
      { visibility: { mode: "private" }, ownerId: "priya" },
      directory
    ).label
  ).toBe("Owner only")
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
  expect(summary.description).toContain("The owner keeps access")
  expect(summary.description).toContain("Folder restrictions also apply")
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
})

test("empty grants do not promise access to a team or person", () => {
  expect(
    visibilitySummary(
      { visibility: { mode: "people", personIds: [] } },
      directory
    )
  ).toMatchObject({ label: "Owner only", marked: true })
})
