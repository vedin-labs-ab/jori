import { expect, test } from "vitest"
import { type ChatMessage } from "@/shared/console/chat/types"
import { referenceTargets } from "./references"

function message(
  overrides: Partial<ChatMessage> & { id: string }
): ChatMessage {
  return { role: "jori", text: "", parts: [], createdAt: 0, ...overrides }
}

test("collects each target once across contexts, mentions, and reference parts", () => {
  const table = { kind: "table", id: "collections:1" } as const
  const job = { kind: "job", id: "jobs:1" } as const

  expect(
    referenceTargets([
      message({ id: "m1", role: "person", context: table, references: [job] }),
      message({
        id: "m2",
        parts: [
          { kind: "reference", target: table },
          { kind: "reference", target: job },
          { kind: "choices", options: [{ label: "Open it" }] },
        ],
      }),
      message({ id: "m3", parts: [{ kind: "reference", target: job }] }),
    ])
  ).toEqual([table, job])
  expect(referenceTargets([message({ id: "m4" })])).toEqual([])
})
