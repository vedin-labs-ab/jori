import { expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { type AgentRuntimeInput } from "../executions/agent/input"
import { integration } from "../executions/agent/tools/fixtures"
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

function context(args: {
  connectedIntegrations: Doc<"integrations">[]
  input: AgentRuntimeInput
  toolModes: ReadonlyMap<string, "allowed" | "blocked" | "prompted">
}): ApprovalBrokerContext {
  return {
    connectedIntegrations: args.connectedIntegrations,
    execution: execution(),
    input: args.input,
    integrations: args.input.integrations,
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
    conversation: [],
    routing: null,
    integration: source ?? integration("slack"),
    integrations,
  }
}

function automationInput(
  integration: Doc<"integrations">,
  tools: string[]
): AgentRuntimeInput {
  return {
    type: "automation",
    run: run(),
    automation: {
      access: {
        integrations: [{ id: integration._id, tools }],
        web: false,
      },
    } as Doc<"automations">,
    event: null,
    integration: null,
    integrations: [integration],
  }
}

function run(): Doc<"runs"> {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    task: "Task",
    title: "Task",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
    reason: { type: "manual" },
    display: {
      source: {
        type: "manual",
        metadata: {},
      },
      trigger: "Manual",
      details: [],
    },
  } as unknown as Doc<"runs">
}

function execution(): Doc<"executions"> {
  return {
    _id: "execution",
    _creationTime: 0,
    tenantId: "tenant",
    runId: "run",
    status: "running",
    createdBy: "user",
    createdAt: 0,
  } as Doc<"executions">
}
