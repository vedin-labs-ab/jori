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
