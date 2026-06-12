import { render } from "@testing-library/react"
import { vi } from "vitest"
import { AutomationInstructionsField } from "."

export function renderInstructionsField({
  description,
  readScope = "selected",
  surfaces,
}: {
  description: string
  readScope?: Parameters<typeof AutomationInstructionsField>[0]["readScope"]
  surfaces: Parameters<typeof AutomationInstructionsField>[0]["surfaces"]
}) {
  const onValueChange = vi.fn()

  const view = render(
    <AutomationInstructionsField
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
