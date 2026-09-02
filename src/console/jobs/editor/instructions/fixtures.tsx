import { render } from "@testing-library/react"
import { vi } from "vitest"
import { type ToolPermission } from "../../../permissions/types"
import { readAdditionalJobSurfaces } from "./document"
import { JobInstructionsField } from "./field"

const instructionToolPermissions = [
  toolPermission("github", "github_get_issue", "Read issue", "read"),
  toolPermission(
    "github",
    "github_add_issue_comment",
    "Add issue comment",
    "write"
  ),
  toolPermission("slack", "conversations_history", "Read history", "read"),
  toolPermission("slack", "conversations_add_message", "Send message", "write"),
  toolPermission("notion", "notion_get_page", "Read page", "read"),
  toolPermission("notion", "notion_create_page", "Create page", "write"),
] satisfies ToolPermission[]

export function renderInstructionsField({
  description,
  error,
  permissions = instructionToolPermissions,
  policyKey = "test",
  showAccessError,
  scope = "personal",
  skills = ["meeting-prep"],
  surfaces,
  webSearch = false,
}: {
  description: string
  error?: Parameters<typeof JobInstructionsField>[0]["error"]
  permissions?: Parameters<typeof JobInstructionsField>[0]["permissions"]
  policyKey?: Parameters<typeof JobInstructionsField>[0]["policyKey"]
  showAccessError?: Parameters<
    typeof JobInstructionsField
  >[0]["showAccessError"]
  scope?: Parameters<typeof JobInstructionsField>[0]["scope"]
  skills?: Parameters<typeof JobInstructionsField>[0]["skills"]
  surfaces: Parameters<typeof JobInstructionsField>[0]["surfaces"]
  webSearch?: boolean
}) {
  const onValueChange = vi.fn()
  const onWebSearchChange = vi.fn()
  const field = (nextScope = scope) => (
    <JobInstructionsField
      additionalSurfaces={readAdditionalJobSurfaces({
        description,
        surfaces,
      })}
      error={error}
      id="instructions"
      onWebSearchChange={onWebSearchChange}
      onValueChange={onValueChange}
      placeholder="Instructions"
      permissions={permissions}
      policyKey={policyKey}
      showAccessError={showAccessError}
      scope={nextScope}
      skills={skills}
      surfaces={surfaces}
      organizationId="organization"
      value={description}
      webSearch={webSearch}
    />
  )
  const view = render(field())

  return {
    container: view.container,
    onValueChange,
    onWebSearchChange,
    rerenderScope: (nextScope: typeof scope) => view.rerender(field(nextScope)),
  }
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
    label,
    mode,
    overrideMode: null,
    route: "broker",
    surface,
    tool,
  }
}
