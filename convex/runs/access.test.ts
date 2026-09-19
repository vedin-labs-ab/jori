import { expect, test } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { holdsTool, resolveSubtaskAccess } from "./access"
import { type InstructionRuntimeInput } from "./agent/input"

test("inherits the job contract when tools are omitted", async () => {
  const access = contract([integrationEntry("gmail-id", ["search_messages"])], {
    jori: ["web_search", "read_table"],
  })
  const parent = jobParent(access)

  expect(
    await resolveSubtaskAccess(fakeCtx({ job: { access } }), {
      parent,
    })
  ).toEqual(access)
})

test("inherits the instruction contract when tools are omitted", async () => {
  const access = contract([integrationEntry("gmail-id", ["search_messages"])])
  const parent = instructionParent(access)

  expect(await resolveSubtaskAccess(fakeCtx(), { parent })).toEqual(access)
})

test("a full-surface parent passes on the full surface when tools are omitted", async () => {
  expect(
    await resolveSubtaskAccess(fakeCtx(), { parent: instructionParent() })
  ).toBeUndefined()
})

test("clamps requested tools to the parent contract", async () => {
  const parent = instructionParent(
    contract(
      [
        integrationEntry("gmail-id", ["search_messages", "send_message"]),
        integrationEntry("slack-id", ["channels_list"]),
      ],
      { jori: ["web_search", "web_fetch"] }
    )
  )

  expect(
    await resolveSubtaskAccess(fakeCtx(), {
      parent,
      tools: ["search_messages", "github_create_issue", "web_search"],
    })
  ).toEqual({
    integrations: [integrationEntry("gmail-id", ["search_messages"])],
    jori: ["web_search"],
  })
})

test("a sub-agent cannot receive a Jori tool its parent lacks", async () => {
  const parent = instructionParent(
    contract([integrationEntry("gmail-id", ["search_messages"])], {
      jori: ["read_table"],
    })
  )

  expect(
    await resolveSubtaskAccess(fakeCtx(), {
      parent,
      tools: ["read_table", "insert_table_row", "web_search", "bash"],
    })
  ).toEqual({
    integrations: [],
    jori: ["read_table"],
  })
})

test("an empty tool list grants only core tools", async () => {
  const parent = instructionParent(
    contract([integrationEntry("gmail-id", ["search_messages"])], {
      jori: ["web_search"],
    })
  )

  expect(await resolveSubtaskAccess(fakeCtx(), { parent, tools: [] })).toEqual({
    integrations: [],
    jori: [],
  })
})

test("a full-surface parent grants the requested tools of Jori and its integrations", async () => {
  const parent = instructionParent()

  expect(
    await resolveSubtaskAccess(
      fakeCtx({
        integrations: [
          activeIntegration("slack-id", "slack"),
          activeIntegration("linear-id", "linear"),
        ],
      }),
      { parent, tools: ["channels_list", "web_fetch", "load_skill"] }
    )
  ).toEqual({
    integrations: [integrationEntry("slack-id", ["channels_list"])],
    // Core tools need no grant, so they are never written into a contract.
    jori: ["web_fetch"],
  })
})

test("every run holds the core tools, whatever its contract", () => {
  const input = instructionInput(contract([]))

  expect(holdsTool(input, { surface: "jori", tool: "finish_run" })).toBe(true)
  expect(holdsTool(input, { surface: "jori", tool: "load_skill" })).toBe(true)
  expect(holdsTool(input, { surface: "jori", tool: "read_table" })).toBe(false)
  expect(
    holdsTool(instructionInput(contract([], { jori: ["read_table"] })), {
      surface: "jori",
      tool: "read_table",
    })
  ).toBe(true)
})

test("uses the run snapshot when the parent job is gone", async () => {
  const parent = jobParent()

  await expect(resolveSubtaskAccess(fakeCtx(), { parent })).resolves.toEqual(
    contract([])
  )
})

type Access = NonNullable<Awaited<ReturnType<typeof resolveSubtaskAccess>>>

function contract(
  integrations: Access["integrations"],
  options: { jori?: string[] } = {}
): Access {
  return { integrations, jori: options.jori ?? [] }
}

function instructionInput(access: Access): InstructionRuntimeInput {
  return {
    type: "instruction",
    run: instructionParent(access),
    access,
    instructions: "Do the thing.",
    integrations: [],
    organization: null,
    requester: null,
    timezone: null,
  }
}

function integrationEntry(id: string, tools: string[]) {
  return { id: id as Id<"integrations">, tools }
}

function jobParent(access?: Access) {
  return {
    ...baseParent(),
    job: { id: "job" },
    access: access ?? contract([]),
  } as unknown as Doc<"runs">
}

function instructionParent(access?: Access) {
  return {
    ...baseParent(),
    ...(access === undefined ? {} : { access }),
  } as unknown as Doc<"runs">
}

function baseParent() {
  return {
    _id: "parent",
    _creationTime: 0,
    organizationId: "organization",
    principal: { kind: "person", personId: "person" },
    cause: { type: "manual", personId: "person" },
    createdBy: "person",
    snapshot: { title: "Parent", source: { type: "manual" }, context: [] },
    status: "running",
    createdAt: 0,
  }
}

function activeIntegration(id: string, integration: string) {
  return {
    _id: id,
    organizationId: "organization",
    integration,
    scope: "organization",
    status: "active",
  }
}

function fakeCtx(
  docs: { job?: { access: Access }; integrations?: unknown[] } = {}
) {
  return {
    db: {
      get: async (id: string) =>
        id === "job" && docs.job !== undefined ? docs.job : null,
      query: () => ({
        withIndex: () => ({
          take: async () => docs.integrations ?? [],
        }),
      }),
    },
  } as unknown as QueryCtx
}
