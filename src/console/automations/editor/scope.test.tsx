// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderEventFields } from "./event.test.helpers"

describe("automation event conditions", () => {
  test("hides optional parameters until they are added as conditions", () => {
    renderEventFields({
      eventProvider: "linear",
      event: "issue.comment.created",
    })

    expect(screen.queryByLabelText("Team")).toBeNull()
    expect(screen.queryByLabelText("Project")).toBeNull()
    expect(screen.queryByLabelText("Issue")).toBeNull()
    expect(screen.queryByText("Scope")).toBeNull()
    expect(screen.queryByText("Choose where this applies.")).toBeNull()
    expect(screen.getByText("Condition")).toBeDefined()
    expect(
      screen.getByRole("combobox", { name: "Add condition" })
    ).toBeDefined()
    expect(
      screen.queryByText(
        "Runs when someone creates a comment on a matching Linear issue."
      )
    ).toBeNull()
  })

  test("shows required scope fields without an add button when every parameter is required", () => {
    renderEventFields({ eventProvider: "slack", event: "message.created" })

    expect(screen.getByLabelText("Channel")).toBeDefined()
    expect(screen.queryByText("Scope")).toBeNull()
    expect(screen.queryByRole("combobox", { name: "Add condition" })).toBeNull()
    expect(screen.queryByText("Condition")).toBeNull()
  })

  test("shows conditions that already have values", () => {
    renderEventFields({
      eventProvider: "linear",
      event: "issue.comment.created",
      eventCriteria: {
        issue: "issue-a",
        project: "project-a",
        team: "team-a",
      },
    })

    expect(screen.getByLabelText("Team")).toBeDefined()
    expect(screen.getByLabelText("Project")).toBeDefined()
    expect(screen.getByLabelText("Issue")).toBeDefined()
    expect(screen.getByLabelText("Project").hasAttribute("disabled")).toBe(
      false
    )
    expect(screen.queryByRole("combobox", { name: "Add condition" })).toBeNull()
  })
})

describe("automation event condition editing", () => {
  test("adds a condition from the add-condition picker", () => {
    renderEventFields({
      eventProvider: "linear",
      event: "issue.comment.created",
    })

    openAddConditionPicker()

    expect(
      screen.getByText("Narrows runs to issues in the selected team.")
    ).toBeDefined()

    fireEvent.click(screen.getByRole("option", { name: /Team/ }))

    expect(screen.getByLabelText("Team")).toBeDefined()
    expect(screen.getByLabelText("Team").hasAttribute("disabled")).toBe(false)
    expect(
      screen.getByLabelText("Team").closest('[data-slot="input-group"]')
        ?.className
    ).toContain("basis-0")
    expect(screen.getByRole("group", { name: "Team condition" })).toBeDefined()
    expect(screen.getByText("Condition")).toBeDefined()
    expect(
      screen.queryByText("Narrows runs to issues in the selected team.")
    ).toBeNull()
  })

  test("removes a condition and clears its criteria value", () => {
    const onValuesChange = vi.fn()

    renderEventFields(
      {
        eventProvider: "linear",
        event: "issue.comment.created",
        eventCriteria: { team: "team-a" },
      },
      onValuesChange
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Team condition" })
    )

    expect(screen.queryByLabelText("Team")).toBeNull()
    expect(onValuesChange).toHaveBeenCalledWith(
      expect.objectContaining({ eventCriteria: {} })
    )
  })

  test("disables dependent condition pickers until their parent is selected", () => {
    renderEventFields({
      eventProvider: "github",
      event: "issue.comment.created",
    })

    openAddConditionPicker()
    fireEvent.click(screen.getByRole("option", { name: /Issue/ }))

    expect(screen.getByLabelText("Issue").hasAttribute("disabled")).toBe(true)
    expect(screen.getByLabelText("Issue").getAttribute("placeholder")).toBe(
      "Choose repository first"
    )
  })
})

function openAddConditionPicker() {
  fireEvent.pointerDown(
    screen.getByRole("combobox", { name: "Add condition" }),
    {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    }
  )
}
