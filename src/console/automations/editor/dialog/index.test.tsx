// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { emptyAutomationForm } from "../../types"
import { AutomationDialog } from "."

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

describe("automation dialog instructions validation", () => {
  test("shows required-instructions errors on the instructions field", async () => {
    renderAutomationDialog({
      error: "Instructions are required.",
      values: {
        ...emptyAutomationForm,
        name: "Release summary",
        instructions: "",
      },
    })

    const textbox = await findInstructionsTextbox()
    const editorFrame = document.body.querySelector(
      "[data-automation-instructions-frame]"
    )

    expect(editorFrame?.className).toContain("border-destructive")
    expect(editorFrame?.className).toContain("ring-destructive/20")
    expect(textbox.getAttribute("aria-invalid")).toBe("true")
    expect(textbox.getAttribute("aria-describedby")).toBe(
      "automation-description-error"
    )
    expect(screen.getByRole("alert").textContent).toBe(
      "Instructions are required."
    )
    expect(screen.queryByText("Could not save automation")).toBeNull()
  })

  test("hides stale required-instructions errors after instructions are present", async () => {
    renderAutomationDialog({
      error: "Instructions are required.",
      values: {
        ...emptyAutomationForm,
        name: "Release summary",
        instructions: "Summarize GitHub changes.",
      },
    })

    const textbox = await findInstructionsTextbox()

    expect(textbox.getAttribute("aria-invalid")).toBeNull()
    expect(textbox.getAttribute("aria-describedby")).toBeNull()
    expect(screen.queryByText("Instructions are required.")).toBeNull()
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
      policyKey="test"
      tenantId="tenant"
      values={values}
    />
  )
}

function findInstructionsTextbox() {
  return waitFor(() => {
    const textbox = document.body.querySelector<HTMLElement>(
      "#automation-description"
    )

    if (textbox === null) {
      throw new Error("Instructions textbox not found")
    }

    return textbox
  })
}
