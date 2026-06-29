import { expect, test } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type AgentRuntimeInput } from "../runs/agent/input"
import { integration } from "../runs/agent/tools/fixtures"
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
    "milo",
    "slack",
  ])
  expect(capabilities.connected.map((group) => group.surface)).toContain(
    "github"
  )
  expect(capabilities.available.map((group) => group.surface)).toContain(
    "gmail"
  )
  expect(
    capabilities.run
      .find((group) => group.surface === "milo")
      ?.tools.some((tool) => tool.tool === "list_capabilities")
  ).toBe(true)
  expect(
    capabilities.connected
      .find((group) => group.surface === "github")
      ?.tools.find((tool) => tool.tool === "github_add_issue_comment")?.mode
  ).toBe("blocked")
})

test("limits automation run tools to selected unattended access", () => {
  const github = integration("github")
  const capabilities = listCapabilities(
    context({
      connectedIntegrations: [github, integration("slack")],
      input: automationInput(github, ["github_get_issue"]),
      toolModes: new Map([["github_get_pull_request", "prompted"]]),
    })
  )

  expect(capabilities.run.map((group) => group.surface)).toEqual([
    "milo",
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

test("hides web tools from automation runs without web access", () => {
  const github = integration("github")
  const blocked = listCapabilities(
    context({
      connectedIntegrations: [github],
      input: automationInput(github, ["github_get_issue"], false),
      toolModes: new Map(),
    })
  )
  const allowed = listCapabilities(
    context({
      connectedIntegrations: [github],
      input: automationInput(github, ["github_get_issue"], true),
      toolModes: new Map(),
    })
  )

  expect(miloTools(blocked)).not.toContain("web_search")
  expect(miloTools(blocked)).not.toContain("web_fetch")
  expect(miloTools(allowed)).toEqual(
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
    integrations: args.input.integrations,
    run: run(),
    toolModes: args.toolModes,
  }
}

function messageInput(integrations: Doc<"integrations">[]): AgentRuntimeInput {
  const [source] = integrations

  return {
    type: "message",
    messageIntegration: "slack",
    run: run(),
    message: {} as Doc<"messages">,
    conversation: { entries: [], hasMoreMessages: false },
    integration: source ?? integration("slack"),
    integrations,
    organization: null,
  }
}

function automationInput(
  integration: Doc<"integrations">,
  tools: string[],
  web = false
): AgentRuntimeInput {
  return {
    type: "automation",
    run: run(),
    automation: {
      access: {
        integrations: [{ id: integration._id, tools }],
        web,
      },
    } as Doc<"automations">,
    event: null,
    integration: null,
    integrations: [integration],
    organization: null,
  }
}

function miloTools(capabilities: ReturnType<typeof listCapabilities>) {
  return (
    capabilities.run
      .find((group) => group.surface === "milo")
      ?.tools.map((tool) => tool.tool) ?? []
  )
}

function run(): Doc<"runs"> {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    status: "running",
    instructions: "Task",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    cause: { type: "manual" },
    snapshot: {
      title: "Task",
      source: {
        type: "manual",
      },
      context: [],
    },
  } as unknown as Doc<"runs">
}
