import { MiloLogo } from "@/shared/brand"
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
      description="Control what Milo's built-in tools can do for this organization."
      logo={{ mark: <MiloLogo aria-hidden="true" className="size-8" /> }}
      title="Milo"
    >
      <PermissionSection
        controller={controller}
        emptyLabel="No permissions to configure yet."
        surface="milo"
        title="Permissions"
      />
    </IntegrationCardSurface>
  )
}
