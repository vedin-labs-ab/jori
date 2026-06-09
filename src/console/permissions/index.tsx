import { BrandIcon } from "@/shared/brand"
import { IntegrationSurface } from "../integrations/surface"
import { type ToolPermissionController, type ToolProvider } from "./controller"
import { PermissionSection } from "./section"

export function IntegrationPermissions({
  controller,
  provider,
}: {
  controller: ToolPermissionController
  provider: Exclude<ToolProvider, "milo">
}) {
  return (
    <PermissionSection
      controller={controller}
      emptyLabel="No provider permissions are defined yet."
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
      description="Control built-in scheduling permissions for this tenant."
      logo={{ mark: <BrandIcon className="size-7" /> }}
      title="Milo tools"
    >
      <PermissionSection
        controller={controller}
        emptyLabel="No tenant tool permissions are defined yet."
        provider="milo"
        title="Permissions"
      />
    </IntegrationSurface>
  )
}
