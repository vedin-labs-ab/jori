import { MiloLogo } from "@/shared/brand"
import { IntegrationSurface } from "../integrations/connection/surface"
import { type ToolPermissionController, type ToolSurface } from "./controller"
import { PermissionSection } from "./section"

export function IntegrationPermissions({
  controller,
  provider,
}: {
  controller: ToolPermissionController
  provider: Exclude<ToolSurface, "milo">
}) {
  return (
    <PermissionSection
      controller={controller}
      emptyLabel="No permissions to configure yet."
      provider={provider}
      title="Permissions"
    />
  )
}

export function NativePermissionsCard({
  controller,
}: {
  controller: ToolPermissionController
}) {
  return (
    <IntegrationSurface
      description="Control what Milo's built-in tools can do for this organization."
      logo={{ mark: <MiloLogo aria-hidden="true" className="size-8" /> }}
      title="Milo"
    >
      <PermissionSection
        controller={controller}
        emptyLabel="No permissions to configure yet."
        provider="milo"
        title="Permissions"
      />
    </IntegrationSurface>
  )
}
