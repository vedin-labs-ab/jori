import { expect, test } from "vitest"
import { replyPartLimits } from "../../../contracts/replies/parts"
import { toolFinalDescription } from "../../../contracts/runtime/tools"
import { activeSurfaceToolReferenceSchemas, activeSurfaceTools } from "./tools"

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

test("the console replies but never reacts", () => {
  expect(activeSurfaceTools("console").map((tool) => tool.name)).toEqual([
    "send_reply",
  ])

  const reference = activeSurfaceToolReferenceSchemas()
  const titles = (schema: unknown) =>
    ((schema as { oneOf: Array<{ title: string }> }).oneOf ?? []).map(
      (variant) => variant.title
    )

  expect(titles(reference.send_reply)).toContain("Console")
  expect(titles(reference.add_reaction)).not.toContain("Console")
})

test("a console reply carries text first, then references and choices", () => {
  const schema = tool("console", "send_reply")?.inputSchema
  const properties = schema?.properties as Record<string, unknown>

  expect(schema).toMatchObject({
    required: ["text"],
    properties: {
      text: { type: "string" },
      parts: {
        type: "array",
        maxItems:
          replyPartLimits.references +
          replyPartLimits.questions +
          replyPartLimits.chips,
        items: {
          anyOf: [
            { properties: { kind: { const: "reference" } } },
            { properties: { kind: { const: "choices" } } },
          ],
        },
      },
    },
  })
  expect(Object.keys(properties)[0]).toBe("text")
  expect(properties).not.toHaveProperty("blocks")
  expect(properties).not.toHaveProperty("commentId")
  expect(
    (
      activeSurfaceToolReferenceSchemas().send_reply as {
        oneOf: Array<{ title: string }>
      }
    ).oneOf.find((variant) => variant.title === "Console")
  ).toEqual({ title: "Console", ...schema })
})

test("Slack replies carry blocks and no parts", () => {
  const properties = tool("slack", "send_reply")?.inputSchema.properties

  expect(properties).toMatchObject({ blocks: { type: "array" } })
  expect(properties).not.toHaveProperty("parts")
})

test.each(["github", "linear"] as const)(
  "%s replies carry neither blocks nor parts",
  (surface) => {
    const properties = tool(surface, "send_reply")?.inputSchema.properties

    expect(properties).not.toHaveProperty("blocks")
    expect(properties).not.toHaveProperty("parts")
  }
)

test("exposes Linear comment targeting only on the Linear active surface", () => {
  expect(activeSurfaceTools("linear")[0]?.inputSchema).toMatchObject({
    properties: {
      commentId: {
        type: "string",
      },
      final: {
        description: toolFinalDescription,
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
      final: { description: toolFinalDescription, type: "boolean" },
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
