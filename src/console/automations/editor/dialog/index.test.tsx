// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { emptyAutomationForm } from "../../types"
import { AutomationDialog } from "."

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: () => ({ status: "ready", skills: [] }),
}))

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
  })

  test("never renders non-field save errors inline", () => {
    renderAutomationDialog({
      error: "Could not reach the server.",
      values: { ...emptyAutomationForm, name: "Release summary" },
    })

    expect(
      screen.getByLabelText("Name").getAttribute("aria-invalid")
    ).toBeNull()
    expect(screen.queryByText("Could not reach the server.")).toBeNull()
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
  })
})

describe("automation dialog access controls", () => {
  test("shows web search directly after instructions without an access heading", () => {
    renderAutomationDialog({
      error: undefined,
      values: {
        ...emptyAutomationForm,
        name: "Release summary",
        instructions: "Summarize GitHub changes.",
      },
    })

    const instructionsFrame = document.body.querySelector(
      "[data-automation-instructions-frame]"
    )
    const webSearchLabel = screen.getByText("Let Milo search the web")

    expect(screen.queryByText("Access")).toBeNull()
    expect(instructionsFrame).not.toBeNull()
    expect(
      instructionsFrame?.compareDocumentPosition(webSearchLabel) ??
        Node.DOCUMENT_POSITION_PRECEDING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
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
