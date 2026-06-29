import { expect, test } from "vitest"
import { activeSurfaceTools } from "./tools"

test("exposes reply and reaction active surface tools", () => {
  expect(activeSurfaceTools("slack").map((tool) => tool.name)).toEqual([
    "send_reply",
    "add_reaction",
  ])
  expect(activeSurfaceTools("linear").map((tool) => tool.name)).toEqual([
    "send_reply",
    "add_reaction",
  ])
  expect(activeSurfaceTools("github").map((tool) => tool.name)).toEqual([
    "send_reply",
    "add_reaction",
  ])
})

test("exposes Linear comment targeting only on the Linear active surface", () => {
  expect(activeSurfaceTools("linear")[0]?.inputSchema).toMatchObject({
    properties: {
      commentId: {
        type: "string",
      },
      final: {
        type: "boolean",
      },
      text: {
        type: "string",
      },
    },
  })
  expect(activeSurfaceTools("slack")[0]?.inputSchema).not.toMatchObject({
    properties: {
      commentId: expect.anything(),
    },
  })
})

test("uses surface-specific reaction target schemas", () => {
  expect(tool("slack", "add_reaction")?.inputSchema).toMatchObject({
    required: ["reaction", "target"],
    properties: {
      final: { type: "boolean" },
      reaction: { type: "string" },
      target: {
        required: ["messageTs"],
        properties: {
          messageTs: { type: "string" },
        },
      },
    },
  })
  expect(tool("linear", "add_reaction")?.inputSchema).toMatchObject({
    properties: {
      target: {
        oneOf: [
          {
            required: ["type", "commentId"],
          },
          {
            required: ["type", "issueId"],
          },
        ],
      },
    },
  })
  expect(tool("github", "add_reaction")?.inputSchema).toMatchObject({
    properties: {
      reaction: {
        enum: [
          "+1",
          "-1",
          "laugh",
          "confused",
          "heart",
          "hooray",
          "rocket",
          "eyes",
        ],
      },
      target: {
        required: ["type", "commentId"],
        properties: {
          commentId: { type: "number" },
        },
      },
    },
  })
})

function tool(surface: Parameters<typeof activeSurfaceTools>[0], name: string) {
  return activeSurfaceTools(surface).find(
    (candidate) => candidate.name === name
  )
}
