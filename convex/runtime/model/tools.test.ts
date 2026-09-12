import { chatFunctionToolToJSON } from "@openrouter/sdk/models/chatfunctiontool"
import { expect, test, vi } from "vitest"
import { decodeJsonObject } from "../../../contracts/json"
import { notionToolInputSchemas } from "../../../contracts/tools/notion"
import { OpenRouterModel } from "./chat"

const openRouter = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock("../../model/openrouter", () => ({
  providerPreferences: () => ({ requireParameters: true }),
  sendOpenRouterChat: openRouter.send,
}))

test("preserves optional Notion pagination through the provider wire schema", async () => {
  const parameters = decodeJsonObject(
    JSON.stringify(notionToolInputSchemas.notion_get_block_children)
  )
  const args = { blockId: "synthetic-block" }
  openRouter.send.mockResolvedValue({
    choices: [
      {
        message: {
          role: "assistant",
          toolCalls: [
            {
              type: "function",
              id: "call-1",
              function: {
                name: "notion_get_block_children",
                arguments: JSON.stringify(args),
              },
            },
          ],
        },
      },
    ],
  })
  const result = await new OpenRouterModel("run-1").complete({
    messages: [{ role: "user", content: "Read the first page." }],
    tools: [
      {
        name: "notion_get_block_children",
        description: "Read blocks.",
        inputSchema: parameters,
      },
    ],
  })
  const tool = openRouter.send.mock.lastCall?.[0].tools[0]
  const wire = JSON.parse(chatFunctionToolToJSON(tool))
  expect(wire.function.strict).toBe(false)
  expect(wire.function.parameters).toEqual(parameters)
  expect(wire.function.parameters.required).toEqual(["blockId"])
  expect(wire.function.parameters.properties.start_cursor.type).toBe("string")
  expect(result).toMatchObject({
    type: "tool_calls",
    toolCalls: [{ name: "notion_get_block_children", args }],
  })
})
