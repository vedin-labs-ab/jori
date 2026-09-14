// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { emptyJobForm, type Job } from "../types"
import { JobEditorDialog } from "./dialog"

// Load real lazy views before interaction assertions start their deadlines.
import "./schedule/picker"

afterEach(cleanup)

describe("job dialog name validation", () => {
  test("shows name-required errors on the name field", () => {
    renderJobDialog({
      error: "Name is required.",
      values: { ...emptyJobForm, name: "" },
    })

    const input = screen.getByLabelText("Name")

    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(input.getAttribute("aria-describedby")).toBe("job-name-error")
    expect(screen.getByRole("alert").textContent).toBe("Name is required.")
  })

  test("never renders non-field save errors inline", () => {
    renderJobDialog({
      error: "Could not reach the server.",
      values: { ...emptyJobForm, name: "Release summary" },
    })

    expect(
      screen.getByLabelText("Name").getAttribute("aria-invalid")
    ).toBeNull()
    expect(screen.queryByText("Could not reach the server.")).toBeNull()
  })

  test("hides stale name-required errors after a name is present", () => {
    renderJobDialog({
      error: "Name is required.",
      values: { ...emptyJobForm, name: "Release summary" },
    })

    expect(
      screen.getByLabelText("Name").getAttribute("aria-invalid")
    ).toBeNull()
    expect(screen.queryByText("Name is required.")).toBeNull()
  })
})

describe("job dialog instructions validation", () => {
  test("shows required-instructions errors on the instructions field", async () => {
    renderJobDialog({
      error: "Instructions are required.",
      values: {
        ...emptyJobForm,
        name: "Release summary",
        instructions: "",
      },
    })

    const textbox = await findInstructionsTextbox()
    const editorFrame = document.body.querySelector(
      "[data-job-instructions-frame]"
    )

    expect(editorFrame?.className).toContain("border-destructive")
    expect(editorFrame?.className).toContain("ring-destructive/20")
    expect(textbox.getAttribute("aria-invalid")).toBe("true")
    expect(textbox.getAttribute("aria-describedby")).toBe(
      "job-description-error"
    )
    expect(screen.getByRole("alert").textContent).toBe(
      "Instructions are required."
    )
  })

  test("hides stale required-instructions errors after instructions are present", async () => {
    renderJobDialog({
      error: "Instructions are required.",
      values: {
        ...emptyJobForm,
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

describe("job dialog sharing validation", () => {
  test("shows sharing conflicts immediately without a save error", async () => {
    renderJobDialog({
      error: undefined,
      values: {
        ...emptyJobForm,
        instructions: "Read @Gmail.",
        scope: "organization",
        surfaces: [{ integration: "gmail", tools: ["gmail_search"] }],
      },
    })

    const textbox = await findInstructionsTextbox()
    const integration = document.body.querySelector(
      '[data-job-surface-scope="blocked"]'
    )

    expect(textbox.getAttribute("aria-invalid")).toBe("true")
    expect(integration).not.toBeNull()
    expect(screen.getByRole("alert").textContent).toBe(
      "Organization jobs can't use personal access. Remove the highlighted items or switch to Personal."
    )
    expect(
      [...screen.getByRole("alert").querySelectorAll(".font-medium")].map(
        (element) => element.textContent
      )
    ).toEqual(["Organization", "Personal"])
  })
})

describe("job dialog access controls", () => {
  test("shows web search directly after instructions without an access heading", () => {
    renderJobDialog({
      error: undefined,
      values: {
        ...emptyJobForm,
        name: "Release summary",
        instructions: "Summarize GitHub changes.",
      },
    })

    const instructionsFrame = document.body.querySelector(
      "[data-job-instructions-frame]"
    )
    const webSearchLabel = screen.getByText("Let Jori search the web")

    expect(screen.queryByText("Access")).toBeNull()
    expect(instructionsFrame).not.toBeNull()
    expect(
      instructionsFrame?.compareDocumentPosition(webSearchLabel) ??
        Node.DOCUMENT_POSITION_PRECEDING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  test("shows explicit access that has no matching instruction reference", async () => {
    renderJobDialog({
      error: undefined,
      values: {
        ...emptyJobForm,
        name: "Release summary",
        instructions: "Summarize the release.",
        surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
      },
    })

    expect(await findInstructionsTextbox()).toBeDefined()
    expect(screen.getByText("Additional access")).toBeDefined()
    expect(
      screen.getByRole("button", {
        name: "GitHub additional access: 1 tool enabled. Configure tools.",
      })
    ).toBeDefined()
  })
})

describe("job dialog folder", () => {
  test("offers the folder field to a new job only", () => {
    renderJobDialog({ error: undefined, values: emptyJobForm })
    openAdvancedSettings()

    expect(screen.getByLabelText("Folder")).toBeDefined()

    cleanup()
    renderJobDialog({
      error: undefined,
      job: { id: "job" } as unknown as Job,
      values: emptyJobForm,
    })
    openAdvancedSettings()

    expect(screen.queryByLabelText("Folder")).toBeNull()
  })
})

function openAdvancedSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }))
}

function renderJobDialog({
  error,
  job,
  values,
}: {
  error: string | undefined
  job?: Job
  values: typeof emptyJobForm
}) {
  return render(
    <JobEditorDialog
      error={error}
      eventFields={null}
      folderField={(field) => (
        <label>
          Folder
          <input id={field.id} readOnly value={field.value ?? ""} />
        </label>
      )}
      grantOptions={{ people: undefined, teams: undefined }}
      isOpen={true}
      isSaving={false}
      job={job}
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onValuesChange={() => undefined}
      permissions={undefined}
      policyKey="test"
      skills={[]}
      values={values}
    />
  )
}

function findInstructionsTextbox() {
  return waitFor(() => {
    const textbox = document.body.querySelector<HTMLElement>("#job-description")

    if (textbox === null) {
      throw new Error("Instructions textbox not found")
    }

    return textbox
  })
}
