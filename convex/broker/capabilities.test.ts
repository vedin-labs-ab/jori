import { expect, test } from "vitest"
import { getToolPermission } from "../../contracts/permissions"
import { brokerJoriToolResponseSchemas } from "../../contracts/tools/responses/jori/broker"
import { runDoc } from "../../test/convex/console"
import { schemaViolations } from "../../test/convex/schema"
import { integration } from "../../test/convex/tools"
import { type Doc } from "../_generated/dataModel"
import { type AgentRuntimeInput } from "../runs/agent/input"
import { type ApprovalBrokerContext } from "./approval"
import { listCapabilities } from "./capabilities"

test("separates run tools from connected and available capabilities", () => {
  const capabilities = listCapabilities(
    context({
      connectedIntegrations: [integration("slack"), integration("github")],
      input: messageInput([integration("slack")]),
      toolModes: new Map([["github_add_issue_comment", "blocked"]]),
    })
  )

  expect(capabilities.run.map((group) => group.surface)).toEqual([
    "jori",
    "slack",
  ])
  expect(
    schemaViolations(
      capabilities,
      brokerJoriToolResponseSchemas.list_capabilities
    )
  ).toEqual([])
  expect(capabilities.connected.map((group) => group.surface)).toContain(
    "github"
  )
  expect(capabilities.available.map((group) => group.surface)).toContain(
    "gmail"
  )
  expect(
    capabilities.run
      .find((group) => group.surface === "jori")
      ?.tools.some((tool) => tool.tool === "list_capabilities")
  ).toBe(true)
  expect(joriTools(capabilities)).not.toContain("read_workstreams")
  expect(
    capabilities.connected
      .find((group) => group.surface === "github")
      ?.tools.find((tool) => tool.tool === "github_add_issue_comment")?.mode
  ).toBe("blocked")
})

test("uses user-facing descriptions in capability listings", () => {
  const capabilities = listCapabilities(
    context({
      connectedIntegrations: [integration("github")],
      input: messageInput([integration("github")]),
      toolModes: new Map(),
    })
  )
  const cloneTool = capabilities.run
    .find((group) => group.surface === "github")
    ?.tools.find((tool) => tool.tool === "github_clone_repository")
  const permission = getToolPermission("github_clone_repository")

  expect(cloneTool?.description).toBe(permission?.description)
  expect(cloneTool?.description).not.toContain("/home/user")
})

test("limits job run tools to selected unattended access", () => {
  const github = integration("github")
  const capabilities = listCapabilities(
    context({
      connectedIntegrations: [github, integration("slack")],
      input: jobInput(github, ["github_get_issue"]),
      toolModes: new Map([["github_get_pull_request", "prompted"]]),
    })
  )

  expect(capabilities.run.map((group) => group.surface)).toEqual([
    "jori",
    "github",
  ])
  expect(
    capabilities.run.find((group) => group.surface === "github")?.tools
  ).toEqual([
    expect.objectContaining({
      mode: "allowed",
      tool: "github_get_issue",
    }),
  ])
  expect(capabilities.connected.map((group) => group.surface)).toContain(
    "slack"
  )
})

test("hides interactive tools from job runs", () => {
  const github = integration("github")
  const job = listCapabilities(
    context({
      connectedIntegrations: [github],
      input: jobInput(github, ["github_get_issue"]),
      toolModes: new Map(),
    })
  )
  const message = listCapabilities(
    context({
      connectedIntegrations: [github],
      input: messageInput([github]),
      toolModes: new Map(),
    })
  )

  expect(joriTools(job)).not.toContain("offer_integration")
  expect(joriTools(message)).toContain("offer_integration")
})

test("hides web tools from job runs without web access", () => {
  const github = integration("github")
  const blocked = listCapabilities(
    context({
      connectedIntegrations: [github],
      input: jobInput(github, ["github_get_issue"], false),
      toolModes: new Map(),
    })
  )
  const allowed = listCapabilities(
    context({
      connectedIntegrations: [github],
      input: jobInput(github, ["github_get_issue"], true),
      toolModes: new Map(),
    })
  )

  expect(joriTools(blocked)).not.toContain("web_search")
  expect(joriTools(blocked)).not.toContain("web_fetch")
  expect(joriTools(allowed)).toEqual(
    expect.arrayContaining(["web_search", "web_fetch"])
  )
})

function context(args: {
  connectedIntegrations: Doc<"integrations">[]
  input: AgentRuntimeInput
  toolModes: ReadonlyMap<string, "allowed" | "blocked" | "prompted">
}): ApprovalBrokerContext {
  return {
    connectedIntegrations: args.connectedIntegrations,
    input: args.input,
    run: runDoc(),
    toolModes: args.toolModes,
  }
}

function messageInput(integrations: Doc<"integrations">[]): AgentRuntimeInput {
  const [source] = integrations

  return {
    type: "message",
    surface: "slack",
    run: runDoc(),
    message: {} as Doc<"messages">,
    conversation: { entries: [], hasMoreMessages: false, summary: null },
    integration: source ?? integration("slack"),
    integrations,
    organization: null,
    requester: null,
    timezone: null,
    place: null,
    workstreams: null,
  }
}

function jobInput(
  integration: Doc<"integrations">,
  tools: string[],
  web = false
): AgentRuntimeInput {
  return {
    type: "job",
    access: {
      integrations: [{ id: integration._id, tools }],
      web,
    },
    instructions: "Test",
    run: runDoc(),
    event: null,
    integration: null,
    integrations: [integration],
    organization: null,
    requester: null,
    timezone: null,
    workstreams: null,
  }
}

function joriTools(capabilities: ReturnType<typeof listCapabilities>) {
  return (
    capabilities.run
      .find((group) => group.surface === "jori")
      ?.tools.map((tool) => tool.tool) ?? []
  )
}
