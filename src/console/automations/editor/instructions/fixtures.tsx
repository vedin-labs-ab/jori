import { render } from "@testing-library/react"
import { vi } from "vitest"
import { type ToolPermission } from "../../../permissions/types"
import { AutomationInstructionsField } from "."

export const instructionToolPermissions = [
  toolPermission("github", "github_get_issue", "Read issue", "read"),
  toolPermission(
    "github",
    "github_add_issue_comment",
    "Add issue comment",
    "write"
  ),
  toolPermission("slack", "conversations_history", "Read history", "read"),
  toolPermission("slack", "conversations_add_message", "Send message", "write"),
  toolPermission("googleDrive", "google_drive_read_file", "Read file", "read"),
  toolPermission(
    "googleDrive",
    "google_drive_create_file",
    "Create file",
    "write"
  ),
] satisfies ToolPermission[]

export function renderInstructionsField({
  description,
  error,
  permissions = instructionToolPermissions,
  policyKey = "test",
  showAccessError,
  surfaces,
}: {
  description: string
  error?: Parameters<typeof AutomationInstructionsField>[0]["error"]
  permissions?: Parameters<typeof AutomationInstructionsField>[0]["permissions"]
  policyKey?: Parameters<typeof AutomationInstructionsField>[0]["policyKey"]
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
      showAccessError={showAccessError}
      surfaces={surfaces}
      value={description}
    />
  )

  return { container: view.container, onValueChange }
}

export function toolPermission(
  surface: ToolPermission["surface"],
  tool: string,
  label: string,
  access: ToolPermission["access"],
  mode: ToolPermission["mode"] = "allowed"
): ToolPermission {
  return {
    access,
    description: label,
    usage: `Use ${tool}.`,
    label,
    mode,
    overrideMode: null,
    route: "broker",
    surface,
    tool,
  }
}
