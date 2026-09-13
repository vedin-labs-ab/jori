// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { toolPermission } from "../fixtures"
import { type JobInstructionsFieldProps } from "../types"
import { useJobInstructionsEditor } from "./state"

afterEach(cleanup)

test("preserves selection on value echoes and refreshes external values and policy", async () => {
  const props = instructionProps()
  const field = renderHook(useJobInstructionsEditor, { initialProps: props })
  await waitFor(() => expect(field.result.current.editor).not.toBeNull())
  const editor = field.result.current.editor
  if (editor === null) {
    throw new Error("Editor did not initialize")
  }
  const onValueChange = vi.fn()
  const additionalSurfaces = [{ integration: "slack" as const, tools: [] }]

  field.rerender({ ...props, additionalSurfaces, onValueChange })
  act(() => {
    editor.commands.setTextSelection(1)
    editor.commands.insertContent("Now ")
  })
  expect(props.onValueChange).not.toHaveBeenCalled()
  expect(onValueChange).toHaveBeenLastCalledWith({
    description: "Now Read @GitHub.",
    surfaces: [...props.surfaces, ...additionalSurfaces],
  })
  const echoed = {
    ...props,
    additionalSurfaces,
    onValueChange,
    surfaces: [...props.surfaces, ...additionalSurfaces],
    value: "Now Read @GitHub.",
  }
  const selection = editor.state.selection
  const document = editor.state.doc
  field.rerender(echoed)
  expect(editor.state.doc).toBe(document)
  expect(editor.state.selection.eq(selection)).toBe(true)

  field.rerender({
    ...echoed,
    policyKey: "blocked",
    permissions: [
      toolPermission("github", "github_get_issue", "Read", "read", "blocked"),
    ],
  })
  let policy: unknown
  editor.state.doc.descendants((node) => {
    if (node.type.name === "jobSurface") {
      policy = node.attrs.policy
    }
  })
  expect(policy).toBe("blocked")
  expect(onValueChange).toHaveBeenCalledTimes(1)

  field.rerender({ ...echoed, value: "" })
  expect(editor.getText()).toBe("")
  expect(field.result.current.isEmpty).toBe(true)
  expect(onValueChange).toHaveBeenCalledTimes(1)
})

function instructionProps(): JobInstructionsFieldProps {
  return {
    additionalSurfaces: [],
    id: "instructions",
    onValueChange: vi.fn(),
    onWebSearchChange: vi.fn(),
    permissions: [toolPermission("github", "github_get_issue", "Read", "read")],
    placeholder: "Instructions",
    policyKey: "allowed",
    scope: "personal",
    skills: [],
    surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
    value: "Read @GitHub.",
    webSearch: false,
  }
}
