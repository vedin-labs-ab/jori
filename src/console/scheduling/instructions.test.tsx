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

describe("schedule instructions field layout", () => {
  test("aligns placeholder with the editable text", async () => {
    const field = renderInstructionsField({
      description: "",
      surfaces: [],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()

    const placeholder = field.container.querySelector(".pointer-events-none")

    expect(placeholder?.className).toContain("top-[9px]")
    expect(placeholder?.className).toContain("left-[9px]")
    expect(placeholder?.className).toContain("right-[9px]")
    expect(placeholder?.className).toContain("text-sm/6")
    expect(placeholder?.className).toContain("md:text-xs/6")
  })

  test("constrains long unbroken text inside the editor", async () => {
    const field = renderInstructionsField({
      description: "Post to GitHub then qweqweqweqweqweqweqweqweqweqweqweqwe.",
      surfaces: [{ provider: "github", access: "read" }],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()

    const editorFrame = field.container.querySelector(".relative > div")

    expect(field.container.firstElementChild?.className).toContain("min-w-0")
    expect(editorFrame?.className).toContain("min-w-0")
    expect(editorFrame?.className).toContain("[overflow-wrap:anywhere]")
  })

  test("keeps text rows stable when badges are present", async () => {
    const field = renderInstructionsField({
      description: "Post GitHub results to Slack.",
      surfaces: [
        { provider: "github", access: "read" },
        { provider: "slack", access: "write" },
      ],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()

    const editorFrame = field.container.querySelector(".relative > div")
    const badgeWrapper = field.container.querySelector(
      "[data-schedule-surface-view]"
    )
    const buttonGroup = badgeWrapper?.querySelector(
      '[data-slot="button-group"]'
    )

    expect(editorFrame?.className).toContain("[&_.tiptap]:leading-6")
    expect(editorFrame?.className).toContain("[&_.tiptap>p]:min-h-6")
    expect(editorFrame?.className).toContain("[&_.tiptap>p]:leading-6")
    expect(badgeWrapper?.className).toContain("align-middle")
    expect(buttonGroup?.className).toContain("align-middle")
    expect(buttonGroup?.className).toContain("h-6")
  })

  test("uses icon opacity instead of background for badge access hover", async () => {
    renderInstructionsField({
      description: "Post to GitHub.",
      surfaces: [{ provider: "github", access: "read" }],
    })

    const button = await screen.findByRole("button", {
      name: "GitHub access: Read. Change access.",
    })

    expect(button.className).toContain("text-informational")
    expect(button.className).toContain("opacity-55")
    expect(button.className).toContain("hover:opacity-100")
    expect(button.className).not.toContain("hover:bg-")
  })
})

describe("schedule instructions marker hover", () => {
  test("switches remove pane content instantly on hover", async () => {
    renderInstructionsField({
      description: "Post to GitHub.",
      surfaces: [{ provider: "github", access: "read" }],
    })

    const button = await screen.findByRole("button", {
      name: "Remove GitHub marker",
    })
    const logoWrapper = button.querySelector("img")?.parentElement
    const removeIcon = button.querySelector("svg")
    const labelWrapper = button.querySelector(".relative.inline-grid")
    const [providerLabel, removeLabel] = Array.from(
      labelWrapper?.querySelectorAll("span") ?? []
    )

    expect(logoWrapper?.className).toContain(
      "group-hover/remove-surface-marker:invisible"
    )
    expect(removeIcon?.className.baseVal).toContain("invisible")
    expect(removeIcon?.className.baseVal).toContain(
      "group-hover/remove-surface-marker:visible"
    )
    expect(providerLabel?.className).toContain(
      "group-hover/remove-surface-marker:invisible"
    )
    expect(removeLabel?.className).toContain("invisible")
    expect(removeLabel?.className).toContain(
      "group-hover/remove-surface-marker:visible"
    )
    expect(button.innerHTML).not.toContain("transition-")
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

  test("removes a marker from its provider pane", async () => {
    const field = renderInstructionsField({
      description: "Post to GitHub.",
      surfaces: [{ provider: "github", access: "read" }],
    })

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Remove GitHub marker",
      })
    )

    await waitFor(() => {
      expect(field.onValueChange).toHaveBeenLastCalledWith({
        description: "Post to .",
        surfaces: [],
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

  const view = render(
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

  return { container: view.container, onValueChange }
}
