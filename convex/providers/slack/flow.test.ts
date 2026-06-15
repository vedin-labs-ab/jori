import { describe, expect, test, vi } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import { callSlackTool } from "../../broker/tools/slack"
import { assemblePrompt } from "../../executions/prompt"
import { createSkillSandboxFiles } from "../../executions/sandbox/skills"
import { assembleToolsForRun } from "../../executions/tools"
import { filterRuntimeSkillsForBundle } from "../../executions/tools/bundles"
import { resolveToolModes } from "../../permissions/catalog"
import { skills as globalSkills } from "../../prompts/generated"
import { createProviderActor } from "../../shared/actor"
import { getSlackMessage, type SlackEventPayload } from "./events"

type SlackFlow = ReturnType<typeof createSlackFlow>

describe("Slack input to Slack output flow", () => {
  test("assembles a Slack-triggered run and posts a threaded Slack reply", async () => {
    const flow = createSlackFlow()

    expectSlackInput(flow)
    expectRuntimeAssembly(flow)
    await expectSlackOutput(flow)
  })
})

function createSlackFlow() {
  const slackInput = getSlackMessage(slackEventPayload())

  expect(slackInput).not.toBeNull()

  if (slackInput === null) {
    throw new Error("Expected Slack message input")
  }

  const integration = slackIntegration(slackInput.accountId)
  const toolBundle = assembleToolsForRun({
    milo: {
      convexSiteUrl: "https://convex.example",
      executionToken: "execution-token",
    },
    integrations: [integration],
    toolModes: resolveToolModes([]),
  })

  return {
    integration,
    prompt: assemblePrompt(slackRuntimeInput(slackInput, integration)),
    skillFiles: createSkillSandboxFiles(slackRuntimeSkills(toolBundle)),
    slackInput,
    toolBundle,
  }
}

function slackRuntimeSkills(
  toolBundle: ReturnType<typeof assembleToolsForRun>
) {
  return filterRuntimeSkillsForBundle(
    Object.values(globalSkills).map((skill) => ({
      ...skill,
      id: `${skill.name}-skill`,
      tenantId: null,
    })),
    toolBundle.skillNames
  )
}

function slackRuntimeInput(
  slackInput: NonNullable<ReturnType<typeof getSlackMessage>>,
  integration: Doc<"integrations">
) {
  return {
    type: "message",
    provider: "slack",
    trigger: {
      _id: "trigger",
      _creationTime: 0,
      tenantId: integration.tenantId,
      type: "message",
      provider: "slack",
      status: "active",
      messageId: "message",
      createdAt: 0,
    },
    integration,
    integrations: [integration],
    message: {
      _id: "message",
      _creationTime: 0,
      tenantId: integration.tenantId,
      integrationId: integration._id,
      externalId: slackInput.externalId,
      conversationId: slackInput.conversationId,
      actor: createProviderActor({
        provider: "slack",
        externalId: slackInput.actorId,
        email: "requester@example.com",
      }),
      text: slackInput.text,
      data: slackInput.data,
      createdAt: 0,
    },
  } as unknown as Parameters<typeof assemblePrompt>[0]
}

function expectSlackInput({ slackInput }: SlackFlow) {
  expect(slackInput).toMatchObject({
    accountId: "T123",
    type: "app_mention",
    externalId: "slack:T123:client-message-1",
    conversationId: "1710000000.000100",
    text: "<@U_MILO> summarize this thread",
    data: {
      channelId: "C123",
      eventId: "Ev123",
      ts: "1710000000.000100",
      threadTs: undefined,
      channelType: "channel",
    },
  })
}

function expectRuntimeAssembly({ prompt, skillFiles, toolBundle }: SlackFlow) {
  expect(prompt).toContain("A Slack message triggered this run.")
  expect(prompt).toContain("- Channel ID: C123")
  expect(prompt).toContain("- Message timestamp: 1710000000.000100")
  expect(prompt).toContain("<@U_MILO> summarize this thread")
  expect(toolBundle.mcpServers.map((server) => server.name)).toEqual([
    "milo",
    "slack",
  ])
  expect(toolBundle.skillNames).toEqual(["slack"])
  expect(skillFiles).toHaveLength(1)
  expect(skillFiles[0]).toMatchObject({
    path: "/home/user/milo-workspace/.agents/skills/slack/SKILL.md",
  })
  expect(skillFiles[0]?.content).toContain(
    "Format Slack messages so they feel native: direct, compact, and easy to scan."
  )
  expect(skillFiles[0]?.content).toContain(
    "Use Slack-native `blocks` instead of one long `text` string"
  )
  expect(toolBundle.sandboxFiles.map((file) => file.path)).toContain(
    "/home/user/milo-workspace/milo-slack-mcp.mjs"
  )
  expect(
    toolBundle.sandboxFiles.find((file) =>
      file.path.endsWith("milo-slack-mcp.mjs")
    )?.content
  ).toContain("conversations_add_message")
}

async function expectSlackOutput({ integration }: SlackFlow) {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify({ ok: true, ts: "1710000000.000200" }))
    )

  const result = await callSlackTool(integration, "conversations_add_message", {
    channel: "C123",
    text: "Here is the summary: the thread needs a concise follow-up.",
    thread_ts: "1710000000.000100",
  })

  expect(result).toEqual({ ok: true, ts: "1710000000.000200" })
  expect(fetchMock).toHaveBeenCalledOnce()
  expect(fetchMock).toHaveBeenCalledWith(
    "https://slack.com/api/chat.postMessage",
    {
      method: "POST",
      headers: {
        authorization: "Bearer xoxb-test-bot",
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel: "C123",
        text: "Here is the summary: the thread needs a concise follow-up.",
        thread_ts: "1710000000.000100",
      }),
    }
  )
}

function slackEventPayload(): SlackEventPayload {
  return {
    type: "event_callback",
    team_id: "T123",
    event_id: "Ev123",
    event: {
      type: "app_mention",
      user: "U123",
      channel: "C123",
      channel_type: "channel",
      text: "<@U_MILO> summarize this thread",
      ts: "1710000000.000100",
      client_msg_id: "client-message-1",
    },
  }
}

function slackIntegration(accountId: string): Doc<"integrations"> {
  return {
    _id: "slack-integration",
    _creationTime: 0,
    tenantId: "tenant",
    provider: "slack",
    scope: "tenant",
    externalId: accountId,
    credentials: {
      bot: "xoxb-test-bot",
      user: "xoxp-test-user",
    },
    data: {
      botId: "U_MILO",
      team: {
        id: accountId,
        name: "Example Workspace",
      },
    },
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
