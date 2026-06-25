import { expect, test } from "vitest"
import { activeSurfaceTools } from "./tools"

test("exposes only send_reply as an active surface tool", () => {
  expect(activeSurfaceTools("slack").map((tool) => tool.name)).toEqual([
    "send_reply",
  ])
  expect(activeSurfaceTools("linear").map((tool) => tool.name)).toEqual([
    "send_reply",
  ])
  expect(activeSurfaceTools("github").map((tool) => tool.name)).toEqual([
    "send_reply",
  ])
})

test("exposes Linear reply targets only on the Linear active surface", () => {
  expect(activeSurfaceTools("linear")[0]?.inputSchema).toMatchObject({
    properties: {
      target: {
        type: "string",
      },
      text: {
        type: "string",
      },
    },
  })
  expect(activeSurfaceTools("slack")[0]?.inputSchema).not.toMatchObject({
    properties: {
      target: expect.anything(),
    },
  })
})
