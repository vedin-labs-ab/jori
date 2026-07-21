import { useAuth } from "@better-auth-ui/react"
import type { ComponentProps } from "react"

import { SectionGroup } from "@/components/ui/section"
import { OrganizationDangerZone } from "./organization-danger-zone"
import { OrganizationProfile } from "./organization-profile"

export type OrganizationSettingsProps = {
  className?: string
}

/**
 * Organization settings UI: profile details, plugin-contributed cards
 * (`organizationCards`), then danger zone.
 */
export function OrganizationSettings({
  className,
  ...props
}: OrganizationSettingsProps & ComponentProps<"div">) {
  const { plugins } = useAuth()

  return (
    <SectionGroup className={className} {...props}>
      <OrganizationProfile />

      {plugins.flatMap((plugin) =>
        plugin.organizationCards?.map((Card, index) => (
          <Card key={`${plugin.id}-${index.toString()}`} />
        ))
      )}

      <OrganizationDangerZone />
    </SectionGroup>
  )
}
