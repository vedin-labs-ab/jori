import { render } from "@testing-library/react"
import { vi } from "vitest"
import { AutomationInstructionsField } from "."

export function renderInstructionsField({
  description,
  error,
  permissions,
  policyKey = "test",
  readScope = "selected",
  showAccessError,
  surfaces,
}: {
  description: string
  error?: Parameters<typeof AutomationInstructionsField>[0]["error"]
  permissions?: Parameters<typeof AutomationInstructionsField>[0]["permissions"]
  policyKey?: Parameters<typeof AutomationInstructionsField>[0]["policyKey"]
  readScope?: Parameters<typeof AutomationInstructionsField>[0]["readScope"]
  showAccessError?: Parameters<
    typeof AutomationInstructionsField
  >[0]["showAccessError"]
  surfaces: Parameters<typeof AutomationInstructionsField>[0]["surfaces"]
}) {
  const onValueChange = vi.fn()

  const view = render(
    <AutomationInstructionsField
      error={error}
      id="instructions"
      onBlur={vi.fn()}
      onValueChange={onValueChange}
      placeholder="Instructions"
      permissions={permissions}
      policyKey={policyKey}
      readScope={readScope}
      showAccessError={showAccessError}
      surfaces={surfaces}
      value={description}
    />
  )

  return { container: view.container, onValueChange }
}
