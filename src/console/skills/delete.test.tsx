// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { DeleteSkillDialog } from "./delete"
import { SkillManagementMenu } from "./list/menu"
import { type Skill } from "./types"

afterEach(() => {
  cleanup()
})

test("skill management delegates deletion to the shared confirmation", () => {
  const onDelete = vi.fn()
  const managedSkill = skill()

  render(
    <SkillManagementMenu
      isPending={false}
      onDelete={onDelete}
      skill={managedSkill}
    />
  )

  fireEvent.pointerDown(
    screen.getByRole("button", { name: "Manage Launch notes" }),
    { button: 0, ctrlKey: false }
  )
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))

  expect(screen.getByText('Delete "Launch notes"?')).toBeDefined()
  fireEvent.click(screen.getByRole("button", { name: "Delete skill" }))
  expect(onDelete).toHaveBeenCalledWith(managedSkill)
})

test("skill deletion prevents conflicting actions while pending", () => {
  render(
    <AlertDialog open>
      <DeleteSkillDialog isPending onDelete={() => undefined} skill={skill()} />
    </AlertDialog>
  )

  expect(
    (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
      .disabled
  ).toBe(true)
  expect(
    (
      screen.getByRole("button", {
        name: "Delete skill",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true)
})

function skill(): Skill {
  return {
    _id: "skill_1",
    associatedIntegrations: [],
    body: "Keep launch notes concise.",
    category: "communication",
    createdAt: 1,
    description: "Writes concise launch notes.",
    name: "Launch notes",
    scope: "organization",
    organizationId: "organization_1",
    updatedAt: 1,
  } as unknown as Skill
}
