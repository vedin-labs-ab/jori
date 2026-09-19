import { expect, test } from "vitest"
import { resolveToolModes } from "../../../../contracts/permissions"
import { integration } from "../../../../test/convex/tools"
import { type Doc } from "../../../_generated/dataModel"
import { type InstructionRuntimeInput } from "../input"
import { permissionGroups } from "./resolve"

test("instruction runs without access get the full tool surface", () => {
  const groups = permissionGroups(instructionInput({}), resolveToolModes([]))

  expect(surfaceTools(groups, "gmail")).toEqual(
    expect.arrayContaining([
      "google_gmail_search_threads",
      "google_gmail_send_message",
    ])
  )
  expect(surfaceTools(groups, "jori")).toEqual(
    expect.arrayContaining(["web_search", "insert_table_row"])
  )
})

test("instruction runs with access are narrowed to their tool contract", () => {
  const gmail = integration("gmail")
  const groups = permissionGroups(
    instructionInput({
      integrations: [gmail],
      access: {
        integrations: [
          { id: gmail._id, tools: ["google_gmail_search_threads"] },
        ],
        jori: ["read_table"],
      },
    }),
    resolveToolModes([])
  )
  const jori = surfaceTools(groups, "jori")

  expect(surfaceTools(groups, "gmail")).toEqual(["google_gmail_search_threads"])
  expect(jori).toContain("read_table")
  expect(jori).not.toContain("insert_table_row")
  expect(jori).not.toContain("web_search")
  expect(jori).not.toContain("web_fetch")
  // Core tools need no grant: a run can always find out what it can do.
  expect(jori).toContain("load_skill")
})

function instructionInput(overrides: Partial<InstructionRuntimeInput>) {
  return {
    type: "instruction" as const,
    run: {} as Doc<"runs">,
    instructions: "Do the thing.",
    integrations: [integration("gmail")],
    organization: null,
    requester: null,
    timezone: null,
    ...overrides,
  }
}

function surfaceTools(
  groups: ReturnType<typeof permissionGroups>,
  surface: string
) {
  return (
    groups
      .find((group) => group.surface === surface)
      ?.permissions.map((permission) => permission.tool) ?? []
  )
}
