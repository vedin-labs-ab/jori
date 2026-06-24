import { expect, test } from "vitest"
import { activeSurfaceTools } from "./tools"

test("exposes active surface reactions only for supported integrations", () => {
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
  ])
})
