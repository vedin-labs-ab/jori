/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { DemoConsoleAt } from "../../../../test/demo"
import { uploadPause } from "./upload"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

// jsdom has no object URLs; an uploaded file's bytes live behind one.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:demo")
  URL.revokeObjectURL = vi.fn()
})

afterEach(cleanup)

test("a picked file uploads into the workspace and joins the list", async () => {
  render(<DemoConsoleAt path="/files" />)

  fireEvent.click(screen.getByRole("button", { name: "Upload file" }))
  fireEvent.change(await screen.findByLabelText("Add files"), {
    target: {
      files: [new File(["a,b\n1,2"], "budget.csv", { type: "text/csv" })],
    },
  })
  fireEvent.click(screen.getByRole("button", { name: "Upload" }))

  await screen.findByText("Uploaded 1 file.", undefined, {
    timeout: uploadPause * 4,
  })

  expect(screen.getByRole("link", { name: /budget\.csv/ })).toBeDefined()
  expect(URL.createObjectURL).toHaveBeenCalledOnce()
})
