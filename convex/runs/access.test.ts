import { expect, test } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { resolveSubtaskAccess } from "./access"

test("inherits the automation contract when tools are omitted", async () => {
  const access = contract([integrationEntry("gmail-id", ["search_messages"])], {
    web: true,
  })
  const parent = automationParent(access)

  expect(
    await resolveSubtaskAccess(fakeCtx({ automation: { access } }), {
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
      { web: true }
    )
  )

  expect(
    await resolveSubtaskAccess(fakeCtx(), {
      parent,
      tools: ["search_messages", "github_create_issue", "web_search"],
    })
  ).toEqual({
    integrations: [integrationEntry("gmail-id", ["search_messages"])],
    web: true,
  })
})

test("web stays off when the parent has no web access", async () => {
  const parent = instructionParent(
    contract([integrationEntry("gmail-id", ["search_messages"])])
  )

  expect(
    await resolveSubtaskAccess(fakeCtx(), {
      parent,
      tools: ["search_messages", "web_search", "web_fetch"],
    })
  ).toEqual({
    integrations: [integrationEntry("gmail-id", ["search_messages"])],
    web: false,
  })
})

test("web stays off unless a web tool is requested", async () => {
  const parent = instructionParent(
    contract([integrationEntry("gmail-id", ["search_messages"])], {
      web: true,
    })
  )

  const access = await resolveSubtaskAccess(fakeCtx(), {
    parent,
    tools: ["search_messages"],
  })

  expect(access?.web).toBe(false)
})

test("an empty tool list grants only core tools", async () => {
  const parent = instructionParent(
    contract([integrationEntry("gmail-id", ["search_messages"])], {
      web: true,
    })
  )

  expect(await resolveSubtaskAccess(fakeCtx(), { parent, tools: [] })).toEqual({
    integrations: [],
    web: false,
  })
})

test("a full-surface parent grants requested catalog tools of its integrations", async () => {
  const parent = instructionParent()

  expect(
    await resolveSubtaskAccess(
      fakeCtx({
        integrations: [
          activeIntegration("slack-id", "slack"),
          activeIntegration("linear-id", "linear"),
        ],
      }),
      { parent, tools: ["channels_list", "web_fetch"] }
    )
  ).toEqual({
    integrations: [integrationEntry("slack-id", ["channels_list"])],
    web: true,
  })
})

test("uses the run snapshot when the parent automation is gone", async () => {
  const parent = automationParent()

  await expect(resolveSubtaskAccess(fakeCtx(), { parent })).resolves.toEqual(
    contract([])
  )
})

type Access = NonNullable<Awaited<ReturnType<typeof resolveSubtaskAccess>>>

function contract(
  integrations: Access["integrations"],
  options: { web?: boolean } = {}
): Access {
  return { integrations, web: options.web ?? false }
}

function integrationEntry(id: string, tools: string[]) {
  return { id: id as Id<"integrations">, tools }
}

function automationParent(access?: Access) {
  return {
    ...baseParent(),
    automationId: "automation",
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
  docs: { automation?: { access: Access }; integrations?: unknown[] } = {}
) {
  return {
    db: {
      get: async (id: string) =>
        id === "automation" && docs.automation !== undefined
          ? docs.automation
          : null,
      query: () => ({
        withIndex: () => ({
          take: async () => docs.integrations ?? [],
        }),
      }),
    },
  } as unknown as QueryCtx
}
