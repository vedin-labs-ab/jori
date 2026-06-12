// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { emptyAutomationForm } from "../types"
import { AutomationDialog } from "./dialog"

afterEach(cleanup)

describe("automation dialog name validation", () => {
  test("shows name-required errors on the name field", () => {
    renderAutomationDialog({
      error: "Name is required.",
      values: { ...emptyAutomationForm, name: "" },
    })

    const input = screen.getByLabelText("Name")

    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(input.getAttribute("aria-describedby")).toBe("automation-name-error")
    expect(screen.getByRole("alert").textContent).toBe("Name is required.")
    expect(screen.queryByText("Could not save automation")).toBeNull()
  })

  test("keeps unrelated save errors in the form alert", () => {
    renderAutomationDialog({
      error: "Could not reach the server.",
      values: { ...emptyAutomationForm, name: "Release summary" },
    })

    expect(
      screen.getByLabelText("Name").getAttribute("aria-invalid")
    ).toBeNull()
    expect(screen.getByText("Could not save automation")).toBeDefined()
    expect(screen.getByText("Could not reach the server.")).toBeDefined()
  })

  test("hides stale name-required errors after a name is present", () => {
    renderAutomationDialog({
      error: "Name is required.",
      values: { ...emptyAutomationForm, name: "Release summary" },
    })

    expect(
      screen.getByLabelText("Name").getAttribute("aria-invalid")
    ).toBeNull()
    expect(screen.queryByText("Name is required.")).toBeNull()
    expect(screen.queryByText("Could not save automation")).toBeNull()
  })
})

function renderAutomationDialog({
  error,
  values,
}: {
  error: string | undefined
  values: typeof emptyAutomationForm
}) {
  return render(
    <AutomationDialog
      automation={undefined}
      error={error}
      isOpen={true}
      isSaving={false}
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onValuesChange={() => undefined}
      tenantId="tenant"
      values={values}
    />
  )
}
