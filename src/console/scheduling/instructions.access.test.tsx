// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { renderInstructionsField } from "./instructions/test-utils"

afterEach(cleanup)

describe("schedule instructions all-read access", () => {
  test("shows all-read marker guidance", async () => {
    const field = renderInstructionsField({
      description: "",
      readScope: "allConnected",
      surfaces: [],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()
    expect(field.container.textContent).toContain(
      "Click its icon to switch between read and read/write."
    )
  })

  test("cycles marker access between read and read/write", async () => {
    const field = renderInstructionsField({
      description: "Post to GitHub.",
      readScope: "allConnected",
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
        surfaces: [{ provider: "github", access: "both" }],
      })
    })

    fireEvent.click(
      await screen.findByRole("button", {
        name: "GitHub access: Read/write. Change access.",
      })
    )

    await waitFor(() => {
      expect(field.onValueChange).toHaveBeenLastCalledWith({
        description: "Post to GitHub.",
        surfaces: [{ provider: "github", access: "read" }],
      })
    })
  })
})
