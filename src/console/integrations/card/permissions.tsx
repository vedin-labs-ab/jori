import {
  type ToolPermissionController,
  type ToolSurface,
} from "../../permissions/controller"
import { PermissionSection } from "../../permissions/section"

export function IntegrationPermissions({
  controller,
  surface,
}: {
  controller: ToolPermissionController
  surface: Exclude<ToolSurface, "milo">
}) {
  return (
    <PermissionSection
      controller={controller}
      emptyLabel="No permissions to configure yet."
      surface={surface}
      title="Permissions"
    />
  )
}
