// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Suspense, useState } from "react"
import { afterEach, expect, test, vi } from "vitest"
import {
  ConsoleHeaderActions,
  ConsoleHeaderActionsProvider,
  ConsoleHeaderButton,
  ConsoleSearch,
} from "./layout"

afterEach(() => {
  cleanup()
})

test("toolbar search labels the input and reports typed values", () => {
  const onValueChange = vi.fn()

  render(
    <ConsoleSearch
      label="Search files"
      onValueChange={onValueChange}
      value=""
    />
  )

  const input = screen.getByRole("textbox", { name: "Search files" })

  expect(input.getAttribute("placeholder")).toBe("Search files")
  fireEvent.change(input, { target: { value: "report" } })

  expect(onValueChange).toHaveBeenCalledWith("report")
})

test("toolbar search can use a placeholder different from its label", () => {
  render(
    <ConsoleSearch
      label="Search runs"
      onValueChange={() => {}}
      placeholder="Search runs..."
      value=""
    />
  )

  const input = screen.getByRole("textbox", { name: "Search runs" })

  expect(input.getAttribute("placeholder")).toBe("Search runs...")
})

test("compact search names the current query and opens a focused field", async () => {
  const onValueChange = vi.fn()

  render(
    <ConsoleSearch
      label="Search files"
      onValueChange={onValueChange}
      value="draft"
    />
  )

  fireEvent.click(screen.getByRole("button", { name: "Search files: draft" }))

  const inputs = await screen.findAllByRole("textbox", {
    name: "Search files",
  })
  const compactInput = inputs.at(-1)

  expect(compactInput).toBe(document.activeElement)
  fireEvent.change(compactInput as HTMLInputElement, {
    target: { value: "report" },
  })
  expect(onValueChange).toHaveBeenCalledWith("report")
})

test("header buttons keep their accessible label when compact", () => {
  render(
    <ConsoleHeaderButton
      icon={<svg aria-hidden />}
      label="New job"
      type="button"
    />
  )

  expect(screen.getByRole("button", { name: "New job" })).toBeDefined()
})

test("portaled header actions hide with their suspended page and return on reveal", async () => {
  let suspended = false
  let finish: () => void = () => undefined
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  function Page() {
    if (suspended) {
      throw pending
    }
    return (
      <section>
        <ConsoleHeaderActions>
          <button type="button">Save page</button>
        </ConsoleHeaderActions>
      </section>
    )
  }
  function Frame() {
    const [slot, setSlot] = useState<HTMLElement | null>(null)
    return (
      <>
        <header ref={setSlot} />
        <ConsoleHeaderActionsProvider slot={slot}>
          <Suspense fallback="Loading page">
            <Page />
          </Suspense>
        </ConsoleHeaderActionsProvider>
      </>
    )
  }
  const view = render(<Frame />)
  const action = screen.getByRole("button", { name: "Save page" })
  suspended = true
  view.rerender(<Frame />)
  expect(screen.getByText("Loading page")).toBeDefined()
  expect(screen.queryByRole("button", { name: "Save page" })).toBeNull()
  await act(async () => {
    suspended = false
    finish()
  })
  expect(screen.getByRole("button", { name: "Save page" })).toBe(action)
})
