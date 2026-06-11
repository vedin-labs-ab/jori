// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { ScheduleInstructionsField } from "./instructions"
import {
  createScheduleInstructionDocument,
  serializeScheduleInstructionDocument,
} from "./instructions/document"

afterEach(cleanup)

describe("schedule instructions document", () => {
  test("converts parsed integration mentions into inline badge nodes", () => {
    const document = createScheduleInstructionDocument({
      description: "Review @github and post to slack.",
      readScope: "selected",
      surfaces: [
        { provider: "github", access: "read" },
        { provider: "slack", access: "write" },
      ],
    })

    expect(serializeScheduleInstructionDocument(document)).toEqual({
      description: "Review GitHub and post to Slack.",
      surfaces: [
        { provider: "github", access: "read" },
        { provider: "slack", access: "write" },
      ],
    })
  })

  test("defaults new all-read integrations to read access", () => {
    const document = createScheduleInstructionDocument({
      description: "Send to Slack.",
      readScope: "allConnected",
      surfaces: [],
    })

    expect(serializeScheduleInstructionDocument(document).surfaces).toEqual([
      { provider: "slack", access: "read" },
    ])
  })
})

describe("schedule instructions field", () => {
  test("renders integration badges inside the editor", async () => {
    renderInstructionsField({
      description: "Post to @github.",
      surfaces: [{ provider: "github", access: "write" }],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()
    expect(
      await screen.findByRole("button", {
        name: "GitHub access: Write. Change access.",
      })
    ).toBeDefined()
  })

  test("cycles badge access from its inline icon", async () => {
    const field = renderInstructionsField({
      description: "Post to GitHub.",
      surfaces: [{ provider: "github", access: "read" }],
    })

    fireEvent.click(
      await screen.findByRole("button", {
        name: "GitHub access: Read. Change access.",
      })
    )

    await waitFor(() => {
      expect(field.onValueChange).toHaveBeenLastCalledWith({
        description: "Post to GitHub.",
        surfaces: [{ provider: "github", access: "write" }],
      })
    })
  })
})

function renderInstructionsField({
  description,
  surfaces,
}: {
  description: string
  surfaces: Parameters<typeof ScheduleInstructionsField>[0]["surfaces"]
}) {
  const onValueChange = vi.fn()

  render(
    <ScheduleInstructionsField
      id="instructions"
      onBlur={vi.fn()}
      onValueChange={onValueChange}
      placeholder="Instructions"
      readScope="selected"
      surfaces={surfaces}
      value={description}
    />
  )

  return { onValueChange }
}
