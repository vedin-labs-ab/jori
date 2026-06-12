import { render } from "@testing-library/react"
import { vi } from "vitest"
import { ScheduleInstructionsField } from "."

export function renderInstructionsField({
  description,
  readScope = "selected",
  surfaces,
}: {
  description: string
  readScope?: Parameters<typeof ScheduleInstructionsField>[0]["readScope"]
  surfaces: Parameters<typeof ScheduleInstructionsField>[0]["surfaces"]
}) {
  const onValueChange = vi.fn()

  const view = render(
    <ScheduleInstructionsField
      id="instructions"
      onBlur={vi.fn()}
      onValueChange={onValueChange}
      placeholder="Instructions"
      readScope={readScope}
      surfaces={surfaces}
      value={description}
    />
  )

  return { container: view.container, onValueChange }
}
