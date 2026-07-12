import { type Node as ProseMirrorNode } from "@tiptap/pm/model"
import { expect, test, vi } from "vitest"
import { readCachedInstructionSurfaces } from "./snapshot"

test("reads instruction surfaces once per immutable document", () => {
  const descendants = vi.fn()
  descendants.mockImplementation(
    (
      visit: (node: {
        attrs: Record<string, unknown>
        type: { name: string }
      }) => void
    ) => {
      visit({
        attrs: { integration: "github", tools: ["github_get_issue"] },
        type: { name: "automationSurface" },
      })
    }
  )
  const document = { descendants } as unknown as ProseMirrorNode

  const first = readCachedInstructionSurfaces(document)
  const second = readCachedInstructionSurfaces(document)

  expect(first).toBe(second)
  expect(first).toEqual([
    { integration: "github", tools: ["github_get_issue"] },
  ])
  expect(descendants).toHaveBeenCalledTimes(1)
})
