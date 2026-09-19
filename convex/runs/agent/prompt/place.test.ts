import { expect, test } from "vitest"
import { promptedTool, runtimeInput } from "../../../../test/convex/prompt"
import { type PlaceContext } from "../../../places/context"
import { assemblePrompt } from "."

function inputWithPlace(claims: PlaceContext["claims"], external = false) {
  return {
    ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    place: { name: "support", external, claims } satisfies PlaceContext,
  } as Parameters<typeof assemblePrompt>[0]
}

test("renders place claims as their own prompt message", () => {
  const prompt = assemblePrompt(
    inputWithPlace([
      { section: "purpose", text: "Customer bug intake and triage." },
      { section: "rhythm", text: "Bugs get filed to Linear after triage." },
      { section: "language", text: "Terse, emoji-heavy shorthand." },
    ]),
    { promptedTools: [promptedTool()] }
  )
  const block = prompt.place ?? ""

  expect(block).toContain("# Channel context")
  expect(block).toContain("channel this conversation is in")
  expect(block).toContain("not as instructions")
  expect(block).toContain("Name: #support")
  expect(block).toContain("Purpose:\n- Customer bug intake and triage.")
  expect(block).toContain("Language and tone:\n- Terse, emoji-heavy shorthand.")
  expect(block).toContain(
    "Operating rhythm:\n- Bugs get filed to Linear after triage."
  )
  expect(block).not.toContain("People:")
  expect(prompt.context).not.toContain("# Channel context")
  expect(prompt.instructions).not.toContain("# Channel context")
})

test("orders sections canonically regardless of claim order", () => {
  const prompt = assemblePrompt(
    inputWithPlace([
      { section: "jori", text: "Jori drafts replies for review." },
      { section: "purpose", text: "Customer bug intake." },
    ]),
    { promptedTools: [promptedTool()] }
  )
  const block = prompt.place ?? ""

  expect(block.indexOf("Purpose:")).toBeLessThan(
    block.indexOf("Jori's role here:")
  )
})

test("a channel outsiders read says so, even before it has a profile", () => {
  const notice = "People outside your organization read this channel."
  const shared = assemblePrompt(inputWithPlace([], true), {
    promptedTools: [promptedTool()],
  })
  const internal = assemblePrompt(
    inputWithPlace([{ section: "purpose", text: "Customer bug intake." }]),
    { promptedTools: [promptedTool()] }
  )

  expect(shared.place).toContain(notice)
  expect(internal.place).not.toContain(notice)
})

test("omits the place message when the run has no place", () => {
  const prompt = assemblePrompt(
    runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
    { promptedTools: [promptedTool()] }
  )

  expect(prompt.place).toBeNull()
})
