import { JoriLogo } from "@/shared/brand"
import { type ToolPermissionController } from "../../permissions/controller"
import { PermissionSection } from "../../permissions/section"
import { IntegrationCardSurface } from "./surface"

export function NativePermissionsCard({
  controller,
}: {
  controller: ToolPermissionController
}) {
  return (
    <IntegrationCardSurface
      description="Control what Jori's built-in tools can do for this organization."
      logo={{ mark: <JoriLogo aria-hidden="true" className="size-8" /> }}
      title="Jori"
    >
      <PermissionSection
        controller={controller}
        emptyLabel="No permissions to configure yet."
        surface="jori"
        title="Permissions"
      />
    </IntegrationCardSurface>
  )
}
